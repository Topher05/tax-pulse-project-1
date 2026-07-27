from __future__ import annotations

import os
import tempfile
import uuid
from pathlib import Path
from typing import Protocol, Sequence


class _PytestOption(Protocol):
    basetemp: str | None


class _PytestConfig(Protocol):
    option: _PytestOption


def _repo_temp_parent() -> Path:
    return Path(__file__).resolve().parent / ".pytest_tmp"


def _fallback_temp_parent() -> Path:
    return Path(tempfile.gettempdir()) / "tax-pulse-project-team-1-pytest"


def _is_usable_temp_parent(candidate: Path) -> bool:
    try:
        candidate.mkdir(parents=True, exist_ok=True)
        probe = candidate / ".pytest-temp-probe"
        probe.mkdir()
        probe.rmdir()
    except OSError:
        return False
    return True


def _select_temp_parent(
    candidates: Sequence[Path] | None = None,
) -> Path:
    search_candidates = candidates or (_repo_temp_parent(), _fallback_temp_parent())

    for candidate in search_candidates:
        if _is_usable_temp_parent(candidate):
            return candidate

    fallback_parent = _fallback_temp_parent()
    fallback_parent.mkdir(parents=True, exist_ok=True)
    return fallback_parent


def _create_run_temp_root(parent: Path) -> Path:
    run_temp_root = parent / f"run-{os.getpid()}-{uuid.uuid4().hex}"
    run_temp_root.mkdir(parents=True, exist_ok=False)
    return run_temp_root


WORKSPACE_TEMP_PARENT = _select_temp_parent()
WORKSPACE_TEMP_ROOT = _create_run_temp_root(WORKSPACE_TEMP_PARENT)

for env_var in ("TMP", "TEMP", "TMPDIR"):
    os.environ[env_var] = str(WORKSPACE_TEMP_ROOT)

tempfile.tempdir = str(WORKSPACE_TEMP_ROOT)


def pytest_configure(config: _PytestConfig) -> None:
    if getattr(config.option, "basetemp", None) is None:
        config.option.basetemp = str(WORKSPACE_TEMP_ROOT)
