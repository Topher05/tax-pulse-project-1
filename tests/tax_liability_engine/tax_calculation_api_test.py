from __future__ import annotations

from datetime import UTC, datetime, timedelta
from decimal import Decimal

import jwt
import pytest
from httpx import ASGITransport, AsyncClient
from tax_pulse_project_team_1.api import create_app
from tax_pulse_project_team_1.jwt_authentication import JwtValidationConfig
from tax_pulse_project_team_1.routers import tax_calculation as tax_calculation_router
from tax_pulse_project_team_1.tax_calculation import TaxCalculationRequest, TaxCalculationResult

CONFIG = JwtValidationConfig(
    issuer="https://auth.taxpulse.example",
    signing_secret="a-unique-test-secret-that-is-more-than-32-bytes",
)
SAMPLE_REQUEST = {
    "income": "100000",
    "deductions": "12000",
    "withholding": 24500,
    "state": "CA",
    "filing_status": "single",
}
EXPECTED_RESPONSE = {
    "income": "100000",
    "deductions": "12000",
    "state": "CA",
    "filing_status": "single",
    "taxable_income": "88000",
    "federal_liability": "14072.00",
    "state_liability": "4622.64",
    "total_liability": "18694.64",
    "effective_rate": "0.2124",
    "marginal_rate": "0.3130",
    "currency": "USD",
}


def issue_token(
    *,
    role: object = "Advisor",
    tenant_id: object = "tenant-001",
    issuer: str = CONFIG.issuer,
    expires_at: datetime | None = None,
) -> str:
    return jwt.encode(
        {
            "sub": "user-001",
            "role": role,
            "tenant_id": tenant_id,
            "iss": issuer,
            "iat": datetime.now(UTC),
            "exp": expires_at or datetime.now(UTC) + timedelta(minutes=5),
        },
        CONFIG.signing_secret,
        algorithm="HS256",
    )


def make_result() -> TaxCalculationResult:
    return TaxCalculationResult(
        income=Decimal("100000"),
        deductions=Decimal("12000"),
        state="CA",
        filing_status="single",
        taxable_income=Decimal("88000"),
        federal_liability=Decimal("14072.00"),
        state_liability=Decimal("4622.64"),
        total_liability=Decimal("18694.64"),
        effective_rate=Decimal("0.2124"),
        marginal_rate=Decimal("0.3130"),
    )


@pytest.mark.asyncio
async def test_tax_calculation_endpoint_returns_expected_liability() -> None:
    app = create_app(CONFIG)
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.post(
            "/tax-calculations",
            headers={"Authorization": f"Bearer {issue_token()}"},
            json=SAMPLE_REQUEST,
        )

    assert response.status_code == 200
    assert response.json() == EXPECTED_RESPONSE
    assert response.json()["total_liability"] == "18694.64"


@pytest.mark.asyncio
async def test_tax_calculation_endpoint_calls_calculate_tax_and_uses_tenant_claim(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    seen_requests: list[dict[str, object]] = []

    async def fake_calculate_tax(request: TaxCalculationRequest) -> TaxCalculationResult:
        seen_requests.append(request.model_dump())
        return make_result()

    monkeypatch.setattr(tax_calculation_router, "calculate_tax", fake_calculate_tax)

    app = create_app(CONFIG)
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.post(
            "/tax-calculations",
            headers={"Authorization": f"Bearer {issue_token(tenant_id='tenant-002')}"},
            json=SAMPLE_REQUEST,
        )

    assert response.status_code == 200
    assert seen_requests == [
        {
            "income": Decimal("100000"),
            "deductions": Decimal("12000"),
            "withholding": 24500.0,
            "state": "CA",
            "filing_status": "single",
        }
    ]
    assert response.json() == EXPECTED_RESPONSE


@pytest.mark.asyncio
async def test_tax_calculation_endpoint_rejects_missing_jwt() -> None:
    app = create_app(CONFIG)
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.post("/tax-calculations", json=SAMPLE_REQUEST)

    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "Bearer"
    assert response.json() == {"detail": "A valid access token is required."}


@pytest.mark.asyncio
async def test_tax_calculation_endpoint_rejects_token_missing_tenant_claim() -> None:
    app = create_app(CONFIG)
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.post(
            "/tax-calculations",
            headers={"Authorization": f"Bearer {issue_token(tenant_id='')}"},
            json=SAMPLE_REQUEST,
        )

    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "Bearer"
    assert response.json() == {"detail": "A valid access token is required."}
