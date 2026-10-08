"""
Aegis Root API Router
"""
from fastapi import APIRouter
from backend.app.api.health import router as health_router
from backend.app.api.safety import router as safety_router
from backend.app.api.approvals import router as approvals_router
from backend.app.api.plan import router as plan_router
from backend.app.api.auth import router as auth_router
from backend.app.api.tools import router as tools_router

api_router = APIRouter(prefix="/api")

api_router.include_router(health_router)
api_router.include_router(safety_router)
api_router.include_router(approvals_router)
api_router.include_router(plan_router)
api_router.include_router(auth_router)
api_router.include_router(tools_router)
