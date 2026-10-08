"""
Aegis Root API Router
"""
from fastapi import APIRouter
from backend.app.api.health import router as health_router
from backend.app.api.safety import router as safety_router
from backend.app.api.approvals import router as approvals_router

api_router = APIRouter(prefix="/api")

api_router.include_router(health_router)
api_router.include_router(safety_router)
api_router.include_router(approvals_router)
