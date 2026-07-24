"""Python entry point for bootstrapping the LocalStack DynamoDB queue projection."""

from __future__ import annotations

import argparse
from dataclasses import replace
from pathlib import Path
from typing import Sequence

from .localstack_bootstrap import (
    bootstrap_localstack_queue_projection,
    load_localstack_bootstrap_config,
)


def build_parser() -> argparse.ArgumentParser:
    """Create the command-line parser for the bootstrap entrypoint."""

    parser = argparse.ArgumentParser(
        prog="tax-pulse",
        description="Start LocalStack and provision the Tax Plan Cycle queue table.",
    )
    parser.add_argument(
        "--env-file",
        type=Path,
        default=None,
        help="Path to the local .env file (defaults to the repository root .env).",
    )
    parser.add_argument(
        "--compose-file",
        type=Path,
        default=None,
        help="Path to the docker-compose file (defaults to src/python/docker-compose.yml).",
    )
    parser.add_argument(
        "--table-name",
        default=None,
        help="Override the DynamoDB table name for bootstrap verification.",
    )
    return parser


def main(argv: Sequence[str] | None = None) -> None:
    """Bootstrap the LocalStack-backed queue projection table."""

    args = build_parser().parse_args(argv)

    repo_root = Path(__file__).resolve().parents[3]
    env_file = args.env_file or (repo_root / ".env")
    compose_file = args.compose_file or (repo_root / "src/python/docker-compose.yml")
    config = load_localstack_bootstrap_config(
        project_root=repo_root,
        env_file=env_file,
        compose_file=compose_file,
    )
    if args.table_name is not None:
        config = replace(config, table_name=args.table_name)

    result = bootstrap_localstack_queue_projection(config)
    state = "created" if result.table_created else "already existed"
    print(f"LocalStack is ready on {config.endpoint_url} and {result.table_name} {state}.")


if __name__ == "__main__":
    main()
