"""
Marketing Routes Package - Refactored from monolithic marketing_v2.py

Strategy: Progressive migration
- New modular routes are in this package
- Original marketing_v2.py still handles routes not yet migrated
- Eventually, marketing_v2.py will be deprecated

Phase 1 Modules (NEW):
- Digital Ads Management (/marketing/v3/ads)
- Creative Asset Management (/marketing/v3/assets)
"""

from fastapi import APIRouter

# Create main marketing router for NEW modular routes only
# This will coexist with marketing_v2_router during migration
marketing_modular_router = APIRouter(prefix="/marketing/v3", tags=["Marketing V3 (Modular)"])

# Import completed sub-routers
from .contacts import router as contacts_router
from .publications import router as publications_router
from .campaigns import router as campaigns_router
from .deals import router as deals_router

# Phase 1: Digital Ads & Creative Assets (NEW)
from .ads import router as ads_router
from .assets_v2 import router as assets_v2_router

# Include completed sub-routers
marketing_modular_router.include_router(contacts_router)
marketing_modular_router.include_router(publications_router)
marketing_modular_router.include_router(campaigns_router)
marketing_modular_router.include_router(deals_router)

# Phase 1 routes
marketing_modular_router.include_router(ads_router)
marketing_modular_router.include_router(assets_v2_router)

# The following routers are stubs - routes still served by marketing_v2.py
# from .pipeline import router as pipeline_router
# from .pr import router as pr_router
# from .outreach import router as outreach_router
# from .ai import router as ai_router
# from .monitoring import router as monitoring_router
# from .calendar import router as calendar_router
# from .activity import router as activity_router
# from .relationships import router as relationships_router
# from .deliveries import router as deliveries_router
# from .microsoft import router as microsoft_router

__all__ = ['marketing_modular_router']
