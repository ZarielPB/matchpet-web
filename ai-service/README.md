# MatchPet AI — microservicio del asistente (FastAPI + Gemini)

Intermediario entre la PWA y la API de Google Gemini. La clave de Gemini vive solo aquí (nunca en el frontend).

## Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/v1/health` | Estado del servicio (`Service is running`). |
| POST | `/api/v1/chat` | Recibe `session_id`, el historial `messages` y, opcional, `questionnaire`. Devuelve `reply`, `fallback` y `remaining_messages`. |
| GET | `/docs` | Swagger UI. |

Si Gemini falla (cuota, timeout, error) el servicio responde 200 con un mensaje amable y `fallback: true`. Hay tres topes, y al superarlos responde con un aviso sin llamar a Gemini:
`MAX_MESSAGES_PER_SESSION` (por conversación), `MAX_MESSAGES_PER_DAY` (por usuario autenticado, o por IP si el servicio está abierto) y `MAX_GLOBAL_MESSAGES_PER_DAY` (total del servicio). El `session_id` lo elige el cliente, por eso el tope real es el diario.

## Configuración

```bash
cp .env.example .env     # luego pega tu GEMINI_API_KEY en .env
```

Variables en `.env.example`. Con `SUPABASE_URL` y `SUPABASE_ANON_KEY` definidos, `/chat` exige el token de sesión de Supabase (`Authorization: Bearer <access_token>`).

## Con Docker (recomendado)

```bash
docker compose up --build        # construye y levanta en http://localhost:8000
curl http://localhost:8000/api/v1/health
docker compose down              # detener
```

## Sin Docker

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements-dev.txt
.venv/bin/uvicorn app.main:app --reload     # http://localhost:8000/docs
.venv/bin/python -m pytest -q               # pruebas
```

## Ejemplo de consulta

```bash
curl -X POST http://localhost:8000/api/v1/chat -H "Content-Type: application/json" -d '{
  "session_id": "sesion-12345",
  "messages": [{"role": "user", "content": "¿Qué cuidados necesita un gato senior?"}],
  "questionnaire": {"activity_level": "bajo", "space_type": "pequeño"}
}'
```

## Si el modelo no responde

Los modelos de Gemini cambian con el tiempo. Lista los disponibles para tu clave:

```bash
.venv/bin/python -c "from google import genai; from app.config import get_settings as g; [print(m.name) for m in genai.Client(api_key=g().gemini_api_key).models.list() if 'generateContent' in (m.supported_actions or [])]"
```

y cambia `GEMINI_MODEL` en `.env`. Los modelos "lite" responden más rápido que los de razonamiento.

## Límites conocidos

- Los contadores están en memoria: se reinician al reiniciar el servicio y no se comparten entre varias instancias (con más de una, usar Redis).
- Sin `SUPABASE_URL` el servicio queda abierto y limita por IP: úsalo así solo en desarrollo. En producción define `SUPABASE_URL` y `SUPABASE_ANON_KEY` (los mismos valores públicos `VITE_SUPABASE_*` del frontend) y el frontend debe enviar `Authorization: Bearer <access_token>`.
