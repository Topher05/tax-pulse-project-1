resource "aws_security_group" "ecs_service" {
  name        = "${local.resource_name_prefix}-ecs-service-sg"
  description = "Access control for the future ECS service compute layer"
  vpc_id      = aws_vpc.main.id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = [var.vpc_cidr]
  }

  egress {
    description = "HTTPS egress through the private-subnet NAT gateway for ECR, CloudWatch, Secrets Manager, and JWKS."
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "${local.resource_name_prefix}-ecs-service-sg"
    Environment = var.environment
  }
}

resource "aws_db_subnet_group" "db" {
  name       = "${local.resource_name_prefix}-db-subnet-group"
  subnet_ids = values(aws_subnet.private)[*].id

  tags = {
    Name        = "${local.resource_name_prefix}-db-subnet-group"
    Environment = var.environment
  }
}

resource "aws_security_group" "db" {
  name        = "${local.resource_name_prefix}-db-sg"
  description = "Allow inbound PostgreSQL traffic from ECS services"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "PostgreSQL access from ECS service compute"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_service.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = [var.vpc_cidr]
  }

  tags = {
    Name        = "${local.resource_name_prefix}-db-sg"
    Environment = var.environment
  }
}

resource "aws_db_instance" "postgres" {
  identifier                  = "${local.resource_name_prefix}-db"
  allocated_storage           = 20
  max_allocated_storage       = 100
  engine                      = "postgres"
  engine_version              = "18.4"
  instance_class              = "db.t4g.micro"
  db_name                     = var.db_name
  username                    = var.db_username
  password                    = var.db_password
  storage_encrypted           = true
  db_subnet_group_name        = aws_db_subnet_group.db.name
  vpc_security_group_ids      = [aws_security_group.db.id]
  backup_retention_period     = 0
  deletion_protection         = false
  skip_final_snapshot         = true
  publicly_accessible         = false
  auto_minor_version_upgrade  = true
  allow_major_version_upgrade = false

  tags = {
    Name        = "${local.resource_name_prefix}-postgres"
    Environment = var.environment
  }
}
