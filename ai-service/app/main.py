import logging
import time
from collections import OrderedDict
from datetime import date

import httpx
from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware

from .config import Settings, get_settings
from .gemini import GeminiUnavailable, generate_reply
from .prompts import BUSY_MESSAGE, DAILY_LIMIT_MESSAGE, FALLBACK_MESSAGE, LIMIT_MESSAGE
from .schemas import ChatRequest, ChatResponse, HealthResponse

logging.basicConfig(level=logging.INFO)

app = FastAPI(title="MatchPet AI", version="1.0.0", description="Asistente de compatibilidad y adopción (FastAPI + Gemini).")

# HU-63 CA#4: solo los orígenes configurados (Firebase Hosting en producción).
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().origins,
    allow_methods=["GET", "POST"],
    allow_headers=["Authorization", "Content-Type"],
)

# shortcut: contadores en memoria (se reinician al reiniciar y no se comparten entre réplicas); con más de una instancia usar Redis.
_sessions: "OrderedDict[str, int]" = OrderedDict()
_MAX_TRACKED_SESSIONS = 5000
_daily = {"day": date.today(), "global": 0, "actors": {}}


def _count_message(session_id: str) -> int:
    n = _sessions.pop(session_id, 0) + 1
    _sessions[session_id] = n
    while len(_sessions) > _MAX_TRACKED_SESSIONS:
        _sessions.popitem(last=False)
    return n


def _roll_day() -> None:
    if _daily["day"] != date.today():
        _daily.update(day=date.today(), **{"global": 0, "actors": {}})


async def require_user(
    request: Request,
    authorization: str | None = Header(default=None),
    settings: Settings = Depends(get_settings),
) -> str:
    """Devuelve quién consulta. Con SUPABASE_URL exige una sesión válida de MatchPet y usa su id;
    sin configurar (solo desarrollo) el servicio queda abierto y se identifica por IP."""
    if not settings.supabase_url:
        return f"ip:{request.client.host if request.client else 'desconocido'}"
    token = (authorization or "").removeprefix("Bearer ").strip()
    if not token:
        raise HTTPException(status_code=401, detail="Inicia sesión para usar el asistente.")
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            r = await client.get(
                f"{settings.supabase_url}/auth/v1/user",
                headers={"Authorization": f"Bearer {token}", "apikey": settings.supabase_anon_key},
            )
    except httpx.HTTPError:
        raise HTTPException(status_code=503, detail="No se pudo verificar la sesión.")
    if r.status_code != 200 or not r.json().get("id"):
        raise HTTPException(status_code=401, detail="Sesión inválida o vencida.")
    return f"user:{r.json()['id']}"


@app.get("/api/v1/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(status="ok", message="Service is running")


@app.post("/api/v1/chat", response_model=ChatResponse)
async def chat(req: ChatRequest, actor: str = Depends(require_user), settings: Settings = Depends(get_settings)) -> ChatResponse:
    if req.messages[-1].role != "user":
        raise HTTPException(status_code=422, detail="El último mensaje debe ser del usuario.")

    # HU-64 CA#5 (por conversación) + topes diarios que no dependen de lo que envíe el cliente.
    _roll_day()
    if _sessions.get(req.session_id, 0) >= settings.max_messages_per_session:
        return ChatResponse(reply=LIMIT_MESSAGE, fallback=True, remaining_messages=0)
    if _daily["global"] >= settings.max_global_messages_per_day:
        return ChatResponse(reply=BUSY_MESSAGE, fallback=True, remaining_messages=0)
    if _daily["actors"].get(actor, 0) >= settings.max_messages_per_day:
        return ChatResponse(reply=DAILY_LIMIT_MESSAGE, fallback=True, remaining_messages=0)

    used = _count_message(req.session_id)
    _daily["global"] += 1
    _daily["actors"][actor] = _daily["actors"].get(actor, 0) + 1
    remaining = max(settings.max_messages_per_session - used, 0)

    # HU-64 CA#4: ante cualquier fallo del proveedor, respuesta amable (no un error técnico).
    try:
        reply = await generate_reply(settings, req.messages, req.questionnaire)
    except GeminiUnavailable:
        # un fallo del proveedor no cuenta contra el usuario
        _sessions[req.session_id] = used - 1
        _daily["global"] -= 1
        _daily["actors"][actor] -= 1
        return ChatResponse(reply=FALLBACK_MESSAGE, fallback=True, remaining_messages=remaining + 1)
    return ChatResponse(reply=reply, remaining_messages=remaining)
