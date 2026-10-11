import datetime
import jwt
from functools import wraps
from flask import request, jsonify, g
from werkzeug.security import generate_password_hash, check_password_hash
from config import Config
from database import get_db

def hash_password(password: str) -> str:
    """Securely hash password using PBKDF2/SHA256."""
    return generate_password_hash(password, method="pbkdf2:sha256", salt_length=16)

def verify_password(password: str, password_hash: str) -> bool:
    """Verify raw password against stored hash."""
    return check_password_hash(password_hash, password)

def create_jwt_token(user_id: str, username: str, role: str) -> str:
    """Generate signed JWT token."""
    payload = {
        "sub": user_id,
        "username": username,
        "role": role,
        "exp": datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=Config.JWT_EXPIRATION_HOURS),
        "iat": datetime.datetime.now(datetime.timezone.utc),
    }
    return jwt.encode(payload, Config.SECRET_KEY, algorithm="HS256")

def decode_jwt_token(token: str) -> dict:
    """Decode and validate JWT token."""
    try:
        return jwt.decode(token, Config.SECRET_KEY, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        raise ValueError("Token has expired")
    except jwt.InvalidTokenError:
        raise ValueError("Invalid authentication token")

def jwt_required(f):
    """Decorator to protect API endpoints with JWT verification."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return jsonify({"error": "Authorization token required", "code": "UNAUTHORIZED"}), 401
        
        token = auth_header.split(" ", 1)[1].strip()
        try:
            payload = decode_jwt_token(token)
        except ValueError as e:
            return jsonify({"error": str(e), "code": "INVALID_TOKEN"}), 401
        
        # Verify user still exists in database
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id, username, email, role FROM users WHERE id = ?", (payload["sub"],))
            user = cursor.fetchone()
            if not user:
                return jsonify({"error": "User no longer exists", "code": "USER_NOT_FOUND"}), 401
            
            g.current_user = dict(user)
        
        return f(*args, **kwargs)
    return decorated_function
