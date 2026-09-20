from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from app.services.sqlite_kb import sqlite_kb

router = APIRouter()


class ChatbotQueryRequest(BaseModel):
    message: str = Field(..., description="User description of disease, problem, or symptoms")
    session_id: Optional[str] = Field("default-session", description="Session identifier for message persistence")
    vitals: Optional[Dict[str, Any]] = Field(None, description="Optional patient vitals (e.g. SpO2, HR, BP, Temp)")


class ChatbotQueryResponse(BaseModel):
    reply: str
    condition_name: str
    category: Optional[str] = None
    severity_level: str
    urgency_code: str
    confidence: str
    immediate_actions: List[str]
    recommended_steps: List[str]
    recommended_specialist: Optional[str] = None
    diagnostic_tests: List[str] = []
    red_flags: List[str] = []
    source: str = "sqlite_offline_kb"


class ClearHistoryRequest(BaseModel):
    session_id: str = "default-session"


@router.post("/query", response_model=ChatbotQueryResponse)
async def query_chatbot(payload: ChatbotQueryRequest):
    """
    Evaluates patient symptoms/problem against the offline SQLite clinical knowledge base.
    Persists query and response into local SQLite chat history.
    """
    query_text = payload.message.strip()
    if not query_text:
        raise HTTPException(status_code=400, detail="Query message cannot be empty.")

    # Run triage matching against SQLite KB
    triage_result = sqlite_kb.match_symptoms(query_text)

    # Save user question to SQLite
    sqlite_kb.save_message(
        session_id=payload.session_id,
        role="user",
        content=query_text
    )

    # Save bot answer to SQLite
    sqlite_kb.save_message(
        session_id=payload.session_id,
        role="assistant",
        content=triage_result.get("reply_text", ""),
        structured_data=triage_result
    )

    return ChatbotQueryResponse(
        reply=triage_result.get("reply_text", ""),
        condition_name=triage_result.get("condition_name", "Clinical Triage"),
        category=triage_result.get("category"),
        severity_level=triage_result.get("severity_level", "MODERATE"),
        urgency_code=triage_result.get("urgency_code", "doctor_consult"),
        confidence=triage_result.get("confidence", "moderate"),
        immediate_actions=triage_result.get("immediate_actions", []),
        recommended_steps=triage_result.get("recommended_steps", []),
        recommended_specialist=triage_result.get("recommended_specialist"),
        diagnostic_tests=triage_result.get("diagnostic_tests", []),
        red_flags=triage_result.get("red_flags", []),
        source="sqlite_offline_kb"
    )


@router.get("/knowledge-pack")
async def get_offline_knowledge_pack():
    """
    Exports the complete SQLite disease & protocol knowledge base.
    Used by the frontend to cache locally for 100% offline browser execution.
    """
    conditions = sqlite_kb.get_all_conditions()
    return {
        "version": "1.0",
        "database": "sqlite",
        "total_conditions": len(conditions),
        "conditions": conditions
    }


@router.get("/history")
async def get_chat_history(session_id: str = Query("default-session", description="Session ID")):
    """Retrieves SQLite-stored chat messages for a session."""
    history = sqlite_kb.get_history(session_id=session_id)
    return {
        "session_id": session_id,
        "count": len(history),
        "messages": history
    }


@router.post("/clear")
async def clear_chat_history(payload: ClearHistoryRequest):
    """Clears SQLite chat history for a session."""
    sqlite_kb.clear_history(session_id=payload.session_id)
    return {"status": "cleared", "session_id": payload.session_id}
