import enum
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, ForeignKey, Enum, Text
from sqlalchemy.orm import relationship, declarative_base

Base = declarative_base()

class UserRole(str, enum.Enum):
    ADMIN = "admin"
    EMPLOYEE = "employee"

class AttendanceStatus(str, enum.Enum):
    PRESENT = "present"
    ABSENT = "absent"
    HALF_DAY = "half_day"
    LEAVE = "leave"

class LeaveType(str, enum.Enum):
    PAID = "paid"
    SICK = "sick"
    UNPAID = "unpaid"

class LeaveStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(UserRole), default=UserRole.EMPLOYEE, nullable=False)
    is_active = Column(Boolean, default=True)
    email_verified = Column(Boolean, default=False)
    verification_token = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    profile = relationship("Profile", back_populates="user", uselist=False)

class Profile(Base):
    __tablename__ = "profiles"

    user_id = Column(String, ForeignKey("users.id"), primary_key=True)
    employee_id = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    address = Column(Text, nullable=True)
    date_of_birth = Column(String, nullable=True)
    gender = Column(String, default="Not specified")
    department = Column(String, nullable=False)
    job_title = Column(String, nullable=False)
    date_of_joining = Column(String, nullable=False)
    profile_picture_file_id = Column(String, nullable=True)
    bank_account_number = Column(String, nullable=True)
    bank_ifsc = Column(String, nullable=True)
    pan_number = Column(String, nullable=True)
    status = Column(String, default="active")
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="profile")
    attendance = relationship("Attendance", back_populates="profile")
    leave_requests = relationship("LeaveRequest", foreign_keys="[LeaveRequest.profile_id]", back_populates="profile")
    salary_structure = relationship("SalaryStructure", back_populates="profile", uselist=False)

class Attendance(Base):
    __tablename__ = "attendance"

    id = Column(String, primary_key=True, index=True)
    profile_id = Column(String, ForeignKey("profiles.user_id"), nullable=False)
    date = Column(String, nullable=False, index=True)
    check_in = Column(DateTime, nullable=True)
    check_out = Column(DateTime, nullable=True)
    status = Column(Enum(AttendanceStatus), default=AttendanceStatus.PRESENT)
    hours_worked = Column(Float, nullable=True)
    notes = Column(Text, nullable=True)

    profile = relationship("Profile", back_populates="attendance")

class LeaveRequest(Base):
    __tablename__ = "leave_requests"

    id = Column(String, primary_key=True, index=True)
    profile_id = Column(String, ForeignKey("profiles.user_id"), nullable=False)
    leave_type = Column(Enum(LeaveType), nullable=False)
    start_date = Column(String, nullable=False)
    end_date = Column(String, nullable=False)
    days_count = Column(Integer, nullable=False)
    remarks = Column(Text, nullable=False)
    status = Column(Enum(LeaveStatus), default=LeaveStatus.PENDING)
    reviewed_by = Column(String, ForeignKey("profiles.user_id"), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    review_comment = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    profile = relationship("Profile", foreign_keys=[profile_id], back_populates="leave_requests")

class LeaveBalance(Base):
    __tablename__ = "leave_balances"

    id = Column(String, primary_key=True, index=True)
    profile_id = Column(String, ForeignKey("profiles.user_id"), nullable=False)
    leave_type = Column(Enum(LeaveType), nullable=False)
    total_days = Column(Integer, default=15)
    used_days = Column(Integer, default=0)
    year = Column(Integer, default=2026)

class SalaryStructure(Base):
    __tablename__ = "salary_structures"

    id = Column(String, primary_key=True, index=True)
    profile_id = Column(String, ForeignKey("profiles.user_id"), unique=True, nullable=False)
    base_salary = Column(Float, default=8000.0)
    hra = Column(Float, default=2000.0)
    transport_allowance = Column(Float, default=400.0)
    medical_allowance = Column(Float, default=300.0)
    special_allowance = Column(Float, default=800.0)
    provident_fund = Column(Float, default=680.0)
    tax_deduction = Column(Float, default=1200.0)
    insurance_deduction = Column(Float, default=250.0)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    profile = relationship("Profile", back_populates="salary_structure")

class Document(Base):
    __tablename__ = "documents"

    id = Column(String, primary_key=True, index=True)
    profile_id = Column(String, ForeignKey("profiles.user_id"), nullable=False)
    file_name = Column(String, nullable=False)
    file_type = Column(String, nullable=False)
    file_size = Column(Integer, nullable=False)
    storage_path = Column(String, nullable=False)
    uploaded_by = Column(String, ForeignKey("profiles.user_id"), nullable=False)
    uploaded_at = Column(DateTime, default=datetime.utcnow)

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String, primary_key=True, index=True)
    profile_id = Column(String, ForeignKey("profiles.user_id"), nullable=False)
    type = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    related_entity_id = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
