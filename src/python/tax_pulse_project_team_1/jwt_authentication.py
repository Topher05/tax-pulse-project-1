"""FastAPI authentication dependency for shared TaxPulse access JWTs."""

from __future__ import annotations

import os
from collections.abc import Awaitable, Callable, Mapping
from dataclasses import dataclass
from typing import Literal, cast

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

UserRole = Literal["Firm Admin", "Advisor", "Client", "TaxPulse Platform Admin"]

_USER_ROLES: frozenset[str] = frozenset(
    {"Firm Admin", "Advisor", "Client", "TaxPulse Platform Admin"}
)
_AUTHENTICATION_REQUIRED_DETAIL = "A valid access token is required."


@dataclass(frozen=True)
class JwtValidationConfig:
    """Shared HMAC JWT configuration supplied by the service environment."""

    issuer: str
    signing_secret: str

    @classmethod
    def from_environment(cls, environment: Mapping[str, str] | None = None) -> JwtValidationConfig:
        """Load the shared Node JWT configuration without reading it at import time."""

        values = os.environ if environment is None else environment
        issuer = values.get("JWT_ISSUER", "").strip()
        signing_secret = values.get("JWT_SIGNING_SECRET", "")

        if not issuer:
            raise ValueError("JWT_ISSUER is required.")
        if not signing_secret.strip():
            raise ValueError("JWT_SIGNING_SECRET is required.")
        if len(signing_secret.encode("utf-8")) < 32:
            raise ValueError("JWT_SIGNING_SECRET must contain at least 32 UTF-8 bytes.")

        return cls(issuer=issuer, signing_secret=signing_secret)


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
    """Create a FastAPI dependency that validates Node-issued HS256 access JWTs."""

    bearer_scheme = HTTPBearer(auto_error=False)

    async def require_authenticated_principal(
        credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),  # noqa: B008
    ) -> AuthenticatedPrincipal:
        if credentials is None:
            raise _authentication_required()

        try:
            payload = jwt.decode(
                credentials.credentials,
                config.signing_secret,
                algorithms=["HS256"],
                issuer=config.issuer,
                options={"require": ["exp"]},
            )
        except jwt.InvalidTokenError:
            raise _authentication_required() from None

        principal = _to_authenticated_principal(payload)
        if principal is None:
            raise _authentication_required()

        return principal

    return require_authenticated_principal
