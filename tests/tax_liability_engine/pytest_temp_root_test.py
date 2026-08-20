from __future__ import annotations

from pathlib import Path
from typing import Any, cast

import pytest

import conftest


class DummyOption:
    def __init__(self, basetemp: str | None) -> None:
        self.basetemp = basetemp


class DummyConfig:
    def __init__(self, basetemp: str | None) -> None:
        self.option = DummyOption(basetemp)


def test_select_temp_parent_prefers_repo_parent(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    repo_parent = tmp_path / "repo"
    fallback_parent = tmp_path / "fallback"

    monkeypatch.setattr(conftest, "_repo_temp_parent", lambda: repo_parent)
    monkeypatch.setattr(conftest, "_fallback_temp_parent", lambda: fallback_parent)
    monkeypatch.setattr(
        conftest,
        "_is_usable_temp_parent",
        lambda candidate: candidate == repo_parent,
    )

    assert conftest._select_temp_parent() == repo_parent


def test_select_temp_parent_falls_back_when_repo_parent_is_unusable(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    repo_parent = tmp_path / "repo"
    fallback_parent = tmp_path / "fallback"

    monkeypatch.setattr(conftest, "_repo_temp_parent", lambda: repo_parent)
    monkeypatch.setattr(conftest, "_fallback_temp_parent", lambda: fallback_parent)
    monkeypatch.setattr(
        conftest,
        "_is_usable_temp_parent",
        lambda candidate: candidate == fallback_parent,
    )

    assert conftest._select_temp_parent() == fallback_parent


def test_create_run_temp_root_creates_unique_child(tmp_path: Path) -> None:
    run_temp_root = conftest._create_run_temp_root(tmp_path)

    assert run_temp_root.parent == tmp_path
    assert run_temp_root.is_dir()
    assert run_temp_root.name.startswith("run-")


def test_pytest_configure_sets_basetemp_when_not_provided(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    run_temp_root = tmp_path / "run-root"
    run_temp_root.mkdir()
    monkeypatch.setattr(conftest, "WORKSPACE_TEMP_ROOT", run_temp_root)
    config = DummyConfig(basetemp=None)

    conftest.pytest_configure(cast(Any, config))

    assert config.option.basetemp == str(run_temp_root)


def test_pytest_configure_preserves_manual_basetemp(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    run_temp_root = tmp_path / "run-root"
    run_temp_root.mkdir()
    monkeypatch.setattr(conftest, "WORKSPACE_TEMP_ROOT", run_temp_root)
    manual_basetemp = tmp_path / "manual-basetemp"
    config = DummyConfig(basetemp=str(manual_basetemp))

    conftest.pytest_configure(cast(Any, config))

    assert config.option.basetemp == str(manual_basetemp)
