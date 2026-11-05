"""Interpreter-runnable startup for the TaxPulse liability engine API."""

from __future__ import annotations

import os
import sys
from pathlib import Path

import uvicorn


def _project_root() -> Path:
    return Path(__file__).resolve().parents[3]


def _load_dotenv(dotenv_path: Path) -> None:
    if not dotenv_path.exists():
        return

    for raw_line in dotenv_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue

        key, separator, value = line.partition("=")
        if separator and key.strip():
            os.environ.setdefault(key.strip(), value)


def _ensure_python_path(src_python: Path) -> None:
    src_python_text = str(src_python)
    if src_python_text not in sys.path:
        sys.path.insert(0, src_python_text)


def main() -> None:
    root = _project_root()
    _load_dotenv(root / ".env")
    _ensure_python_path(root / "src")

    from tax_liability_engine.api import create_app

    uvicorn.run(create_app(), host="127.0.0.1", port=8000)


if __name__ == "__main__":
    main()
