# Log Alerting Pipeline

A production-style DevOps project that automatically monitors application logs,
detects error patterns, and sends email alerts — containerized with Docker and
powered by a Jenkins CI/CD pipeline.

---

## The Problem It Solves

In production environments, engineers manually monitor application logs to catch
errors before they escalate. This is time-consuming, error-prone, and impossible
to scale. This project automates that process entirely — the system watches logs
24/7, detects anomalies, and alerts the team instantly without human intervention.

---

## Architecture
GitHub Repository
│
│ git push (webhook)
▼
Jenkins CI/CD Pipeline (running in Docker)
│
├── Stage 1: Run Unit Tests
├── Stage 2: Build Docker Image
├── Stage 3: Push to Docker Hub
└── Stage 4: Deploy Container
│
▼
Log Monitor Application
│
┌──────────┴──────────┐
│                     │
Log Generator          Log Scanner
(simulates app)     (reads every 30s)
│
Error threshold met?
│
▼
Gmail SMTP Alert
(sent to inbox)
---

## Tech Stack

| Tool | Purpose |
|---|---|
| Python 3.12 | Core application logic |
| Docker | Containerization |
| Jenkins | CI/CD pipeline automation |
| GitHub + Webhooks | Source control + pipeline trigger |
| Docker Hub | Container image registry |
| Gmail SMTP | Email alerting |
| PyYAML | Configuration management |
| ngrok | Expose local Jenkins to GitHub webhooks |

---

## Project Structure
log-alerting-pipeline/
├── app/
│   ├── log_generator.py      # Simulates application writing logs
│   ├── log_monitor.py        # Scans logs and triggers alerts
│   └── alert.py              # Sends email via Gmail SMTP
├── tests/
│   └── test_monitor.py       # Unit tests (run by Jenkins)
├── scripts/
│   └── run_tests.sh          # Test runner script
├── logs/
│   └── app.log               # Log file being monitored
├── Dockerfile                # Containerizes the application
├── Jenkinsfile               # CI/CD pipeline definition
├── config.yaml               # App configuration
├── requirements.txt          # Python dependencies
└── .gitignore
---

## How It Works

### 1. Log Generation
`log_generator.py` simulates a real application by writing log entries every
2 seconds into `logs/app.log`. Log levels are weighted to mirror production:
INFO (60%), WARNING (25%), ERROR (10%), CRITICAL (5%).

### 2. Log Monitoring
`log_monitor.py` scans the log file every 30 seconds using `f.seek()` to read
only new lines since the last scan — not the entire file. This makes it
efficient even on large log files.

### 3. Alert Logic
If the number of ERROR or CRITICAL lines in a single scan crosses the threshold
(default: 3), an email alert is triggered. A cooldown period (default: 300
seconds) prevents alert spam.

### 4. Email Alert
`alert.py` connects to Gmail's SMTP server on port 587 using STARTTLS encryption.
Credentials are never hardcoded — they are injected at runtime via environment
variables, managed securely by Jenkins credentials manager.

### 5. CI/CD Pipeline
Every `git push` to the main branch triggers the Jenkins pipeline via GitHub
webhook:
- **Test** — runs unit tests, pipeline stops if any fail
- **Build** — builds Docker image
- **Push** — pushes image to Docker Hub
- **Deploy** — stops old container, deploys new one with credentials injected

---

## Pipeline Stages
git push → GitHub Webhook → Jenkins
│
┌───────────▼───────────┐
│    Stage 1: Test       │
│  python3 test_monitor  │
└───────────┬───────────┘
│ pass
┌───────────▼───────────┐
│    Stage 2: Build      │
│  docker build          │
└───────────┬───────────┘
│
┌───────────▼───────────┐
│    Stage 3: Push       │
│  docker push hub       │
└───────────┬───────────┘
│
┌───────────▼───────────┐
│    Stage 4: Deploy     │
│  docker run container  │
└───────────────────────┘
---

## Setup & Running Locally

### Prerequisites
- Docker installed and running
- Python 3.12+
- Gmail account with App Password enabled
- Jenkins running in Docker

### 1. Clone the repository
```bash
git clone https://github.com/Harsh-Vardhan21/log-alerting-pipeline.git
cd log-alerting-pipeline
```

### 2. Run Jenkins in Docker
```bash
docker network create jenkins

docker run -d \
  --name jenkins \
  --network jenkins \
  -p 8080:8080 \
  -v jenkins_home:/var/jenkins_home \
  -v /var/run/docker.sock:/var/run/docker.sock \
  jenkins/jenkins:lts
```

### 3. Build and run the application
```bash
docker build -t log-alerting-pipeline .

docker run -d \
  --name log-monitor \
  --network jenkins \
  -e ALERT_EMAIL="your@gmail.com" \
  -e ALERT_PASSWORD="your-app-password" \
  -e RECEIVER_EMAIL="your@gmail.com" \
  log-alerting-pipeline
```

### 4. Generate logs to monitor
```bash
docker exec -it log-monitor python log_generator.py
```

### 5. Watch the monitor
```bash
docker logs -f log-monitor
```

---

## Configuration

Edit `config.yaml` to customize behaviour without touching code:

```yaml
log_file: "logs/app.log"    # Path to log file
keywords:                    # Patterns to detect
  - "ERROR"
  - "CRITICAL"
threshold: 3                 # Matches needed to trigger alert
interval: 30                 # Scan frequency in seconds
cooldown: 300                # Seconds between alerts
```

---

## Security

- All credentials (email, password) are stored in Jenkins Credentials Manager
- Injected as environment variables at runtime — never hardcoded
- `.env` files are excluded via `.gitignore`
- Gmail uses App Password + STARTTLS encryption on port 587

---

## Key DevOps Concepts Demonstrated

- **Containerization** — app runs identically in any environment via Docker
- **CI/CD** — automated test → build → push → deploy on every code change
- **Infrastructure as Code** — entire pipeline defined in Jenkinsfile
- **Secure credential management** — secrets injected at runtime, never in code
- **Webhook automation** — zero-touch pipeline trigger on git push
- **Docker layer caching** — optimized build times via layer ordering
- **Log monitoring** — efficient file reading with seek pointer

---

## Docker Hub

Image publicly available at:
---

## Author

**Harsh Vardhan**
- GitHub: [Harsh-Vardhan21](https://github.com/Harsh-Vardhan21)
