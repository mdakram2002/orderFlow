FROM python:3.12-slim
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
COPY services/notification-service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY services/notification-service/ .
EXPOSE 8005
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8005}"]

