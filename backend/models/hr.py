"""
HR Models - Employee Database, Grade Types, Reporting Structure
"""

from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict
from enum import Enum
from datetime import datetime


# ============== GRADE TYPE MODELS ==============

class GradeCategory(str, Enum):
    ENTRY = "entry"
    ASSOCIATE = "associate"
    MID = "mid"
    SENIOR = "senior"
    LEAD = "lead"
    MANAGER = "manager"
    DIRECTOR = "director"
    EXECUTIVE = "executive"


class GradeTypeCreate(BaseModel):
    name: str  # e.g., "L1 - Junior", "L4 - Senior"
    code: str  # e.g., "L1", "L4", "M1"
    category: GradeCategory = GradeCategory.ENTRY
    level: int = Field(ge=1, le=20, default=1)  # Numeric level for sorting
    min_experience_years: Optional[float] = None  # Minimum years of experience
    max_experience_years: Optional[float] = None
    description: Optional[str] = None
    salary_band_min: Optional[float] = None  # Min salary for this grade
    salary_band_max: Optional[float] = None
    currency: str = "INR"
    benefits: List[str] = []  # List of benefits/perks for this grade
    color: str = "#8B7355"


class GradeTypeUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[GradeCategory] = None
    level: Optional[int] = None
    min_experience_years: Optional[float] = None
    max_experience_years: Optional[float] = None
    description: Optional[str] = None
    salary_band_min: Optional[float] = None
    salary_band_max: Optional[float] = None
    currency: Optional[str] = None
    benefits: Optional[List[str]] = None
    color: Optional[str] = None
    is_active: Optional[bool] = None


class GradeTypeResponse(BaseModel):
    id: str
    name: str
    code: str
    category: str
    level: int
    min_experience_years: Optional[float] = None
    max_experience_years: Optional[float] = None
    description: Optional[str] = None
    salary_band_min: Optional[float] = None
    salary_band_max: Optional[float] = None
    currency: str = "INR"
    benefits: List[str] = []
    color: str = "#8B7355"
    is_active: bool = True
    employee_count: int = 0
    created_at: str
    updated_at: str


# ============== EMPLOYEE MODELS ==============

class EmploymentType(str, Enum):
    FULL_TIME = "full_time"
    PART_TIME = "part_time"
    CONTRACT = "contract"
    INTERN = "intern"
    CONSULTANT = "consultant"


class EmploymentStatus(str, Enum):
    ACTIVE = "active"
    PROBATION = "probation"
    CONFIRMED = "confirmed"
    NOTICE_PERIOD = "notice_period"
    RESIGNED = "resigned"
    TERMINATED = "terminated"


class WorkMode(str, Enum):
    OFFICE = "office"
    HYBRID = "hybrid"
    REMOTE = "remote"


# ============== POSITION MODELS ==============

class PositionLevel(str, Enum):
    CEO = "ceo"
    VP = "vp"
    DIRECTOR = "director"
    MANAGER = "manager"
    LEAD = "lead"
    EXECUTIVE = "executive"
    ASSOCIATE = "associate"


class PositionCreate(BaseModel):
    title: str  # e.g., "Marketing Head", "Senior Developer"
    code: str  # e.g., "MKT-HEAD", "SR-DEV"
    level: PositionLevel = PositionLevel.ASSOCIATE
    department_id: Optional[str] = None
    reporting_position_id: Optional[str] = None  # Parent position
    description: Optional[str] = None
    is_active: bool = True


class PositionUpdate(BaseModel):
    title: Optional[str] = None
    level: Optional[PositionLevel] = None
    department_id: Optional[str] = None
    reporting_position_id: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class PositionResponse(BaseModel):
    id: str
    title: str
    code: str
    level: str
    department_id: Optional[str] = None
    department_name: Optional[str] = None
    reporting_position_id: Optional[str] = None
    reporting_position_title: Optional[str] = None
    description: Optional[str] = None
    is_active: bool = True
    employee_count: int = 0
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    
    class Config:
        extra = "ignore"


# ============== TEAM MODELS ==============

class TeamCreate(BaseModel):
    name: str
    code: str
    department_id: str
    team_lead_id: Optional[str] = None
    description: Optional[str] = None


class TeamUpdate(BaseModel):
    name: Optional[str] = None
    department_id: Optional[str] = None
    team_lead_id: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class TeamResponse(BaseModel):
    id: str
    name: str
    code: str
    department_id: str
    department_name: Optional[str] = None
    team_lead_id: Optional[str] = None
    team_lead_name: Optional[str] = None
    description: Optional[str] = None
    member_count: int = 0
    is_active: bool = True
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    
    class Config:
        extra = "ignore"


class EmployeeCreate(BaseModel):
    # Basic Info
    email: EmailStr
    name: str
    employee_id: Optional[str] = None  # Employee code like EMP-0001
    
    # Organization
    department_id: str
    team_id: Optional[str] = None  # Team within department
    position_id: Optional[str] = None  # Position in hierarchy
    role_id: Optional[str] = None  # System role for access
    grade_id: Optional[str] = None
    reports_to: Optional[str] = None  # Primary Manager's user ID
    secondary_manager_id: Optional[str] = None  # Secondary/Dotted line manager
    
    # Employment Details
    designation: Optional[str] = None  # Job title/designation
    employment_type: EmploymentType = EmploymentType.FULL_TIME
    work_mode: WorkMode = WorkMode.OFFICE
    joining_date: Optional[str] = None
    probation_end_date: Optional[str] = None
    confirmation_date: Optional[str] = None
    
    # Personal
    phone: Optional[str] = None
    personal_email: Optional[str] = None
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    blood_group: Optional[str] = None
    
    # Address
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: str = "India"
    postal_code: Optional[str] = None
    
    # Emergency Contact
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    emergency_contact_relation: Optional[str] = None
    
    # Bank Details
    bank_name: Optional[str] = None
    bank_account_number: Optional[str] = None
    bank_ifsc: Optional[str] = None
    pan_number: Optional[str] = None
    
    # Profile
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    skills: List[str] = []
    certifications: List[str] = []
    
    # Location/Workspace
    work_location: Optional[str] = None  # Office location
    desk_number: Optional[str] = None
    work_phone: Optional[str] = None


class EmployeeUpdate(BaseModel):
    name: Optional[str] = None
    employee_id: Optional[str] = None
    department_id: Optional[str] = None
    team_id: Optional[str] = None
    position_id: Optional[str] = None
    role_id: Optional[str] = None
    grade_id: Optional[str] = None
    reports_to: Optional[str] = None
    secondary_manager_id: Optional[str] = None
    designation: Optional[str] = None
    employment_type: Optional[EmploymentType] = None
    work_mode: Optional[WorkMode] = None
    status: Optional[EmploymentStatus] = None
    joining_date: Optional[str] = None
    probation_end_date: Optional[str] = None
    confirmation_date: Optional[str] = None
    exit_date: Optional[str] = None
    exit_reason: Optional[str] = None
    phone: Optional[str] = None
    personal_email: Optional[str] = None
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    blood_group: Optional[str] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    postal_code: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    emergency_contact_relation: Optional[str] = None
    bank_name: Optional[str] = None
    bank_account_number: Optional[str] = None
    bank_ifsc: Optional[str] = None
    pan_number: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    skills: Optional[List[str]] = None
    certifications: Optional[List[str]] = None
    work_location: Optional[str] = None
    desk_number: Optional[str] = None
    work_phone: Optional[str] = None


class EmployeeResponse(BaseModel):
    id: str
    email: str
    name: str
    employee_id: Optional[str] = None
    
    # Organization
    department_id: Optional[str] = None
    department_name: Optional[str] = None
    team_id: Optional[str] = None
    team_name: Optional[str] = None
    position_id: Optional[str] = None
    position_title: Optional[str] = None
    role_id: Optional[str] = None
    role_name: Optional[str] = None
    grade_id: Optional[str] = None
    grade_name: Optional[str] = None
    reports_to: Optional[str] = None
    manager_name: Optional[str] = None
    secondary_manager_id: Optional[str] = None
    secondary_manager_name: Optional[str] = None
    
    # Employment
    designation: Optional[str] = None
    employment_type: str = "full_time"
    work_mode: str = "office"
    status: str = "active"
    joining_date: Optional[str] = None
    probation_end_date: Optional[str] = None
    confirmation_date: Optional[str] = None
    exit_date: Optional[str] = None
    years_of_service: Optional[float] = None
    
    # Contact
    phone: Optional[str] = None
    personal_email: Optional[str] = None
    work_phone: Optional[str] = None
    
    # Location
    work_location: Optional[str] = None
    city: Optional[str] = None
    country: str = "India"
    
    # Profile
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    skills: List[str] = []
    
    # Team
    direct_reports_count: int = 0
    direct_reports: List[str] = []
    
    # Metadata
    last_login: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    
    class Config:
        extra = "ignore"  # Ignore extra fields from MongoDB


class EmployeeDetailResponse(EmployeeResponse):
    """Full employee details including sensitive information"""
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    blood_group: Optional[str] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    emergency_contact_relation: Optional[str] = None
    bank_name: Optional[str] = None
    bank_account_number: Optional[str] = None
    bank_ifsc: Optional[str] = None
    pan_number: Optional[str] = None
    certifications: List[str] = []
    desk_number: Optional[str] = None
    exit_reason: Optional[str] = None
    
    class Config:
        extra = "ignore"  # Ignore extra fields from MongoDB


# ============== ORG CHART MODELS ==============

class OrgChartNode(BaseModel):
    id: str
    name: str
    title: Optional[str] = None
    department_name: Optional[str] = None
    grade_name: Optional[str] = None
    avatar_url: Optional[str] = None
    email: str
    children: List["OrgChartNode"] = []


# ============== REPORTING STRUCTURE ==============

class ReportingLineCreate(BaseModel):
    employee_id: str
    manager_id: str
    start_date: str
    is_primary: bool = True  # Primary reporting line
    relationship_type: str = "direct"  # direct, dotted_line, matrix


class ReportingLineResponse(BaseModel):
    id: str
    employee_id: str
    employee_name: str
    manager_id: str
    manager_name: str
    start_date: str
    end_date: Optional[str] = None
    is_primary: bool = True
    relationship_type: str = "direct"
    is_active: bool = True


# ============== ENHANCED DEPARTMENT MODELS ==============

class DepartmentEnhancedUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    parent_department_id: Optional[str] = None  # For hierarchy
    department_head_id: Optional[str] = None  # Department head employee
    is_active: Optional[bool] = None


class DepartmentEnhancedResponse(BaseModel):
    id: str
    name: str
    code: str
    description: Optional[str] = None
    color: str = "#8B7355"
    icon: str = "Building2"
    parent_department_id: Optional[str] = None
    parent_department_name: Optional[str] = None
    department_head_id: Optional[str] = None
    department_head_name: Optional[str] = None
    member_count: int = 0
    team_count: int = 0
    is_active: bool = True
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    
    class Config:
        extra = "ignore"


# ============== DEFAULT POSITION HIERARCHY ==============

DEFAULT_POSITIONS = [
    {"title": "CEO", "code": "CEO", "level": "ceo", "description": "Chief Executive Officer"},
    {"title": "Vice President", "code": "VP", "level": "vp", "description": "Vice President"},
    {"title": "Director", "code": "DIR", "level": "director", "description": "Director level"},
    {"title": "Senior Manager", "code": "SR-MGR", "level": "manager", "description": "Senior Manager"},
    {"title": "Manager", "code": "MGR", "level": "manager", "description": "Manager"},
    {"title": "Team Lead", "code": "TL", "level": "lead", "description": "Team Lead"},
    {"title": "Senior Executive", "code": "SR-EXEC", "level": "executive", "description": "Senior Executive"},
    {"title": "Executive", "code": "EXEC", "level": "executive", "description": "Executive"},
    {"title": "Associate", "code": "ASSOC", "level": "associate", "description": "Associate"},
]


# ============== DEFAULT GRADE TYPES ==============

DEFAULT_GRADE_TYPES = [
    {
        "name": "Grade I",
        "code": "G1",
        "category": "entry",
        "level": 1,
        "min_experience_years": 0,
        "max_experience_years": 1,
        "description": "Entry level position",
        "color": "#9E9E9E",
        "benefits": ["Health Insurance"]
    },
    {
        "name": "Grade II",
        "code": "G2",
        "category": "entry",
        "level": 2,
        "min_experience_years": 1,
        "max_experience_years": 2,
        "description": "Junior level position",
        "color": "#8BC34A",
        "benefits": ["Health Insurance", "Leave Encashment"]
    },
    {
        "name": "Grade III(A)",
        "code": "G3A",
        "category": "associate",
        "level": 3,
        "min_experience_years": 2,
        "max_experience_years": 3,
        "description": "Associate level - Band A",
        "color": "#4CAF50",
        "benefits": ["Health Insurance", "Leave Encashment", "Bonus Eligible"]
    },
    {
        "name": "Grade III(B)",
        "code": "G3B",
        "category": "associate",
        "level": 4,
        "min_experience_years": 3,
        "max_experience_years": 4,
        "description": "Associate level - Band B",
        "color": "#43A047",
        "benefits": ["Health Insurance", "Leave Encashment", "Bonus Eligible"]
    },
    {
        "name": "Grade IV(A)",
        "code": "G4A",
        "category": "mid",
        "level": 5,
        "min_experience_years": 4,
        "max_experience_years": 5,
        "description": "Mid level - Band A",
        "color": "#2196F3",
        "benefits": ["Health Insurance", "Leave Encashment", "Bonus Eligible", "Work From Home"]
    },
    {
        "name": "Grade IV(B)",
        "code": "G4B",
        "category": "mid",
        "level": 6,
        "min_experience_years": 5,
        "max_experience_years": 6,
        "description": "Mid level - Band B",
        "color": "#1E88E5",
        "benefits": ["Health Insurance", "Leave Encashment", "Bonus Eligible", "Work From Home"]
    },
    {
        "name": "Grade IV(C)",
        "code": "G4C",
        "category": "senior",
        "level": 7,
        "min_experience_years": 6,
        "max_experience_years": 7,
        "description": "Senior level - Band C",
        "color": "#3F51B5",
        "benefits": ["Health Insurance", "Leave Encashment", "Bonus Eligible", "Work From Home", "Car Allowance"]
    },
    {
        "name": "Grade IV(D)",
        "code": "G4D",
        "category": "senior",
        "level": 8,
        "min_experience_years": 7,
        "max_experience_years": 8,
        "description": "Senior level - Band D",
        "color": "#303F9F",
        "benefits": ["Health Insurance", "Leave Encashment", "Bonus Eligible", "Work From Home", "Car Allowance"]
    },
    {
        "name": "Grade V(A)",
        "code": "G5A",
        "category": "lead",
        "level": 9,
        "min_experience_years": 8,
        "max_experience_years": 10,
        "description": "Lead level - Band A",
        "color": "#9C27B0",
        "benefits": ["Health Insurance", "Leave Encashment", "Bonus Eligible", "Work From Home", "Car Allowance", "Stock Options"]
    },
    {
        "name": "Grade V(B)",
        "code": "G5B",
        "category": "manager",
        "level": 10,
        "min_experience_years": 10,
        "max_experience_years": 12,
        "description": "Manager level - Band B",
        "color": "#7B1FA2",
        "benefits": ["Health Insurance", "Leave Encashment", "Bonus Eligible", "Work From Home", "Car Allowance", "Stock Options", "Executive Health Checkup"]
    },
    {
        "name": "Grade V(C)",
        "code": "G5C",
        "category": "director",
        "level": 11,
        "min_experience_years": 12,
        "max_experience_years": 15,
        "description": "Director level - Band C",
        "color": "#E91E63",
        "benefits": ["Health Insurance", "Leave Encashment", "Bonus Eligible", "Work From Home", "Car Allowance", "Stock Options", "Executive Health Checkup", "Club Membership"]
    },
    {
        "name": "Grade V(D)",
        "code": "G5D",
        "category": "executive",
        "level": 12,
        "min_experience_years": 15,
        "max_experience_years": None,
        "description": "Executive level - Band D",
        "color": "#F44336",
        "benefits": ["Health Insurance", "Leave Encashment", "Bonus Eligible", "Work From Home", "Car Allowance", "Stock Options", "Executive Health Checkup", "Club Membership", "Housing Allowance"]
    }
]
