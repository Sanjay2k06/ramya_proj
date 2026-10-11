import uuid
from flask import Blueprint, request, jsonify, g
from database import get_db
from security.auth_helpers import hash_password, verify_password, create_jwt_token, jwt_required

auth_bp = Blueprint("auth", __name__, url_prefix="/api/v1/auth")

@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json() or {}
    username = (data.get("username") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    role = data.get("role", "analyst")

    if not username or len(username) < 3:
        return jsonify({"error": "Username must be at least 3 characters", "field": "username"}), 400
    if not email or "@" not in email:
        return jsonify({"error": "A valid email address is required", "field": "email"}), 400
    if not password or len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters", "field": "password"}), 400

    user_id = f"user-{uuid.uuid4().hex[:10]}"
    pwd_hash = hash_password(password)

    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id FROM users WHERE username = ? OR email = ?", (username, email))
            if cursor.fetchone():
                return jsonify({"error": "Username or email is already registered", "code": "USER_EXISTS"}), 409
            
            cursor.execute("""
                INSERT INTO users (id, username, email, password_hash, role)
                VALUES (?, ?, ?, ?, ?)
            """, (user_id, username, email, pwd_hash, role))
            
            # Audit log
            cursor.execute("""
                INSERT INTO audit_events (id, user_id, event_type, details, ip_address)
                VALUES (?, ?, 'USER_REGISTERED', ?, ?)
            """, (f"audit-{uuid.uuid4().hex[:10]}", user_id, f"Registered user {username}", request.remote_addr))

        token = create_jwt_token(user_id, username, role)
        return jsonify({
            "message": "User registered successfully",
            "token": token,
            "user": {
                "id": user_id,
                "username": username,
                "email": email,
                "role": role
            }
        }), 201

    except Exception as e:
        return jsonify({"error": "Registration failed", "details": str(e)}), 500

@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    username_or_email = (data.get("username") or data.get("email") or "").strip()
    password = data.get("password") or ""

    if not username_or_email or not password:
        return jsonify({"error": "Username and password are required"}), 400

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE username = ? OR email = ?", (username_or_email, username_or_email.lower()))
        user = cursor.fetchone()

        if not user or not verify_password(password, user["password_hash"]):
            return jsonify({"error": "Invalid username or password credentials", "code": "INVALID_CREDENTIALS"}), 401

        user_dict = dict(user)
        token = create_jwt_token(user_dict["id"], user_dict["username"], user_dict["role"])

        # Audit log
        cursor.execute("""
            INSERT INTO audit_events (id, user_id, event_type, details, ip_address)
            VALUES (?, ?, 'USER_LOGIN', 'Authenticated session established', ?)
        """, (f"audit-{uuid.uuid4().hex[:10]}", user_dict["id"], request.remote_addr))

    return jsonify({
        "message": "Authentication successful",
        "token": token,
        "user": {
            "id": user_dict["id"],
            "username": user_dict["username"],
            "email": user_dict["email"],
            "role": user_dict["role"]
        }
    }), 200

@auth_bp.route("/logout", methods=["POST"])
@jwt_required
def logout():
    return jsonify({"message": "Successfully logged out"}), 200

@auth_bp.route("/me", methods=["GET"])
@jwt_required
def get_current_user():
    return jsonify({"user": g.current_user}), 200
