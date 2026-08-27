"""Shared RS256/JWKS fixtures for tax engine authentication tests."""

from __future__ import annotations

__test__ = False

import base64
import json
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import TYPE_CHECKING

import pytest

if TYPE_CHECKING:
    from cryptography.hazmat.primitives.asymmetric import rsa


@dataclass(frozen=True)
class JwtValidationConfig:
    issuer: str
    jwks_url: str


@dataclass(frozen=True)
class JwtTestMaterial:
    """The private key and matching local JWKS configuration for a test."""

    config: JwtValidationConfig
    private_key: rsa.RSAPrivateKey


@pytest.fixture
def jwt_test_material(tmp_path: Path) -> JwtTestMaterial:
    """Create a disposable RS256 signing key and its JWKS document."""

    from cryptography.hazmat.primitives.asymmetric import rsa

    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    public_key = private_key.public_key().public_numbers()
    public_jwk = {
        "kty": "RSA",
        "alg": "RS256",
        "kid": "test-rsa-key",
        "use": "sig",
        "n": _base64url_uint(public_key.n),
        "e": _base64url_uint(public_key.e),
    }
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

    from cryptography.hazmat.primitives import hashes
    from cryptography.hazmat.primitives.asymmetric import padding

    header = {"alg": "RS256", "kid": "test-rsa-key", "typ": "JWT"}
    payload = {
        "sub": "user-001",
        "role": role,
        "tenant_id": tenant_id,
        "iss": issuer or material.config.issuer,
        "iat": int(datetime.now(UTC).timestamp()),
        "exp": int((expires_at or datetime.now(UTC) + timedelta(minutes=5)).timestamp()),
    }
    signing_input = ".".join(_base64url_json(part) for part in (header, payload)).encode("ascii")
    signature = material.private_key.sign(
        signing_input,
        padding.PKCS1v15(),
        hashes.SHA256(),
    )
    return ".".join(
        (
            _base64url_json(header),
            _base64url_json(payload),
            _base64url_bytes(signature),
        )
    )


def _base64url_json(value: object) -> str:
    return _base64url_bytes(
        json.dumps(value, separators=(",", ":"), sort_keys=True).encode("utf-8")
    )


def _base64url_bytes(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).rstrip(b"=").decode("ascii")


def _base64url_uint(value: int) -> str:
    length = max(1, (value.bit_length() + 7) // 8)
    return _base64url_bytes(value.to_bytes(length, "big"))
