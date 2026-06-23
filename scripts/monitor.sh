#!/bin/bash
# Cubicle health + resource monitor
# Run via cron every 5 min

HEALTH_URL="https://cubiqlo.com/api/health"
CPU_THRESHOLD=85
RAM_THRESHOLD=85
DISK_THRESHOLD=90

LOG="/root/projects/cubicle/scripts/monitor.log"
ALERT_FILE="/root/projects/cubicle/scripts/.last_alert"

# Health check
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$HEALTH_URL" 2>/dev/null)
if [ "$HTTP_CODE" != "200" ]; then
  MSG="🚨 Cubicle DOWN! HTTP $HTTP_CODE at $(date)"
  echo "$MSG" >> "$LOG"
  echo "$MSG"
  exit 1
fi

# CPU usage (1-min average)
CPU=$(top -bn1 | grep "Cpu(s)" | awk '{print 100 - $8}' | cut -d. -f1)
if [ "$CPU" -gt "$CPU_THRESHOLD" ]; then
  MSG="⚠️ Cubicle CPU high: ${CPU}% at $(date)"
  echo "$MSG" >> "$LOG"
  echo "$MSG"
fi

# RAM usage
RAM=$(free | awk '/Mem:/ {printf "%.0f", $3/$2*100}')
if [ "$RAM" -gt "$RAM_THRESHOLD" ]; then
  MSG="⚠️ Cubicle RAM high: ${RAM}% at $(date)"
  echo "$MSG" >> "$LOG"
  echo "$MSG"
fi

# Disk usage
DISK=$(df / | awk 'NR==2 {print $5}' | tr -d '%')
if [ "$DISK" -gt "$DISK_THRESHOLD" ]; then
  MSG="⚠️ Cubicle disk high: ${DISK}% at $(date)"
  echo "$MSG" >> "$LOG"
  echo "$MSG"
fi

# Docker container status
CONTAINERS=$(docker ps --filter "name=cubicle" --format "{{.Names}}:{{.Status}}" 2>/dev/null)
DEAD=$(echo "$CONTAINERS" | grep -v "Up" || true)
if [ -n "$DEAD" ]; then
  MSG="🚨 Cubicle container down: $DEAD at $(date)"
  echo "$MSG" >> "$LOG"
  echo "$MSG"
fi

# DB check
DB_CHECK=$(curl -s --max-time 10 "$HEALTH_URL" 2>/dev/null | grep -o '"db":"ok"' || true)
if [ -z "$DB_CHECK" ]; then
  MSG="🚨 Cubicle DB unhealthy at $(date)"
  echo "$MSG" >> "$LOG"
  echo "$MSG"
fi

echo "OK cpu=${CPU}% ram=${RAM}% disk=${DISK}% http=${HTTP_CODE}"
