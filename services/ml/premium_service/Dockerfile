FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py .
COPY train.py .

# Model file will be generated at runtime if not present
EXPOSE 5001

CMD ["python", "app.py"]
