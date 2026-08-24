"""SMTP / SendGrid email delivery for Luminix reports."""

from __future__ import annotations

import base64
import os
import smtplib
from email.mime.application import MIMEApplication
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path
from typing import Any, Dict, Optional

try:
    import httpx
except ImportError:  # pragma: no cover
    httpx = None  # type: ignore


def _smtp_configured() -> bool:
    return bool(os.getenv("SMTP_HOST") and os.getenv("SMTP_FROM"))


def _sendgrid_configured() -> bool:
    return bool(os.getenv("SENDGRID_API_KEY"))


def _build_body_text(report_summary: Optional[Dict[str, Any]] = None) -> str:
    lines = [
        "Your personalized Luminix health report is attached.",
        "",
        "Includes BMI metrics, nutrition plan, and workout summary.",
    ]
    if report_summary:
        nutrition = report_summary.get("nutrition_analysis") or {}
        anthro = nutrition.get("anthropometrics") if isinstance(nutrition, dict) else {}
        if not anthro and isinstance(nutrition, dict):
            anthro = {k: nutrition[k] for k in ("bmi", "bmr_kcal", "tdee_kcal") if k in nutrition}
        if anthro.get("bmi"):
            lines.extend(["", f"BMI: {anthro.get('bmi')}"])
        if anthro.get("tdee_kcal"):
            lines.append(f"Daily calories (TDEE): {anthro.get('tdee_kcal')}")
        meal = report_summary.get("meal_plan") or report_summary.get("weekly_plan") or {}
        days = meal.get("days") if isinstance(meal, dict) else None
        if days:
            first = days[0]
            meals = first.get("meals") or {}
            lines.append("")
            lines.append(f"Sample day ({first.get('day', 'Day 1')}):")
            for slot, item in list(meals.items())[:3]:
                name = item.get("name") if isinstance(item, dict) else str(item)
                lines.append(f"  • {slot.title()}: {name}")
        gym = report_summary.get("gym_plan") or {}
        exercises = gym.get("exercises") if isinstance(gym, dict) else None
        if exercises:
            lines.append("")
            lines.append("Workout highlights:")
            for ex in exercises[:4]:
                lines.append(f"  • {ex.get('name', 'Exercise')}")
    lines.extend(["", "— The Luminix Team"])
    return "\n".join(lines)


def _send_via_sendgrid(
    to_email: str,
    pdf_path: Path,
    subject: str,
    body: str,
) -> tuple[bool, str]:
    if httpx is None:
        return False, "httpx required for SendGrid (pip install httpx)"

    api_key = os.getenv("SENDGRID_API_KEY", "")
    from_addr = os.getenv("SENDGRID_FROM") or os.getenv("SMTP_FROM", "noreply@luminix.app")

    with pdf_path.open("rb") as f:
        pdf_b64 = base64.b64encode(f.read()).decode("ascii")

    payload = {
        "personalizations": [{"to": [{"email": to_email}]}],
        "from": {"email": from_addr, "name": "Luminix Health"},
        "subject": subject,
        "content": [{"type": "text/plain", "value": body}],
        "attachments": [
            {
                "content": pdf_b64,
                "filename": pdf_path.name,
                "type": "application/pdf",
                "disposition": "attachment",
            }
        ],
    }

    try:
        res = httpx.post(
            "https://api.sendgrid.com/v3/mail/send",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json=payload,
            timeout=30,
        )
        if res.status_code in (200, 202):
            return True, f"Report sent to {to_email} via SendGrid"
        return False, f"SendGrid error ({res.status_code}): {res.text}"
    except Exception as exc:  # noqa: BLE001
        return False, f"SendGrid delivery failed: {exc}"


def _send_via_smtp(
    to_email: str,
    pdf_path: Path,
    subject: str,
    body: str,
) -> tuple[bool, str]:
    host = os.getenv("SMTP_HOST", "")
    port = int(os.getenv("SMTP_PORT", "587"))
    user = os.getenv("SMTP_USER", "")
    password = os.getenv("SMTP_PASSWORD", "")
    from_addr = os.getenv("SMTP_FROM", user)
    use_tls = os.getenv("SMTP_USE_TLS", "true").lower() in ("1", "true", "yes")

    msg = MIMEMultipart()
    msg["Subject"] = subject
    msg["From"] = from_addr
    msg["To"] = to_email
    msg.attach(MIMEText(body, "plain"))

    with pdf_path.open("rb") as f:
        attachment = MIMEApplication(f.read(), _subtype="pdf")
    attachment.add_header("Content-Disposition", "attachment", filename=pdf_path.name)
    msg.attach(attachment)

    try:
        with smtplib.SMTP(host, port, timeout=30) as server:
            if use_tls:
                server.starttls()
            if user and password:
                server.login(user, password)
            server.sendmail(from_addr, [to_email], msg.as_string())
        return True, f"Report sent to {to_email}"
    except Exception as exc:  # noqa: BLE001
        return False, f"Email delivery failed: {exc}"


def send_report_email(
    to_email: str,
    pdf_path: Path,
    subject: str = "Your Luminix Health Report",
    report_summary: Optional[Dict[str, Any]] = None,
) -> tuple[bool, str]:
    """
    Send PDF report via SendGrid (preferred) or SMTP.
    Falls back to mock mode when neither is configured.
    """
    if not pdf_path.is_file():
        return False, "PDF file not found"

    body = _build_body_text(report_summary)

    if _sendgrid_configured():
        return _send_via_sendgrid(to_email, pdf_path, subject, body)

    if _smtp_configured():
        return _send_via_smtp(to_email, pdf_path, subject, body)

    print(f"[Luminix mock email] Would send {pdf_path.name} to {to_email}")
    print(body)
    return True, f"Report queued for {to_email} (email not configured — mock mode)"
