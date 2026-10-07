"""Minimal private-object storage client for Supabase Storage.

The application uses its own JWT/RBAC model, so browser clients never receive
the Supabase service-role key.  All object operations are performed by the
backend after its normal authorization checks have succeeded.
"""

from __future__ import annotations

import json
import os
from typing import Optional
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen

from fastapi import HTTPException, status


def _settings() -> tuple[str, str, str]:
    url = os.getenv("SUPABASE_URL", "").rstrip("/")
    service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    bucket = os.getenv("SUPABASE_STORAGE_BUCKET", "fsms-documents")
    if not url or not service_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Supabase Storage chưa được cấu hình trên máy chủ.",
        )
    return url, service_key, bucket


def _request(method: str, path: str, *, data: Optional[bytes] = None, content_type: Optional[str] = None) -> tuple[bytes, dict[str, str]]:
    url, service_key, _ = _settings()
    headers = {"Authorization": f"Bearer {service_key}", "apikey": service_key}
    if content_type:
        headers["Content-Type"] = content_type
    request = Request(f"{url}{path}", data=data, headers=headers, method=method)
    try:
        with urlopen(request, timeout=30) as response:
            return response.read(), dict(response.headers.items())
    except HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")[:500]
        raise HTTPException(status_code=502, detail=f"Không thể thao tác Supabase Storage: {detail}") from exc
    except URLError as exc:
        raise HTTPException(status_code=503, detail="Không thể kết nối Supabase Storage.") from exc


def upload_private_file(object_path: str, content: bytes, content_type: str) -> None:
    """Store a new immutable object; callers must generate a unique path."""
    _, _, bucket = _settings()
    encoded_path = quote(object_path, safe="/")
    _request(
        "POST",
        f"/storage/v1/object/{quote(bucket, safe='')}/{encoded_path}",
        data=content,
        content_type=content_type or "application/octet-stream",
    )


def download_private_file(object_path: str) -> tuple[bytes, str]:
    """Read a private object through the backend after application RBAC."""
    _, _, bucket = _settings()
    encoded_path = quote(object_path, safe="/")
    content, headers = _request("GET", f"/storage/v1/object/{quote(bucket, safe='')}/{encoded_path}")
    return content, headers.get("Content-Type", "application/octet-stream")
