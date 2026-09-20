from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from contextlib import asynccontextmanager
from app.core.database import engine, Base
import app.models  # load models for metadata

@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield

app = FastAPI(
    title="Smart Health Grid API",
    description="Backend for Patient Data -> AI Analysis -> Recommendation -> Resource Matching -> Care & Follow-up",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "smart-health-grid-api"}


import os
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.api.v1.endpoints import auth, patients, risk, recommendations, referrals, followups, facilities, iot, chatbot

app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(patients.router, prefix="/api/v1/patients", tags=["patients"])
app.include_router(risk.router, prefix="/api/v1/risk", tags=["ai-analysis"])
app.include_router(recommendations.router, prefix="/api/v1/recommendations", tags=["recommendations"])
app.include_router(referrals.router, prefix="/api/v1/referrals", tags=["care-followup"])
app.include_router(followups.router, prefix="/api/v1", tags=["care-followup"])
app.include_router(facilities.router, prefix="/api/v1/facilities", tags=["resource-matching"])
app.include_router(iot.router, prefix="/api/v1/iot", tags=["iot-telemetry"])
app.include_router(chatbot.router, prefix="/api/v1/chatbot", tags=["clinical-chatbot"])

STATIC_DIR = "static"
app.mount("/assets", StaticFiles(directory=os.path.join(STATIC_DIR, "assets")), name="static-assets")


@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    """
    SPA fallback: serve the built React app for any non-API route so that
    client-side routes (e.g. /dashboard, /triage, /facilities) work on a
    direct navigation or a page refresh, not just when reached via in-app
    navigation. Real static files (favicon, icons) are served as-is; every
    other path falls back to index.html and lets React Router take over.
    """
    if full_path.startswith("api/"):
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail=f"API endpoint not found: /{full_path}")
    candidate = os.path.join(STATIC_DIR, full_path)
    if full_path and os.path.isfile(candidate):
        return FileResponse(candidate)
    return FileResponse(os.path.join(STATIC_DIR, "index.html"))
