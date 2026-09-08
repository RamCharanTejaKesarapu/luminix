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


def send_donation_notification_email(
    donor_name: str,
    donor_email: Optional[str],
    amount: float,
    note: Optional[str],
    channel: str = "Direct",
    client_ip: str = "127.0.0.1",
) -> tuple[bool, str]:
    """
    Sends an immediate donation notification email to Ram Charan Teja (luno97802@gmail.com).
    Uses SendGrid or SMTP (Gmail TLS) if configured, with resilient logging fallback.
    """
    to_email = "luno97802@gmail.com"
    subject = f"🎉 New Luminix Donation Pledge: ${amount:.2f} from {donor_name}"

    body_text = f"""New Donation / Support Pledge Received for Luminix!

Donor: {donor_name}
Email: {donor_email or 'Not provided'}
Pledge Amount: ${amount:.2f}
Payment Channel: {channel}
Client IP: {client_ip}

Personal Note / Message:
"{note or 'No message provided'}"

—
Luminix Autonomous AI Biomechanics Platform
https://luminix-a0363.firebaseapp.com
"""

    html_body = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0c1016; color: #f3f4f6; border-radius: 12px; overflow: hidden; border: 1px solid rgba(224, 35, 28, 0.3); box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
        <div style="background: linear-gradient(135deg, rgba(224, 35, 28, 0.25), rgba(16, 21, 29, 0.95)); padding: 24px; border-bottom: 1px solid rgba(224, 35, 28, 0.2);">
            <div style="font-family: monospace; font-size: 11px; color: #ff524d; letter-spacing: 0.12em; text-transform: uppercase;">LUMINIX // CREATOR DISPATCH</div>
            <h2 style="margin: 8px 0 0; font-size: 22px; color: #ffffff;">🎉 New Donation Pledge Received!</h2>
        </div>
        <div style="padding: 24px;">
            <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 18px; margin-bottom: 20px;">
                <div style="font-size: 13px; color: #9ca3af; margin-bottom: 4px;">PLEDGE AMOUNT</div>
                <div style="font-size: 32px; font-weight: 800; color: #10b981; font-family: monospace;">${amount:.2f}</div>
            </div>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 20px;">
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.06);">
                    <td style="padding: 10px 0; color: #9ca3af; width: 140px;">Donor Name:</td>
                    <td style="padding: 10px 0; color: #ffffff; font-weight: 600;">{donor_name}</td>
                </tr>
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.06);">
                    <td style="padding: 10px 0; color: #9ca3af;">Donor Email:</td>
                    <td style="padding: 10px 0; color: #60a5fa;"><a href="mailto:{donor_email or ''}" style="color: #60a5fa; text-decoration: none;">{donor_email or 'Not provided'}</a></td>
                </tr>
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.06);">
                    <td style="padding: 10px 0; color: #9ca3af;">Payment Channel:</td>
                    <td style="padding: 10px 0; color: #f59e0b; font-family: monospace;">{channel}</td>
                </tr>
                <tr>
                    <td style="padding: 10px 0; color: #9ca3af;">Client IP:</td>
                    <td style="padding: 10px 0; color: #9ca3af; font-family: monospace; font-size: 12px;">{client_ip}</td>
                </tr>
            </table>
            <div style="background: rgba(224, 35, 28, 0.08); border-left: 3px solid #e0231c; padding: 14px; border-radius: 4px; margin-bottom: 20px;">
                <div style="font-size: 11px; font-family: monospace; color: #ff524d; text-transform: uppercase; margin-bottom: 6px;">PERSONAL NOTE FROM DONOR:</div>
                <div style="font-size: 14px; font-style: italic; color: #e5e7eb; line-height: 1.5;">"{note or 'No message provided'}"</div>
            </div>
            <div style="text-align: center; margin-top: 24px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.08); font-size: 12px; color: #6b7280; font-family: monospace;">
                Luminix Autonomous AI Health & Biomechanical Sanctuary • Ram Charan Teja
            </div>
        </div>
    </div>
    """

    if _sendgrid_configured() and httpx:
        try:
            api_key = os.getenv("SENDGRID_API_KEY", "")
            from_addr = os.getenv("SENDGRID_FROM") or os.getenv("SMTP_FROM", "noreply@luminix.app")
            payload = {
                "personalizations": [{"to": [{"email": to_email}]}],
                "from": {"email": from_addr, "name": "Luminix Support Notification"},
                "subject": subject,
                "content": [
                    {"type": "text/plain", "value": body_text},
                    {"type": "text/html", "value": html_body},
                ],
            }
            res = httpx.post(
                "https://api.sendgrid.com/v3/mail/send",
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                json=payload,
                timeout=30,
            )
            if res.status_code in (200, 202):
                return True, f"Donation notification delivered to {to_email} via SendGrid"
        except Exception:
            pass

    if _smtp_configured():
        try:
            host = os.getenv("SMTP_HOST", "")
            port = int(os.getenv("SMTP_PORT", "587"))
            user = os.getenv("SMTP_USER", "")
            password = os.getenv("SMTP_PASSWORD", "")
            from_addr = os.getenv("SMTP_FROM", user or "noreply@luminix.app")
            use_tls = os.getenv("SMTP_USE_TLS", "true").lower() in ("1", "true", "yes")

            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = from_addr
            msg["To"] = to_email
            msg.attach(MIMEText(body_text, "plain"))
            msg.attach(MIMEText(html_body, "html"))

            with smtplib.SMTP(host, port, timeout=20) as server:
                if use_tls:
                    server.starttls()
                if user and password:
                    server.login(user, password)
                server.sendmail(from_addr, [to_email], msg.as_string())
            return True, f"Donation notification sent to {to_email} via SMTP"
        except Exception as exc:
            return False, f"SMTP delivery notice: {exc}"

    print(f"[Luminix Donation Notification] Pledged ${amount:.2f} by {donor_name} -> {to_email}")
    return True, f"Donation recorded and queued for {to_email}"
