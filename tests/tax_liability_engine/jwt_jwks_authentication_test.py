from __future__ import annotations

import json
from datetime import UTC, datetime, timedelta
from pathlib import Path

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient
from jwt.algorithms import RSAAlgorithm

from tax_liability_engine.jwt_authentication import (
    AuthenticatedPrincipal,
    JwtValidationConfig,
    create_jwt_authentication_dependency,
)


@pytest.fixture
def jwt_material(tmp_path: Path) -> tuple[JwtValidationConfig, rsa.RSAPrivateKey]:
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    public_jwk = json.loads(RSAAlgorithm.to_jwk(private_key.public_key()))
    public_jwk.update(alg="RS256", kid="test-rsa-key", use="sig")
    jwks_path = tmp_path / "jwks.json"
    jwks_path.write_text(json.dumps({"keys": [public_jwk]}), encoding="utf-8")
    return (
        JwtValidationConfig(issuer="https://auth.taxpulse.example", jwks_url=jwks_path.as_uri()),
        private_key,
    )


@pytest.fixture
def client(jwt_material: tuple[JwtValidationConfig, rsa.RSAPrivateKey]) -> TestClient:
    config, _ = jwt_material
    app = FastAPI()
    require_authenticated_principal = create_jwt_authentication_dependency(config)

    @app.get("/protected")
    async def protected(
        principal: AuthenticatedPrincipal = Depends(require_authenticated_principal),  # noqa: B008
    ) -> dict[str, str]:
        return {"role": principal.role, "tenant_id": principal.tenant_id}

    return TestClient(app)


def issue_token(
    config: JwtValidationConfig,
    private_key: rsa.RSAPrivateKey,
    *,
    expires_at: datetime | None = None,
) -> str:
    return jwt.encode(
        {
            "sub": "user-001",
            "role": "Advisor",
            "tenant_id": "tenant-001",
            "iss": config.issuer,
            "iat": datetime.now(UTC),
            "exp": expires_at or datetime.now(UTC) + timedelta(minutes=5),
        },
        private_key,
        algorithm="RS256",
        headers={"kid": "test-rsa-key"},
    )


def test_rs256_jwks_valid_token_exposes_principal(
    client: TestClient, jwt_material: tuple[JwtValidationConfig, rsa.RSAPrivateKey]
) -> None:
    config, private_key = jwt_material

    response = client.get(
        "/protected", headers={"Authorization": f"Bearer {issue_token(config, private_key)}"}
    )

    assert response.status_code == 200
    assert response.json() == {"role": "Advisor", "tenant_id": "tenant-001"}


@pytest.mark.parametrize("expired", [True, False], ids=["expired", "tampered"])
def test_rs256_jwks_rejects_invalid_tokens(
    client: TestClient,
    jwt_material: tuple[JwtValidationConfig, rsa.RSAPrivateKey],
    expired: bool,
) -> None:
    config, private_key = jwt_material
    token = issue_token(
        config,
        private_key,
        expires_at=datetime.now(UTC) - timedelta(minutes=1) if expired else None,
    )
    if not expired:
        header, payload, signature = token.split(".")
        token = ".".join((header, payload, f"{'a' if signature[0] != 'a' else 'b'}{signature[1:]}"))

    response = client.get("/protected", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "Bearer"
