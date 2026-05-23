#!/bin/sh
if [ "$SERVICE_TYPE" = "worker" ]; then
    exec celery -A app.tasks worker --loglevel=info --concurrency=2
else
    exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
fi
