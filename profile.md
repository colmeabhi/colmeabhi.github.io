# Abhishek Ahirrao

> Platform engineer with four years at Quantiphi building AWS data platforms and deployment tooling for Fortune 100 clients, now an MS Computer Science student at San José State University working on LLM inference infrastructure, distributed systems and GPU programming.

- **Role:** Platform & Software Engineer
- **Status:** Open to full-time platform, infrastructure and backend roles · MS CS, May 2027
- **Location:** San Francisco Bay Area, CA
- **Email:** ahirraoabhishek007@gmail.com
- **Website:** https://colmeabhi.github.io
- **Resume (PDF):** https://drive.google.com/file/d/1fVO2sZfs7FwYCimgi0GuCOgj1vS1Y6dJ/view
- **GitHub:** https://github.com/colmeabhi
- **LinkedIn:** https://www.linkedin.com/in/abhishekahirrao/
- **Devpost:** https://devpost.com/colmeabhi
- **Instagram:** https://instagram.com/colmeabhi

_Goes by abhi (/uh-bhee/). Last updated 2026-11-10. Structured version: https://colmeabhi.github.io/resume.json_

## At a glance

- **4 yrs** — platform engineering at Quantiphi
- **~$90K** — annual AWS spend saved (17%)
- **500GB+** — processed daily on client data platforms
- **3×** — certified: AWS SAA, AWS Developer, Terraform

## Experience

### Senior Platform Engineer — Quantiphi
_jul 2021 – jul 2025 · Mumbai_

Progression: Framework Engineer Intern → Platform Engineer → Senior Platform Engineer

- Engineered data platforms processing 500GB+ daily for Fortune 100 clients in retail and healthcare, delivering sub-second query performance on Snowflake and Redshift.
- Saved 17% of annual AWS spend (~$90K) through rightsizing, Savings Plans and cost-allocation tagging.
- Built deployment tooling in Python and Bash — CLIs and REST APIs that hid infrastructure complexity from 20+ engineers.
- Automated IaC and CI/CD with Jenkins, CloudFormation and Vault across dev, staging and production, cutting deployment errors by 20%.
- Consolidated monitoring for 15+ services into one logging, metrics and alerting stack (Grafana, Loki, Prometheus).
- As an intern: broke a monolithic ETL into event-driven microservices on Lambda, Step Functions and SQS, and ran containerised ETL on ECS.

### Web Development Intern — Felis Leo Ventures
_jul 2020 – oct 2020 · Mumbai_

- Built a web-based video calling application with real-time communication.

### Summer Research Intern — Bennett University
_may 2020 – jun 2020 · Noida_

- GPU-accelerated computing research; neural networks and ML algorithms for hyperspectral image classification.

## Projects

### Cache-aware scale-in for vLLM on Kubernetes (research · in progress)

<https://github.com/colmeabhi/cache-aware-scale-in>

A Kubernetes controller that scores each vLLM replica's KV-cache hit rate and writes it to the pod-deletion-cost annotation, so a scale-down removes the coldest replica instead of an arbitrary one — fewer warm caches thrown away, lower time to first token.

- Built as a six-stage ladder: laptop prototype with fake pods → kind/k3s mock cluster → Llama 3 8B on 3 A100 replicas with llm-d routing.
- Ships as an in-cluster image with RBAC, Prometheus/Loki/Grafana dashboards, and CI that runs the scale-in trial on kind for every push.
- Stack: python, kubernetes, vllm, k3s, prometheus, grafana

### Idempotent Order API

<https://github.com/colmeabhi/idempotent-order-cloud-api>

A retry-safe order service: the Idempotency-Key is claimed in the same Postgres transaction as the order, so concurrent duplicates get the same order back instead of a second order or a 500.

- Found and fixed a select-then-insert race that returned 500s under parallel retries; replaced with a single INSERT … ON CONFLICT claim.
- 11.7× throughput and 8.6× lower p95 at saturation after adding a threadpool and connection pool (3,558 req/s, p95 22 ms, k6 on one machine).
- Deployed ALB → ECS Fargate → RDS with Terraform and GitHub Actions; Redis rate limiter; 41 tests.
- Stack: python, fastapi, postgres, redis, terraform, ecs fargate

### IaC Drift Reconciliation SaaS (team project)

<https://github.com/Kunal23002/iac-drift-saas>

Multi-tenant pipeline that reads CloudTrail across AWS accounts, finds console changes that drifted from CloudFormation, has an LLM on Bedrock rewrite the template, validates it with cfn-lint and opens a GitHub pull request.

- Five Lambdas fanned out per stack, with DynamoDB de-duplication, an SQS dead-letter queue and CloudWatch health checks every five minutes.
- Self-service customer portal (FastAPI + React) on App Runner; SaaS and customer-side infrastructure in Terraform.
- Stack: aws lambda, bedrock, terraform, dynamodb, cloudtrail, fastapi

### Parallel N-body simulation

<https://github.com/colmeabhi/parallelized-nbody-simulation-cuda-cpp>

A galaxy simulation with five solvers compared like-for-like: SIMD serial, OpenMP, a Barnes–Hut octree, and naive versus shared-memory-tiled CUDA kernels.

- Removed a cross-block data race by splitting force and position updates across kernel launches.
- Switched to a kick-drift-kick leapfrog integrator and measured the Barnes–Hut crossover at N ≈ 12.7K bodies under OpenMP.
- Stack: c++, cuda, openmp, barnes–hut, nsight

### AI Sprint Planning Assistant (1st place · hackathon)

<https://devpost.com/colmeabhi>

Turns a planning spreadsheet into Jira work with a RAG pipeline and multi-tool orchestration. Won the “Agents with Superpowers: Context Engineering Hackathon” sponsored by Composio and Redis.

- Stack: python, langchain, openai, redis, composio

### SDN load balancer

<https://github.com/colmeabhi/sdn-load-balance>

A RYU (OpenFlow 1.3) controller that balances HTTP traffic to a virtual IP by installing rewrite rules straight into the switch, with five swappable algorithms.

- Automated Locust sweep across 5 algorithms × 5 load levels, with throughput and p95/p99 latency plots.
- Stack: python, ryu, openflow, mininet, locust

### Phantom (team project)

<https://github.com/krishmula/phantom>

Drift analysis for CloudFormation: combines CloudTrail and Datadog context and asks Claude on Bedrock whether a console change should be legitimised, reverted or refactored.

- Stack: aws, bedrock, datadog, cloudformation

### dualstack-chat

<https://github.com/colmeabhi/dualstack-chat>

Concurrent chat server exposing one in-memory state over a custom TCP protocol and a JSON/HTTP API; standard library only, cleans up after dead clients.

- Stack: python, sockets, threads

### ResuMatch (hackathon · team)

<https://github.com/7shantanu7/Weave-Hackathon>

Agent that refines a resume against feedback from a judge LLM and finds matching jobs. Built at WeaveHacks 2.0.

- Stack: python, agents, llm

### DevSecOps AI Agent (hackathon · team)

<https://github.com/Tejas-Chakkarwar/DevSecOps>

Watches a repository's commits, scans them for vulnerabilities, researches the fix and opens a pull request. Built at Daytona HackSprint.

- Stack: python, langgraph, bandit

### GPU matrix multiplication (team project)

<https://github.com/rahuldadlani/cuda-gpu-matrix-multiplication>

CUDA kernels reaching a 60× speedup over sequential CPU execution.

- Stack: c++, cuda

### MCP Wikipedia agent

<https://github.com/colmeabhi/mcp-wikipedia-research-agent>

MCP server and client for context-aware Wikipedia research with token optimisation and caching.

- Stack: python, mcp

### California fishing compliance

<https://github.com/colmeabhi/regulated-fish-classification-california-datasetcreator-modeltraining>

Dataset builder, training and evaluation for classifying regulated fish species; 91% accuracy.

- Stack: python, pytorch, opencv

### Text summarisation API

<https://github.com/colmeabhi/summarization-model>

Flask API with an NLTK text-processing pipeline, containerised with Docker; 82% ROUGE-1.

- Stack: python, flask, nltk, docker

### Database migration platform (at work)

Self-service Python CLI and REST API for Fivetran and Snowflake provisioning with RBAC and SSO/SCIM; Lambda-based monitoring with sub-minute incident detection.

- Stack: python, fivetran, snowflake

## Education

### MS, Computer Science — San José State University
_aug 2025 – may 2027_

- Coursework: Design & Analysis of Algorithms, Computer Communication, Cloud Computing, Parallel Programming, Machine Learning.
- Research project (CS 297): cache-aware scale-in for LLM inference on Kubernetes.

### BE, Computer Engineering — Fr. Conceicao Rodrigues College of Engineering, Mumbai University
_aug 2017 – jun 2021_

- Grade 8.4/10. Mozilla Campus Club logistics in-charge, Training and Placement coordinator, college basketball team.

## Skills

- **cloud & infra:** AWS (Lambda, API Gateway, Step Functions, S3, EC2, ECS, EKS, RDS, DMS, VPC, SQS, SNS), Terraform, CloudFormation
- **containers:** Docker, Kubernetes, ECS (Fargate), Helm, k3s
- **languages:** Python, C++, SQL, Bash, CUDA, Go (learning)
- **backend:** FastAPI, Flask, REST APIs, PostgreSQL, Redis, Message queues (SQS, SNS)
- **data platforms:** Snowflake, Redshift, SQL Server, Fivetran, AWS DMS
- **observability:** Prometheus, Alertmanager, Grafana, Loki, CloudWatch, SLOs/MTTD/MTTR
- **ai / ml:** vLLM, PyTorch, LangChain, Amazon Bedrock, OpenAI, MCP, OpenCV, NLTK
- **ci / cd:** GitHub Actions, Jenkins, Ansible, Git, Linux
- **security:** IAM, KMS, WAF, Vault / Secrets Manager, SOC 2, GDPR compliance

## Certifications

- AWS Solutions Architect Associate (AWS)
- AWS Developer Associate (AWS)
- HashiCorp Terraform Associate (HashiCorp)

## Awards

- 1st place, “Agents with Superpowers” Context Engineering Hackathon (Composio & Redis)
- All India Rank 223, Technothlon

## Contact

Email ahirraoabhishek007@gmail.com — the fastest way to reach him. LinkedIn also works.
