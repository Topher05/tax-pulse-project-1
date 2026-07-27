from __future__ import annotations

from datetime import UTC, datetime, timedelta

import jwt
import pytest
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient
from httpx import Response
from tax_liability_engine.jwt_authentication import (
    AuthenticatedPrincipal,
    JwtValidationConfig,
    create_jwt_authentication_dependency,
)

CONFIG = JwtValidationConfig(
    issuer="https://auth.taxpulse.example",
    signing_secret="a-unique-test-secret-that-is-more-than-32-bytes",
)


@pytest.fixture
def client() -> TestClient:
    app = FastAPI()
    require_authenticated_principal = create_jwt_authentication_dependency(CONFIG)

    @app.get("/protected")
    async def protected(
        principal: AuthenticatedPrincipal = Depends(require_authenticated_principal),  # noqa: B008
    ) -> dict[str, str]:
        return {"role": principal.role, "tenant_id": principal.tenant_id}

    return TestClient(app)


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


def authentication_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def assert_authentication_required(response: Response) -> None:
    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "Bearer"
    assert response.json() == {"detail": "A valid access token is required."}


def test_valid_shared_jwt_exposes_role_and_tenant_id(client: TestClient) -> None:
    response = client.get("/protected", headers=authentication_headers(issue_token()))

    assert response.status_code == 200
    assert response.json() == {"role": "Advisor", "tenant_id": "tenant-001"}


@pytest.mark.parametrize(
    ("environment", "message"),
    [
        ({"JWT_SIGNING_SECRET": CONFIG.signing_secret}, "JWT_ISSUER is required."),
        ({"JWT_ISSUER": CONFIG.issuer}, "JWT_SIGNING_SECRET is required."),
        (
            {"JWT_ISSUER": CONFIG.issuer, "JWT_SIGNING_SECRET": "too-short"},
            "JWT_SIGNING_SECRET must contain at least 32 UTF-8 bytes.",
        ),
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


@pytest.mark.parametrize(
    "token",
    [
        pytest.param(
            issue_token(expires_at=datetime.now(UTC) - timedelta(minutes=1)), id="expired"
        ),
        pytest.param(issue_token(issuer="https://other.taxpulse.example"), id="wrong-issuer"),
    ],
)
def test_invalid_token_claims_are_rejected(client: TestClient, token: str) -> None:
    response = client.get("/protected", headers=authentication_headers(token))

    assert_authentication_required(response)


def test_tampered_token_is_rejected(client: TestClient) -> None:
    token = issue_token()
    header, payload, signature = token.split(".")
    changed_signature = ("a" if signature[0] != "a" else "b") + signature[1:]

    response = client.get(
        "/protected", headers=authentication_headers(".".join((header, payload, changed_signature)))
    )

    assert_authentication_required(response)


@pytest.mark.parametrize(
    ("role", "tenant_id"),
    [
        ("Unknown role", "tenant-001"),
        (None, "tenant-001"),
        ("Advisor", None),
        ("Advisor", ""),
    ],
)
def test_invalid_downstream_claims_are_rejected(
    client: TestClient, role: object, tenant_id: object
) -> None:
    response = client.get(
        "/protected", headers=authentication_headers(issue_token(role=role, tenant_id=tenant_id))
    )

    assert_authentication_required(response)
