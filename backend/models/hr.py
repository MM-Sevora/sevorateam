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
    FREELANCER = "freelancer"


class EmploymentStatus(str, Enum):
    ACTIVE = "active"
    ON_NOTICE = "on_notice"
    ON_LEAVE = "on_leave"
    TERMINATED = "terminated"
    RESIGNED = "resigned"
    PROBATION = "probation"


class EmployeeCreate(BaseModel):
    # Basic Info
    email: EmailStr
    name: str
    employee_id: Optional[str] = None  # Employee code like EMP001
    
    # Organization
    department_id: str
    role_id: Optional[str] = None
    grade_id: Optional[str] = None
    reports_to: Optional[str] = None  # Manager's user ID
    
    # Employment Details
    title: Optional[str] = None  # Job title
    employment_type: EmploymentType = EmploymentType.FULL_TIME
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
    role_id: Optional[str] = None
    grade_id: Optional[str] = None
    reports_to: Optional[str] = None
    title: Optional[str] = None
    employment_type: Optional[EmploymentType] = None
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
    role_id: Optional[str] = None
    role_name: Optional[str] = None
    grade_id: Optional[str] = None
    grade_name: Optional[str] = None
    reports_to: Optional[str] = None
    manager_name: Optional[str] = None
    
    # Employment
    title: Optional[str] = None
    employment_type: str = "full_time"
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


# ============== DEFAULT GRADE TYPES ==============

DEFAULT_GRADE_TYPES = [
    {
        "name": "L1 - Trainee",
        "code": "L1",
        "category": "entry",
        "level": 1,
        "min_experience_years": 0,
        "max_experience_years": 1,
        "description": "Entry level trainee position",
        "color": "#9E9E9E",
        "benefits": ["Health Insurance"]
    },
    {
        "name": "L2 - Junior Associate",
        "code": "L2",
        "category": "entry",
        "level": 2,
        "min_experience_years": 1,
        "max_experience_years": 2,
        "description": "Junior level associate",
        "color": "#8BC34A",
        "benefits": ["Health Insurance", "Leave Encashment"]
    },
    {
        "name": "L3 - Associate",
        "code": "L3",
        "category": "associate",
        "level": 3,
        "min_experience_years": 2,
        "max_experience_years": 4,
        "description": "Associate level",
        "color": "#4CAF50",
        "benefits": ["Health Insurance", "Leave Encashment", "Bonus Eligible"]
    },
    {
        "name": "L4 - Senior Associate",
        "code": "L4",
        "category": "mid",
        "level": 4,
        "min_experience_years": 4,
        "max_experience_years": 6,
        "description": "Senior Associate with specialized expertise",
        "color": "#2196F3",
        "benefits": ["Health Insurance", "Leave Encashment", "Bonus Eligible", "Work From Home"]
    },
    {
        "name": "L5 - Lead",
        "code": "L5",
        "category": "lead",
        "level": 5,
        "min_experience_years": 6,
        "max_experience_years": 8,
        "description": "Team Lead with people management",
        "color": "#3F51B5",
        "benefits": ["Health Insurance", "Leave Encashment", "Bonus Eligible", "Work From Home", "Car Allowance"]
    },
    {
        "name": "M1 - Manager",
        "code": "M1",
        "category": "manager",
        "level": 6,
        "min_experience_years": 8,
        "max_experience_years": 12,
        "description": "Manager with department responsibilities",
        "color": "#9C27B0",
        "benefits": ["Health Insurance", "Leave Encashment", "Bonus Eligible", "Work From Home", "Car Allowance", "Stock Options"]
    },
    {
        "name": "M2 - Senior Manager",
        "code": "M2",
        "category": "manager",
        "level": 7,
        "min_experience_years": 12,
        "max_experience_years": 15,
        "description": "Senior Manager with multiple teams",
        "color": "#673AB7",
        "benefits": ["Health Insurance", "Leave Encashment", "Bonus Eligible", "Work From Home", "Car Allowance", "Stock Options", "Executive Health Checkup"]
    },
    {
        "name": "D1 - Director",
        "code": "D1",
        "category": "director",
        "level": 8,
        "min_experience_years": 15,
        "max_experience_years": 20,
        "description": "Director level with strategic responsibilities",
        "color": "#E91E63",
        "benefits": ["Health Insurance", "Leave Encashment", "Bonus Eligible", "Work From Home", "Car Allowance", "Stock Options", "Executive Health Checkup", "Club Membership"]
    },
    {
        "name": "VP - Vice President",
        "code": "VP",
        "category": "executive",
        "level": 9,
        "min_experience_years": 20,
        "max_experience_years": None,
        "description": "Vice President / C-Suite",
        "color": "#F44336",
        "benefits": ["Health Insurance", "Leave Encashment", "Bonus Eligible", "Work From Home", "Car Allowance", "Stock Options", "Executive Health Checkup", "Club Membership", "Housing Allowance"]
    }
]
