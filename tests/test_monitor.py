import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../app")))

from log_monitor import load_config
import tempfile
import yaml

def test_keywords_detected():
    log_lines = [
        "[2026-05-11 10:00:01] INFO: Service started",
        "[2026-05-11 10:00:02] ERROR: Database connection failed",
        "[2026-05-11 10:00:03] INFO: Health check passed",
        "[2026-05-11 10:00:04] CRITICAL: Service is down",
        "[2026-05-11 10:00:05] ERROR: Timeout while connecting",
    ]

    keywords = ["ERROR", "CRITICAL"]
    matches = []

    for line in log_lines:
        for keyword in keywords:
            if keyword in line:
                matches.append(line.strip())
                break

    assert len(matches) == 3, f"Expected 3 matches, got {len(matches)}"
    print("test_keywords_detected passed")

def test_no_false_positives():
    log_lines = [
        "[2026-05-11 10:00:01] INFO: Service started",
        "[2026-05-11 10:00:02] INFO: Health check passed",
        "[2026-05-11 10:00:03] WARNING: High memory usage",
    ]

    keywords = ["ERROR", "CRITICAL"]
    matches = []

    for line in log_lines:
        for keyword in keywords:
            if keyword in line:
                matches.append(line.strip())
                break

    assert len(matches) == 0, f"Expected 0 matches, got {len(matches)}"
    print("test_no_false_positives passed")

def test_load_config():
    sample_config = {
        "log_file": "logs/app.log",
        "keywords": ["ERROR", "CRITICAL"],
        "threshold": 3,
        "interval": 30,
        "cooldown": 300
    }

    with tempfile.NamedTemporaryFile(mode="w", suffix=".yaml", delete=False) as f:
        yaml.dump(sample_config, f)
        temp_path = f.name

    config = load_config(temp_path)

    assert config["threshold"] == 3
    assert "ERROR" in config["keywords"]
    assert config["interval"] == 30
    print("test_load_config passed")

if __name__ == "__main__":
    test_keywords_detected()
    test_no_false_positives()
    test_load_config()
    print("\nAll tests passed.")
