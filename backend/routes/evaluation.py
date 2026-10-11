from flask import Blueprint, jsonify
from security.auth_helpers import jwt_required
from services.evaluation_service import run_benchmark_evaluation

evaluation_bp = Blueprint("evaluation", __name__, url_prefix="/api/v1/evaluation")

@evaluation_bp.route("/benchmark", methods=["GET"])
@jwt_required
def get_benchmark_evaluation():
    """Execute quantitative benchmark evaluation against ground truth and return metrics."""
    result = run_benchmark_evaluation()
    status_code = 200 if result.get("success") else 500
    return jsonify(result), status_code
