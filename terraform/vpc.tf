data "aws_availability_zones" "available" {
  state = "available"
}

locals {
  resource_name_prefix = "${var.name_prefix}-${var.environment}"
  # The existing dev foundation predates the environment suffix convention. Keep
  # its physical names stable while allowing isolated environments to be unique.
  uses_legacy_dev_names = var.name_prefix == "taxpulse" && var.environment == "dev"
  availability_zones    = slice(data.aws_availability_zones.available.names, 0, 3)

  public_subnet_configs = {
    public_a = {
      az_index = 0
      netnum   = 1
      suffix   = "a"
    }
    public_b = {
      az_index = 1
      netnum   = 2
      suffix   = "b"
    }
    public_c = {
      az_index = 2
      netnum   = 3
      suffix   = "c"
    }
  }

  private_subnet_configs = {
    private_a = {
      az_index = 0
      netnum   = 11
      suffix   = "a"
    }
    private_b = {
      az_index = 1
      netnum   = 12
      suffix   = "b"
    }
    private_c = {
      az_index = 2
      netnum   = 13
      suffix   = "c"
    }
  }
}

resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name        = "${local.resource_name_prefix}-vpc"
    Environment = var.environment
  }
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name        = "${local.resource_name_prefix}-igw"
    Environment = var.environment
  }
}

resource "aws_subnet" "public" {
  for_each = local.public_subnet_configs

  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, each.value.netnum)
  availability_zone = local.availability_zones[each.value.az_index]

  tags = {
    Name        = "${local.resource_name_prefix}-public-${each.value.suffix}"
    Environment = var.environment
  }
}

resource "aws_subnet" "private" {
  for_each = local.private_subnet_configs

  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, each.value.netnum)
  availability_zone = local.availability_zones[each.value.az_index]

  tags = {
    Name        = "${local.resource_name_prefix}-private-${each.value.suffix}"
    Environment = var.environment
  }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = {
    Name        = "${local.resource_name_prefix}-public-rt"
    Environment = var.environment
  }
}

resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name        = "${local.resource_name_prefix}-private-rt"
    Environment = var.environment
  }
}

resource "aws_route_table_association" "public" {
  for_each = aws_subnet.public

  subnet_id      = each.value.id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "private" {
  for_each = aws_subnet.private

  subnet_id      = each.value.id
  route_table_id = aws_route_table.private.id
}
