from flask import Blueprint, request, jsonify, Response, g
from security.auth_helpers import jwt_required
from services.report_generator import build_investigation_report_data, generate_csv_report, generate_html_report

reports_bp = Blueprint("reports", __name__, url_prefix="/api/v1")

@reports_bp.route("/investigations/<inv_id>/reports", methods=["GET", "POST"])
@jwt_required
def get_or_generate_report(inv_id: str):
    """Generate or retrieve complete forensic dossier in structured JSON format."""
    try:
        report_data = build_investigation_report_data(inv_id)
        return jsonify(report_data), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 404
    except Exception as e:
        return jsonify({"error": "Failed to generate report", "details": str(e)}), 500

@reports_bp.route("/reports/<inv_id>/download", methods=["GET"])
@jwt_required
def download_report(inv_id: str):
    """Download forensic report in requested format: json, csv, or html."""
    fmt = request.args.get("format", "json").lower()
    try:
        report_data = build_investigation_report_data(inv_id)
        
        if fmt == "csv":
            csv_content = generate_csv_report(report_data)
            return Response(
                csv_content,
                mimetype="text/csv",
                headers={"Content-Disposition": f"attachment; filename=cti_report_{inv_id}.csv"}
            )
        elif fmt == "html":
            html_content = generate_html_report(report_data)
            return Response(
                html_content,
                mimetype="text/html",
                headers={"Content-Disposition": f"attachment; filename=cti_report_{inv_id}.html"}
            )
        else:
            return jsonify(report_data), 200

    except ValueError as e:
        return jsonify({"error": str(e)}), 404
    except Exception as e:
        return jsonify({"error": "Download failed", "details": str(e)}), 500
