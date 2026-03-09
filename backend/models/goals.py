"""
Goals & Objectives Module - Pydantic Models
Handles Strategic Goals, Financial Years, Quarters, and Objectives
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date
from enum import Enum


# ============ Enums ============

class GoalPriority(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class GoalStatus(str, Enum):
    PLANNING = "planning"
    ACTIVE = "active"
    COMPLETED = "completed"
    ARCHIVED = "archived"


class ObjectiveStatus(str, Enum):
    PLANNING = "planning"
    ACTIVE = "active"
    AT_RISK = "at_risk"
    DELAYED = "delayed"
    COMPLETED = "completed"


class FiscalYearStatus(str, Enum):
    ACTIVE = "active"
    ARCHIVED = "archived"


class KeyResultUnitType(str, Enum):
    NUMBER = "number"
    PERCENTAGE = "percentage"
    CURRENCY = "currency"
    MILESTONE = "milestone"


# ============ Fiscal Year Models ============

class FiscalYearCreate(BaseModel):
    name: str = Field(..., description="e.g., FY 2026-27")
    start_date: date
    end_date: date
    status: FiscalYearStatus = FiscalYearStatus.ACTIVE


class FiscalYearUpdate(BaseModel):
    name: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    status: Optional[FiscalYearStatus] = None


class FiscalYearResponse(BaseModel):
    id: str
    name: str
    start_date: date
    end_date: date
    status: FiscalYearStatus
    quarters: List[dict] = []
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# ============ Quarter Models ============

class QuarterCreate(BaseModel):
    name: str = Field(..., description="e.g., Q1")
    fiscal_year_id: str
    start_date: date
    end_date: date


class QuarterUpdate(BaseModel):
    name: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None


class QuarterResponse(BaseModel):
    id: str
    name: str
    fiscal_year_id: str
    fiscal_year_name: Optional[str] = None
    start_date: date
    end_date: date
    created_at: Optional[datetime] = None


# ============ Strategic Goal Models ============

class StrategicGoalCreate(BaseModel):
    title: str
    description: Optional[str] = None
    fiscal_year_id: str
    owner_id: Optional[str] = None
    priority: GoalPriority = GoalPriority.MEDIUM
    status: GoalStatus = GoalStatus.PLANNING


class StrategicGoalUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    fiscal_year_id: Optional[str] = None
    owner_id: Optional[str] = None
    priority: Optional[GoalPriority] = None
    status: Optional[GoalStatus] = None


class StrategicGoalResponse(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    fiscal_year_id: str
    fiscal_year_name: Optional[str] = None
    owner_id: Optional[str] = None
    owner_name: Optional[str] = None
    priority: GoalPriority
    status: GoalStatus
    objectives_count: int = 0
    objectives_completed: int = 0
    progress: float = 0.0
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# ============ Objective Models ============

class ObjectiveCreate(BaseModel):
    title: str
    description: Optional[str] = None
    strategic_goal_id: str
    fiscal_year_id: str
    quarter_ids: List[str] = []  # Changed to array for multi-select
    department: Optional[str] = None
    owner_id: Optional[str] = None
    sponsor_id: Optional[str] = None
    priority: GoalPriority = GoalPriority.MEDIUM
    status: ObjectiveStatus = ObjectiveStatus.PLANNING
    start_date: Optional[date] = None
    target_date: Optional[date] = None


class ObjectiveUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    strategic_goal_id: Optional[str] = None
    fiscal_year_id: Optional[str] = None
    quarter_ids: Optional[List[str]] = None  # Changed to array for multi-select
    department: Optional[str] = None
    owner_id: Optional[str] = None
    sponsor_id: Optional[str] = None
    priority: Optional[GoalPriority] = None
    status: Optional[ObjectiveStatus] = None
    start_date: Optional[date] = None
    target_date: Optional[date] = None
    progress: Optional[float] = None


class ObjectiveResponse(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    strategic_goal_id: str
    strategic_goal_title: Optional[str] = None
    fiscal_year_id: str
    fiscal_year_name: Optional[str] = None
    quarter_ids: List[str] = []  # Changed to array for multi-select
    quarter_id: Optional[str] = None  # Keep for backward compatibility
    quarter_name: Optional[str] = None  # Primary quarter name (first in list)
    quarter_names: List[str] = []  # All quarter names
    department: Optional[str] = None
    owner_id: Optional[str] = None
    owner_name: Optional[str] = None
    sponsor_id: Optional[str] = None
    sponsor_name: Optional[str] = None
    priority: GoalPriority
    status: ObjectiveStatus
    start_date: Optional[date] = None
    target_date: Optional[date] = None
    progress: float = 0.0
    linked_projects_count: int = 0
    key_results_count: int = 0
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# ============ Key Result Models ============

class KeyResultCreate(BaseModel):
    title: str
    objective_id: str
    target_value: float
    current_value: float = 0.0
    unit_type: KeyResultUnitType = KeyResultUnitType.NUMBER
    status: ObjectiveStatus = ObjectiveStatus.PLANNING


class KeyResultUpdate(BaseModel):
    title: Optional[str] = None
    target_value: Optional[float] = None
    current_value: Optional[float] = None
    unit_type: Optional[KeyResultUnitType] = None
    status: Optional[ObjectiveStatus] = None


class KeyResultResponse(BaseModel):
    id: str
    title: str
    objective_id: str
    target_value: float
    current_value: float
    unit_type: KeyResultUnitType
    progress: float = 0.0
    status: ObjectiveStatus
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# ============ Objective Update (Progress Update) Models ============

class ObjectiveProgressUpdateCreate(BaseModel):
    objective_id: str
    progress: float
    note: Optional[str] = None
    blockers: Optional[str] = None


class ObjectiveProgressUpdateResponse(BaseModel):
    id: str
    objective_id: str
    progress: float
    note: Optional[str] = None
    blockers: Optional[str] = None
    updated_by_id: str
    updated_by_name: Optional[str] = None
    created_at: datetime


# ============ Dashboard Models ============

class GoalsDashboardResponse(BaseModel):
    fiscal_year: Optional[dict] = None
    total_goals: int = 0
    goals_by_status: dict = {}
    total_objectives: int = 0
    objectives_completed: int = 0
    objectives_in_progress: int = 0
    objectives_delayed: int = 0
    quarterly_progress: List[dict] = []
    objectives_by_department: List[dict] = []
    delayed_objectives: List[dict] = []
    recent_updates: List[dict] = []
