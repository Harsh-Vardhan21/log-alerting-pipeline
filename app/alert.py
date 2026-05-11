import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime

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
    except Exception as e:
        print(f"Failed to send email: {e}")
