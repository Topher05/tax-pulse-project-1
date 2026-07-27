from __future__ import annotations

import os
from collections.abc import Iterator
from datetime import date
from typing import cast
from uuid import uuid4

import pytest
from pydantic import ValidationError
from tax_liability_engine import (
    PLAN_CYCLE_QUEUE_PROJECTION_CASE_KEY,
    PLAN_CYCLE_QUEUE_PROJECTION_TENANT_KEY,
    PlanCycleQueueProjectionItem,
    create_dynamodb_client,
    create_plan_cycle_queue_projection_table,
    describe_plan_cycle_queue_projection_table,
    wait_for_plan_cycle_queue_projection_table,
)
from tax_liability_engine.tax_plan_cycle_queue_projection import (
    TaxPlanCycleRecord,
    upsert_tax_plan_cycle_queue_projection,
)
from tax_liability_engine.dynamodb.plan_cycle_queue_projection import DynamoDbClient

try:
    from docker.errors import DockerException as DockerError  # type: ignore[assignment]
except ModuleNotFoundError:  # pragma: no cover - only used when Docker deps are absent

    class DockerError(Exception):
        pass


try:
    from testcontainers.localstack import LocalStackContainer
except ModuleNotFoundError:  # pragma: no cover - only used when LocalStack deps are absent
    LocalStackContainer = None
type DynamoDbAttributeValue = dict[str, str] | dict[str, bool]
type DynamoDbAttributeMap = dict[str, DynamoDbAttributeValue]

DEFAULT_LOCALSTACK_TEST_IMAGE = (
    "localstack/localstack:3.8.1"  # Pinned version in tests to circument api key req for cloud int
)


def _docker_engine_is_available() -> bool:
    try:
        import docker

        client = docker.from_env()
        client.ping()
    except Exception:
        return False

    return True


@pytest.fixture(scope="module")
def localstack_endpoint_url() -> Iterator[str]:
    if LocalStackContainer is None:
        pytest.skip("Docker-backed LocalStack dependencies are unavailable.")
    os.environ.setdefault("TESTCONTAINERS_RYUK_DISABLED", "true")
    localstack_image = os.getenv("TAXPULSE_LOCALSTACK_IMAGE", DEFAULT_LOCALSTACK_TEST_IMAGE)
    try:
        localstack_container = LocalStackContainer(image=localstack_image).with_services("dynamodb")
    except DockerError as error:
        pytest.skip(f"Docker is unavailable for LocalStack-backed tests: {error}")

    if localstack_auth_token := os.getenv("LOCALSTACK_AUTH_TOKEN"):
        localstack_container = localstack_container.with_env(
            "LOCALSTACK_AUTH_TOKEN", localstack_auth_token
        )

    with localstack_container as localstack:
        yield localstack.get_url()


@pytest.fixture
def dynamodb_client(localstack_endpoint_url: str) -> DynamoDbClient:
    return create_dynamodb_client(endpoint_url=localstack_endpoint_url)


def unique_table_name() -> str:
    return f"taxpulse_plan_cycle_queue_projection_{uuid4().hex}"


def to_dynamodb_attribute_map(
    item: PlanCycleQueueProjectionItem,
) -> DynamoDbAttributeMap:
    projection = item.to_dynamodb_item()

    return {
        "tenant_id": {"S": str(projection["tenant_id"])},
        "case_id": {"S": str(projection["case_id"])},
        "client": {"S": str(projection["client"])},
        "stage": {"S": str(projection["stage"])},
        "owner": {"S": str(projection["owner"])},
        "priority": {"S": str(projection["priority"])},
        "due_date": {"S": str(projection["due_date"])},
        "is_overdue": {"BOOL": bool(projection["is_overdue"])},
    }


def test_plan_cycle_queue_projection_item_accepts_required_fields() -> None:
    item = PlanCycleQueueProjectionItem(
        tenant_id="tenant-001",
        case_id="case-001",
        client="North Shore Family Office",
        stage="Review",
        owner="advisor-001",
        priority="high",
        due_date=date(2026, 7, 15),
        is_overdue=True,
    )

    assert item.to_dynamodb_item() == {
        "tenant_id": "tenant-001",
        "case_id": "case-001",
        "client": "North Shore Family Office",
        "stage": "Review",
        "owner": "advisor-001",
        "priority": "high",
        "due_date": "2026-07-15",
        "is_overdue": True,
    }


@pytest.mark.parametrize(
    "payload",
    [
        {
            "tenant_id": "tenant-001",
            "case_id": "case-001",
            "client": "North Shore Family Office",
            "stage": "Review",
            "owner": "advisor-001",
            "priority": "high",
            "due_date": "2026-07-15",
        },
        {
            "tenant_id": "tenant-001",
            "case_id": "case-001",
            "client": "North Shore Family Office",
            "stage": "Planning",
            "owner": "advisor-001",
            "priority": "high",
            "due_date": "2026-07-15",
            "is_overdue": True,
        },
        {
            "tenant_id": "tenant-001",
            "case_id": "case-001",
            "client": "North Shore Family Office",
            "stage": "Review",
            "owner": "advisor-001",
            "priority": "urgent",
            "due_date": "2026-07-15",
            "is_overdue": True,
        },
    ],
)
def test_plan_cycle_queue_projection_item_rejects_invalid_shapes(
    payload: dict[str, object],
) -> None:
    with pytest.raises(ValidationError):
        PlanCycleQueueProjectionItem.model_validate(payload)


def test_creates_plan_cycle_queue_projection_table_against_localstack(
    dynamodb_client: DynamoDbClient,
) -> None:
    table_name = unique_table_name()

    create_plan_cycle_queue_projection_table(dynamodb_client, table_name)
    wait_for_plan_cycle_queue_projection_table(dynamodb_client, table_name)

    description = describe_plan_cycle_queue_projection_table(dynamodb_client, table_name)
    table = cast(dict[str, object], description["Table"])
    billing_mode_summary = cast(dict[str, str], table["BillingModeSummary"])
    empty_query = dynamodb_client.query(
        TableName=table_name,
        KeyConditionExpression="tenant_id = :tenant_id",
        ExpressionAttributeValues={":tenant_id": {"S": "tenant-queue-001"}},
    )

    assert table["TableName"] == table_name
    assert table["KeySchema"] == [
        {"AttributeName": PLAN_CYCLE_QUEUE_PROJECTION_TENANT_KEY, "KeyType": "HASH"},
        {"AttributeName": PLAN_CYCLE_QUEUE_PROJECTION_CASE_KEY, "KeyType": "RANGE"},
    ]
    assert table["AttributeDefinitions"] == [
        {"AttributeName": PLAN_CYCLE_QUEUE_PROJECTION_TENANT_KEY, "AttributeType": "S"},
        {"AttributeName": PLAN_CYCLE_QUEUE_PROJECTION_CASE_KEY, "AttributeType": "S"},
    ]
    assert billing_mode_summary["BillingMode"] == "PAY_PER_REQUEST"
    assert empty_query["Items"] == []


def test_queries_projection_items_by_tenant_from_localstack(
    dynamodb_client: DynamoDbClient,
) -> None:
    table_name = unique_table_name()
    create_plan_cycle_queue_projection_table(dynamodb_client, table_name)
    wait_for_plan_cycle_queue_projection_table(dynamodb_client, table_name)

    tenant_record = TaxPlanCycleRecord(
        case_id="case-overdue-001",
        client_id="North Shore Family Office",
        stage="Review",
        owner="advisor-001",
        priority="high",
        due_date="2026-07-10",
        on_hold=False,
    )
    future_record = TaxPlanCycleRecord(
        case_id="case-future-001",
        client_id="Juniper Advisory Client",
        stage="Modeling",
        owner="advisor-002",
        priority="medium",
        due_date="2026-07-24",
        on_hold=False,
    )
    other_tenant_record = TaxPlanCycleRecord(
        case_id="case-other-001",
        client_id="Other Tenant Client",
        stage="Intake",
        owner="advisor-003",
        priority="low",
        due_date="2026-07-01",
        on_hold=False,
    )
    tenant_item = PlanCycleQueueProjectionItem(
        tenant_id="tenant-queue-001",
        case_id="case-overdue-001",
        client="North Shore Family Office",
        stage="Review",
        owner="advisor-001",
        priority="high",
        due_date=date(2026, 7, 10),
        is_overdue=True,
    )
    future_item = PlanCycleQueueProjectionItem(
        tenant_id="tenant-queue-001",
        case_id="case-future-001",
        client="Juniper Advisory Client",
        stage="Modeling",
        owner="advisor-002",
        priority="medium",
        due_date=date(2026, 7, 24),
        is_overdue=False,
    )
    other_tenant_item = PlanCycleQueueProjectionItem(
        tenant_id="tenant-queue-002",
        case_id="case-other-001",
        client="Other Tenant Client",
        stage="Intake",
        owner="advisor-003",
        priority="low",
        due_date=date(2026, 7, 1),
        is_overdue=True,
    )

    for tenant_id, source in [
        ("tenant-queue-001", tenant_record),
        ("tenant-queue-001", future_record),
        ("tenant-queue-002", other_tenant_record),
    ]:
        upsert_tax_plan_cycle_queue_projection(
            tenant_id,
            source,
            as_of=date(2026, 7, 22),
            dynamodb_client=dynamodb_client,
            table_name=table_name,
        )

    response = dynamodb_client.query(
        TableName=table_name,
        KeyConditionExpression="tenant_id = :tenant_id",
        ExpressionAttributeValues={":tenant_id": {"S": "tenant-queue-001"}},
    )

    items = cast(list[DynamoDbAttributeMap], response["Items"])
    returned_items = sorted(items, key=lambda row: cast(dict[str, str], row["case_id"])["S"])

    assert returned_items == [
        to_dynamodb_attribute_map(future_item),
        to_dynamodb_attribute_map(tenant_item),
    ]
