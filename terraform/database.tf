resource "aws_security_group" "ecs_tasks" {
  name        = "taxpulse-${var.environment}-ecs-tasks-sg"
  description = "Access control for future ECS tasks compute layer"
  vpc_id      = aws_vpc.main.id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = [var.vpc_cidr]
  }

  tags = {
    Name        = "taxpulse-${var.environment}-ecs-tasks-sg"
    Environment = var.environment
  }
}

resource "aws_db_subnet_group" "db_subnet_group" {
  name       = "taxpulse-${var.environment}-db-subnet-group"
  subnet_ids = [aws_subnet.private_1.id, aws_subnet.private_2.id]

  tags = {
    Name        = "taxpulse-${var.environment}-db-subnet-group"
    Environment = var.environment
  }
}

resource "aws_security_group" "db" {
  name        = "taxpulse-${var.environment}-db-sg"
  description = "Allow inbound PostgreSQL traffic from ECS tasks"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "PostgreSQL access from ECS compute layer"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_tasks.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = [var.vpc_cidr]
  }

  tags = {
    Name        = "taxpulse-${var.environment}-db-sg"
    Environment = var.environment
  }
}

resource "aws_db_instance" "postgres" {
  identifier             = "taxpulse-${var.environment}-db"
  allocated_storage      = 20
  max_allocated_storage  = 100
  engine                 = "postgres"
  engine_version         = "18.0" # Match the Postgres 18 docker-compose configuration
  instance_class         = "db.t4g.micro"
  db_name                = var.db_name
  username               = var.db_username
  password               = var.db_password
  storage_encrypted      = true
  db_subnet_group_name   = aws_db_subnet_group.db_subnet_group.name
  vpc_security_group_ids = [aws_security_group.db.id]
  skip_final_snapshot    = true

  tags = {
    Name        = "taxpulse-${var.environment}-postgres"
    Environment = var.environment
  }
}
