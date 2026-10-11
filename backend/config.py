import os
from pathlib import Path
from dotenv import load_dotenv

# Base backend directory
BASE_DIR = Path(__file__).resolve().parent

# Load .env file
load_dotenv(BASE_DIR / ".env")

class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "temporal-cti-forensics-secret-key-2026-prod-grade")
    JWT_EXPIRATION_HOURS = int(os.getenv("JWT_EXPIRATION_HOURS", "24"))
    
    # SQLite Database Path
    INSTANCE_DIR = BASE_DIR / "instance"
    INSTANCE_DIR.mkdir(parents=True, exist_ok=True)
    DATABASE_PATH = os.getenv("DATABASE_PATH", str(INSTANCE_DIR / "cti_forensics.db"))
    
    # Gemini AI configuration
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
    GEMINI_TIMEOUT_SECONDS = int(os.getenv("GEMINI_TIMEOUT_SECONDS", "30"))
    
    # CORS Configuration
    CORS_ORIGINS = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]
    
    # CTI Data & Synthetic Store
    DATA_DIR = BASE_DIR / "data"
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    SYNTHETIC_DATASET_PATH = DATA_DIR / "synthetic_cti_dataset.json"
    
    # Safety limits
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16 MB max payload
    ALLOWED_EXTENSIONS = {"txt", "json", "csv"}
