# ECS Services Module

Creates the SCRUM-157 and SCRUM-158 runtime resources:

- ECR repositories and lifecycle policies for both service images.
- ECS task execution role and service task roles.
- CloudWatch log groups.
- ECS cluster, task definitions, and Fargate services.
- Internet-facing ALB, target groups, HTTP listener, and path rules.
- ALB-only service security group ingress on ports `3000` and `8000`.

Required inputs are the SCRUM-162 VPC/subnets, immutable image tags, shared
Secrets Manager ARN, Redis URL, and SNS/SQS event endpoints.
