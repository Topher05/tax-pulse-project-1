from __future__ import annotations

import os
import tempfile
from pathlib import Path


WORKSPACE_TEMP_ROOT = Path(__file__).resolve().parent / ".pytest_tmp"
WORKSPACE_TEMP_ROOT.mkdir(parents=True, exist_ok=True)

for env_var in ("TMP", "TEMP", "TMPDIR"):
    os.environ[env_var] = str(WORKSPACE_TEMP_ROOT)

tempfile.tempdir = str(WORKSPACE_TEMP_ROOT)
