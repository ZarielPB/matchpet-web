from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Toda la configuración sale de variables de entorno (.env); nunca del código (HU-64 CA#1)."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    gemini_api_key: str = ""
    gemini_model: str = "gemini-3.5-flash-lite"
    gemini_timeout_seconds: int = 20
    gemini_max_output_tokens: int = 400

    # HU-63 CA#4: solo el frontend puede llamar al servicio. Separar con comas.
    allowed_origins: str = "http://localhost:5173,http://localhost:4173"

    # HU-64 CA#5: tope de mensajes de usuario por sesión de chat.
    max_messages_per_session: int = 20
    # El session_id lo elige el cliente, así que no basta: también hay tope diario por usuario
    # (por IP si no hay sesión de Supabase) y un tope global que protege la cuota de Gemini.
    max_messages_per_day: int = 100
    max_global_messages_per_day: int = 1000

    # Si se define, /chat exige un token de sesión de Supabase válido (evita que cualquiera gaste la cuota).
    supabase_url: str = ""
    supabase_anon_key: str = ""

    @property
    def origins(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
