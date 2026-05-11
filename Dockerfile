FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app/ .
COPY config.yaml .

RUN mkdir -p /app/logs

ENV ALERT_EMAIL=""
ENV ALERT_PASSWORD=""
ENV RECEIVER_EMAIL=""

CMD ["python", "-u" , "log_monitor.py"]