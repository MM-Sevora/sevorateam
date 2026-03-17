"""
Employee Models - Separate from User (Auth) models
Clean Architecture: User = Auth, Employee = HR Data
"""

from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict
from enum import Enum
from datetime import datetime


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


class EmployeeCreate(BaseModel):
    """Create a new employee record (link to existing user)"""
    user_id: str  # Links to users collection
    employee_code: Optional[str] = None  # EMP-0001 format, auto-generated if not provided
    
    # Organization
    department_id: Optional[str] = None
    team_id: Optional[str] = None
    position_id: Optional[str] = None
    grade_id: Optional[str] = None
    reports_to: Optional[str] = None  # Employee ID of manager
    secondary_manager_id: Optional[str] = None
    
    # Employment Details
    designation: Optional[str] = None
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
    bio: Optional[str] = None
    skills: List[str] = []
    certifications: List[str] = []
    
    # Location/Workspace
    work_location: Optional[str] = None
    desk_number: Optional[str] = None
    work_phone: Optional[str] = None


class EmployeeUpdate(BaseModel):
    """Update employee HR data"""
    department_id: Optional[str] = None
    team_id: Optional[str] = None
    position_id: Optional[str] = None
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
    bio: Optional[str] = None
    skills: Optional[List[str]] = None
    certifications: Optional[List[str]] = None
    work_location: Optional[str] = None
    desk_number: Optional[str] = None
    work_phone: Optional[str] = None


class EmployeeResponse(BaseModel):
    """Employee response with enriched data"""
    id: str  # Employee collection ID
    user_id: str  # Link to users collection
    employee_code: Optional[str] = None  # EMP-0001 (may also be stored as employee_id)
    
    # From users collection (joined)
    email: str
    name: str
    avatar_url: Optional[str] = None
    
    # Organization
    department_id: Optional[str] = None
    department_name: Optional[str] = None
    team_id: Optional[str] = None
    team_name: Optional[str] = None
    position_id: Optional[str] = None
    position_title: Optional[str] = None
    grade_id: Optional[str] = None
    grade_name: Optional[str] = None
    role_id: Optional[str] = None
    role_name: Optional[str] = None
    custom_role_ids: List[str] = []
    custom_role_names: List[str] = []
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
    bio: Optional[str] = None
    skills: List[str] = []
    
    # Team
    direct_reports_count: int = 0
    
    # Metadata
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    
    class Config:
        extra = "ignore"


class EmployeeDetailResponse(EmployeeResponse):
    """Extended employee response with all details"""
    # Personal
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    blood_group: Optional[str] = None
    
    # Address
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    
    # Emergency Contact
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    emergency_contact_relation: Optional[str] = None
    
    # Bank Details (masked for security)
    bank_name: Optional[str] = None
    has_bank_details: bool = False
    
    # Profile
    certifications: List[str] = []
    desk_number: Optional[str] = None
    
    # Reporting
    direct_reports: List[Dict] = []
    reporting_chain: List[Dict] = []
