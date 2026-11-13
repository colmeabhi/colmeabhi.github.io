# Teaching Kubernetes which pod to delete

> When an LLM deployment scales down, Kubernetes removes a replica without knowing which one is holding the useful cache. This is my M.S. project, and it is not finished.

Case study by Abhishek Ahirrao (https://colmeabhi.github.io). Code: https://github.com/colmeabhi/cache-aware-scale-in

- **What:** M.S. project (CS 297) at San José State
- **State:** Controller done, GPU benchmark still to run
- **Built with:** Python, Kubernetes, vLLM, llm-d, k3s, Prometheus, Grafana

**In short:** A small controller looks at each vLLM replica's cache, gives it a score, and writes that score into an annotation Kubernetes already understands. When the deployment shrinks, the replica with the least useful cache goes first.

## Why this bothered me

LLM servers like vLLM keep a cache of prompts they have already worked through. If your request starts with the same system prompt as the last hundred requests, the server skips most of the work and answers quickly. If it does not have that prompt cached, it has to read the whole thing again from the top.

Here is the catch. Every replica has its own cache. Run three replicas and you get three different caches, a bit like three baristas who each remember a different set of regulars.

Now traffic drops at night, and the deployment goes from three replicas to two. Kubernetes has to fire one barista. It picks, roughly, the one who started most recently. It does not ask who knows the most regulars.

If the newest replica happens to hold the popular prompts, they are gone, and the next requests for them are slow until another replica learns them again. One time in three is bad enough odds that I wanted to fix it.

## The lazy solution, which is the good one

My first instinct was to write something that watches for scale-downs and deletes the right pod itself. That means racing the part of Kubernetes whose whole job is deleting pods. I would lose that race, probably in production, probably on a Friday.

It turns out Kubernetes already has a knob for this. You can put an annotation called `pod-deletion-cost` on a pod, and when it has to choose, it deletes the cheapest one first. So the controller never deletes anything. It just keeps the price tags up to date and lets Kubernetes do what it was going to do anyway.

_Diagram: Every 5 seconds: read each pod's cache metrics, work out a score, update the price tag if it changed enough._

The score itself is three lines:

```
recent_hit_rate = hits_in_last_window / lookups_in_last_window
cache_value     = 0.7 * recent_hit_rate + 0.3 * kv_usage
deletion_cost   = round(cache_value * 1000)
```

A pod with a 70% hit rate ends up around 700. A pod with 5% ends up near 50. Guess which one goes.

## Things I went back and forth on

Recent or lifetime hit rate? vLLM only gives you counters that go up forever, so a pod that was busy an hour ago and has done nothing since still looks great. I keep the previous reading for each pod and work out the rate between two scrapes, then smooth it so one noisy interval does not flip the ranking.

Why not just use how full the cache is? Because a cache full of prompts nobody asks for again is worth nothing. Hit rate tells you if the cache is useful, usage tells you how much there is to lose. I use both, weighted 0.7 and 0.3. Those weights are a judgment call. I have not tuned them yet.

How often to write? Kubernetes' own docs warn you not to update this annotation on every metric tick, because each update is a write to the API server. So I only write when the score has moved by at least 25. The ranking needs to be in the right order, not precise.

What if a scrape fails? The pod keeps its old score. Writing zero because of a network blip would be a great way to get the best pod deleted.

And for the comparison runs, turning the controller off is not enough. The old price tags would still be sitting on the pods and Kubernetes would still read them. The baseline has to strip the annotations too.

## How I know it works so far

GPUs are expensive, so I built this as a ladder where the first rungs cost nothing.

| Stage | Runs on | What it checks |
|---|---|---|
| 1 | My laptop, fake pods | The scoring maths gives the costs I expect |
| 2 | A local cluster (kind or k3s) | Scaling 3 to 2 removes the cheapest pod |
| 3 | 1 GPU | Prefix caching really works on the vLLM build I am using |
| 4 | 3 GPUs | A real scale-in removes the coldest replica |
| 5 | 3 GPUs and a gateway | Time to first token and hit rate, default against mine |
| 6 | 3 GPUs | The whole thing from one script, controller running in the cluster |

Stages 1 and 2 run in CI on every push, with unit tests and a scale-in trial on a kind cluster. Stage 2 is the one I trust most right now: the cheapest pod is the one that gets removed.

## The honest part

> Note: I have not run the GPU benchmark yet. Llama 3 8B on three A100 replicas is the plan. Until that is done I do not have a time-to-first-token number, and I would rather leave this section empty than put a guess in it.

What does exist: the controller, the scoring, the trial harness, an image that runs inside the cluster with the right permissions, dashboards in Grafana, and a script that runs the whole GPU day so I do not burn rented hours typing commands.

## What I already know is wrong with it

- The score can be up to 5 seconds old. A sudden traffic shift can beat it.
- The annotation is best effort, and it only ranks pods inside one ReplicaSet.
- Kubernetes looks at my cost before it thinks about spreading pods across nodes, so on a bigger cluster this could pile pods onto one node.
- The 0.7 and 0.3 weights are my guess. A proper sweep is the obvious next experiment.
