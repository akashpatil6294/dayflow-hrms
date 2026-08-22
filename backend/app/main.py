from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, get_db
from . import models

# Initialize SQLAlchemy Tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Dayflow HRMS API",
    description="Enterprise Human Resource Management System with SQLite Persistence & RBAC",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    return {"status": "ok", "app": "Dayflow HRMS FastAPI Backend"}
