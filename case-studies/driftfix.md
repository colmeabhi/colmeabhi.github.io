# The 2 am fix that CloudFormation undoes

> Someone changes production by hand, and the template in Git quietly stops telling the truth. driftfix notices, has an LLM write the template change, and opens a pull request for a person to decide on. It started as a hackathon win and became a three-person rebuild that I led.

Case study by Abhishek Ahirrao (https://colmeabhi.github.io). Code: https://github.com/colmeabhi/driftfix

- **What:** Won the AWS x Datadog GenAI hackathon as Phantom, then rebuilt as a multi-tenant service by a team of three
- **State:** Deployed on AWS and load tested with 10 stacks. Not ready for real customers yet, for reasons listed at the end
- **Built with:** Python, AWS Lambda, Amazon Bedrock, CloudTrail, DynamoDB, EventBridge, SQS, CloudWatch, Terraform, React, FastAPI

**In short:** Once a day, four Lambdas read each customer's CloudTrail logs, find write calls that did not come from CloudFormation, ask Bedrock to update the template, check the result with cfn-lint and open a pull request. driftfix can read the customer's account and nothing else, and a person merges or closes every fix.

## The fix that gets undone

Infrastructure as Code rests on one promise: the template in Git describes what is running. That promise lasts until the first incident.

It is late, production is slow, and an engineer opens the AWS console and bumps an instance from `t3.large` to `t3.xlarge`. The incident ends. Everyone goes to bed. Nobody updates the template.

Nothing goes wrong for a while. Then someone deploys an unrelated change, CloudFormation reads the template, sees `t3.large`, and helpfully resizes the instance back down. Same incident, second time, and now nobody remembers why.

AWS can tell you that a stack has drifted. It will not write the fix. Someone still has to find what changed, find the right file, and open a pull request. That is the boring part I wanted to automate.

## How a change becomes a pull request

_Diagram: One manual change, followed from the console to a pull request. The dashed arrow is the retry when cfn-lint rejects the model's output._

The Orchestrator runs every morning at 07:00 UTC. For each customer it reads the last 72 hours of CloudTrail logs and keeps only successful write calls that CloudFormation did not make itself, so a normal deploy is not mistaken for drift. It reads the `aws:cloudformation:stack-name` tag on each changed resource to find which stack owns it.

Then it starts one Stack Processor per drifted stack, so ten drifted stacks means ten Lambdas running side by side. Each one sends the template, the parameter files next to it and the CloudTrail events to Bedrock, and gets back the changed files plus a summary, a root cause and a confidence score. The Validator checks them and the PR Creator opens the pull request.

## Decisions I would defend

My part of the rebuild was the architecture, the Lambda pipeline, the cross-account IAM and the Terraform. These are the choices that shaped it.

- **Read-only, one hour at a time.** Each run assumes a read-only role in the customer's account and gets credentials that last one hour. The role only works with a secret `ExternalId` made at sign-up, so one customer cannot point driftfix at someone else's account.
- **Send the parameter files too.** If the template says `InstanceType: !Ref Size` and `prod.json` sets `Size`, the right fix is one line in `prod.json`. A model that only sees the template would hardcode `t3.xlarge` into it and quietly change every other environment as well.
- **Expect the model to be wrong sometimes.** When cfn-lint finds errors, they go back to the model with its previous answer, up to three times. Only errors block a template. Warnings are ignored, because most hand-written templates already have some.
- **Let the model say it is unsure.** Below 0.6 confidence, or when the model asks for a review itself, the pull request gets `needs review` in its title and a warning banner.
- **Never lose or repeat an event.** DynamoDB keeps one record per CloudTrail event: `queued`, `pr_opened`, `no_change` or `failed`. Failed events are retried on later runs, which is why it reads 72 hours of logs while running every 24. Branch names are built from the event ID, so a retried Lambda finds its own branch instead of opening a second pull request.

## Did it hold up?

We created real drift in a test account with 10 CloudFormation stacks, by calling APIs like `PutBucketEncryption` and `ModifyDBInstance` directly, and then started the Orchestrator by hand.

| Scenario | Drifted stacks | Bedrock median | Bedrock slowest 1% | Errors |
|---|---|---|---|---|
| Functional | 1 | 1.7 s | 1.7 s | 0 |
| Scaling | 3 | 4.6 s | 7.4 s | 0 |
| Security | 6 | 4.3 s | 9.7 s | 0 |
| Performance | 10 | 5.1 s | 13.3 s | 0 |
| Failure isolation | 10, plus 1 broken tenant | 5.3 s | 14.9 s | 0 |

> Note: One run per scenario, on 2026-05-04, against one AWS account. The single-stack run had one Bedrock call, so its median and slowest 1% are the same call.

Lambda did exactly what it says on the box: concurrency went up one for one with the number of drifted stacks, with no throttles. The slow part was the LLM. The median call stayed around 5 seconds, but the slowest calls grew to almost 15 seconds once ten stacks asked Bedrock at the same time.

The tenant with a broken IAM role was logged and skipped, and the other ten stacks finished normally. A search of every Lambda log group for `AKIA`, `ghp_`, `password` and friends found nothing. We also broke it on purpose three ways, with an invalid template, a throttle and a starved Lambda, and each one set off the alarm it should have.

## What is still wrong with it

- The sign-up portal has no login. Anyone who can reach it can add or remove customers. That has to be fixed before it faces the internet.
- All customers share one 15-minute Orchestrator run, one after another. That caps how many customers a run can serve.
- If the template is not in the customer's repository, driftfix falls back to the copy CloudFormation keeps and proposes it as `template.yaml` in the root, which may be the wrong place.
- It only fixes CloudFormation, not Terraform.
- The unit tests are run by hand. There is no CI yet.

## Who did what

This was a team of three. Kunal Elchipuram built the sign-up portal, deployed it on App Runner, ran the load tests and tuned the Bedrock integration. Ethan Machado built the dashboards, the alarms, the health checks and the failure scenarios. I designed the system and built the pipeline, the IAM and the Terraform.
