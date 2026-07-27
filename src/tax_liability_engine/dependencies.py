"""Shared FastAPI dependencies for the TaxPulse HTTP surface."""

from __future__ import annotations

from collections.abc import Awaitable, Callable

from fastapi import Depends

from .jwt_authentication import AuthenticatedPrincipal


def create_tenant_scope_dependency(
    require_authenticated_principal: Callable[..., Awaitable[AuthenticatedPrincipal]],
) -> Callable[..., Awaitable[str]]:
    """Return the authenticated tenant id so route handlers stay tenant-scoped."""

    async def require_tenant_id(
        principal: AuthenticatedPrincipal = Depends(require_authenticated_principal),  # noqa: B008
    ) -> str:
        return principal.tenant_id

    return require_tenant_id
