"""Shared RS256/JWKS fixtures for tax engine authentication tests."""

from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from pathlib import Path

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa
from jwt.algorithms import RSAAlgorithm

from tax_liability_engine.jwt_authentication import JwtValidationConfig


@dataclass(frozen=True)
class JwtTestMaterial:
    """The private key and matching local JWKS configuration for a test."""

    config: JwtValidationConfig
    private_key: rsa.RSAPrivateKey


@pytest.fixture
def jwt_test_material(tmp_path: Path) -> JwtTestMaterial:
    """Create a disposable RS256 signing key and its JWKS document."""

    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    public_jwk = json.loads(RSAAlgorithm.to_jwk(private_key.public_key()))
    public_jwk.update(alg="RS256", kid="test-rsa-key", use="sig")
    jwks_path = tmp_path / "jwks.json"
    jwks_path.write_text(json.dumps({"keys": [public_jwk]}), encoding="utf-8")
    return JwtTestMaterial(
        config=JwtValidationConfig(
            issuer="https://auth.taxpulse.example",
            jwks_url=jwks_path.as_uri(),
        ),
        private_key=private_key,
    )


def issue_access_token(
    material: JwtTestMaterial,
    *,
    role: object = "Advisor",
    tenant_id: object = "tenant-001",
    issuer: str | None = None,
    expires_at: datetime | None = None,
) -> str:
    """Issue an RS256 access token matching the supplied local JWKS."""

    return jwt.encode(
        {
            "sub": "user-001",
            "role": role,
            "tenant_id": tenant_id,
            "iss": issuer or material.config.issuer,
            "iat": datetime.now(UTC),
            "exp": expires_at or datetime.now(UTC) + timedelta(minutes=5),
        },
        material.private_key,
        algorithm="RS256",
        headers={"kid": "test-rsa-key"},
    )
