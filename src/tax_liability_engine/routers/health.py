"""Health check router for the TaxPulse HTTP surface."""

from __future__ import annotations

from fastapi import APIRouter


def create_health_router() -> APIRouter:
    """Create the health route group for the FastAPI app."""

    router = APIRouter(tags=["health"])

    @router.get("/health")
    async def health() -> dict[str, str]:
        return {"status": "ok"}

    return router
