# ECS Services Module

Creates the SCRUM-157 and SCRUM-158 runtime resources:

- ECR repositories and lifecycle policies for both service images.
- ECS task execution role and service task roles.
- CloudWatch log groups.
- ECS cluster, task definitions, and Fargate services with pinned ADOT collector sidecars.
- Internet-facing ALB, target groups, HTTP listener, and path rules.
- ALB-only service security group ingress on ports `3000` and `8000`.

Required inputs are the SCRUM-162 VPC/subnets, immutable image tags, shared
Secrets Manager ARN, Redis URL, SNS/SQS event endpoints, and the sandbox
observability knobs for the collector image, log retention, and trace sampling.
