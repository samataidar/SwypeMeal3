import sys
import pytest
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

from fastapi.testclient import TestClient  # noqa: E402
import main  # noqa: E402  (import after sys.path setup)


class FakeSupabase:
    """Minimal stand-in for SupabaseClient that records calls."""

    def __init__(
        self,
        recipes=None,
        queue_rows=None,
        swiped_rows=None,
        pending_rows=None,
        user_rows=None,
        roles=None,
        fail_tables=(),
    ):
        self.calls = []
        self.recipes = recipes or []
        self.queue_rows = queue_rows or []
        self.swiped_rows = swiped_rows or []
        self.pending_rows = pending_rows or []
        self.user_rows = user_rows or []
        self.roles = roles or []
        self.fail_tables = set(fail_tables)

    def _maybe_fail(self, table):
        if table in self.fail_tables:
            raise Exception("supabase down")

    def select(self, table, query="*", filters=None, order=None, limit=None):
        self.calls.append(("select", table))
        self._maybe_fail(table)
        if table == "recipes":
            return self.recipes
        if table == "queue_items":
            return self.queue_rows
        if table == "swiped_recipes":
            return self.swiped_rows
        if table == "pending_recipes":
            return self.pending_rows
        if table == "users":
            return self.user_rows
        if table == "user_roles":
            return self.roles
        return []

    def insert(self, table, data):
        self.calls.append(("insert", table, data))
        self._maybe_fail(table)
        return data

    def upsert(self, table, data, on_conflict=None):
        self.calls.append(("upsert", table, data))
        self._maybe_fail(table)
        return data

    def delete(self, table, filters):
        self.calls.append(("delete", table))
        self._maybe_fail(table)
        return None

    def update(self, table, filters, data):
        self.calls.append(("update", table, data))
        self._maybe_fail(table)
        return None

    def _request(self, method, path, **kwargs):
        self.calls.append((method.lower(), path, kwargs.get("json")))
        return {}

    def tables(self):
        return [call[1] for call in self.calls]


def _reset_caches():
    main._health_cache = None
    main._catalog_cache = None
    main._catalog_cached_at = 0.0


@pytest.fixture
def client():
    return TestClient(main.app)


@pytest.fixture
def file_mode(tmp_path, monkeypatch):
    """File storage with an isolated data directory and insecure auth."""
    monkeypatch.setattr(main, "DATA_DIR", str(tmp_path))
    monkeypatch.setattr(main, "USE_SUPABASE", False)
    monkeypatch.setattr(main, "supabase", None)
    monkeypatch.setattr(main, "ALLOW_INSECURE_AUTH", True)
    monkeypatch.setattr(main, "AUTH_ENABLED", False)
    monkeypatch.delenv("RENDER", raising=False)
    _reset_caches()
    yield main
    _reset_caches()


@pytest.fixture
def supabase_mode(monkeypatch):
    """Supabase mode; returns a function that installs a fake client."""
    monkeypatch.setattr(main, "USE_SUPABASE", True)
    monkeypatch.setattr(main, "ALLOW_INSECURE_AUTH", True)
    monkeypatch.setattr(main, "AUTH_ENABLED", False)
    monkeypatch.setattr(main, "SUPABASE_KEY_ROLE", "service_role")
    _reset_caches()

    def install(fake):
        monkeypatch.setattr(main, "supabase", fake)
        _reset_caches()
        return fake

    yield install
    _reset_caches()


@pytest.fixture
def headers():
    return {"X-User-ID": "test-user"}
