"""Backend API tests (file storage + fake Supabase)."""

import base64
import json

import pytest

import main


def _jwt_with_role(role: str) -> str:
    header = base64.urlsafe_b64encode(
        json.dumps({"alg": "HS256", "typ": "JWT"}).encode()
    ).rstrip(b"=")
    payload = base64.urlsafe_b64encode(json.dumps({"role": role}).encode()).rstrip(b"=")
    return (header + b"." + payload + b".sig").decode()


# ---------------------------------------------------------------------------
# Health / configuration
# ---------------------------------------------------------------------------

def test_health_file_storage(client, file_mode):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"
    assert response.json()["database"] == "file_storage"


def test_health_degraded_on_render_without_supabase(client, file_mode, monkeypatch):
    monkeypatch.setenv("RENDER", "true")
    file_mode._health_cache = None
    payload = client.get("/api/health").json()
    assert payload["status"] == "degraded"
    assert payload["database"] == "file_storage"


def test_anon_key_is_refused(client, supabase_mode, headers, monkeypatch):
    # A real client is required: the role guard lives in SupabaseClient.
    supabase_mode(main.SupabaseClient("https://example.invalid", "key"))
    monkeypatch.setattr(main, "SUPABASE_KEY_ROLE", "anon")
    main._health_cache = None

    health = client.get("/api/health").json()
    assert health["status"] == "unhealthy"
    assert health["supabase_key_role"] == "anon"
    # Storage endpoints fail loudly instead of returning empty data.
    assert client.get("/api/queue/test-user", headers=headers).status_code == 503


# ---------------------------------------------------------------------------
# Auth / access control
# ---------------------------------------------------------------------------

def test_auth_is_required(client, file_mode):
    assert client.get("/api/queue/test-user").status_code == 401
    assert client.post("/api/queue/test-user", params={"recipe_id": "1"}).status_code == 401


def test_foreign_user_is_forbidden(client, file_mode, headers):
    response = client.get("/api/queue/someone-else", headers=headers)
    assert response.status_code == 403


def test_admin_endpoint_requires_admin(client, file_mode, headers):
    assert client.get("/api/recipes/pending", headers=headers).status_code == 403


# ---------------------------------------------------------------------------
# Queue / history (file mode)
# ---------------------------------------------------------------------------

def test_queue_lifecycle(client, file_mode, headers):
    added = client.post("/api/queue/test-user", params={"recipe_id": "1"}, headers=headers)
    assert added.status_code == 200
    item_id = added.json()["item"]["id"]

    queue = client.get("/api/queue/test-user", headers=headers).json()
    assert queue["count"] == 1

    # Duplicates are rejected
    assert client.post("/api/queue/test-user", params={"recipe_id": "1"}, headers=headers).status_code == 400

    assert client.delete(f"/api/queue/test-user/{item_id}", headers=headers).status_code == 200
    assert client.get("/api/queue/test-user", headers=headers).json()["count"] == 0


def test_cook_moves_item_to_history(client, file_mode, headers):
    item = client.post("/api/queue/test-user", params={"recipe_id": "1"}, headers=headers).json()["item"]
    response = client.post(
        "/api/cook/test-user",
        headers=headers,
        json={"queue_item_id": item["id"], "rating": 5, "notes": "ok"},
    )
    assert response.status_code == 200
    assert client.get("/api/queue/test-user", headers=headers).json()["count"] == 0
    history = client.get("/api/history/test-user", headers=headers).json()
    assert history["count"] == 1
    assert history["history"][0]["rating"] == 5


def test_unknown_recipe_is_404(client, file_mode, headers):
    assert client.post("/api/queue/test-user", params={"recipe_id": "nope"}, headers=headers).status_code == 404


# ---------------------------------------------------------------------------
# Supabase mode: targeted writes
# ---------------------------------------------------------------------------

def test_queue_delete_is_a_single_targeted_write(client, supabase_mode, headers):
    from conftest import FakeSupabase

    fake = supabase_mode(FakeSupabase())
    assert client.delete("/api/queue/test-user/some-id", headers=headers).status_code == 200
    assert fake.calls == [("delete", "queue_items")]


def test_swipe_writes_only_affected_rows(client, supabase_mode, headers):
    from conftest import FakeSupabase

    fake = supabase_mode(FakeSupabase())
    response = client.post("/api/swipe/test-user", headers=headers, json={"recipe_id": "1", "action": "like"})
    assert response.status_code == 200
    assert any(call[0] == "upsert" and call[1] == "swiped_recipes" for call in fake.calls)
    assert any(call[0] == "upsert" and call[1] == "queue_items" for call in fake.calls)
    # No bulk rewrite of the user's data.
    assert not any(call[0] == "delete" for call in fake.calls)


def test_preferences_do_not_rewrite_everything(client, supabase_mode, headers):
    from conftest import FakeSupabase

    fake = supabase_mode(FakeSupabase())
    payload = {
        "max_calories": 700,
        "max_cook_time": 30,
        "exclude_tags": [],
        "preferred_difficulty": ["easy"],
    }
    assert client.put("/api/preferences/test-user", headers=headers, json=payload).status_code == 200
    assert any(call[0] == "upsert" and call[1] == "user_preferences" for call in fake.calls)
    assert not any(call[0] == "delete" for call in fake.calls)


def test_read_failure_returns_503_and_never_writes_files(client, supabase_mode, headers, tmp_path, monkeypatch):
    from conftest import FakeSupabase

    supabase_mode(FakeSupabase(fail_tables={"queue_items"}))
    monkeypatch.setattr(main, "DATA_DIR", str(tmp_path))

    assert client.get("/api/queue/test-user", headers=headers).status_code == 503
    assert client.delete("/api/queue/test-user/x", headers=headers).status_code == 503
    assert list(tmp_path.iterdir()) == []


# ---------------------------------------------------------------------------
# Recipe catalog: the database overrides bundled recipes
# ---------------------------------------------------------------------------

def test_catalog_uses_database_overrides(client, supabase_mode, headers):
    from conftest import FakeSupabase

    row = main.RECIPES_DB[0].model_dump()
    row["title"] = "Carbonara EDITED"
    supabase_mode(FakeSupabase(recipes=[row]))

    assert main.get_recipe_by_id("1")["title"] == "Carbonara EDITED"

    response = client.get("/api/recipes?include_all=true", headers=headers)
    assert response.status_code == 200
    titles = {recipe["id"]: recipe["title"] for recipe in response.json()["recipes"]}
    assert titles["1"] == "Carbonara EDITED"
    assert len(titles) == len(main.RECIPES_DB)


# ---------------------------------------------------------------------------
# Queue reorder
# ---------------------------------------------------------------------------

def test_reorder_updates_only_changed_positions(client, supabase_mode, headers):
    from conftest import FakeSupabase

    fake = supabase_mode(FakeSupabase(queue_rows=[{"id": "a", "position": 0}, {"id": "b", "position": 1}]))
    response = client.post("/api/queue/test-user/reorder", headers=headers, json={"item_ids": ["b", "a"]})
    assert response.status_code == 200
    updates = [call for call in fake.calls if call[0] == "update"]
    assert len(updates) == 2

    # Unknown (optimistic) ids are ignored.
    fake.calls.clear()
    response = client.post("/api/queue/test-user/reorder", headers=headers, json={"item_ids": ["zzz", "a"]})
    assert response.status_code == 200
    assert len([call for call in fake.calls if call[0] == "update"]) == 1


def test_reorder_rejects_foreign_user(client, supabase_mode, headers):
    from conftest import FakeSupabase

    supabase_mode(FakeSupabase())
    assert client.post("/api/queue/other/reorder", headers=headers, json={"item_ids": []}).status_code == 403


# ---------------------------------------------------------------------------
# Swiped ids
# ---------------------------------------------------------------------------

def test_swiped_ids_are_returned(client, supabase_mode, headers):
    from conftest import FakeSupabase

    supabase_mode(FakeSupabase(swiped_rows=[{"recipe_id": "1"}, {"recipe_id": "2"}]))
    payload = client.get("/api/swiped/test-user", headers=headers).json()
    assert payload["swiped_ids"] == ["1", "2"]
    assert payload["count"] == 2


def test_swiped_ids_in_file_mode(client, file_mode, headers):
    client.post("/api/swipe/test-user", headers=headers, json={"recipe_id": "1", "action": "dislike"})
    payload = client.get("/api/swiped/test-user", headers=headers).json()
    assert payload["swiped_ids"] == ["1"]


# ---------------------------------------------------------------------------
# Profiles and recipe authorship
# ---------------------------------------------------------------------------

def test_profile_from_user_extracts_name_and_email():
    profile = main._profile_from_user({
        "email": "anna@example.com",
        "user_metadata": {"full_name": "Anna", "avatar_url": "https://example.com/a.png"},
    })
    assert profile == {
        "full_name": "Anna",
        "email": "anna@example.com",
        "avatar_url": "https://example.com/a.png",
    }


def test_profile_falls_back_to_email_local_part():
    profile = main._profile_from_user({"email": "ivan@example.com", "user_metadata": {}})
    assert profile["full_name"] == "ivan"


def test_profile_upsert_writes_only_present_fields(supabase_mode):
    from conftest import FakeSupabase

    fake = supabase_mode(FakeSupabase())
    main._upsert_user_profile("u1", {"full_name": "Anna", "email": "", "avatar_url": ""})

    updates = [call for call in fake.calls if call[0] == "update" and call[1] == "users"]
    assert updates == [("update", "users", {"full_name": "Anna"})]


def test_approved_recipe_keeps_public_author_name(client, supabase_mode, headers):
    from conftest import FakeSupabase

    pending = {
        "id": "p-1",
        "author_id": "author-1",
        "author_name": "Anna",
        "title": "Soup",
        "description": "Tasty",
        "image": "https://example.com/soup.jpg",
        "cook_time": 20,
        "servings": 2,
        "calories": 300,
        "protein": 10,
        "fat": 8,
        "carbs": 30,
        "ingredients": ["water"],
        "steps": ["cook"],
        "tags": ["soup"],
        "difficulty": "easy",
        "status": "pending",
    }
    fake = supabase_mode(FakeSupabase(
        pending_rows=[pending],
        roles=[{"user_id": "test-user", "role": "admin"}],
    ))

    response = client.post("/api/recipes/p-1/approve", headers=headers, json={})
    assert response.status_code == 200, response.text

    inserted = [call for call in fake.calls if call[0] == "insert" and call[1] == "recipes"]
    assert inserted, fake.calls
    assert inserted[0][2]["author_name"] == "Anna"
    assert inserted[0][2]["author_id"] == "author-1"


def test_approve_falls_back_to_user_profile_for_author_name(client, supabase_mode, headers):
    from conftest import FakeSupabase

    pending = {
        "id": "p-2",
        "author_id": "author-2",
        "title": "Soup",
        "description": "Tasty",
        "image": "https://example.com/soup.jpg",
        "cook_time": 20,
        "servings": 2,
        "calories": 300,
        "protein": 10,
        "fat": 8,
        "carbs": 30,
        "ingredients": ["water"],
        "steps": ["cook"],
        "tags": ["soup"],
        "difficulty": "easy",
        "status": "pending",
    }
    fake = supabase_mode(FakeSupabase(
        pending_rows=[pending],
        user_rows=[{"full_name": "Ivan", "email": "ivan@example.com"}],
        roles=[{"user_id": "test-user", "role": "admin"}],
    ))

    assert client.post("/api/recipes/p-2/approve", headers=headers, json={}).status_code == 200
    inserted = [call for call in fake.calls if call[0] == "insert" and call[1] == "recipes"]
    assert inserted[0][2]["author_name"] == "Ivan"
