import smtplib
import os
import json
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime

ALERTS_JSON = "logs/alerts.json"


def _get_severity(error_count: int) -> str:
    if error_count >= 10:
        return "Critical"
    if error_count >= 5:
        return "High"
    return "Medium"


def _append_alert(error_count: int, receiver: str) -> None:
    entry = {
        "time": datetime.now().strftime("%H:%M:%S"),
        "errors": error_count,
        "severity": _get_severity(error_count),
        "sentTo": receiver,
        "status": "Delivered",
    }
    try:
        with open(ALERTS_JSON, "r") as f:
            data = json.load(f)
        if not isinstance(data, list):
            data = []
    except (FileNotFoundError, json.JSONDecodeError):
        data = []
    data.append(entry)
    with open(ALERTS_JSON, "w") as f:
        json.dump(data, f, indent=2)


def send_alert(matches):
    sender = os.environ.get("ALERT_EMAIL")
    password = os.environ.get("ALERT_PASSWORD")
    receiver = os.environ.get("RECEIVER_EMAIL")

    if not sender or not password or not receiver:
        print("Email credentials not set in environment variables. Skipping alert.")
        return

    subject = f"[LOG ALERT] {len(matches)} error(s) detected - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"

    body = "The following errors were detected in the application logs:\n\n"
    for i, match in enumerate(matches, 1):
        body += f"{i}. {match}\n"
    body += "\nPlease investigate immediately."

    msg = MIMEMultipart()
    msg["From"] = sender
    msg["To"] = receiver
    msg["Subject"] = subject
    msg.attach(MIMEText(body, "plain"))

    try:
        server = smtplib.SMTP("smtp.gmail.com", 587)
        server.starttls()
        server.login(sender, password)
        server.sendmail(sender, receiver, msg.as_string())
        server.quit()
        print(f"Alert email sent to {receiver}")
        _append_alert(len(matches), receiver)
    except Exception as e:
        print(f"Failed to send email: {e}")
