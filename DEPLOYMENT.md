# 🚀 Medi-Connect — Production Deployment Guide

Follow this guide to deploy your **Medi-Connect** backend to production platforms like **Render**, **Railway**, **Fly.io**, or any cloud VPS.

---

## 🛠️ Step 1: Production Environment Variables (`.env`)

Before deploying, update your production environment variables:

```env
# 1. Environment & Debug
PROJECT_NAME="Medi-Connect Backend"
ENVIRONMENT="production"
DEBUG=False

# 2. Production PostgreSQL Database URLs
# Replace with your production DB URI (e.g. Supabase, Render Postgres, Neon, or Railway)
DATABASE_URL="postgresql+asyncpg://<db_user>:<db_pass>@<db_host>:<db_port>/<db_name>"
DATABASE_URL_SYNC="postgresql+psycopg2://<db_user>:<db_pass>@<db_host>:<db_port>/<db_name>"

# 3. Security (Generate a secure secret key: openssl rand -hex 32)
SECRET_KEY="your-secure-random-32-byte-hex-key"
ALGORITHM="HS256"
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# 4. Real API Keys
GEMINI_API_KEY="AIzaSy..."
GOOGLE_MAPS_API_KEY="AIzaSy..."
FIREBASE_PROJECT_ID="medi-connect-app"
FIREBASE_SERVER_KEY="AAAA..."
```

---

## 🔒 Step 2: Tighten CORS Origins ([app/main.py](file:///Users/veduu/Downloads/smart-health-grid-backend_4/app/main.py))

In production, update `allow_origins` in `app/main.py` to point to your actual frontend domain:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://medi-connect.vercel.app",
        "https://medi-connect.netlify.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## ☁️ Step 3: Platform Deployment Options

### Option A: Render (Easiest — Free Tier Available)
1. Push your repository to GitHub.
2. Go to **[Render Dashboard](https://dashboard.render.com)** -> Click **New +** -> Select **Web Service**.
3. Connect your GitHub repository.
4. Select **Docker** environment (Render will automatically detect your `Dockerfile`).
5. Under **Environment Variables**, add the variables from Step 1 (`DATABASE_URL`, `SECRET_KEY`, `GEMINI_API_KEY`, etc.).
6. Click **Create Web Service**. Render will build and deploy your API!

### Option B: Railway (Fastest Setup)
1. Go to **[Railway.app](https://railway.app)** -> Click **New Project**.
2. Provision a **PostgreSQL** database service.
3. Deploy from GitHub repo and set environment variables.
4. Set Start Command:
   ```bash
   alembic upgrade head && python -m app.scripts.seed_facilities && uvicorn app.main:app --host 0.0.0.0 --port $PORT --workers 4
   ```

---

## ⚡ Step 4: Verification After Deployment

Once deployed, visit your live URL:
- **Health Check**: `https://your-api.onrender.com/health`
- **Swagger Docs**: `https://your-api.onrender.com/docs`
