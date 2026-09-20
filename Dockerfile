FROM python:3.12-slim

WORKDIR /app

# System deps for psycopg2 (asyncpg is pure-python, but psycopg2-binary needs libpq at runtime
# for some environments; slim image usually has it, this covers the gaps)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev gcc \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

# Run migrations, then start the API. In production, split these into
# separate steps (e.g. a migration job) rather than running on every boot.
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
