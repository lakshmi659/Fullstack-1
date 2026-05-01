"""
Task 3 – Sahana B S
File Upload API: accepts image/PDF, validates type & size,
saves to uploads/, returns metadata. Full CRUD for file management.
"""

from fastapi import APIRouter, HTTPException, UploadFile, File, status
from fastapi.responses import FileResponse
from pydantic import BaseModel
from datetime import datetime, timezone
from typing import Optional
import uuid
import os
import shutil

router = APIRouter(prefix="/files", tags=["Task 3 – File Upload"])

# ─── Config ──────────────────────────────────────────────────────────────────
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_TYPES = {
    "image/jpeg":       ".jpg",
    "image/png":        ".png",
    "image/gif":        ".gif",
    "image/webp":       ".webp",
    "application/pdf":  ".pdf",
}
MAX_FILE_SIZE_MB = 10
MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

# ─── In-Memory Registry ───────────────────────────────────────────────────────
_files_db: list[dict] = []


# ─── Models ──────────────────────────────────────────────────────────────────
class FileMetadata(BaseModel):
    id: str
    original_filename: str
    saved_filename: str
    content_type: str
    size_bytes: int
    size_kb: float
    uploaded_at: str
    download_url: str


# ─── Helpers ─────────────────────────────────────────────────────────────────
def _find_file(file_id: str) -> dict:
    for f in _files_db:
        if f["id"] == file_id:
            return f
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"File '{file_id}' not found",
    )


# ─── Routes ──────────────────────────────────────────────────────────────────
@router.post("/upload", response_model=FileMetadata, status_code=status.HTTP_201_CREATED)
async def upload_file(file: UploadFile = File(...)):
    """
    Upload an image (JPEG, PNG, GIF, WEBP) or PDF.
    - Max size: 10 MB
    - Returns metadata including download URL
    """
    # Validate content type
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported file type '{file.content_type}'. "
                   f"Allowed: {', '.join(ALLOWED_TYPES.keys())}",
        )

    # Read and validate size
    contents = await file.read()
    file_size = len(contents)

    if file_size == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty",
        )
    if file_size > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large ({file_size / 1024 / 1024:.1f} MB). Max is {MAX_FILE_SIZE_MB} MB",
        )

    # Save with unique name to avoid collisions
    ext = ALLOWED_TYPES[file.content_type]
    file_id = str(uuid.uuid4())
    saved_filename = f"{file_id}{ext}"
    save_path = os.path.join(UPLOAD_DIR, saved_filename)

    with open(save_path, "wb") as f:
        f.write(contents)

    # Register in memory
    record = {
        "id": file_id,
        "original_filename": file.filename,
        "saved_filename": saved_filename,
        "content_type": file.content_type,
        "size_bytes": file_size,
        "size_kb": round(file_size / 1024, 2),
        "uploaded_at": datetime.now(timezone.utc).isoformat(),
        "download_url": f"/files/{file_id}/download",
    }
    _files_db.append(record)
    return record


@router.get("/", response_model=list[FileMetadata], status_code=status.HTTP_200_OK)
def list_files():
    """List all uploaded files with their metadata."""
    return _files_db


@router.get("/{file_id}/download")
def download_file(file_id: str):
    """
    Download a file by ID.
    - 200: Returns the file
    - 404: File not found
    """
    record = _find_file(file_id)
    file_path = os.path.join(UPLOAD_DIR, record["saved_filename"])

    if not os.path.exists(file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File exists in registry but not on disk",
        )

    return FileResponse(
        path=file_path,
        media_type=record["content_type"],
        filename=record["original_filename"],
    )


@router.get("/{file_id}", response_model=FileMetadata, status_code=status.HTTP_200_OK)
def get_file_info(file_id: str):
    """Get metadata for a specific file without downloading it."""
    return _find_file(file_id)


@router.delete("/{file_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_file(file_id: str):
    """
    Delete a file from disk and registry.
    - 204: Deleted
    - 404: Not found
    """
    record = _find_file(file_id)
    file_path = os.path.join(UPLOAD_DIR, record["saved_filename"])

    # Remove from disk (ignore if already gone)
    if os.path.exists(file_path):
        os.remove(file_path)

    _files_db.remove(record)
