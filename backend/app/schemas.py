from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

class UserAuth(BaseModel):
    email: EmailStr
    password: str

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: Optional[str] = "employee"
    department: Optional[str] = "Engineering"
    job_title: Optional[str] = "Software Engineer"
    base_salary: Optional[float] = 8500.0

class ProfileResponse(BaseModel):
    user_id: str
    employee_id: str
    full_name: str
    email: str
    phone: Optional[str] = None
    address: Optional[str] = None
    date_of_birth: Optional[str] = None
    gender: Optional[str] = "Not specified"
    department: str
    job_title: str
    date_of_joining: str
    role: str
    status: str
    bank_account_number: Optional[str] = None
    bank_ifsc: Optional[str] = None
    pan_number: Optional[str] = None

class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    department: Optional[str] = None
    job_title: Optional[str] = None
    role: Optional[str] = None
    status: Optional[str] = None
    bank_account_number: Optional[str] = None
    bank_ifsc: Optional[str] = None
    pan_number: Optional[str] = None

class LeaveApplyRequest(BaseModel):
    leave_type: str
    start_date: str
    end_date: str
    remarks: str

class LeaveReviewRequest(BaseModel):
    request_id: str
    status: str
    comment: Optional[str] = None

class SalaryStructureUpdate(BaseModel):
    base_salary: float
    hra: Optional[float] = 0.0
    transport_allowance: Optional[float] = 0.0
    medical_allowance: Optional[float] = 0.0
    special_allowance: Optional[float] = 0.0
    provident_fund: Optional[float] = 0.0
    tax_deduction: Optional[float] = 0.0
    insurance_deduction: Optional[float] = 0.0

class AttendanceCheckIn(BaseModel):
    notes: Optional[str] = None

class AttendanceAdjustment(BaseModel):
    profile_id: str
    date: str
    status: str
    check_in: Optional[str] = None
    check_out: Optional[str] = None
    notes: Optional[str] = None
