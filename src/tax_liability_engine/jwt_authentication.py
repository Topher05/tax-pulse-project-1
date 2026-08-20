"""FastAPI authentication dependency for shared TaxPulse access JWTs."""

from __future__ import annotations

import asyncio
import json
import os
import time
from collections.abc import Awaitable, Callable, Mapping
from dataclasses import dataclass
from typing import Literal, cast
from urllib.request import urlopen

import jwt
from cryptography.hazmat.primitives.asymmetric.rsa import RSAPublicKey
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt.algorithms import RSAAlgorithm

UserRole = Literal["Firm Admin", "Advisor", "Client", "TaxPulse Platform Admin"]

_USER_ROLES: frozenset[str] = frozenset(
    {"Firm Admin", "Advisor", "Client", "TaxPulse Platform Admin"}
)
_AUTHENTICATION_REQUIRED_DETAIL = "A valid access token is required."
_JWKS_CACHE_SECONDS = 300


class _JwksKeyNotFoundError(Exception):
    """Raised when a token cannot be matched to an RSA public key in the JWKS."""


class _JwksKeyProvider:
    """Fetches and caches public signing keys, refreshing once for key rotation."""

    def __init__(self, jwks_url: str) -> None:
        self._jwks_url = jwks_url
        self._keys: list[dict[str, object]] = []
        self._loaded_at = 0.0
        self._lock = asyncio.Lock()

    async def get_signing_key(self, token: str) -> RSAPublicKey:
        try:
            header = jwt.get_unverified_header(token)
        except jwt.InvalidTokenError as error:
            raise _JwksKeyNotFoundError from error

        key_id = header.get("kid")
        if header.get("alg") != "RS256" or not isinstance(key_id, str) or not key_id:
            raise _JwksKeyNotFoundError

        key = self._find_key(await self._get_keys(), key_id)
        if key is None:
            key = self._find_key(await self._get_keys(force_refresh=True), key_id)
        if key is None:
            raise _JwksKeyNotFoundError

        return cast(RSAPublicKey, RSAAlgorithm.from_jwk(json.dumps(key)))

    async def _get_keys(self, *, force_refresh: bool = False) -> list[dict[str, object]]:
        async with self._lock:
            cache_is_fresh = time.monotonic() - self._loaded_at < _JWKS_CACHE_SECONDS
            if self._keys and cache_is_fresh and not force_refresh:
                return self._keys

            self._keys = await asyncio.to_thread(self._fetch_keys)
            self._loaded_at = time.monotonic()
            return self._keys

    def _fetch_keys(self) -> list[dict[str, object]]:
        with urlopen(self._jwks_url, timeout=5) as response:  # noqa: S310
            document = cast(object, json.load(response))

        if not isinstance(document, dict):
            raise _JwksKeyNotFoundError
        keys = document.get("keys")
        if not isinstance(keys, list):
            raise _JwksKeyNotFoundError

        return [key for key in keys if isinstance(key, dict)]

    @staticmethod
    def _find_key(keys: list[dict[str, object]], key_id: str) -> dict[str, object] | None:
        return next((key for key in keys if key.get("kid") == key_id), None)


@dataclass(frozen=True)
class JwtValidationConfig:
    """JWT validation configuration supplied by the service environment."""

    issuer: str
    jwks_url: str

    @classmethod
    def from_environment(cls, environment: Mapping[str, str] | None = None) -> JwtValidationConfig:
        """Load JWT verification configuration without reading it at import time."""

        values = os.environ if environment is None else environment
        issuer = values.get("JWT_ISSUER", "").strip()
        jwks_url = values.get("JWT_JWKS_URL", "").strip()

        if not issuer:
            raise ValueError("JWT_ISSUER is required.")
        if not jwks_url:
            raise ValueError("JWT_JWKS_URL is required.")
        return cls(issuer=issuer, jwks_url=jwks_url)


@dataclass(frozen=True)
class AuthenticatedPrincipal:
    """Verified access-token claims available to FastAPI route handlers."""

    role: UserRole
    tenant_id: str


def _authentication_required() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=_AUTHENTICATION_REQUIRED_DETAIL,
        headers={"WWW-Authenticate": "Bearer"},
    )


def _to_authenticated_principal(payload: dict[str, object]) -> AuthenticatedPrincipal | None:
    role = payload.get("role")
    tenant_id = payload.get("tenant_id")

    if not isinstance(role, str) or role not in _USER_ROLES:
        return None
    if not isinstance(tenant_id, str) or not tenant_id:
        return None

    return AuthenticatedPrincipal(role=cast(UserRole, role), tenant_id=tenant_id)


def create_jwt_authentication_dependency(
    config: JwtValidationConfig,
) -> Callable[..., Awaitable[AuthenticatedPrincipal]]:
    """Create a FastAPI dependency that validates Node-issued access JWTs."""

    bearer_scheme = HTTPBearer(auto_error=False)
    jwks_key_provider = _JwksKeyProvider(config.jwks_url)

    async def require_authenticated_principal(
        credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),  # noqa: B008
    ) -> AuthenticatedPrincipal:
        if credentials is None:
            raise _authentication_required()

        try:
            signing_key = await jwks_key_provider.get_signing_key(credentials.credentials)
            algorithms = ["RS256"]

            payload = jwt.decode(
                credentials.credentials,
                signing_key,
                algorithms=algorithms,
                issuer=config.issuer,
                options={"require": ["exp"]},
            )
        except (OSError, ValueError, _JwksKeyNotFoundError, jwt.PyJWTError):
            raise _authentication_required() from None

        principal = _to_authenticated_principal(payload)
        if principal is None:
            raise _authentication_required()

        return principal

    return require_authenticated_principal
