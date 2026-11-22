#!/usr/bin/env bash
# Starts or stops the FlowPay backend JAR for the CI E2E job (dev profile, with
# Postgres and RabbitMQ as service containers on their default ports).
#
#   BACKEND_JAR=path/to/app.jar scripts/ci-backend.sh start
#   scripts/ci-backend.sh stop
#
# Extra backend settings come from the environment (for example
# WEBHOOK_DELIVERY_RETRY_DELAYS). The log is appended to BACKEND_LOG (backend.log).
set -euo pipefail

LOG=${BACKEND_LOG:-backend.log}
PID_FILE=backend.pid
HEALTH=http://localhost:8080/actuator/health

case "${1:-}" in
  start)
    : "${BACKEND_JAR:?BACKEND_JAR must point to the backend JAR}"
    SPRING_PROFILES_ACTIVE=dev nohup java -jar "$BACKEND_JAR" >>"$LOG" 2>&1 &
    echo $! >"$PID_FILE"
    for second in $(seq 1 180); do
      if curl -fsS "$HEALTH" >/dev/null 2>&1; then
        echo "Backend healthy after ${second}s"
        exit 0
      fi
      if ! kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
        echo "Backend exited during start-up:"
        tail -n 60 "$LOG"
        exit 1
      fi
      sleep 1
    done
    echo "Backend not healthy after 180s:"
    tail -n 60 "$LOG"
    exit 1
    ;;
  stop)
    pid=$(cat "$PID_FILE")
    kill "$pid"
    for _ in $(seq 1 30); do
      kill -0 "$pid" 2>/dev/null || exit 0
      sleep 1
    done
    echo "Backend did not stop within 30s"
    exit 1
    ;;
  *)
    echo "usage: $0 start|stop" >&2
    exit 2
    ;;
esac
