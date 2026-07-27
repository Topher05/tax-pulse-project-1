from __future__ import annotations

from dataclasses import replace
from pathlib import Path
from typing import cast

import pytest
from botocore.exceptions import ClientError

from tax_liability_engine.localstack_bootstrap import (
    bootstrap_localstack_queue_projection,
    ensure_plan_cycle_queue_projection_table,
    load_env_file,
    load_localstack_bootstrap_config,
    run_localstack_compose,
)


def test_load_env_file_reads_simple_key_values(tmp_path: Path) -> None:
    env_file = tmp_path / ".env"
    env_file.write_text(
        "\n".join(
            [
                "AWS_ACCESS_KEY_ID=test",
                "AWS_SECRET_ACCESS_KEY=test",
                "AWS_REGION=us-east-1",
                "TAXPULSE_DYNAMODB_ENDPOINT_URL=http://localhost:4566",
                "LOCALSTACK_AUTH_TOKEN=token-value",
            ]
        ),
        encoding="utf-8",
    )

    values = load_env_file(env_file)

    assert values == {
        "AWS_ACCESS_KEY_ID": "test",
        "AWS_SECRET_ACCESS_KEY": "test",
        "AWS_REGION": "us-east-1",
        "TAXPULSE_DYNAMODB_ENDPOINT_URL": "http://localhost:4566",
        "LOCALSTACK_AUTH_TOKEN": "token-value",
    }


def test_load_localstack_bootstrap_config_requires_all_localstack_keys(tmp_path: Path) -> None:
    repo_root = tmp_path
    env_file = repo_root / ".env"
    env_file.write_text(
        "\n".join(
            [
                "AWS_ACCESS_KEY_ID=test",
                "AWS_SECRET_ACCESS_KEY=test",
                "AWS_REGION=us-east-1",
                "TAXPULSE_DYNAMODB_ENDPOINT_URL=http://localhost:4566",
                "LOCALSTACK_AUTH_TOKEN=token-value",
            ]
        ),
        encoding="utf-8",
    )
    compose_file = repo_root / "src/tax_liability_engine/docker-compose.yml"

    config = load_localstack_bootstrap_config(
        project_root=repo_root,
        env_file=env_file,
        compose_file=compose_file,
    )

    assert config.project_root == repo_root
    assert config.compose_file == compose_file
    assert config.env_file == env_file
    assert config.endpoint_url == "http://localhost:4566"
    assert config.region_name == "us-east-1"
    assert config.access_key_id == "test"
    assert config.secret_access_key == "test"
    assert config.auth_token == "token-value"


def test_run_localstack_compose_invokes_docker_compose(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    repo_root = tmp_path
    env_file = repo_root / ".env"
    env_file.write_text(
        "\n".join(
            [
                "AWS_ACCESS_KEY_ID=test",
                "AWS_SECRET_ACCESS_KEY=test",
                "AWS_REGION=us-east-1",
                "TAXPULSE_DYNAMODB_ENDPOINT_URL=http://localhost:4566",
                "LOCALSTACK_AUTH_TOKEN=token-value",
            ]
        ),
        encoding="utf-8",
    )
    compose_file = repo_root / "src/tax_liability_engine/docker-compose.yml"
    config = load_localstack_bootstrap_config(
        project_root=repo_root,
        env_file=env_file,
        compose_file=compose_file,
    )

    captured: dict[str, object] = {}

    def fake_run(command: list[str], **kwargs: object) -> object:
        captured["command"] = command
        captured["kwargs"] = kwargs
        return object()

    monkeypatch.setattr("subprocess.run", fake_run)

    run_localstack_compose(config)

    captured_kwargs = cast(dict[str, object], captured["kwargs"])
    assert captured["command"] == [
        "docker",
        "compose",
        "--env-file",
        str(env_file),
        "-f",
        str(compose_file),
        "up",
        "-d",
        "taxpulse-localstack",
    ]
    assert captured_kwargs["check"] is True
    assert captured_kwargs["cwd"] == repo_root


def test_ensure_plan_cycle_queue_projection_table_creates_missing_table() -> None:
    calls: list[str] = []

    class FakeWaiter:
        def wait(self, **kwargs: object) -> None:
            kwargs_dict = cast(dict[str, object], kwargs)
            table_name = cast(str, kwargs_dict["TableName"])
            calls.append(f"wait:{table_name}")

    class FakeClient:
        def __init__(self) -> None:
            self.exceptions = type("Exceptions", (), {})

        def describe_table(self, **kwargs: object) -> dict[str, object]:
            table_name = cast(str, kwargs["TableName"])
            calls.append(f"describe:{table_name}")
            raise ClientError(
                {
                    "Error": {
                        "Code": "ResourceNotFoundException",
                        "Message": "missing",
                    }
                },
                "DescribeTable",
            )

        def create_table(self, **kwargs: object) -> dict[str, object]:
            table_name = cast(str, kwargs["TableName"])
            calls.append(f"create:{table_name}")
            return {}

        def get_waiter(self, waiter_name: str) -> FakeWaiter:
            assert waiter_name == "table_exists"
            return FakeWaiter()

        def list_tables(self, **kwargs: object) -> dict[str, object]:
            return {}

        def put_item(self, **kwargs: object) -> dict[str, object]:
            return {}

        def query(self, **kwargs: object) -> dict[str, object]:
            return {}

    created = ensure_plan_cycle_queue_projection_table(FakeClient(), table_name="demo")

    assert created is True
    assert calls == ["describe:demo", "create:demo", "wait:demo"]


def test_ensure_plan_cycle_queue_projection_table_skips_existing_table() -> None:
    calls: list[str] = []

    class FakeWaiter:
        def wait(self, **kwargs: object) -> None:
            kwargs_dict = cast(dict[str, object], kwargs)
            calls.append(f"wait:{cast(str, kwargs_dict['TableName'])}")

    class FakeClient:
        def __init__(self) -> None:
            self.exceptions = type("Exceptions", (), {})

        def describe_table(self, **kwargs: object) -> dict[str, object]:
            table_name = cast(str, kwargs["TableName"])
            calls.append(f"describe:{table_name}")
            return {"Table": {"TableName": table_name}}

        def create_table(self, **kwargs: object) -> dict[str, object]:
            table_name = cast(str, kwargs["TableName"])
            calls.append(f"create:{table_name}")
            return {}

        def get_waiter(self, waiter_name: str) -> FakeWaiter:
            calls.append(f"waiter:{waiter_name}")
            return FakeWaiter()

        def list_tables(self, **kwargs: object) -> dict[str, object]:
            return {}

        def put_item(self, **kwargs: object) -> dict[str, object]:
            return {}

        def query(self, **kwargs: object) -> dict[str, object]:
            return {}

    created = ensure_plan_cycle_queue_projection_table(FakeClient(), table_name="demo")

    assert created is False
    assert calls == ["describe:demo"]


def test_bootstrap_localstack_queue_projection_runs_compose_and_creates_table(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    repo_root = tmp_path
    env_file = repo_root / ".env"
    env_file.write_text(
        "\n".join(
            [
                "AWS_ACCESS_KEY_ID=test",
                "AWS_SECRET_ACCESS_KEY=test",
                "AWS_REGION=us-east-1",
                "TAXPULSE_DYNAMODB_ENDPOINT_URL=http://localhost:4566",
                "LOCALSTACK_AUTH_TOKEN=token-value",
            ]
        ),
        encoding="utf-8",
    )
    compose_file = repo_root / "src/tax_liability_engine/docker-compose.yml"
    config = load_localstack_bootstrap_config(
        project_root=repo_root,
        env_file=env_file,
        compose_file=compose_file,
    )
    expected_config = replace(config, table_name="custom-table")

    events: list[str] = []

    class FakeClient:
        def list_tables(self, **kwargs: object) -> dict[str, object]:
            events.append(f"list:{kwargs['Limit']}")
            return {}

    def fake_run_localstack_compose(received_config: object) -> None:
        assert received_config == expected_config
        events.append("compose")

    def fake_wait_for_localstack_dynamodb_client(received_config: object) -> FakeClient:
        assert received_config == expected_config
        events.append("wait")
        return FakeClient()

    def fake_ensure_plan_cycle_queue_projection_table(
        dynamodb_client: object,
        *,
        table_name: str,
    ) -> bool:
        assert isinstance(dynamodb_client, FakeClient)
        assert table_name == "custom-table"
        events.append("table")
        return True

    monkeypatch.setattr(
        "tax_liability_engine.localstack_bootstrap.run_localstack_compose",
        fake_run_localstack_compose,
    )
    monkeypatch.setattr(
        "tax_liability_engine.localstack_bootstrap.wait_for_localstack_dynamodb_client",
        fake_wait_for_localstack_dynamodb_client,
    )
    monkeypatch.setattr(
        "tax_liability_engine.localstack_bootstrap.ensure_plan_cycle_queue_projection_table",
        fake_ensure_plan_cycle_queue_projection_table,
    )

    result = bootstrap_localstack_queue_projection(expected_config)

    assert result.table_name == "custom-table"
    assert result.table_created is True
    assert events == ["compose", "wait", "table"]
