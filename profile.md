# Abhishek Ahirrao

> Platform engineer with 3.5 years at Quantiphi building self-service infrastructure, AWS data platforms and on-call tooling, now an MS Computer Science student at San José State University (class of 2027) working on LLM serving infrastructure, distributed systems and GPU programming.

- **Role:** Platform & Software Engineer
- **Status:** Open to full-time platform, infrastructure and backend roles · MS CS, 2027
- **Location:** San Jose, CA
- **Email:** abhishekahirrao09@gmail.com
- **Website:** https://colmeabhi.github.io
- **Resume (PDF):** https://drive.google.com/file/d/1fVO2sZfs7FwYCimgi0GuCOgj1vS1Y6dJ/view
- **GitHub:** https://github.com/colmeabhi
- **LinkedIn:** https://www.linkedin.com/in/abhishekahirrao/
- **Devpost:** https://devpost.com/colmeabhi
- **Instagram:** https://instagram.com/colmeabhi

_Goes by abhi (/uh-bhee/). Last updated 2026-11-10. Structured version: https://colmeabhi.github.io/resume.json_

## Experience

### SDE-Platform II, Quantiphi
_jan 2024 – jun 2025 · Mumbai_

- Built a self-service infrastructure platform adopted by 50 data engineers across 5 data platforms: a Python CLI and a Claude-on-Bedrock interface that turned plain-English requests into pre-approved Terraform and CloudFormation stacks, with approval gates and TTL teardown. Cut platform-team requests ~85% and dev spend ~18%.
- Architected the migration of an Informatica-on-EC2 ETL platform to Lambda and ECS Fargate services orchestrated by Step Functions, ingesting change data from 8+ sources across 5 countries into Redshift. Authored the design and cost model (projected 70% lower compute) and mentored 2 juniors.
- Split day-long full loads into restartable 2-hour batches, holding a T+1 freshness SLA on 95%+ of runs as volume doubled from 300 GB to 600 GB/day.
- Enforced policy-as-code guardrails on 120 CloudFormation and Terraform stacks across 3 accounts with Control Tower, SCPs and Lambda checks; non-compliant stacks rolled back automatically.
- On-call for 6 production services; consolidated 3 environments into one Grafana dashboard with symptom-based CloudWatch alerts, cutting MTTR from 3 hours to 10 minutes.
- Shipped a major release every 2 weeks via Jenkins with two-layer rollback: CloudFormation reverted failed stack updates, and failed post-deploy checks redeployed the last known-good template and image.

### SDE-Platform I, Quantiphi
_jan 2022 – dec 2023 · Mumbai_

- Authored CloudFormation and Terraform for 40 interdependent stacks per environment and built the platform network: segmented VPC subnets, NACLs, security groups and IAM isolation between team workloads.
- Built and operated 30 daily ETL Lambdas per environment with run-locking, health checks and control-table backups, deployed through Jenkins pipelines with Trivy scanning.
- Ran 5 types of disaster-recovery drill every 4 months; restored a failed production RDS instance in about an hour.

### Framework Engineer Intern, Quantiphi
_jul 2021 – dec 2021 · Remote_

- Broke a monolithic ETL into event-driven microservices on Lambda, Step Functions and SQS, and ran containerised ETL workloads on ECS.

## Projects

### Phantom: IaC Drift Reconciliation SaaS (hackathon winner · led team of 3)

<https://github.com/Kunal23002/iac-drift-saas>

Finds AWS console changes that drifted from Terraform and CloudFormation, has an LLM on Bedrock write the fix, validates it with cfn-lint and opens a GitHub pull request. Started as the winning prototype at the AWS × Datadog GenAI Hackathon; I then led a 3-person rebuild into a multi-account SaaS.

- Reads each customer's CloudTrail through STS and fans out one Lambda per drifted stack, with DynamoDB de-duplication and a dead-letter queue.
- Load tests on 10 live stacks scaled 1:1 with zero errors and isolated Bedrock P99 latency as the bottleneck.
- See also: [hackathon prototype](https://github.com/krishmula/phantom)
- Stack: python, aws lambda, bedrock, dynamodb, terraform

### Cache-aware scale-in for vLLM on Kubernetes (M.S. project · in progress)

<https://github.com/colmeabhi/cache-aware-scale-in>

A Kubernetes controller that scores each vLLM replica's KV-cache value and sets pod-deletion-cost, so scale-in removes the coldest replica instead of an arbitrary one. Fewer warm caches get thrown away, which lowers time to first token.

- Benchmarking TTFT and cache hit rate on Llama 3 8B across 3 A100 replicas with llm-d routing.
- Ships as an in-cluster image with RBAC and Prometheus/Loki/Grafana dashboards; CI runs the scale-in trial on kind for every push.
- Stack: python, kubernetes, vllm, llm-d, prometheus

### Duplicate-Safe Order Ledger Service

<https://github.com/colmeabhi/idempotent-order-cloud-api>

An idempotent order API: same-key retries replay the stored response inside one Postgres transaction, so a client that retries never creates a second order.

- Deployed on ECS Fargate behind an ALB with RDS Postgres and SSM-stored secrets, via Terraform and GitHub Actions.
- k6 load tests sustained 250 req/s at 13 ms p95 with zero errors.
- Found and fixed a select-then-insert race that returned 500s under parallel retries.
- Stack: python, fastapi, postgresql, ecs fargate, rds, k6

### Parallel N-body simulation

<https://github.com/colmeabhi/parallelized-nbody-simulation-cuda-cpp>

A galaxy simulation with five solvers compared like-for-like: SIMD serial, OpenMP, a Barnes–Hut octree, and naive versus shared-memory-tiled CUDA kernels.

- Removed a cross-block data race by splitting force and position updates across kernel launches.
- Switched to a kick-drift-kick leapfrog integrator and measured the Barnes–Hut crossover at N ≈ 12.7K bodies under OpenMP.
- Stack: c++, cuda, openmp, barnes–hut, nsight

### AI Sprint Planning Assistant (1st of ~50 teams)

<https://devpost.com/colmeabhi>

Turns a planning spreadsheet into Jira work with a RAG pipeline and multi-tool orchestration. Took 1st place of ~50 teams at the Composio × Redis “Agents with Superpowers” hackathon.

- Stack: python, langchain, openai, redis, composio

### SDN load balancer

<https://github.com/colmeabhi/sdn-load-balance>

RYU (OpenFlow 1.3) controller that balances HTTP to a virtual IP with five swappable algorithms, benchmarked with an automated Locust sweep.

- Automated Locust sweep across 5 algorithms × 5 load levels, with throughput and p95/p99 latency plots.
- Stack: python, ryu, openflow, mininet, locust

### GPU matrix multiplication (team project)

<https://github.com/rahuldadlani/cuda-gpu-matrix-multiplication>

CUDA kernels reaching a 60× speedup over sequential CPU execution.

- Stack: c++, cuda

### California fishing compliance

<https://github.com/colmeabhi/regulated-fish-classification-california-datasetcreator-modeltraining>

Dataset builder, training and evaluation for classifying regulated fish species; 91% accuracy.

- Stack: python, pytorch, opencv

### ResuMatch (hackathon · team)

<https://github.com/7shantanu7/Weave-Hackathon>

Agent that refines a resume against feedback from a judge LLM and finds matching jobs. Built at WeaveHacks 2.0.

- Stack: python, agents, llm

## Education

### MS Computer Science, San José State University
_2025 – 2027_

- GPA 3.71/4.0 · Student Assistant, CFETI · expected 2027.
- Coursework: Design & Analysis of Algorithms, Computer Communication, Cloud Computing, Parallel Programming, Machine Learning.

### BE Computer Engineering, University of Mumbai
_2017 – 2021_

- GPA 8.4/10 · Fr. Conceicao Rodrigues College of Engineering.

## Skills

- **cloud:** AWS (Lambda, ECS Fargate, EC2, Step Functions, S3, VPC, IAM, RDS, Redshift, DMS, DynamoDB, Bedrock), GCP
- **infra & delivery:** Terraform, CloudFormation, Docker, Kubernetes, Jenkins, GitHub Actions, Vault, Trivy
- **observability:** CloudWatch, Prometheus, Grafana, Loki, SLOs, Incident response, Disaster recovery
- **languages:** Python, SQL, Bash, C++ / CUDA
- **data:** PostgreSQL, Redshift, Snowflake, DynamoDB
- **ai infra:** vLLM, llm-d, Amazon Bedrock, LangChain, MCP

## Certifications

- AWS Solutions Architect Associate (AWS)
- AWS Developer Associate (AWS)
- HashiCorp Terraform Associate (HashiCorp)

## Awards

- Winner, AWS × Datadog GenAI Hackathon (2025)
- 1st place of ~50 teams, Composio × Redis Hackathon (2025)

## Contact

Email abhishekahirrao09@gmail.com. It is the fastest way to reach him. LinkedIn also works.
