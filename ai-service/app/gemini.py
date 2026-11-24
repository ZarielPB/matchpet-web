import logging

from google import genai
from google.genai import errors, types

from .config import Settings
from .prompts import SYSTEM_PROMPT
from .schemas import ChatMessage, Questionnaire

log = logging.getLogger("matchpet-ai")

_LABELS = {
    "hours_at_home": {"menos_de_4": "menos de 4 horas", "4_a_8": "entre 4 y 8 horas", "mas_de_8": "más de 8 horas"},
}


class GeminiUnavailable(Exception):
    """Rate limit, timeout, clave inválida o cualquier fallo del proveedor (el router responde con fallback)."""


def _context(q: Questionnaire | None) -> str:
    if q is None:
        return ""
    rows = [
        ("Tiempo en casa", _LABELS["hours_at_home"].get(q.hours_at_home or "", None)),
        ("Nivel de actividad", q.activity_level),
        ("Tipo de espacio", q.space_type),
        ("Tamaño preferido", q.preferred_size),
    ]
    lines = [f"- {k}: {v}" for k, v in rows if v]
    return "Datos del cuestionario del adoptante:\n" + "\n".join(lines) if lines else ""


def build_contents(messages: list[ChatMessage]) -> list[types.Content]:
    return [
        types.Content(role="user" if m.role == "user" else "model", parts=[types.Part(text=m.content)])
        for m in messages
    ]


async def generate_reply(settings: Settings, messages: list[ChatMessage], questionnaire: Questionnaire | None) -> str:
    if not settings.gemini_api_key:
        raise GeminiUnavailable("GEMINI_API_KEY no configurada")
    system = SYSTEM_PROMPT
    if ctx := _context(questionnaire):
        system = f"{SYSTEM_PROMPT}\n\n{ctx}"
    try:
        client = genai.Client(
            api_key=settings.gemini_api_key,
            http_options=types.HttpOptions(timeout=settings.gemini_timeout_seconds * 1000),
        )
        resp = await client.aio.models.generate_content(
            model=settings.gemini_model,
            contents=build_contents(messages),
            config=types.GenerateContentConfig(
                system_instruction=system,
                max_output_tokens=settings.gemini_max_output_tokens,
                temperature=0.6,
            ),
        )
    except errors.APIError as e:  # 429 (cuota), 400, 403, 5xx…
        log.warning("Gemini APIError code=%s status=%s", getattr(e, "code", "?"), getattr(e, "status", "?"))
        raise GeminiUnavailable(str(getattr(e, "code", "api"))) from e
    except Exception as e:  # timeout, red
        log.warning("Gemini fallo: %s", type(e).__name__)
        raise GeminiUnavailable(type(e).__name__) from e

    text = (resp.text or "").strip()
    if not text:  # bloqueado por seguridad o sin contenido
        raise GeminiUnavailable("respuesta vacía")
    return text
