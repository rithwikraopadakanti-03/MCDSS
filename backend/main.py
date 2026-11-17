"""
main.py
FastAPI entrypoint for the MCDSS backend.
Exposes REST API endpoints consumed by the React frontend.
"""
import os
import base64
from typing import List, Dict, Any, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

from decision_engine import DecisionEngine
from ai_chatbot import AIChatbot
from voice_processor import process_voice_transcript
from pdf_exporter import generate_pdf_report

# ── App Setup ───────────────────────────────────────────────────────
app = FastAPI(
    title="MCDSS API",
    description="AI-Powered Multi-Criteria Decision Support System",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Pydantic Models ──────────────────────────────────────────────────

class AlternativeModel(BaseModel):
    id: Optional[str] = None
    name: str
    values: Dict[str, float]

class CriterionModel(BaseModel):
    name: str
    type: str = "benefit"          # 'benefit' or 'cost'
    min: Optional[float] = None
    max: Optional[float] = None

class ConstraintModel(BaseModel):
    criterion_id: str
    operator: str                  # '<', '>', '<=', '>=', '==', '!='
    value: float

class DecideRequest(BaseModel):
    decision_name: str
    alternatives: List[AlternativeModel]
    criteria: Dict[str, CriterionModel]
    weights: Dict[str, float]
    constraints: List[ConstraintModel] = []

class ChatMessage(BaseModel):
    role: str   # 'user' | 'assistant'
    content: str

class ChatRequest(BaseModel):
    message: str
    history: List[ChatMessage] = []
    current_state: Optional[Dict[str, Any]] = None

class SuggestCriteriaRequest(BaseModel):
    category: str

class VoiceRequest(BaseModel):
    transcript: str

class ExportPDFRequest(BaseModel):
    report_data: Dict[str, Any]

# ── Health Check ─────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"status": "ok", "service": "MCDSS API v1.0.0"}

@app.get("/api/health")
def health():
    api_key_set = bool(os.environ.get("GEMINI_API_KEY"))
    return {
        "status": "healthy",
        "gemini_api_configured": api_key_set,
    }

# ── Core Decision Engine ─────────────────────────────────────────────

@app.post("/api/decide")
def decide(request: DecideRequest):
    """
    Runs the full MCDSS decision pipeline:
    CSP → A* Search → Utility → Heuristics → Explainability.
    """
    try:
        payload = {
            "decision_name": request.decision_name,
            "alternatives": [a.model_dump() for a in request.alternatives],
            "criteria": {k: v.model_dump() for k, v in request.criteria.items()},
            "weights": request.weights,
            "constraints": [c.model_dump() for c in request.constraints],
        }
        result = DecisionEngine.run(payload)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ── AI Chatbot ───────────────────────────────────────────────────────

@app.post("/api/chat")
def chat(request: ChatRequest):
    """
    Handles conversational AI chatbot queries.
    Extracts decision parameters from natural language using Gemini.
    """
    try:
        history = [h.model_dump() for h in request.history]
        result = AIChatbot.chat(
            request.message,
            history,
            request.current_state or {}
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/suggest-criteria")
def suggest_criteria(request: SuggestCriteriaRequest):
    """
    Returns AI-suggested criteria for a given decision category.
    """
    try:
        result = AIChatbot.suggest_criteria(request.category)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ── Voice Processing ─────────────────────────────────────────────────

@app.post("/api/voice")
def process_voice(request: VoiceRequest):
    """
    Parses a voice transcript and extracts structured decision data.
    """
    try:
        result = process_voice_transcript(request.transcript)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ── PDF Export ───────────────────────────────────────────────────────

@app.post("/api/export-pdf")
def export_pdf(request: ExportPDFRequest):
    """
    Generates a professional PDF report and returns it as base64 or raw bytes.
    """
    try:
        pdf_bytes = generate_pdf_report(request.report_data)
        encoded = base64.b64encode(pdf_bytes).decode("utf-8")
        return {"pdf_base64": encoded, "filename": "mcdss_report.pdf"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
