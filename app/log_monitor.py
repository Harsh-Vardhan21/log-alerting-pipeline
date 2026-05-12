import time
import yaml
from datetime import datetime
from alert import send_alert

SCANNER_LOG = "logs/scanner.log"


def _write_scan_log(scan_count: int, match_count: int, alert_sent: bool, suppressed: bool) -> None:
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    if alert_sent:
        msg = f"[{ts}] SCAN #{scan_count}: {match_count} matches found. Alert sent."
    elif suppressed:
        msg = f"[{ts}] SCAN #{scan_count}: {match_count} matches found. Alert suppressed (cooldown)."
    else:
        msg = f"[{ts}] SCAN #{scan_count}: {match_count} matches. No alert."
    with open(SCANNER_LOG, "a") as f:
        f.write(msg + "\n")


def load_config(config_path="config.yaml"):
    with open(config_path, "r") as f:
        return yaml.safe_load(f)

def monitor(config):
    log_file = config["log_file"]
    keywords = config["keywords"]
    threshold = config["threshold"]
    interval = config["interval"]
    cooldown = config["cooldown"]

    print(f"Monitoring {log_file} every {interval} seconds...")
    print(f"Alert triggers if {threshold} matches found in one scan")

    last_position = 0
    last_alert_time = 0
    scan_count = 0

    while True:
        try:
            with open(log_file, "r") as f:
                f.seek(last_position)
                new_lines = f.readlines()
                last_position = f.tell()

            matches = []
            for line in new_lines:
                for keyword in keywords:
                    if keyword in line:
                        matches.append(line.strip())
                        break

            scan_count += 1

            if len(matches) >= threshold:
                current_time = time.time()
                if current_time - last_alert_time > cooldown:
                    print(f"ALERT: {len(matches)} matches found. Sending email...")
                    send_alert(matches)
                    last_alert_time = current_time
                    _write_scan_log(scan_count, len(matches), alert_sent=True, suppressed=False)
                else:
                    print("Alert suppressed — cooldown active")
                    _write_scan_log(scan_count, len(matches), alert_sent=False, suppressed=True)
            else:
                print(f"Scan complete. {len(matches)} matches found. No alert.")
                _write_scan_log(scan_count, len(matches), alert_sent=False, suppressed=False)

        except FileNotFoundError:
            print(f"Log file not found: {log_file}. Waiting...")

        time.sleep(interval)

if __name__ == "__main__":
    config = load_config()
    monitor(config)
