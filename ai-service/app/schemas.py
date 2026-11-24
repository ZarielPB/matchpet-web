from typing import Literal

from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=1000)


class Questionnaire(BaseModel):
    """Respuestas del cuestionario de estilo de vida (opcionales, HU-64 CA#3)."""

    hours_at_home: Literal["menos_de_4", "4_a_8", "mas_de_8"] | None = None
    activity_level: Literal["bajo", "moderado", "alto"] | None = None
    space_type: Literal["pequeño", "amplio"] | None = None
    preferred_size: Literal["pequeño", "mediano", "grande"] | None = None


class ChatRequest(BaseModel):
    session_id: str = Field(min_length=8, max_length=64, pattern=r"^[A-Za-z0-9_-]+$")
    messages: list[ChatMessage] = Field(min_length=1, max_length=20)
    questionnaire: Questionnaire | None = None


class ChatResponse(BaseModel):
    reply: str
    fallback: bool = False
    remaining_messages: int


class HealthResponse(BaseModel):
    status: str
    message: str
