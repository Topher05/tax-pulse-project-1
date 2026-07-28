from __future__ import annotations

import socket
import threading
import time
from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path

import httpx
import uvicorn
from pact import Verifier
from tax_liability_engine.api import create_app
from tax_liability_engine.jwt_authentication import JwtValidationConfig

CONFIG = JwtValidationConfig(
    issuer="https://auth.taxpulse.example",
    signing_secret="a-unique-test-secret-that-is-more-than-32-bytes",
)
PACT_FILE = (
    Path(__file__).resolve().parents[2] / "pacts" / "CoreCaseService-TaxCalculationEngine.json"
)


def find_available_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind(("127.0.0.1", 0))
        return int(sock.getsockname()[1])


@contextmanager
def run_tax_engine_provider() -> Iterator[str]:
    port = find_available_port()
    base_url = f"http://127.0.0.1:{port}"
    server = uvicorn.Server(
        uvicorn.Config(
            create_app(CONFIG),
            host="127.0.0.1",
            port=port,
            log_level="warning",
            lifespan="off",
        )
    )
    thread = threading.Thread(target=server.run, daemon=True)

    thread.start()
    try:
        deadline = time.monotonic() + 10
        last_error: Exception | None = None
        while time.monotonic() < deadline:
            try:
                response = httpx.get(f"{base_url}/health", timeout=0.5)
                if response.status_code == 200:
                    break
            except httpx.HTTPError as error:
                last_error = error
            time.sleep(0.05)
        else:
            raise RuntimeError(
                "TaxCalculationEngine provider did not start in time"
            ) from last_error

        yield base_url
    finally:
        server.should_exit = True
        thread.join(timeout=5)


def test_tax_calculation_engine_verifies_core_case_service_pact() -> None:
    assert PACT_FILE.exists(), "Run npm run test:pact to generate the SCRUM-88 pact file."

    with run_tax_engine_provider() as base_url:
        verifier = (
            Verifier("TaxCalculationEngine", host="127.0.0.1")
            .add_transport(url=base_url)
            .add_source(str(PACT_FILE))
        )

        verifier.verify()
