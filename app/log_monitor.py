import time
import yaml
from alert import send_alert

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

            if len(matches) >= threshold:
                current_time = time.time()
                if current_time - last_alert_time > cooldown:
                    print(f"ALERT: {len(matches)} matches found. Sending email...")
                    send_alert(matches)
                    last_alert_time = current_time
                else:
                    print("Alert suppressed — cooldown active")
            else:
                print(f"Scan complete. {len(matches)} matches found. No alert.")

        except FileNotFoundError:
            print(f"Log file not found: {log_file}. Waiting...")

        time.sleep(interval)

if __name__ == "__main__":
    config = load_config()
    monitor(config)
