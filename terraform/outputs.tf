output "vpc_id" {
  description = "The ID of the VPC"
  value       = aws_vpc.main.id
}

output "public_subnet_ids" {
  description = "IDs of the public subnets"
  value       = [aws_subnet.public_1.id, aws_subnet.public_2.id]
}

output "private_subnet_ids" {
  description = "IDs of the private subnets"
  value       = [aws_subnet.private_1.id, aws_subnet.private_2.id]
}

output "postgres_endpoint" {
  description = "The database connection endpoint"
  value       = aws_db_instance.postgres.endpoint
}

output "redis_endpoint" {
  description = "The Redis replication group primary endpoint"
  value       = aws_elasticache_replication_group.redis.primary_endpoint_address
}

output "dynamodb_table_name" {
  description = "The name of the DynamoDB queue projection table"
  value       = aws_dynamodb_table.plan_cycle_queue_projection.name
}
