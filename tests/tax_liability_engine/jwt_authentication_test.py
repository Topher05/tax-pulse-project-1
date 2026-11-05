from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient
from httpx import Response

from tax_liability_engine.jwt_authentication import (
    AuthenticatedPrincipal,
    JwtValidationConfig,
    create_jwt_authentication_dependency,
)
from tests.tax_liability_engine.auth_test_support import (
    JwtTestMaterial,
    issue_access_token,
)


@pytest.fixture
def client(jwt_test_material: JwtTestMaterial) -> TestClient:
    app = FastAPI()
    require_authenticated_principal = create_jwt_authentication_dependency(jwt_test_material.config)

    @app.get("/protected")
    async def protected(
        principal: AuthenticatedPrincipal = Depends(require_authenticated_principal),  # noqa: B008
    ) -> dict[str, str]:
        return {"role": principal.role, "tenant_id": principal.tenant_id}

    return TestClient(app)


def authentication_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def assert_authentication_required(response: Response) -> None:
    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "Bearer"
    assert response.json() == {"detail": "A valid access token is required."}


def test_valid_shared_jwt_exposes_role_and_tenant_id(
    client: TestClient,
    jwt_test_material: JwtTestMaterial,
) -> None:
    response = client.get(
        "/protected", headers=authentication_headers(issue_access_token(jwt_test_material))
    )

    assert response.status_code == 200
    assert response.json() == {"role": "Advisor", "tenant_id": "tenant-001"}


@pytest.mark.parametrize(
    ("environment", "message"),
    [
        ({"JWT_JWKS_URL": "https://auth.taxpulse.example/jwks"}, "JWT_ISSUER is required."),
        ({"JWT_ISSUER": "https://auth.taxpulse.example"}, "JWT_JWKS_URL is required."),
    ],
)
def test_jwt_validation_config_rejects_invalid_environment(
    environment: dict[str, str], message: str
) -> None:
    with pytest.raises(ValueError, match=message):
        JwtValidationConfig.from_environment(environment)


@pytest.mark.parametrize(
    "authorization",
    [None, "Basic abc123", "Bearer", "Bearer not-a-jwt"],
)
def test_missing_or_malformed_bearer_token_is_rejected(
    client: TestClient, authorization: str | None
) -> None:
    headers = None if authorization is None else {"Authorization": authorization}

    response = client.get("/protected", headers=headers)

    assert_authentication_required(response)


@pytest.mark.parametrize("case", ["expired", "wrong-issuer"])
def test_invalid_token_claims_are_rejected(
    client: TestClient,
    jwt_test_material: JwtTestMaterial,
    case: str,
) -> None:
    token = issue_access_token(
        jwt_test_material,
        expires_at=datetime.now(UTC) - timedelta(minutes=1) if case == "expired" else None,
        issuer="https://other.taxpulse.example" if case == "wrong-issuer" else None,
    )

    response = client.get("/protected", headers=authentication_headers(token))

    assert_authentication_required(response)


def test_tampered_token_is_rejected(client: TestClient, jwt_test_material: JwtTestMaterial) -> None:
    header, payload, signature = issue_access_token(jwt_test_material).split(".")
    changed_signature = ("a" if signature[0] != "a" else "b") + signature[1:]

    response = client.get(
        "/protected",
        headers=authentication_headers(".".join((header, payload, changed_signature))),
    )

    assert_authentication_required(response)


@pytest.mark.parametrize(
    ("role", "tenant_id"),
    [("Unknown role", "tenant-001"), (None, "tenant-001"), ("Advisor", None), ("Advisor", "")],
)
def test_invalid_downstream_claims_are_rejected(
    client: TestClient,
    jwt_test_material: JwtTestMaterial,
    role: object,
    tenant_id: object,
) -> None:
    response = client.get(
        "/protected",
        headers=authentication_headers(
            issue_access_token(jwt_test_material, role=role, tenant_id=tenant_id)
        ),
    )

    assert_authentication_required(response)
