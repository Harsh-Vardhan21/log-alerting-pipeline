import random
import time
from datetime import datetime

LOG_FILE = "logs/app.log"

LOG_LEVELS = [
    ("INFO", 60),
    ("WARNING", 25),
    ("ERROR", 10),
    ("CRITICAL", 5),
]

MESSAGES = {
    "INFO": [
        "User login successful",
        "Health check passed",
        "Request processed successfully",
        "Service started",
    ],
    "WARNING": [
        "High memory usage detected",
        "Slow response time observed",
        "Retry attempt for failed request",
    ],
    "ERROR": [
        "Database connection failed",
        "Failed to process request",
        "Authentication error for user",
        "Timeout while connecting to service",
    ],
    "CRITICAL": [
        "Service is down",
        "Disk space critically low",
        "Unhandled exception occurred",
    ],
}

def generate_log_line():
    levels = [level for level, _ in LOG_LEVELS]
    weights = [weight for _, weight in LOG_LEVELS]
    level = random.choices(levels, weights=weights, k=1)[0]
    message = random.choice(MESSAGES[level])
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    return f"[{timestamp}] {level}: {message}"

def run():
    print(f"Writing logs to {LOG_FILE}")
    while True:
        line = generate_log_line()
        with open(LOG_FILE, "a") as f:
            f.write(line + "\n")
        print(line)
        time.sleep(2)

if __name__ == "__main__":
    run()
