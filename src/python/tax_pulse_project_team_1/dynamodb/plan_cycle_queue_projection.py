"""DynamoDB table definition for the Plan Cycle Queue projection."""

from __future__ import annotations

import os
from datetime import date
from typing import Final, Literal, Protocol, cast

import boto3
from pydantic import BaseModel, ConfigDict, Field

DEFAULT_AWS_REGION: Final[str] = "us-east-1"
DEFAULT_LOCALSTACK_ACCESS_KEY_ID: Final[str] = "test"
DEFAULT_LOCALSTACK_SECRET_ACCESS_KEY: Final[str] = "test"
DEFAULT_PLAN_CYCLE_QUEUE_PROJECTION_TABLE_NAME: Final[str] = "taxpulse_plan_cycle_queue_projection"
PLAN_CYCLE_QUEUE_PROJECTION_TENANT_KEY: Final[str] = "tenant_id"
PLAN_CYCLE_QUEUE_PROJECTION_CASE_KEY: Final[str] = "case_id"

TaxPlanCycleStage = Literal[
    "Intake",
    "Data Aggregation",
    "Modeling",
    "Review",
    "Client Approval",
    "Executed",
    "Archived",
]
TaxPlanCyclePriority = Literal["low", "medium", "high"]


class DynamoDbClient(Protocol):
    """Small boto3 DynamoDB client surface used by this module."""

    def create_table(self, **kwargs: object) -> dict[str, object]: ...

    def describe_table(self, **kwargs: object) -> dict[str, object]: ...

    def get_waiter(self, waiter_name: str) -> DynamoDbWaiter: ...

    def put_item(self, **kwargs: object) -> dict[str, object]: ...

    def query(self, **kwargs: object) -> dict[str, object]: ...


class DynamoDbWaiter(Protocol):
    """Small boto3 waiter surface used by this module."""

    def wait(self, **kwargs: object) -> None: ...


class PlanCycleQueueProjectionItem(BaseModel):
    """Denormalized DynamoDB item for a tenant-scoped Plan Cycle Queue row."""

    model_config = ConfigDict(populate_by_name=True)

    tenant_id: str = Field(min_length=1)
    case_id: str = Field(min_length=1)
    client: str = Field(min_length=1)
    stage: TaxPlanCycleStage
    owner: str = Field(min_length=1)
    priority: TaxPlanCyclePriority
    due_date: date
    is_overdue: bool

    def to_dynamodb_item(self) -> dict[str, object]:
        """Return a DynamoDB document item with JSON-compatible scalar values."""

        return self.model_dump(mode="json")


def create_dynamodb_client(
    *,
    endpoint_url: str | None = None,
    region_name: str | None = None,
    aws_access_key_id: str | None = None,
    aws_secret_access_key: str | None = None,
) -> DynamoDbClient:
    """Create a DynamoDB client for LocalStack now or real AWS later.

    When ``endpoint_url`` or ``TAXPULSE_DYNAMODB_ENDPOINT_URL`` is set, the client is
    pointed at that local emulator endpoint and uses fake default credentials. When no
    endpoint is configured, boto3's normal AWS credential provider chain is used.
    """

    resolved_endpoint_url = endpoint_url or os.getenv("TAXPULSE_DYNAMODB_ENDPOINT_URL")
    resolved_region_name = region_name or os.getenv("AWS_REGION") or DEFAULT_AWS_REGION
    client_options: dict[str, object] = {"region_name": resolved_region_name}

    if resolved_endpoint_url:
        client_options["endpoint_url"] = resolved_endpoint_url
        client_options["aws_access_key_id"] = (
            aws_access_key_id or os.getenv("AWS_ACCESS_KEY_ID") or DEFAULT_LOCALSTACK_ACCESS_KEY_ID
        )
        client_options["aws_secret_access_key"] = (
            aws_secret_access_key
            or os.getenv("AWS_SECRET_ACCESS_KEY")
            or DEFAULT_LOCALSTACK_SECRET_ACCESS_KEY
        )

    return cast(DynamoDbClient, boto3.client("dynamodb", **client_options))


def create_plan_cycle_queue_projection_table(
    dynamodb_client: DynamoDbClient,
    table_name: str = DEFAULT_PLAN_CYCLE_QUEUE_PROJECTION_TABLE_NAME,
) -> dict[str, object]:
    """Create the Plan Cycle Queue projection table."""

    return dynamodb_client.create_table(
        TableName=table_name,
        AttributeDefinitions=[
            {"AttributeName": PLAN_CYCLE_QUEUE_PROJECTION_TENANT_KEY, "AttributeType": "S"},
            {"AttributeName": PLAN_CYCLE_QUEUE_PROJECTION_CASE_KEY, "AttributeType": "S"},
        ],
        KeySchema=[
            {"AttributeName": PLAN_CYCLE_QUEUE_PROJECTION_TENANT_KEY, "KeyType": "HASH"},
            {"AttributeName": PLAN_CYCLE_QUEUE_PROJECTION_CASE_KEY, "KeyType": "RANGE"},
        ],
        BillingMode="PAY_PER_REQUEST",
    )


def wait_for_plan_cycle_queue_projection_table(
    dynamodb_client: DynamoDbClient,
    table_name: str = DEFAULT_PLAN_CYCLE_QUEUE_PROJECTION_TABLE_NAME,
) -> None:
    """Wait until the local DynamoDB table can be described as existing."""

    waiter = dynamodb_client.get_waiter("table_exists")
    waiter.wait(TableName=table_name)


def describe_plan_cycle_queue_projection_table(
    dynamodb_client: DynamoDbClient,
    table_name: str = DEFAULT_PLAN_CYCLE_QUEUE_PROJECTION_TABLE_NAME,
) -> dict[str, object]:
    """Describe the Plan Cycle Queue projection table."""

    return dynamodb_client.describe_table(TableName=table_name)
