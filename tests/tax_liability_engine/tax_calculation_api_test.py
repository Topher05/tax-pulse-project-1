from __future__ import annotations

from decimal import Decimal

import pytest
from httpx import ASGITransport, AsyncClient

from tax_liability_engine.api import create_app
from tax_liability_engine.routers import tax_calculation as tax_calculation_router
from tax_liability_engine.tax_calculation import TaxCalculationRequest, TaxCalculationResult
from tests.tax_liability_engine.auth_test_support import JwtTestMaterial, issue_access_token

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
async def test_tax_calculation_endpoint_returns_expected_liability(
    jwt_test_material: JwtTestMaterial,
) -> None:
    app = create_app(jwt_test_material.config)
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.post(
            "/tax-calculations",
            headers={"Authorization": f"Bearer {issue_access_token(jwt_test_material)}"},
            json=SAMPLE_REQUEST,
        )

    assert response.status_code == 200
    assert response.json() == EXPECTED_RESPONSE
    assert response.json()["total_liability"] == "18694.64"


@pytest.mark.asyncio
async def test_tax_calculation_endpoint_echoes_the_request_id_header(
    jwt_test_material: JwtTestMaterial,
) -> None:
    app = create_app(jwt_test_material.config)
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.post(
            "/tax-calculations",
            headers={
                "Authorization": f"Bearer {issue_access_token(jwt_test_material)}",
                "x-request-id": "req-tax-001",
            },
            json=SAMPLE_REQUEST,
        )

    assert response.status_code == 200
    assert response.headers["x-request-id"] == "req-tax-001"


@pytest.mark.asyncio
async def test_tax_calculation_endpoint_calls_calculate_tax_and_uses_tenant_claim(
    monkeypatch: pytest.MonkeyPatch,
    jwt_test_material: JwtTestMaterial,
) -> None:
    seen_requests: list[dict[str, object]] = []

    async def fake_calculate_tax(request: TaxCalculationRequest) -> TaxCalculationResult:
        seen_requests.append(request.model_dump())
        return make_result()

    monkeypatch.setattr(tax_calculation_router, "calculate_tax", fake_calculate_tax)

    app = create_app(jwt_test_material.config)
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.post(
            "/tax-calculations",
            headers={
                "Authorization": f"Bearer {issue_access_token(jwt_test_material, tenant_id='tenant-002')}"
            },
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
async def test_tax_calculation_endpoint_rejects_missing_jwt(
    jwt_test_material: JwtTestMaterial,
) -> None:
    app = create_app(jwt_test_material.config)
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.post("/tax-calculations", json=SAMPLE_REQUEST)

    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "Bearer"
    assert response.json() == {"detail": "A valid access token is required."}


@pytest.mark.asyncio
async def test_tax_calculation_endpoint_rejects_token_missing_tenant_claim(
    jwt_test_material: JwtTestMaterial,
) -> None:
    app = create_app(jwt_test_material.config)
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.post(
            "/tax-calculations",
            headers={
                "Authorization": f"Bearer {issue_access_token(jwt_test_material, tenant_id='')}"
            },
            json=SAMPLE_REQUEST,
        )

    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "Bearer"
    assert response.json() == {"detail": "A valid access token is required."}
