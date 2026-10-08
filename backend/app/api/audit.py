"""
Aegis Audit Ledger API Endpoints
Provides endpoints for retrieving append-only cryptographic audit logs and
verifying complete hash-chain integrity.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.agent.audit_ledger import audit_ledger
from backend.app.core.database import get_db
from backend.app.schemas.audit import AuditEventRead, AuditVerificationResult

router = APIRouter(prefix="/audit", tags=["Audit Ledger"])


@router.get("/plan/{plan_id}", response_model=List[AuditEventRead])
async def get_plan_audit_events(
    plan_id: str,
    limit: int = Query(default=200, ge=1, le=1000),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db)
) -> List[AuditEventRead]:
    """
    Retrieves chronological, secret-scrubbed audit ledger events for a specific plan.
    """
    return await audit_ledger.get_plan_events(
        plan_id=plan_id,
        db=db,
        limit=limit,
        offset=offset
    )


@router.get("/verify/{plan_id}", response_model=AuditVerificationResult)
async def verify_plan_audit_integrity(
    plan_id: str,
    db: AsyncSession = Depends(get_db)
) -> AuditVerificationResult:
    """
    Cryptographically verifies the complete sequential SHA-256 hash chain for a plan.
    Detects any payload tampering, deleted events, or modified hash links.
    """
    return await audit_ledger.verify_plan_chain(
        plan_id=plan_id,
        db=db
    )


@router.get("/events", response_model=List[AuditEventRead])
async def list_audit_events(
    plan_id: Optional[str] = Query(default=None, description="Optional plan ID filter"),
    limit: int = Query(default=50, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db)
) -> List[AuditEventRead]:
    """
    Retrieves paginated audit events across all plans or filtered by plan_id.
    """
    return await audit_ledger.get_all_events(
        db=db,
        plan_id=plan_id,
        limit=limit,
        offset=offset
    )
