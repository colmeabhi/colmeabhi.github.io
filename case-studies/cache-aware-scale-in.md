# Cache-aware scale-in for vLLM on Kubernetes

> When an LLM deployment scales down, Kubernetes picks which replica to delete without knowing which one holds the useful cache. This controller tells it.

Case study by Abhishek Ahirrao (https://colmeabhi.github.io). Code: https://github.com/colmeabhi/cache-aware-scale-in

- **Context:** M.S. project (CS 297), San José State
- **Status:** In progress: GPU benchmark pending
- **Stack:** Python, Kubernetes, vLLM, llm-d, k3s, Prometheus, Grafana

**In short:** A small controller scores each vLLM replica's prefix cache and writes the score to the `pod-deletion-cost` annotation. On scale-down Kubernetes removes the lowest cost first, so the replica with the least valuable cache goes instead of whichever pod happens to be newest.

## The problem

vLLM keeps a KV cache of prompt prefixes it has already processed. A request whose prefix is cached skips most of the prefill work, which is what makes time to first token (TTFT) low for repeated system prompts.

That cache lives inside each replica. Three replicas behind a prefix-aware router end up with three very different caches: one holds the popular system prompts, another holds mostly one-off prompts.

When traffic drops and the Deployment scales from three replicas to two, Kubernetes has to choose a pod to delete. Between healthy pods its tie-break is based on how recently the pod became ready, which has nothing to do with the cache. If it removes the hot replica, every request that relied on those prefixes pays a full prefill on a replica that has never seen them.

## The approach

Kubernetes already has a hook for this: the `controller.kubernetes.io/pod-deletion-cost` annotation. Among healthy pods of one ReplicaSet, the pod with the lower cost is deleted first. So the controller never deletes anything itself. It only keeps that annotation current and lets the ReplicaSet controller do the rest.

_Diagram: Every 5 seconds: scrape each pod's metrics, score its cache, patch the annotation if the cost moved enough._

```
recent_hit_rate = hits_in_last_window / lookups_in_last_window   (0..1)
cache_value     = 0.7 * recent_hit_rate + 0.3 * kv_usage           (0..1)
deletion_cost   = round(cache_value * 1000)
```

## Decisions and why

- **Recent hit rate, not lifetime.** vLLM only exposes cumulative counters, so a pod that was hot an hour ago still looks hot. The controller keeps the previous counters per pod, takes the delta between scrapes and smooths it with an exponential moving average.
- **Hit rate and usage together.** Hit rate says how useful the cached prefixes are; KV usage says how much is cached. A full cache of prefixes nobody asks for again is worthless, so usage alone was rejected.
- **A dead band on writes.** The cost is only written when it has moved by at least 25. Kubernetes' own documentation warns against updating the annotation on every metric tick, because each update is an API-server write.
- **Use the built-in annotation instead of deleting pods.** Deleting pods from the controller would race the ReplicaSet controller. Autoscalers such as HPA and KEDA decide how many replicas, not which ones.
- **Fail safe.** If a scrape fails the pod keeps its previous cost. Writing 0 on a transient error could get a hot pod deleted. If the controller dies, the annotations stay as they were.
- **An honest baseline.** For the comparison runs the controller is stopped and the annotations are removed. Stopping alone would leave stale costs that Kubernetes would still honour.

## How it is tested

The project is built as a ladder of six stages. Each stage reuses the code of the one before and adds one capability plus a check that proves it.

| Stage | Runs on | What it proves |
|---|---|---|
| 1 | Laptop, fake pods | Metric parsing and scoring give the expected costs |
| 2 | kind / k3s | Scaling 3 to 2 removes the lowest-cost pod |
| 3 | 1 GPU | Prefix caching works on the real vLLM build |
| 4 | 3 GPUs | A real scale-in removes the coldest replica |
| 5 | 3 GPUs + gateway | TTFT and hit rate, default against cache-aware |
| 6 | 3 GPUs | The whole run from one script, controller in-cluster with RBAC |

Stages 1 and 2 need no GPU, so they run in CI on every push: unit tests plus the scale-in trial on a kind cluster.

## Result so far

> Note: The GPU benchmark (Llama 3 8B on three A100 replicas with llm-d routing) has not been run yet. This section will carry the measured TTFT and cache hit rate, default against cache-aware, once it has. Until then there is no performance number to claim.

What exists today: the controller, the scoring and trial harness, an in-cluster image with RBAC, Prometheus, Loki and Grafana dashboards, and a one-command runner for the GPU day.

## Limits and next steps

- The cost is at most 5 seconds stale, so a sudden traffic shift can beat it.
- `pod-deletion-cost` is best-effort and only orders pods of the same ReplicaSet.
- Node spreading is considered after cost, so on a multi-node cluster the controller could concentrate pods on one node.
- The 0.7 / 0.3 weights are a judgment call, not fitted. A sweep with the same benchmark harness is the natural next experiment.
