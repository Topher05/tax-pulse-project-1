from __future__ import annotations

import pytest
from httpx import ASGITransport, AsyncClient

from tax_liability_engine.api import create_app
from tests.tax_liability_engine.auth_test_support import JwtTestMaterial, issue_access_token

BASELINE = {
    "income": 100000,
    "deductions": 12000,
    "state": "CA",
    "filing_status": "single",
}


def scenario(number: int) -> dict[str, object]:
    return {
        "name": f"Scenario {number}",
        "typed_figures": {**BASELINE, "income": BASELINE["income"] + number},
    }


def build_request(count: int) -> dict[str, object]:
    return {
        "baseline": BASELINE,
        "scenarios": [scenario(number) for number in range(1, count + 1)],
    }


def build_three_scenario_request() -> dict[str, object]:
    return {
        "baseline": BASELINE,
        "scenarios": [
            {
                "name": "Increase deductions",
                "typed_figures": {**BASELINE, "deductions": 20000},
            },
            {
                "name": "Keep baseline",
                "typed_figures": BASELINE,
            },
            {
                "name": "Increase income",
                "typed_figures": {**BASELINE, "income": 110000},
            },
        ],
    }


@pytest.mark.asyncio
async def test_scenario_comparison_endpoint_returns_three_deltas_in_input_order(
    jwt_test_material: JwtTestMaterial,
) -> None:
    app = create_app(jwt_test_material.config)
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.post(
            "/scenarios/comparisons",
            headers={"Authorization": f"Bearer {issue_access_token(jwt_test_material)}"},
            json=build_three_scenario_request(),
        )

    assert response.json() == [
        {
            "name": "Increase deductions",
            "total_tax": "16190.64",
            "delta_vs_baseline": "-2504.00",
        },
        {
            "name": "Keep baseline",
            "total_tax": "18694.64",
            "delta_vs_baseline": "0.00",
        },
        {
            "name": "Increase income",
            "total_tax": "21824.64",
            "delta_vs_baseline": "3130.00",
        },
    ]


@pytest.mark.parametrize("count", [2, 5])
@pytest.mark.asyncio
async def test_scenario_comparison_endpoint_accepts_two_to_five_scenarios(
    count: int,
    jwt_test_material: JwtTestMaterial,
) -> None:
    app = create_app(jwt_test_material.config)
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.post(
            "/scenarios/comparisons",
            headers={"Authorization": f"Bearer {issue_access_token(jwt_test_material)}"},
            json=build_request(count),
        )

    assert (response.status_code, len(response.json())) == (200, count)


@pytest.mark.parametrize("count", [1, 6])
@pytest.mark.asyncio
async def test_scenario_comparison_endpoint_rejects_out_of_range_scenario_counts(
    count: int,
    jwt_test_material: JwtTestMaterial,
) -> None:
    app = create_app(jwt_test_material.config)
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.post(
            "/scenarios/comparisons",
            headers={"Authorization": f"Bearer {issue_access_token(jwt_test_material)}"},
            json=build_request(count),
        )

    assert response.status_code == 422


@pytest.mark.asyncio
async def test_scenario_comparison_endpoint_rejects_missing_jwt(
    jwt_test_material: JwtTestMaterial,
) -> None:
    app = create_app(jwt_test_material.config)
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.post("/scenarios/comparisons", json=build_request(3))

    assert (response.status_code, response.headers["www-authenticate"]) == (401, "Bearer")


@pytest.mark.asyncio
async def test_scenario_comparison_endpoint_rejects_invalid_jwt(
    jwt_test_material: JwtTestMaterial,
) -> None:
    app = create_app(jwt_test_material.config)
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.post(
            "/scenarios/comparisons",
            headers={
                "Authorization": "Bearer "
                f"{issue_access_token(jwt_test_material, issuer='https://other.taxpulse.example')}",
            },
            json=build_request(3),
        )

    assert (response.status_code, response.headers["www-authenticate"]) == (401, "Bearer")
