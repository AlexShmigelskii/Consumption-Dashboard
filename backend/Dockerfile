FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
COPY wait-for-it.sh .
RUN chmod +x wait-for-it.sh

CMD ["sh", "-c", "python seed_data.py && ./wait-for-it.sh postgres:5432 -- uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"] 