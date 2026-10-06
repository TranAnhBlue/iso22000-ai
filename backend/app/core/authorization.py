"""Small, framework-independent helpers for consistent RBAC decisions."""

from __future__ import annotations

from typing import Any, Iterable


def role_codes(user: Any, *, include_department: bool = True) -> set[str]:
    """Return normalized role codes for a user without depending on ORM imports."""
    codes = {
        str(role.role_code).lower().strip()
        for role in (getattr(user, "roles", None) or [])
        if getattr(role, "role_code", None)
    }
    if include_department and getattr(user, "department", None):
        codes.add(str(user.department).lower().strip())
    return codes


def has_any_role(
    user: Any,
    allowed_roles: Iterable[str],
    *,
    include_department: bool = True,
    fuzzy_match: bool = True,
) -> bool:
    """Check roles consistently; admins always retain the platform-wide bypass."""
    actual_roles = role_codes(user, include_department=include_department)
    if "admin" in actual_roles:
        return True

    allowed = {str(role).lower().strip() for role in allowed_roles if str(role).strip()}
    if fuzzy_match:
        return any(
            actual == expected or actual in expected or expected in actual
            for actual in actual_roles
            for expected in allowed
        )
    return bool(actual_roles & allowed)
