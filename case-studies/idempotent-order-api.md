# Duplicate-Safe Order Ledger Service

> A client that times out will retry. This API makes sure a retry never becomes a second order, even when the retries arrive at the same instant.

Case study by Abhishek Ahirrao (https://colmeabhi.github.io). Code: https://github.com/colmeabhi/idempotent-order-cloud-api

- **Context:** Personal project
- **Status:** Deployed on AWS, load tested locally
- **Stack:** Python, FastAPI, PostgreSQL, Redis, ECS Fargate, RDS, Terraform, k6

**In short:** `POST /orders` requires an `Idempotency-Key`. The key is claimed in the same Postgres transaction that creates the order, so two identical requests can never both create one. Retries get the original response back; the same key with a different body gets a `409`.

## The problem

Networks drop responses. A client sends an order, the server commits it, and the reply never arrives. The client cannot tell whether the order went through, so the only safe thing it can do is send it again. Without protection, that second request is a second order.

The standard answer is an idempotency key: the client attaches a unique key to the request, and the server promises that the same key always produces the same result.

## The bug that shaped the design

The first version did the obvious thing: `SELECT` the key, and if it is not there, `INSERT` it and create the order. That is correct for one request at a time and wrong for two.

Two parallel requests with the same key could both see "no key". The slower one then hit the primary-key violation and returned a `500`. With 16 workers, 7 of 20 rounds of 50 parallel requests produced a 500.

The fix is to stop checking and start claiming. The request inserts the key first, in the same transaction as the order, and lets the unique index decide who wins:

```
INSERT INTO idempotency_records (...) VALUES (...)
ON CONFLICT (idem_key) DO UPDATE ... WHERE created_at < now() - <ttl>   -- only expired keys
RETURNING idem_key
```

_Diagram: The second request waits on the unique index. When the first commits, the second gets zero rows back and reads the stored response instead._

If the first request rolls back instead, the second one's insert succeeds and it creates the order. There is no window in which both can create one.

## Other decisions

- **Keys expire after 24 hours**, long enough to cover client retries. The claim query takes over an expired key at request time, so expiry is exact even if cleanup has not run.
- **Cleanup takes an advisory lock**, so only one ECS task purges expired keys per cycle. Orders and ledger rows are never deleted.
- **The rate limiter lives in Redis.** With in-memory counters, two tasks each allowed the limit, doubling it. If Redis is unreachable the limiter fails open instead of taking the API down.
- **The client IP is the last entry of `X-Forwarded-For`**, the one the load balancer appends. Earlier entries are client-controlled and are ignored.

## Making it fast

The first version opened a database connection per request, and the async handlers called the blocking driver directly, so requests effectively ran one at a time. Moving the blocking calls to a threadpool and adding a connection pool changed that:

| 50 virtual users, no think time | Before | Threadpool only | Threadpool + pool |
|---|---|---|---|
| Requests per second | 303 | 544 | 3,558 |
| p95 latency | 191 ms | 149 ms | 22 ms |
| p99 latency | 260 ms | 184 ms | 33 ms |

> Note: These numbers were measured with k6 on a laptop (Apple M4) with the API, Postgres and k6 on the same machine. Read them as a before and after comparison, not as production capacity: against RDS every query adds a network round trip.

One detail cost real time to find: psycopg2's pool closes any returned connection above its minimum size. With the usual minimum of 1, a burst of traffic reconnected on nearly every request while holding the pool's lock, which was slower than having no pool at all. The minimum now defaults to the maximum.

## Deployment

_Diagram: Provisioned with Terraform, deployed by GitHub Actions._

The schema migration runs on every container start. It is idempotent and takes an advisory lock, so several tasks booting at once are safe. The suite has 41 tests and CI runs on every push.
