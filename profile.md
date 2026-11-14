# Abhishek Ahirrao

> Platform engineer with 3.5 years at Quantiphi building self-service infrastructure, AWS data platforms and on-call tooling, now an MS Computer Science student at San José State University (class of 2027) working on LLM serving infrastructure, distributed systems and GPU programming.

- **Role:** Platform & Software Engineer
- **Status:** Looking for full-time platform, infrastructure or backend roles, starting 2027.
- **Location:** San Jose, CA
- **Email:** ahirraoabhishek007@gmail.com
- **Website:** https://colmeabhi.github.io
- **Resume (PDF):** https://colmeabhi.github.io/assets/Abhishek_Ahirrao_Resume.pdf
- **GitHub:** https://github.com/colmeabhi
- **LinkedIn:** https://www.linkedin.com/in/abhishekahirrao/

_Goes by abhi (/uh-bhee/). Last updated 2026-11-14. Structured version: https://colmeabhi.github.io/resume.json_

## Experience

### SDE-Platform II, Quantiphi
_Jan 2024 to Jun 2025 · Mumbai_

- Built a self-service infrastructure platform adopted by 50 data engineers across 5 data platforms: a Python CLI and a Claude-on-Bedrock interface that turned plain-English requests into pre-approved Terraform and CloudFormation stacks, with approval gates and TTL teardown. Cut platform-team requests ~85% and dev spend ~18%.
- Architected the migration of an Informatica-on-EC2 ETL platform to Lambda and ECS Fargate services orchestrated by Step Functions, ingesting change data from 8+ sources across 5 countries into Redshift. Authored the design and cost model (projected 70% lower compute) and mentored 2 juniors.
- Split day-long full loads into restartable 2-hour batches, holding a T+1 freshness SLA on 95%+ of runs as volume doubled from 300 GB to 600 GB/day.
- Enforced policy-as-code guardrails on 120 CloudFormation and Terraform stacks across 3 accounts with Control Tower, SCPs and Lambda checks; non-compliant stacks rolled back automatically.
- On-call for 6 production services; consolidated 3 environments into one Grafana dashboard with symptom-based CloudWatch alerts, cutting MTTR from 3 hours to 10 minutes.
- Shipped a major release every 2 weeks via Jenkins with two-layer rollback: CloudFormation reverted failed stack updates, and failed post-deploy checks redeployed the last known-good template and image.
- Case study: https://colmeabhi.github.io/case-studies/self-service-infra.md

### SDE-Platform I, Quantiphi
_Jan 2022 to Dec 2023 · Mumbai_

- Authored CloudFormation and Terraform for 40 interdependent stacks per environment and built the platform network: segmented VPC subnets, NACLs, security groups and IAM isolation between team workloads.
- Built and operated 30 daily ETL Lambdas per environment with run-locking, health checks and control-table backups, deployed through Jenkins pipelines with Trivy scanning.
- Ran 5 types of disaster-recovery drill every 4 months; restored a failed production RDS instance in about an hour.

### Framework Engineer Intern, Quantiphi
_Jul 2021 to Dec 2021 · Remote_

- Broke a monolithic ETL into event-driven microservices on Lambda, Step Functions and SQS, and ran containerised ETL workloads on ECS.

## Projects

### driftfix (hackathon winner, then a team of three)

<https://github.com/colmeabhi/driftfix>

Someone fixes a production incident at 2 am by clicking around the AWS console, and nobody updates the template afterwards. On the next deploy CloudFormation quietly undoes the fix, and everyone gets to enjoy the same incident twice.

driftfix reads CloudTrail, works out what was changed by hand, asks an LLM on Bedrock to update the template, checks the result with cfn-lint and opens a pull request. It never touches infrastructure and never merges anything. A person still decides.

It started as Phantom, which won the AWS x Datadog GenAI hackathon. Three of us then rebuilt it properly as a multi-tenant service. I led that, and my part was the architecture, the Lambda pipeline, the cross-account IAM and the Terraform. In load tests ten stacks ran in parallel with zero errors. The slow part turned out to be the LLM, not us.

- Case study: https://colmeabhi.github.io/case-studies/driftfix.md
- See also: [hackathon prototype](https://github.com/krishmula/phantom)
- Stack: python, aws lambda, bedrock, dynamodb, terraform

### Cache-aware scale-in (M.S. project, in progress)

<https://github.com/colmeabhi/cache-aware-scale-in>

When an LLM deployment scales down, Kubernetes has to pick a replica to delete, and it more or less picks the newest one. It has no idea that pod might be the one holding the cache everybody is using.

I wrote a small controller that scores each replica's cache and tells Kubernetes which one is cheapest to lose.

I have run the benchmark on three A100s. The controller removed the pod it was meant to, and it made no difference, because my test traffic warmed every replica's cache to about 95%. The fix is a harsher test and a better score, and that is what I am working on now.

- Case study: https://colmeabhi.github.io/case-studies/cache-aware-scale-in.md
- Stack: python, kubernetes, vllm, llm-d, prometheus

### Parallel N-body simulation

<https://github.com/colmeabhi/parallelized-nbody-simulation-cuda-cpp>

A small galaxy, with a black hole, a disk of stars and a bulge, where every star pulls on every other star. I wrote it four ways: one CPU thread, OpenMP, a plain CUDA kernel, and a tiled one where each block shares positions through shared memory.

With 65,536 stars on an A100, the tiled kernel takes 8 ms per step and one CPU thread takes 1.5 seconds, so about 190 times faster. At 1,024 stars the GPU barely helps, because starting a kernel costs about as much as the work.

Along the way I found a data race in my own GPU kernel. Some stars felt forces from the past and some from the future, which is not how gravity works. Splitting each step into separate kernels fixed it.

Nsight Compute showed why tiling wins: at 16K stars it cuts reads from global memory by 16 times. And the leapfrog step keeps energy about ten times better than plain Euler, for the same cost.

The galaxy below starts from the same setup and uses the same leapfrog step, in plain JavaScript and with fewer stars.

- Stack: c++, cuda, openmp, nsight compute, modal

### AI sprint planning assistant (1st of about 50 teams)

A hackathon project. You hand it a planning spreadsheet and it creates the Jira tickets, using a RAG pipeline to work out what goes where. Nobody enjoys copying rows into Jira.

It took first place out of about 50 teams at the Composio x Redis hackathon. There is no public repo for it yet.

- Stack: python, langchain, openai, redis, composio

### SDN load balancer

<https://github.com/colmeabhi/sdn-load-balance>

An OpenFlow controller that spreads HTTP traffic across four servers. The controller picks a server for each new connection and writes the rule into the switch, so after the first packet the switch does the work on its own.

It has five algorithms you can swap, and I benchmarked all five with Locust. The demo below runs on its own and cycles through them. Click one to stay on it.

- Stack: python, ryu, openflow, mininet, locust

### Duplicate-safe order ledger

<https://github.com/colmeabhi/idempotent-order-cloud-api>

If a client times out and sends the order again, you do not want to charge them twice. This API takes an idempotency key and guarantees exactly one order, however many times you hit send.

My first version looked correct and was not. Under parallel retries, 7 out of 20 test rounds returned a 500. The fix was a single INSERT ... ON CONFLICT, which is a lot less code than the bug was.

It runs on ECS Fargate with Postgres on RDS, all in Terraform. Go ahead and hammer the button.

- Case study: https://colmeabhi.github.io/case-studies/idempotent-order-api.md
- Stack: python, fastapi, postgresql, ecs fargate, rds, k6

### GPU matrix multiplication

<https://github.com/rahuldadlani/cuda-gpu-matrix-multiplication>

CUDA kernels that run about 60 times faster than the plain CPU version. Team project.

- Stack: c++, cuda

### California fishing compliance

<https://github.com/colmeabhi/regulated-fish-classification-california-datasetcreator-modeltraining>

Scrapes a dataset and trains a model to tell regulated fish species apart. 91% accuracy.

- Stack: python, pytorch, opencv

### ResuMatch

<https://github.com/7shantanu7/Weave-Hackathon>

An agent that rewrites a resume against feedback from a judge LLM. Built at WeaveHacks 2.0 with a team.

- Stack: python, agents, llm

## Education

### MS Computer Science, San José State University
_2025 to 2027_

- GPA 3.71/4.0 · Student Assistant, CFETI · expected 2027.
- Coursework: Cloud Computing, Computer Communication Systems, Advanced Parallel Processing, Design and Analysis of Algorithms, Machine Learning.

### BE Computer Engineering, University of Mumbai
_2017 to 2021_

- GPA 8.4/10 · Fr. Conceicao Rodrigues College of Engineering.
- Coursework: Operating Systems, Computer Networks, Distributed Computing, Database Management Systems.

## Skills

- **Every day:** AWS, Terraform, CloudFormation, Python, SQL, Bash, Docker, Jenkins, Grafana, Prometheus, Loki
- **Comfortable with:** Kubernetes, PostgreSQL, Redshift, Snowflake, DynamoDB, GitHub Actions, Vault, Trivy, C++ and CUDA, Amazon Bedrock
- **Learning now:** Go, vLLM and LLM serving, llm-d

## Certifications

- AWS Solutions Architect Associate (AWS)
- AWS Developer Associate (AWS)
- HashiCorp Terraform Associate (HashiCorp)

## Awards

- Winner, AWS × Datadog GenAI Hackathon (2025)
- 1st place of ~50 teams, Composio × Redis Hackathon (2025)

## Contact

Email ahirraoabhishek007@gmail.com. It is the fastest way to reach him. LinkedIn also works. To book a call: https://calendar.app.google/A6wakCeegtYd2SFs9
