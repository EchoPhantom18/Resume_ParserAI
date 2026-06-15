import json
import re
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from parser import URL_PATTERN, YEAR_PATTERN, extract_projects, extract_section_blocks


BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "resume_parser.db"
PROJECT_STATUS_TITLE_PATTERN = re.compile(
    r"^(?:(?:19|20)\d{2}\s+)?\(?\s*(in development|under development|in progress|ongoing|current|working)\s*\)?(?:\s+(?:19|20)\d{2})?$",
    re.IGNORECASE,
)

JSON_FIELDS = {
    "skills",
    "education",
    "experience",
    "projects",
    "certifications",
    "job_skills",
    "matched_skills",
    "missing_skills",
}


def get_connection() -> sqlite3.Connection:
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def init_db() -> None:
    with get_connection() as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS candidates (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT,
                phone TEXT,
                skills TEXT NOT NULL,
                education TEXT NOT NULL,
                experience TEXT NOT NULL,
                projects TEXT NOT NULL,
                certifications TEXT NOT NULL,
                ats_score REAL NOT NULL DEFAULT 0,
                raw_text TEXT NOT NULL,
                file_name TEXT NOT NULL,
                file_path TEXT NOT NULL,
                file_url TEXT NOT NULL,
                uploaded_at TEXT NOT NULL,
                job_description TEXT,
                job_skills TEXT NOT NULL DEFAULT '[]',
                job_match_score REAL NOT NULL DEFAULT 0,
                matched_skills TEXT NOT NULL,
                missing_skills TEXT NOT NULL,
                match_message TEXT NOT NULL DEFAULT ''
            )
            """
        )
        existing_columns = {
            row["name"]
            for row in connection.execute("PRAGMA table_info(candidates)").fetchall()
        }
        migrations = {
            "job_skills": "TEXT NOT NULL DEFAULT '[]'",
            "match_message": "TEXT NOT NULL DEFAULT ''",
        }
        for column_name, column_definition in migrations.items():
            if column_name not in existing_columns:
                connection.execute(
                    f"ALTER TABLE candidates ADD COLUMN {column_name} {column_definition}"
                )
        connection.execute("CREATE INDEX IF NOT EXISTS idx_candidates_email ON candidates(email)")
        connection.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(lower(email))")
        connection.commit()


def create_user(name: str, email: str, password_hash: str) -> dict[str, Any]:
    created_at = datetime.now(timezone.utc).isoformat()
    normalized_email = email.strip().lower()

    with get_connection() as connection:
        cursor = connection.execute(
            """
            INSERT INTO users (name, email, password_hash, created_at)
            VALUES (?, ?, ?, ?)
            """,
            (name.strip(), normalized_email, password_hash, created_at),
        )
        connection.commit()
        user_id = cursor.lastrowid

    user = get_user_by_id(user_id)
    return user or {}


def get_user_by_email(email: str) -> dict[str, Any] | None:
    if not email:
        return None

    with get_connection() as connection:
        row = connection.execute(
            "SELECT * FROM users WHERE lower(email) = lower(?) LIMIT 1",
            (email.strip(),),
        ).fetchone()
    return row_to_user(row)


def get_user_by_id(user_id: int) -> dict[str, Any] | None:
    with get_connection() as connection:
        row = connection.execute(
            "SELECT * FROM users WHERE id = ? LIMIT 1",
            (user_id,),
        ).fetchone()
    return row_to_user(row)


def save_candidate(
    *,
    parsed: dict[str, Any],
    file_name: str,
    file_path: str,
    file_url: str,
    job_description: str,
    match_result: dict[str, Any],
) -> dict[str, Any]:
    uploaded_at = datetime.now(timezone.utc).isoformat()
    existing = get_candidate_by_email(parsed.get("email", ""))

    match_score = match_result.get("match_score")
    score_for_db = float(match_score) if match_score is not None else 0

    payload = (
        parsed.get("name") or "Unknown Candidate",
        parsed.get("email") or "",
        parsed.get("phone") or "",
        to_json(parsed.get("skills", [])),
        to_json(parsed.get("education", [])),
        to_json(parsed.get("experience", [])),
        to_json(parsed.get("projects", [])),
        to_json(parsed.get("certifications", [])),
        float(parsed.get("ats_score", 0)),
        parsed.get("raw_text", ""),
        file_name,
        file_path,
        file_url,
        uploaded_at,
        job_description,
        to_json(match_result.get("job_skills", [])),
        score_for_db,
        to_json(match_result.get("matched_skills", [])),
        to_json(match_result.get("missing_skills", [])),
        match_result.get("message", ""),
    )

    with get_connection() as connection:
        if existing:
            connection.execute(
                """
                UPDATE candidates
                SET name = ?, email = ?, phone = ?, skills = ?, education = ?,
                    experience = ?, projects = ?, certifications = ?, ats_score = ?,
                    raw_text = ?, file_name = ?, file_path = ?, file_url = ?,
                    uploaded_at = ?, job_description = ?, job_skills = ?,
                    job_match_score = ?, matched_skills = ?, missing_skills = ?,
                    match_message = ?
                WHERE id = ?
                """,
                payload + (existing["id"],),
            )
            candidate_id = existing["id"]
        else:
            cursor = connection.execute(
                """
                INSERT INTO candidates (
                    name, email, phone, skills, education, experience, projects,
                    certifications, ats_score, raw_text, file_name, file_path,
                    file_url, uploaded_at, job_description, job_skills,
                    job_match_score, matched_skills, missing_skills, match_message
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                payload,
            )
            candidate_id = cursor.lastrowid

        connection.commit()

    return get_candidate(candidate_id) or {}


def get_candidate_by_email(email: str) -> dict[str, Any] | None:
    if not email:
        return None

    with get_connection() as connection:
        row = connection.execute(
            "SELECT * FROM candidates WHERE lower(email) = lower(?) LIMIT 1",
            (email,),
        ).fetchone()
    return row_to_candidate(row)


def get_candidate(candidate_id: int) -> dict[str, Any] | None:
    with get_connection() as connection:
        row = connection.execute(
            "SELECT * FROM candidates WHERE id = ?",
            (candidate_id,),
        ).fetchone()
    return row_to_candidate(row)


def list_candidates() -> list[dict[str, Any]]:
    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT * FROM candidates
            ORDER BY datetime(uploaded_at) DESC
            """
        ).fetchall()
    return [candidate for row in rows if (candidate := row_to_candidate(row))]


def update_candidate_match(candidate_id: int, job_description: str, match_result: dict[str, Any]) -> dict[str, Any] | None:
    match_score = match_result.get("match_score")
    score_for_db = float(match_score) if match_score is not None else 0

    with get_connection() as connection:
        connection.execute(
            """
            UPDATE candidates
            SET job_description = ?,
                job_skills = ?,
                job_match_score = ?,
                matched_skills = ?,
                missing_skills = ?,
                match_message = ?
            WHERE id = ?
            """,
            (
                job_description,
                to_json(match_result.get("job_skills", [])),
                score_for_db,
                to_json(match_result.get("matched_skills", [])),
                to_json(match_result.get("missing_skills", [])),
                match_result.get("message", ""),
                candidate_id,
            ),
        )
        connection.commit()
    return get_candidate(candidate_id)


def row_to_candidate(row: sqlite3.Row | None) -> dict[str, Any] | None:
    if row is None:
        return None

    candidate = dict(row)
    for field in JSON_FIELDS:
        candidate[field] = from_json(candidate.get(field))
    candidate["projects"] = best_available_projects(
        candidate.get("projects", []),
        candidate.get("raw_text", ""),
    )
    candidate["job_description"] = candidate.get("job_description") or ""
    candidate["match_message"] = candidate.get("match_message") or ""
    candidate["file_url"] = candidate.get("file_url") or ""
    candidate["match_score"] = (
        candidate.get("job_match_score")
        if candidate.get("job_skills")
        else None
    )
    return candidate


def row_to_user(row: sqlite3.Row | None) -> dict[str, Any] | None:
    if row is None:
        return None

    user = dict(row)
    return {
        "id": user["id"],
        "name": user["name"],
        "email": user["email"],
        "password_hash": user["password_hash"],
        "created_at": user["created_at"],
    }


def public_user(user: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": user.get("id"),
        "name": user.get("name", ""),
        "email": user.get("email", ""),
        "created_at": user.get("created_at", ""),
    }


def to_json(value: Any) -> str:
    return json.dumps(value or [], ensure_ascii=False)


def from_json(value: str | None) -> list[Any]:
    if not value:
        return []
    try:
        parsed = json.loads(value)
        return parsed if isinstance(parsed, list) else []
    except json.JSONDecodeError:
        return []


def best_available_projects(projects: list[Any], raw_text: str) -> list[Any]:
    """Prefer freshly grouped projects when old rows contain stale string fragments."""
    if not raw_text:
        return projects

    current_count = count_valid_projects(projects)
    try:
        sections = extract_section_blocks(raw_text)
        reparsed_projects = extract_projects(sections.get("projects", ""))
    except Exception:
        return projects

    reparsed_count = count_valid_projects(reparsed_projects)
    return reparsed_projects if reparsed_count > current_count else projects


def count_valid_projects(projects: list[Any]) -> int:
    if not isinstance(projects, list):
        return 0

    if any(isinstance(project, dict) for project in projects):
        return sum(
            1
            for project in projects
            if isinstance(project, dict) and is_valid_project_title(str(project.get("title", "")))
        )

    return sum(
        1
        for project in projects
        if is_countable_project_title(str(project or "").strip())
    )


def is_countable_project_title(title: str) -> bool:
    if not is_valid_project_title(title):
        return False
    return bool("—" in title or "–" in title or " - " in title or " ? " in title)


def is_valid_project_title(title: str) -> bool:
    cleaned = title.strip()
    lowered = cleaned.lower()
    if not cleaned:
        return False
    if lowered in {"project", "project details detected, but no description bullets were found."}:
        return False
    if PROJECT_STATUS_TITLE_PATTERN.fullmatch(cleaned):
        return False
    if lowered.startswith(("live:", "github:", "tech stack:", "technologies:", "technology:", "tools:", "stack:")):
        return False
    if URL_PATTERN.search(cleaned) or "|" in cleaned or YEAR_PATTERN.fullmatch(cleaned):
        return False
    if cleaned.lstrip().startswith(("•", "-", "*")):
        return False
    return True
