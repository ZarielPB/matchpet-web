import httpx
import pytest
from fastapi.testclient import TestClient

from app import main
from app.config import Settings, get_settings
from app.gemini import GeminiUnavailable, _context, build_contents
from app.schemas import ChatMessage, Questionnaire

ORIGIN = "http://localhost:5173"


def reset_counters():
    main._sessions.clear()
    main._daily.update(**{"global": 0, "actors": {}})


def make_settings(**over) -> Settings:
    return Settings(_env_file=None, gemini_api_key="test-key", max_messages_per_session=3, **over)


@pytest.fixture
def client(monkeypatch):
    reset_counters()
    settings = make_settings()
    main.app.dependency_overrides[get_settings] = lambda: settings
    calls = []

    async def fake_reply(s, messages, q):
        calls.append((messages, q))
        return "Respuesta de prueba"

    monkeypatch.setattr(main, "generate_reply", fake_reply)
    c = TestClient(main.app)
    c.calls = calls
    yield c
    main.app.dependency_overrides.clear()


def body(**over):
    base = {"session_id": "sesion-12345", "messages": [{"role": "user", "content": "¿Qué cuidados necesita un gato senior?"}]}
    return {**base, **over}


def test_health_dice_service_is_running(client):  # HU-63 CA#3
    r = client.get("/api/v1/health")
    assert r.status_code == 200 and r.json()["message"] == "Service is running"


def test_swagger_disponible(client):  # HU-63 CA#5
    assert client.get("/docs").status_code == 200
    assert "/api/v1/chat" in client.get("/openapi.json").json()["paths"]


def test_cors_solo_origen_permitido(client):  # HU-63 CA#4
    ok = client.options("/api/v1/chat", headers={"Origin": ORIGIN, "Access-Control-Request-Method": "POST"})
    assert ok.headers.get("access-control-allow-origin") == ORIGIN
    bad = client.options("/api/v1/chat", headers={"Origin": "https://malicioso.example", "Access-Control-Request-Method": "POST"})
    assert "access-control-allow-origin" not in bad.headers


def test_chat_responde_y_cuenta_mensajes(client):
    r = client.post("/api/v1/chat", json=body())
    assert r.status_code == 200
    assert r.json() == {"reply": "Respuesta de prueba", "fallback": False, "remaining_messages": 2}


def test_chat_pasa_historial_y_cuestionario(client):  # HU-64 CA#3
    q = {"hours_at_home": "4_a_8", "activity_level": "alto", "space_type": "amplio", "preferred_size": "mediano"}
    msgs = [{"role": "user", "content": "hola"}, {"role": "assistant", "content": "¡Hola!"}, {"role": "user", "content": "¿por qué 80 %?"}]
    assert client.post("/api/v1/chat", json=body(messages=msgs, questionnaire=q)).status_code == 200
    sent, ctx = client.calls[0]
    assert [m.role for m in sent] == ["user", "assistant", "user"] and ctx.activity_level == "alto"


def test_limite_de_mensajes_por_sesion(client):  # HU-64 CA#5
    for _ in range(3):
        assert client.post("/api/v1/chat", json=body()).json()["fallback"] is False
    r = client.post("/api/v1/chat", json=body()).json()
    assert r["fallback"] is True and r["remaining_messages"] == 0 and "límite" in r["reply"]
    assert len(client.calls) == 3  # el cuarto nunca llegó a Gemini
    assert client.post("/api/v1/chat", json=body(session_id="otra-sesion-1")).json()["fallback"] is False


def test_fallo_de_gemini_devuelve_mensaje_amable(client, monkeypatch):  # HU-64 CA#4
    async def boom(*a):
        raise GeminiUnavailable("429")

    monkeypatch.setattr(main, "generate_reply", boom)
    r = client.post("/api/v1/chat", json=body())
    assert r.status_code == 200 and r.json()["fallback"] is True and "descanso" in r.json()["reply"]
    assert r.json()["remaining_messages"] == 3  # el fallo no consume el cupo


@pytest.mark.parametrize("bad", [
    body(messages=[]),
    body(messages=[{"role": "user", "content": ""}]),
    body(messages=[{"role": "user", "content": "x" * 1001}]),
    body(messages=[{"role": "system", "content": "hola"}]),
    body(session_id="corto"),
    body(session_id="con espacios y ñ"),
    body(questionnaire={"activity_level": "extremo"}),
])
def test_validacion_pydantic(client, bad):  # HU-63 CA#1
    assert client.post("/api/v1/chat", json=bad).status_code == 422


def test_el_ultimo_mensaje_debe_ser_del_usuario(client):
    r = client.post("/api/v1/chat", json=body(messages=[{"role": "user", "content": "hola"}, {"role": "assistant", "content": "hola"}]))
    assert r.status_code == 422


def test_sin_clave_de_gemini_cae_en_fallback():
    import asyncio

    from app.gemini import generate_reply

    with pytest.raises(GeminiUnavailable):
        asyncio.run(generate_reply(Settings(_env_file=None, gemini_api_key=""), [ChatMessage(role="user", content="hola")], None))


def test_contexto_del_cuestionario_y_roles_de_gemini():
    assert _context(None) == ""
    assert _context(Questionnaire()) == ""
    ctx = _context(Questionnaire(hours_at_home="mas_de_8", preferred_size="grande"))
    assert "más de 8 horas" in ctx and "grande" in ctx
    roles = [c.role for c in build_contents([ChatMessage(role="user", content="a"), ChatMessage(role="assistant", content="b")])]
    assert roles == ["user", "model"]


# --- Verificación de sesión de Supabase (anti-abuso de la cuota) ---
class FakeAsyncClient:
    status = 200

    def __init__(self, *a, **k): ...
    async def __aenter__(self): return self
    async def __aexit__(self, *a): return False

    async def get(self, url, headers):
        assert url.endswith("/auth/v1/user") and headers["Authorization"] == "Bearer tok"
        return httpx.Response(self.status, json={"id": "user-1"})


def test_con_supabase_exige_sesion_valida(monkeypatch):
    reset_counters()
    settings = make_settings(supabase_url="https://x.supabase.co", supabase_anon_key="anon")
    main.app.dependency_overrides[get_settings] = lambda: settings

    async def fake_reply(*a):
        return "ok"

    monkeypatch.setattr(main, "generate_reply", fake_reply)
    monkeypatch.setattr(main.httpx, "AsyncClient", FakeAsyncClient)
    c = TestClient(main.app)
    try:
        assert c.post("/api/v1/chat", json=body()).status_code == 401  # sin token
        assert c.post("/api/v1/chat", json=body(), headers={"Authorization": "Bearer tok"}).status_code == 200
        FakeAsyncClient.status = 401
        assert c.post("/api/v1/chat", json=body(), headers={"Authorization": "Bearer tok"}).status_code == 401
        assert c.get("/api/v1/health").status_code == 200  # health siempre abierto
    finally:
        FakeAsyncClient.status = 200
        main.app.dependency_overrides.clear()


def test_cambiar_el_session_id_no_evita_el_tope_diario(client, monkeypatch):
    settings = make_settings(max_messages_per_day=4)
    main.app.dependency_overrides[get_settings] = lambda: settings
    for i in range(4):  # 4 sesiones distintas, 1 mensaje cada una
        assert client.post("/api/v1/chat", json=body(session_id=f"sesion-nueva-{i}")).json()["fallback"] is False
    r = client.post("/api/v1/chat", json=body(session_id="sesion-nueva-99")).json()
    assert r["fallback"] is True and "diario" in r["reply"]
    assert len(client.calls) == 4


def test_tope_global_protege_la_cuota(client):
    main.app.dependency_overrides[get_settings] = lambda: make_settings(max_global_messages_per_day=2)
    assert client.post("/api/v1/chat", json=body(session_id="aaaaaaaa1")).json()["fallback"] is False
    assert client.post("/api/v1/chat", json=body(session_id="bbbbbbbb2")).json()["fallback"] is False
    r = client.post("/api/v1/chat", json=body(session_id="cccccccc3")).json()
    assert r["fallback"] is True and "demanda" in r["reply"]


def test_los_topes_se_reinician_al_cambiar_el_dia(client):
    main.app.dependency_overrides[get_settings] = lambda: make_settings(max_messages_per_day=1)
    assert client.post("/api/v1/chat", json=body(session_id="dia-uno-12")).json()["fallback"] is False
    assert client.post("/api/v1/chat", json=body(session_id="dia-uno-34")).json()["fallback"] is True
    from datetime import date, timedelta
    main._daily["day"] = date.today() - timedelta(days=1)
    assert client.post("/api/v1/chat", json=body(session_id="dia-dos-56")).json()["fallback"] is False


def test_cada_usuario_autenticado_tiene_su_propio_cupo(monkeypatch):
    reset_counters()
    settings = make_settings(supabase_url="https://x.supabase.co", supabase_anon_key="anon", max_messages_per_day=1)
    main.app.dependency_overrides[get_settings] = lambda: settings

    async def fake_reply(*a):
        return "ok"

    monkeypatch.setattr(main, "generate_reply", fake_reply)
    monkeypatch.setattr(main.httpx, "AsyncClient", FakeAsyncClient)
    c = TestClient(main.app)
    try:
        h = {"Authorization": "Bearer tok"}
        assert c.post("/api/v1/chat", json=body(session_id="user-uno-1"), headers=h).json()["fallback"] is False
        assert c.post("/api/v1/chat", json=body(session_id="user-uno-2"), headers=h).json()["fallback"] is True
    finally:
        main.app.dependency_overrides.clear()
