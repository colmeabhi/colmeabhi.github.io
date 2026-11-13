# One click, one order

> How I built an order API that survives retries, and the bug in my first version that taught me the difference between checking and claiming.

Case study by Abhishek Ahirrao (https://colmeabhi.github.io). Code: https://github.com/colmeabhi/idempotent-order-cloud-api

- **What:** Personal project
- **State:** Deployed on AWS. Load tested on my laptop
- **Built with:** Python, FastAPI, PostgreSQL, Redis, ECS Fargate, RDS, Terraform, k6

**In short:** Every order request carries an `Idempotency-Key`. The key is claimed in the same database transaction that creates the order, so two identical requests can never both create one. A retry gets the original answer back.

## The problem everyone has met

You press Pay. The spinner spins. Nothing happens. You press Pay again. Did you just buy two?

From the server's side it is the same story. The client sends an order, the server saves it, and the reply gets lost on the way back. The client has no way to tell if the order went through, so the only sensible thing it can do is send it again. Without protection, that second request is a second order.

The usual answer is an idempotency key. The client sticks a unique key on the request, and the server promises that the same key always gives the same result. Try it:

## My first version was wrong

I did the obvious thing. Look the key up. If it is not there, insert it and create the order. That works perfectly when requests arrive one at a time, which is exactly how they arrive when you test by hand.

Two requests with the same key at the same moment is a different story. Both look, both see nothing, both try to insert. One wins. The other crashes into the primary key and returns a 500. When I ran 50 parallel requests across 16 workers, 7 rounds out of 20 produced one.

The fix was to stop asking permission. Instead of checking and then inserting, the request just tries to claim the key, inside the same transaction as the order, and lets the database decide who got there first:

```
INSERT INTO idempotency_records (...) VALUES (...)
ON CONFLICT (idem_key) DO UPDATE ... WHERE created_at < now() - <ttl>
RETURNING idem_key
```

_Diagram: Request B waits on the unique index. When A commits, B gets zero rows back and reads A's stored answer instead._

If you get a row back, the key is yours and you create the order. If you get nothing, someone else owns it and you return their answer. And if the first request rolls back, the second one's insert goes through and it creates the order. There is no moment where both can.

## Smaller decisions

Keys expire after 24 hours, which is plenty for retries. The claim query takes over an expired key on the spot, so expiry is exact even if the cleanup job has not run.

Cleanup takes a database lock so only one server does it per cycle. It deletes old keys and nothing else. Orders and ledger rows stay forever.

The rate limiter keeps its counts in Redis. My first one kept them in memory, which meant two servers each allowed the full limit. A limit of 10 that is really 20 is not much of a limit. If Redis goes down, the limiter lets requests through. I would rather be too generous than be down.

For the client's IP, I take the last entry of `X-Forwarded-For`, the one the load balancer adds. Everything before that is whatever the client felt like typing.

## Then I made it fast

The first version opened a new database connection for every request, and the async handlers called a blocking driver directly. In practice, requests were queuing up and going one at a time. Moving the database calls to a threadpool and adding a connection pool changed things quite a bit:

| 50 users, no pauses | Before | Threadpool only | Threadpool and pool |
|---|---|---|---|
| Requests per second | 303 | 544 | 3,558 |
| p95 latency | 191 ms | 149 ms | 22 ms |
| p99 latency | 260 ms | 184 ms | 33 ms |

> Note: I measured this with k6 on my laptop (an Apple M4), with the API, Postgres and k6 all on the same machine. It is a fair before and after. It is not what you would get in production, where every query also crosses a network.

The pool had one surprise in it. psycopg2's pool closes any connection handed back above its minimum size. With the default minimum of 1, a burst of traffic ended up reconnecting on almost every request, while holding the pool's lock. It was slower than having no pool at all, about 90 requests a second against 180. Setting the minimum equal to the maximum fixed it.

## Where it runs

_Diagram: All of it is Terraform, deployed by GitHub Actions._

The database migration runs every time a container starts. It is safe to run twice, and it takes a lock, so several containers booting at once do not trip over each other. There are 41 tests, and CI runs them on every push.
