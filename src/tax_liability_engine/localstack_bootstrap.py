"""Bootstrap helpers for the local LocalStack Plan Cycle Queue workflow."""

from __future__ import annotations

import subprocess
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Final

from botocore.exceptions import BotoCoreError, ClientError

from .dynamodb.plan_cycle_queue_projection import (
    DEFAULT_PLAN_CYCLE_QUEUE_PROJECTION_TABLE_NAME,
    DynamoDbClient,
    create_dynamodb_client,
    create_plan_cycle_queue_projection_table,
    describe_plan_cycle_queue_projection_table,
    wait_for_plan_cycle_queue_projection_table,
)

DEFAULT_LOCALSTACK_SERVICE_NAME: Final[str] = "taxpulse-localstack"
DEFAULT_LOCALSTACK_ENDPOINT_URL: Final[str] = "http://localhost:4566"
DEFAULT_LOCALSTACK_REGION_NAME: Final[str] = "us-east-1"


@dataclass(frozen=True, slots=True)
class LocalStackBootstrapConfig:
    """Resolved configuration for the LocalStack bootstrap flow."""

    project_root: Path
    compose_file: Path
    env_file: Path
    endpoint_url: str
    region_name: str
    access_key_id: str
    secret_access_key: str
    auth_token: str
    table_name: str = DEFAULT_PLAN_CYCLE_QUEUE_PROJECTION_TABLE_NAME


@dataclass(frozen=True, slots=True)
class LocalStackBootstrapResult:
    """Summary of the bootstrap operation."""

    table_name: str
    table_created: bool


def load_env_file(env_file: Path) -> dict[str, str]:
    """Load a simple KEY=VALUE .env file without extra dependencies."""

    values: dict[str, str] = {}

    for raw_line in env_file.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue

        key, separator, value = line.partition("=")
        if not separator:
            continue

        normalized_key = key.strip()
        normalized_value = value.strip().strip('"').strip("'")
        values[normalized_key] = normalized_value

    return values


def load_localstack_bootstrap_config(
    *,
    project_root: Path,
    env_file: Path,
    compose_file: Path,
) -> LocalStackBootstrapConfig:
    """Resolve the LocalStack bootstrap config from the local .env file."""

    values = load_env_file(env_file)
    required_keys = [
        "AWS_ACCESS_KEY_ID",
        "AWS_SECRET_ACCESS_KEY",
        "AWS_REGION",
        "TAXPULSE_DYNAMODB_ENDPOINT_URL",
        "LOCALSTACK_AUTH_TOKEN",
    ]
    missing_keys = [key for key in required_keys if not values.get(key)]

    if missing_keys:
        joined_keys = ", ".join(missing_keys)
        raise ValueError(f"Missing required LocalStack configuration in {env_file}: {joined_keys}")

    return LocalStackBootstrapConfig(
        project_root=project_root,
        compose_file=compose_file,
        env_file=env_file,
        endpoint_url=values["TAXPULSE_DYNAMODB_ENDPOINT_URL"],
        region_name=values["AWS_REGION"],
        access_key_id=values["AWS_ACCESS_KEY_ID"],
        secret_access_key=values["AWS_SECRET_ACCESS_KEY"],
        auth_token=values["LOCALSTACK_AUTH_TOKEN"],
    )


def run_localstack_compose(config: LocalStackBootstrapConfig) -> None:
    """Start or reconcile the LocalStack container via Docker Compose."""

    subprocess.run(
        [
            "docker",
            "compose",
            "--env-file",
            str(config.env_file),
            "-f",
            str(config.compose_file),
            "up",
            "-d",
            DEFAULT_LOCALSTACK_SERVICE_NAME,
        ],
        check=True,
        cwd=config.project_root,
    )


def wait_for_localstack_dynamodb_client(
    config: LocalStackBootstrapConfig,
    *,
    timeout_seconds: float = 60.0,
    poll_seconds: float = 1.0,
) -> DynamoDbClient:
    """Wait until DynamoDB on LocalStack responds successfully."""

    dynamodb_client = create_dynamodb_client(
        endpoint_url=config.endpoint_url,
        region_name=config.region_name,
        aws_access_key_id=config.access_key_id,
        aws_secret_access_key=config.secret_access_key,
    )
    deadline = time.monotonic() + timeout_seconds
    last_error: Exception | None = None

    while time.monotonic() < deadline:
        try:
            dynamodb_client.list_tables(Limit=1)
            return dynamodb_client
        except (BotoCoreError, OSError, ClientError) as exc:
            last_error = exc
            time.sleep(poll_seconds)

    msg = "LocalStack DynamoDB did not become ready before the timeout."
    raise TimeoutError(msg) from last_error


def ensure_plan_cycle_queue_projection_table(
    dynamodb_client: DynamoDbClient,
    *,
    table_name: str = DEFAULT_PLAN_CYCLE_QUEUE_PROJECTION_TABLE_NAME,
) -> bool:
    """Create the queue projection table if it does not already exist."""

    try:
        describe_plan_cycle_queue_projection_table(dynamodb_client, table_name)
    except ClientError as exc:
        error_code = exc.response.get("Error", {}).get("Code")
        if error_code != "ResourceNotFoundException":
            raise

        create_plan_cycle_queue_projection_table(dynamodb_client, table_name)
        wait_for_plan_cycle_queue_projection_table(dynamodb_client, table_name)
        return True

    return False


def bootstrap_localstack_queue_projection(
    config: LocalStackBootstrapConfig,
) -> LocalStackBootstrapResult:
    """Run the LocalStack compose service and ensure the queue table exists."""

    run_localstack_compose(config)
    dynamodb_client = wait_for_localstack_dynamodb_client(config)
    table_created = ensure_plan_cycle_queue_projection_table(
        dynamodb_client,
        table_name=config.table_name,
    )

    return LocalStackBootstrapResult(table_name=config.table_name, table_created=table_created)


def default_localstack_bootstrap_config() -> LocalStackBootstrapConfig:
    """Resolve the default repo-local LocalStack bootstrap paths."""

    repo_root = Path(__file__).resolve().parents[2]
    compose_file = repo_root / "src/tax_liability_engine/docker-compose.yml"
    env_file = repo_root / ".env"
    return load_localstack_bootstrap_config(
        project_root=repo_root,
        env_file=env_file,
        compose_file=compose_file,
    )
