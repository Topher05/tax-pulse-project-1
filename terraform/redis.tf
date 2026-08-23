resource "aws_elasticache_subnet_group" "redis" {
  name       = "taxpulse-${var.environment}-redis-subnet-group"
  subnet_ids = values(aws_subnet.private)[*].id

  tags = {
    Name        = "taxpulse-${var.environment}-redis-subnet-group"
    Environment = var.environment
  }
}

resource "aws_security_group" "redis" {
  name        = "taxpulse-${var.environment}-redis-sg"
  description = "Allow inbound Redis traffic from ECS services"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "Redis access from ECS service compute"
    from_port       = 6379
    to_port         = 6379
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
    Name        = "taxpulse-${var.environment}-redis-sg"
    Environment = var.environment
  }
}

resource "aws_elasticache_replication_group" "redis" {
  replication_group_id       = "taxpulse-${var.environment}-redis"
  description                = "ElastiCache Redis for TaxPulse"
  engine                     = "redis"
  engine_version             = "7.1"
  node_type                  = "cache.t4g.micro"
  port                       = 6379
  parameter_group_name       = "default.redis7"
  subnet_group_name          = aws_elasticache_subnet_group.redis.name
  security_group_ids         = [aws_security_group.redis.id]
  automatic_failover_enabled = true
  multi_az_enabled           = true
  num_cache_clusters         = 2
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true

  tags = {
    Name        = "taxpulse-${var.environment}-redis"
    Environment = var.environment
  }
}
