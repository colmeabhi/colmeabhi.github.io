# An LLM that could only fill in the blanks

> How about fifty data engineers got their own test infrastructure in minutes instead of a day, and why the LLM in the middle was never allowed to write any of it.

Case study by Abhishek Ahirrao (https://colmeabhi.github.io).

- **What:** Work at Quantiphi, as SDE-Platform II
- **State:** Used by about 50 data engineers across 5 data platforms. The code belongs to the company, so there is no repo to show
- **Built with:** Python, Claude on Amazon Bedrock, Terraform, CloudFormation, AWS SCPs

**In short:** Engineers asked for infrastructure in plain English or through a CLI. The LLM picked one of our pre-approved templates and filled in its variables, and that is all it did. A plan showed exactly what would be created before anything was, expensive things needed a human yes, and everything deleted itself when its time ran out.

## The ticket queue

Say a data engineer wanted to try out a new pipeline. They needed a bucket, a queue and a small database for a week. To get them, they filed a ticket with the platform team, which was us.

Five or six teams each sent about three of those a day, so we got fifteen or more tickets a day, and most of them were the same few templates with different names. Engineers waited a day or more for something that took minutes to create. We spent a lot of our day copying and pasting. Nobody was doing anything wrong. That was just the shape of the process, and it was a bad shape.

## The tempting version

The obvious idea in 2024 was to let people describe what they want and have a model write the Terraform. It demos beautifully.

The problem is the day it writes something that looks right and is not: a bucket open to the internet, an instance size with too many zeros, an IAM policy with a star in it. It will say so with total confidence, and someone will approve it because it looks like every other plan they have approved. I did not want to be the one explaining that bill.

## Fill in the blanks

We already had Terraform and CloudFormation templates the platform team had reviewed, with tagging and narrow IAM roles built in. So the model got exactly one job. It read the request, picked a template, and filled in the template's variables. It never wrote a line of infrastructure.

A request like "I need a small Postgres database and a bucket for a test, for about a week" became something like this:

```
template:  postgres-small-with-bucket
team:      analytics
env:       dev
size:      small
ttl_days:  7
```

> Note: This is an illustration of the shape, not a real template or team.

From there the request went through the same steps every time:

_Diagram: The model only touches the second box. Everything after it is ordinary, boring and reviewed._

- **Validate the variables.** Unknown template, missing tag, size that does not exist: rejected before anything runs.
- **Show a plan.** `terraform plan` or a CloudFormation change set lists exactly what will be created. Nothing is applied before that.
- **Ask a human for the expensive stuff.** Costly tiers stop and wait for an email approval from the platform team.
- **Stay in dev.** The worst case is a messy dev account, not an outage.
- **Expire.** Every stack has a time to live and tears itself down when it runs out.
- **Keep the account rules underneath.** Service control policies still apply, so even if every step above failed, some things simply cannot be created.

There was also a plain Python CLI that did the same thing without the chat, for people who knew exactly what they wanted and would rather type flags than sentences.

## Did anyone use it?

Not at first. There was friction early on, so we adjusted the process, teams learned it, and it spread to all five data platforms.

After that, the platform team went from fifteen or more tickets a day to two or three approvals. Getting test infrastructure went from more than a day to a few minutes.

Over a hundred stacks a day sounds alarming until you look at them: small proof-of-concept stacks of seven or eight resources, two or three per engineer, most of them gone within days. The time limit is what made that fine. Dev-account spend went down by about 18%, mostly because forgotten test resources stopped living forever. A usage and cost dashboard showed each team what it was running.

> Note: These numbers are approximate. They come from counting requests and dev-account spend before and after the tool was adopted.

## What I would tell myself

The LLM was the least important part. The templates, the plans and the time limits did the safety work. The model just made it nicer to ask.

Saying no to the model writing code made it easier to say yes to everything else. Security review is a much shorter meeting when the answer to "what can it create?" is "only these templates".

Make deletion the default. Nobody cleans up test resources on their own.
