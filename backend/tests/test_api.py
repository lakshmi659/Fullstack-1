"""
Task 5 – Lokeshwari MP
Unit + Integration tests for all 3 APIs using pytest + FastAPI TestClient.
"""

import pytest
import io
from fastapi.testclient import TestClient

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from main import app

client = TestClient(app)


# ════════════════════════════════════════════════════════════════════════════
# TASK 1 — User CRUD Tests
# ════════════════════════════════════════════════════════════════════════════

class TestUserCRUD:

    def setup_method(self):
        """Clear users before each test."""
        from routers.users import _users_db
        _users_db.clear()

    # ── Unit: model validation ────────────────────────────────────────────
    def test_create_user_missing_name_422(self):
        r = client.post("/users/", json={"email": "a@b.com"})
        assert r.status_code == 422

    def test_create_user_invalid_age_422(self):
        r = client.post("/users/", json={"name": "A", "email": "a@b.com", "age": -1})
        assert r.status_code == 422

    # ── Integration: full CRUD flow ───────────────────────────────────────
    def test_get_all_users_empty(self):
        r = client.get("/users/")
        assert r.status_code == 200
        assert r.json() == []

    def test_create_user_201(self):
        r = client.post("/users/", json={"name": "Alice", "email": "alice@test.com", "age": 28})
        assert r.status_code == 201
        data = r.json()
        assert data["name"] == "Alice"
        assert data["email"] == "alice@test.com"
        assert "id" in data

    def test_create_duplicate_email_409(self):
        client.post("/users/", json={"name": "Alice", "email": "dup@test.com"})
        r = client.post("/users/", json={"name": "Bob", "email": "dup@test.com"})
        assert r.status_code == 409

    def test_get_user_by_id_200(self):
        create = client.post("/users/", json={"name": "Bob", "email": "bob@test.com"})
        uid = create.json()["id"]
        r = client.get(f"/users/{uid}")
        assert r.status_code == 200
        assert r.json()["name"] == "Bob"

    def test_get_user_not_found_404(self):
        r = client.get("/users/nonexistent-id")
        assert r.status_code == 404

    def test_update_user_200(self):
        create = client.post("/users/", json={"name": "Carol", "email": "carol@test.com"})
        uid = create.json()["id"]
        r = client.put(f"/users/{uid}", json={"name": "Carol Updated"})
        assert r.status_code == 200
        assert r.json()["name"] == "Carol Updated"

    def test_update_user_not_found_404(self):
        r = client.put("/users/bad-id", json={"name": "X"})
        assert r.status_code == 404

    def test_update_user_email_conflict_409(self):
        client.post("/users/", json={"name": "U1", "email": "u1@test.com"})
        r2 = client.post("/users/", json={"name": "U2", "email": "u2@test.com"})
        uid2 = r2.json()["id"]
        r = client.put(f"/users/{uid2}", json={"email": "u1@test.com"})
        assert r.status_code == 409

    def test_delete_user_204(self):
        create = client.post("/users/", json={"name": "Del", "email": "del@test.com"})
        uid = create.json()["id"]
        r = client.delete(f"/users/{uid}")
        assert r.status_code == 204
        assert client.get(f"/users/{uid}").status_code == 404

    def test_delete_user_not_found_404(self):
        r = client.delete("/users/nonexistent-id")
        assert r.status_code == 404


# ════════════════════════════════════════════════════════════════════════════
# TASK 2 — JWT Auth Tests
# ════════════════════════════════════════════════════════════════════════════

class TestJWTAuth:

    def _login(self, username="admin", password="admin123"):
        r = client.post("/auth/login", data={"username": username, "password": password})
        return r

    def _token(self, username="admin", password="admin123"):
        return self._login(username, password).json()["access_token"]

    # ── Unit: token creation/decode ───────────────────────────────────────
    def test_create_and_decode_token(self):
        from routers.auth import _create_access_token, _decode_token
        from datetime import timedelta
        token = _create_access_token({"sub": "test", "role": "user"}, timedelta(minutes=5))
        payload = _decode_token(token)
        assert payload["sub"] == "test"
        assert payload["role"] == "user"

    def test_expired_token_raises(self):
        from routers.auth import _create_access_token, _decode_token
        from datetime import timedelta
        from fastapi import HTTPException
        token = _create_access_token({"sub": "x"}, timedelta(seconds=-1))
        with pytest.raises(HTTPException) as exc:
            _decode_token(token)
        assert exc.value.status_code == 401
        assert "expired" in exc.value.detail.lower()

    # ── Integration: login flow ───────────────────────────────────────────
    def test_login_admin_200(self):
        r = self._login()
        assert r.status_code == 200
        data = r.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["expires_in"] == 1800

    def test_login_user_200(self):
        r = self._login("user", "user123")
        assert r.status_code == 200

    def test_login_wrong_password_401(self):
        r = self._login("admin", "wrongpass")
        assert r.status_code == 401

    def test_login_unknown_user_401(self):
        r = self._login("ghost", "anything")
        assert r.status_code == 401

    def test_protected_me_200(self):
        token = self._token()
        r = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert r.status_code == 200
        data = r.json()
        assert data["user"] == "admin"
        assert data["role"] == "admin"

    def test_protected_me_no_token_401(self):
        r = client.get("/auth/me")
        assert r.status_code == 401

    def test_protected_me_bad_token_401(self):
        r = client.get("/auth/me", headers={"Authorization": "Bearer garbage"})
        assert r.status_code == 401

    def test_admin_only_as_admin_200(self):
        token = self._token("admin", "admin123")
        r = client.get("/auth/admin-only", headers={"Authorization": f"Bearer {token}"})
        assert r.status_code == 200

    def test_admin_only_as_user_403(self):
        token = self._token("user", "user123")
        r = client.get("/auth/admin-only", headers={"Authorization": f"Bearer {token}"})
        assert r.status_code == 403


# ════════════════════════════════════════════════════════════════════════════
# TASK 3 — File Upload Tests
# ════════════════════════════════════════════════════════════════════════════

class TestFileUpload:

    def setup_method(self):
        """Clear file registry before each test."""
        from routers.files import _files_db
        _files_db.clear()

    def _upload(self, content=b"fake image data", filename="test.jpg", content_type="image/jpeg"):
        return client.post(
            "/files/upload",
            files={"file": (filename, io.BytesIO(content), content_type)},
        )

    # ── Unit: helper ─────────────────────────────────────────────────────
    def test_find_file_not_found_raises(self):
        from routers.files import _find_file
        from fastapi import HTTPException
        with pytest.raises(HTTPException) as exc:
            _find_file("nonexistent")
        assert exc.value.status_code == 404

    # ── Integration: upload + metadata ────────────────────────────────────
    def test_upload_jpeg_201(self):
        r = self._upload()
        assert r.status_code == 201
        data = r.json()
        assert "id" in data
        assert data["original_filename"] == "test.jpg"
        assert data["content_type"] == "image/jpeg"
        assert data["size_bytes"] > 0
        assert "/files/" in data["download_url"]

    def test_upload_pdf_201(self):
        r = self._upload(b"%PDF-1.4 fake pdf", "doc.pdf", "application/pdf")
        assert r.status_code == 201
        assert r.json()["content_type"] == "application/pdf"

    def test_upload_invalid_type_415(self):
        r = self._upload(b"data", "file.txt", "text/plain")
        assert r.status_code == 415

    def test_upload_empty_file_400(self):
        r = self._upload(b"", "empty.jpg", "image/jpeg")
        assert r.status_code == 400

    def test_upload_too_large_413(self):
        big = b"x" * (11 * 1024 * 1024)  # 11 MB
        r = self._upload(big, "big.jpg", "image/jpeg")
        assert r.status_code == 413

    def test_list_files_empty(self):
        r = client.get("/files/")
        assert r.status_code == 200
        assert r.json() == []

    def test_list_files_after_upload(self):
        self._upload()
        self._upload(b"second", "b.png", "image/png")
        r = client.get("/files/")
        assert r.status_code == 200
        assert len(r.json()) == 2

    def test_get_file_info_200(self):
        upload = self._upload()
        fid = upload.json()["id"]
        r = client.get(f"/files/{fid}")
        assert r.status_code == 200
        assert r.json()["id"] == fid

    def test_get_file_info_not_found_404(self):
        r = client.get("/files/nonexistent-id")
        assert r.status_code == 404

    def test_download_file_200(self):
        upload = self._upload(b"real content", "dl.jpg", "image/jpeg")
        fid = upload.json()["id"]
        r = client.get(f"/files/{fid}/download")
        assert r.status_code == 200
        assert r.content == b"real content"

    def test_delete_file_204(self):
        upload = self._upload()
        fid = upload.json()["id"]
        r = client.delete(f"/files/{fid}")
        assert r.status_code == 204
        assert client.get(f"/files/{fid}").status_code == 404

    def test_delete_file_not_found_404(self):
        r = client.delete("/files/bad-id")
        assert r.status_code == 404

