import logging
import os
import re
from datetime import datetime, timedelta, timezone
from html import escape
from pathlib import Path
from uuid import uuid4

from fastapi import Depends, FastAPI, File, Form, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from fastapi.staticfiles import StaticFiles
from jose import JWTError, jwt
from passlib.context import CryptContext

from database import (
    create_user,
    get_candidate,
    get_user_by_email,
    get_user_by_id,
    init_db,
    list_candidates,
    public_user,
    save_candidate,
    update_candidate_match,
)
from models import (
    AuthResponse,
    CandidateListItem,
    CandidateResponse,
    CompareCandidatesRequest,
    CompareCandidatesResponse,
    HiringVerdictRequest,
    HiringVerdictResponse,
    JDAnalysisRequest,
    JDAnalysisResponse,
    LoginRequest,
    MatchRequest,
    MatchResponse,
    RecruiterReportResponse,
    RecruiterSummaryResponse,
    SignupRequest,
    UserResponse,
)
from parser import (
    ALLOWED_EXTENSIONS,
    URL_PATTERN,
    YEAR_ANYWHERE_PATTERN,
    YEAR_PATTERN,
    calculate_match_score,
    extract_skills,
    extract_text_from_file,
    parse_resume,
)


BASE_DIR = Path(__file__).resolve().parent
UPLOAD_DIR = BASE_DIR / "uploads"
MAX_FILE_SIZE = 5 * 1024 * 1024
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "resume-parser-ai-local-secret-change-me")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24
password_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer_scheme = HTTPBearer()
logging.basicConfig(level=logging.INFO)

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
init_db()

app = FastAPI(
    title="Resume Parser AI",
    description="FastAPI backend for parsing resumes and matching them against job descriptions.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


def hash_password(password: str) -> str:
    return password_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return password_context.verify(password, password_hash)


def create_access_token(user: dict) -> str:
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": str(user["id"]),
        "email": user["email"],
        "exp": expires_at,
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)) -> dict:
    auth_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired authentication token.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        user_id = int(payload.get("sub", 0))
    except (JWTError, ValueError):
        raise auth_error

    user = get_user_by_id(user_id)
    if user is None:
        raise auth_error
    return user


@app.post("/auth/signup", response_model=AuthResponse)
def signup(payload: SignupRequest) -> dict:
    name = payload.name.strip()
    email = payload.email.strip().lower()
    password = payload.password

    if "@" not in email or "." not in email.split("@")[-1]:
        raise HTTPException(status_code=400, detail="Please enter a valid email address.")
    if get_user_by_email(email):
        raise HTTPException(status_code=409, detail="An account with this email already exists.")

    user = create_user(name, email, hash_password(password))
    return {
        "access_token": create_access_token(user),
        "token_type": "bearer",
        "user": public_user(user),
    }


@app.post("/auth/login", response_model=AuthResponse)
def login(payload: LoginRequest) -> dict:
    user = get_user_by_email(payload.email.strip().lower())
    if user is None or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    return {
        "access_token": create_access_token(user),
        "token_type": "bearer",
        "user": public_user(user),
    }


@app.get("/auth/me", response_model=UserResponse)
def me(current_user: dict = Depends(get_current_user)) -> dict:
    return public_user(current_user)


@app.get("/")
def health_check() -> dict[str, str]:
    return {"status": "ok", "message": "Resume Parser AI backend is running"}


@app.post("/upload-resume", response_model=CandidateResponse)
async def upload_resume(
    file: UploadFile = File(...),
    job_description: str = Form(""),
    current_user: dict = Depends(get_current_user),
) -> dict:
    extension = Path(file.filename or "").suffix.lower()
    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Only PDF and DOCX files are allowed.")

    stored_file_name = f"{uuid4().hex}_{safe_file_name(file.filename or 'resume')}"
    file_path = UPLOAD_DIR / stored_file_name

    try:
        await save_upload_file(file, file_path)
        raw_text = extract_text_from_file(file_path)

        if not raw_text:
            raise HTTPException(status_code=422, detail="No readable text found in the uploaded resume.")

        parsed_resume = parse_resume(raw_text)
        match_result = calculate_match_score(parsed_resume["skills"], job_description)

        return save_candidate(
            parsed=parsed_resume,
            file_name=stored_file_name,
            file_path=str(file_path),
            file_url=f"/uploads/{stored_file_name}",
            job_description=job_description,
            match_result=match_result,
        )
    except HTTPException:
        delete_file(file_path)
        raise
    except ValueError as error:
        delete_file(file_path)
        raise HTTPException(status_code=400, detail=str(error)) from error
    except Exception as error:
        delete_file(file_path)
        raise HTTPException(status_code=500, detail="Resume parsing failed. Please try another file.") from error


@app.post("/match-score", response_model=MatchResponse)
def match_score(payload: MatchRequest, current_user: dict = Depends(get_current_user)) -> dict:
    candidate = get_candidate(payload.candidate_id)
    if candidate is None:
        raise HTTPException(status_code=404, detail="Candidate not found.")

    match_result = calculate_match_score(candidate["skills"], payload.job_description)
    update_candidate_match(payload.candidate_id, payload.job_description, match_result)

    return {
        "candidate_id": payload.candidate_id,
        "job_skills": match_result["job_skills"],
        "matched_skills": match_result["matched_skills"],
        "missing_skills": match_result["missing_skills"],
        "match_score": match_result["match_score"],
        "message": match_result["message"],
    }


@app.get("/candidates", response_model=list[CandidateListItem])
def candidates(current_user: dict = Depends(get_current_user)) -> list[dict]:
    return list_candidates()


@app.get("/candidate/{candidate_id}", response_model=CandidateResponse)
def candidate_detail(candidate_id: int, current_user: dict = Depends(get_current_user)) -> dict:
    candidate = get_candidate(candidate_id)
    if candidate is None:
        raise HTTPException(status_code=404, detail="Candidate not found.")
    return candidate


@app.post("/compare-candidates", response_model=CompareCandidatesResponse)
def compare_candidates(payload: CompareCandidatesRequest, current_user: dict = Depends(get_current_user)) -> dict:
    if payload.candidate_1_id == payload.candidate_2_id:
        raise HTTPException(status_code=400, detail="Please select two different candidates.")

    candidate_1 = get_candidate(payload.candidate_1_id)
    candidate_2 = get_candidate(payload.candidate_2_id)

    if candidate_1 is None or candidate_2 is None:
        raise HTTPException(status_code=404, detail="One or both candidates were not found.")

    comparison = build_candidate_comparison(
        candidate_1,
        candidate_2,
        payload.job_description,
    )

    return {
        "candidate_1": candidate_1,
        "candidate_2": candidate_2,
        "comparison": comparison,
    }


@app.get("/candidate/{id}/recruiter-summary", response_model=RecruiterSummaryResponse)
def recruiter_summary(id: int, current_user: dict = Depends(get_current_user)) -> dict:
    candidate = get_candidate(id)
    if candidate is None:
        raise HTTPException(status_code=404, detail="Candidate not found.")

    return {
        "candidate_id": id,
        "summary": build_recruiter_summary(candidate),
    }


@app.get("/candidate/{id}/hiring-verdict", response_model=HiringVerdictResponse)
def hiring_verdict(id: int, current_user: dict = Depends(get_current_user)) -> dict:
    candidate = get_candidate(id)
    if candidate is None:
        raise HTTPException(status_code=404, detail="Candidate not found.")

    return {
        "candidate_id": id,
        "hiring_verdict": generate_hiring_verdict(candidate),
    }


@app.post("/candidate/{id}/hiring-verdict", response_model=HiringVerdictResponse)
def hiring_verdict_with_jd(id: int, payload: HiringVerdictRequest, current_user: dict = Depends(get_current_user)) -> dict:
    candidate = get_candidate(id)
    if candidate is None:
        raise HTTPException(status_code=404, detail="Candidate not found.")

    return {
        "candidate_id": id,
        "hiring_verdict": generate_hiring_verdict(candidate, payload.job_description),
    }


@app.post("/candidate/{id}/jd-analysis", response_model=JDAnalysisResponse)
def resume_jd_analysis(id: int, payload: JDAnalysisRequest, current_user: dict = Depends(get_current_user)) -> dict:
    candidate = get_candidate(id)
    if candidate is None:
        raise HTTPException(status_code=404, detail="Candidate not found.")
    if not payload.job_description.strip():
        raise HTTPException(status_code=400, detail="Job description is required for JD analysis.")

    return {
        "candidate_id": id,
        "analysis": build_jd_analysis(candidate, payload.job_description),
    }


@app.get("/candidate/{id}/recruiter-report", response_model=RecruiterReportResponse)
def recruiter_report(id: int, current_user: dict = Depends(get_current_user)) -> dict:
    candidate = get_candidate(id)
    if candidate is None:
        raise HTTPException(status_code=404, detail="Candidate not found.")
    return build_recruiter_report(candidate)


@app.get("/candidate/{id}/recruiter-report/download")
def download_recruiter_report(id: int, current_user: dict = Depends(get_current_user)) -> HTMLResponse:
    candidate = get_candidate(id)
    if candidate is None:
        raise HTTPException(status_code=404, detail="Candidate not found.")

    report = build_recruiter_report(candidate)
    headers = {"Content-Disposition": f"attachment; filename=candidate_{id}_recruiter_report.html"}
    return HTMLResponse(content=render_recruiter_report_html(report), headers=headers)


@app.get("/candidate/{candidate_id}/download")
def download_candidate(candidate_id: int, current_user: dict = Depends(get_current_user)) -> JSONResponse:
    candidate = get_candidate(candidate_id)
    if candidate is None:
        raise HTTPException(status_code=404, detail="Candidate not found.")

    headers = {"Content-Disposition": f"attachment; filename=candidate_{candidate_id}.json"}
    return JSONResponse(content=candidate, headers=headers)


async def save_upload_file(upload: UploadFile, destination: Path) -> None:
    bytes_written = 0

    with destination.open("wb") as output_file:
        while chunk := await upload.read(1024 * 1024):
            bytes_written += len(chunk)
            if bytes_written > MAX_FILE_SIZE:
                raise HTTPException(status_code=413, detail="File size must be 5 MB or less.")
            output_file.write(chunk)

    await upload.seek(0)


def safe_file_name(file_name: str) -> str:
    stem = Path(file_name).stem or "resume"
    suffix = Path(file_name).suffix.lower()
    safe_stem = re.sub(r"[^A-Za-z0-9_.-]+", "_", stem).strip("._")
    return f"{safe_stem[:80] or 'resume'}{suffix}"


def delete_file(path: Path) -> None:
    try:
        if path.exists():
            path.unlink()
    except OSError:
        pass


def build_candidate_comparison(candidate_1: dict, candidate_2: dict, job_description: str) -> dict:
    skills_1 = normalize_skill_set(candidate_1.get("skills", []))
    skills_2 = normalize_skill_set(candidate_2.get("skills", []))
    shared_keys = set(skills_1) & set(skills_2)
    candidate_1_unique_keys = set(skills_1) - set(skills_2)
    candidate_2_unique_keys = set(skills_2) - set(skills_1)
    shared_skills = sorted([skills_1[key] for key in shared_keys], key=str.lower)
    candidate_1_unique = sorted([skills_1[key] for key in candidate_1_unique_keys], key=str.lower)
    candidate_2_unique = sorted([skills_2[key] for key in candidate_2_unique_keys], key=str.lower)

    projects_1 = get_project_count(candidate_1.get("projects", []))
    projects_2 = get_project_count(candidate_2.get("projects", []))
    certifications_1 = count_items(candidate_1.get("certifications", []))
    certifications_2 = count_items(candidate_2.get("certifications", []))

    job_match_1 = None
    job_match_2 = None
    job_message = "Add a job description to compare JD fit."

    if job_description.strip():
        match_1 = calculate_match_score(candidate_1.get("skills", []), job_description)
        match_2 = calculate_match_score(candidate_2.get("skills", []), job_description)
        job_match_1 = match_1.get("match_score")
        job_match_2 = match_2.get("match_score")
        job_message = match_1.get("message") or match_2.get("message") or ""

    weighted_1 = calculate_weighted_candidate_score(
        ats_score=number(candidate_1.get("ats_score")),
        job_match_score=job_match_1,
        skills_count=len(skills_1),
        projects_count=projects_1,
        certifications_count=certifications_1,
        max_skills=max(len(skills_1), len(skills_2), 1),
        max_projects=max(projects_1, projects_2, 1),
        max_certifications=max(certifications_1, certifications_2, 1),
    )
    weighted_2 = calculate_weighted_candidate_score(
        ats_score=number(candidate_2.get("ats_score")),
        job_match_score=job_match_2,
        skills_count=len(skills_2),
        projects_count=projects_2,
        certifications_count=certifications_2,
        max_skills=max(len(skills_1), len(skills_2), 1),
        max_projects=max(projects_1, projects_2, 1),
        max_certifications=max(certifications_1, certifications_2, 1),
    )

    if weighted_1 >= weighted_2:
        winner = candidate_1.get("name") or "Candidate 1"
        reason = build_winner_reason(candidate_1, candidate_2, weighted_1, weighted_2, job_match_1, job_match_2)
    else:
        winner = candidate_2.get("name") or "Candidate 2"
        reason = build_winner_reason(candidate_2, candidate_1, weighted_2, weighted_1, job_match_2, job_match_1)

    return {
        "skills_count": {
            "candidate_1": len(skills_1),
            "candidate_2": len(skills_2),
        },
        "matched_skills": {
            "shared": shared_skills,
            "candidate_1_unique": candidate_1_unique,
            "candidate_2_unique": candidate_2_unique,
        },
        "ats_score": {
            "candidate_1": round(number(candidate_1.get("ats_score")), 2),
            "candidate_2": round(number(candidate_2.get("ats_score")), 2),
        },
        "job_match_score": {
            "candidate_1": job_match_1,
            "candidate_2": job_match_2,
            "message": job_message,
        },
        "projects_count": {
            "candidate_1": projects_1,
            "candidate_2": projects_2,
        },
        "certifications_count": {
            "candidate_1": certifications_1,
            "candidate_2": certifications_2,
        },
        "weighted_score": {
            "candidate_1": round(weighted_1, 2),
            "candidate_2": round(weighted_2, 2),
        },
        "winner": winner,
        "reason": reason,
    }


def calculate_weighted_candidate_score(
    *,
    ats_score: float,
    job_match_score: float | None,
    skills_count: int,
    projects_count: int,
    certifications_count: int,
    max_skills: int,
    max_projects: int,
    max_certifications: int,
) -> float:
    job_score = number(job_match_score) if job_match_score is not None else 0
    skills_score = (skills_count / max_skills) * 100
    projects_score = (projects_count / max_projects) * 100
    certifications_score = (certifications_count / max_certifications) * 100

    return (
        ats_score * 0.30
        + job_score * 0.40
        + skills_score * 0.15
        + projects_score * 0.10
        + certifications_score * 0.05
    )


def build_winner_reason(
    winner: dict,
    runner_up: dict,
    winner_score: float,
    runner_up_score: float,
    winner_job_score: float | None,
    runner_up_job_score: float | None,
) -> str:
    reasons = []
    if number(winner.get("ats_score")) >= number(runner_up.get("ats_score")):
        reasons.append("higher ATS quality")
    if winner_job_score is not None and number(winner_job_score) >= number(runner_up_job_score):
        reasons.append("stronger job-description match")
    if count_items(winner.get("skills", [])) >= count_items(runner_up.get("skills", [])):
        reasons.append("broader detected skill coverage")
    if get_project_count(winner.get("projects", [])) >= get_project_count(runner_up.get("projects", [])):
        reasons.append("more project evidence")

    reason_text = ", ".join(reasons[:3]) or "a stronger weighted profile"
    return (
        f"{winner.get('name') or 'The selected candidate'} leads by "
        f"{round(abs(winner_score - runner_up_score), 1)} weighted points with {reason_text}."
    )


def build_recruiter_summary(candidate: dict) -> dict:
    skills = candidate.get("skills", [])
    projects = candidate.get("projects", [])
    education = candidate.get("education", [])
    certifications = candidate.get("certifications", [])
    ats_score = number(candidate.get("ats_score"))
    roles = recommend_roles(skills)

    strengths = []
    if skills:
        strengths.append(f"Strongest detected skills: {', '.join(skills[:5])}.")
    projects_count = get_project_count(projects)
    if projects_count >= 2:
        strengths.append(f"Shows hands-on delivery through {projects_count} parsed projects.")
    elif projects_count == 1:
        strengths.append("Includes one relevant project with practical implementation detail.")
    if education:
        strengths.append("Education section is present and parseable.")
    if certifications:
        strengths.append("Has certifications or achievements listed.")
    if ats_score >= 80:
        strengths.append("Resume completeness is strong based on ATS score.")

    concerns = []
    if ats_score < 60:
        concerns.append("ATS score is below 60, so the resume may be missing important profile details.")
    if len(skills) < 5:
        concerns.append("Detected skill coverage is limited.")
    if not projects:
        concerns.append("No structured project evidence was detected.")
    if not certifications:
        concerns.append("No certifications were detected.")
    if not education:
        concerns.append("Education details were not detected.")
    if not concerns:
        concerns.append("No major concerns detected from parsed resume data.")

    hiring_recommendation = get_hiring_recommendation(ats_score, len(skills), projects_count)
    headline_role = roles[0].replace(" Intern", "") if roles else "candidate"

    return {
        "headline": f"{hiring_recommendation} {headline_role} profile",
        "short_summary": build_short_summary(candidate, skills, projects, roles, ats_score),
        "strengths": strengths,
        "concerns": concerns,
        "recommended_roles": roles,
        "hiring_recommendation": hiring_recommendation,
        "hiring_verdict": generate_hiring_verdict(candidate),
    }


def build_jd_analysis(candidate: dict, job_description: str) -> dict:
    jd_skills = clean_jd_skills(extract_skills(job_description))
    candidate_skills = candidate.get("skills", [])
    candidate_skill_keys = build_skill_key_set(candidate_skills)
    project_tech_keys = build_skill_key_set(get_project_technologies(candidate.get("projects", [])))
    raw_text = str(candidate.get("raw_text", ""))
    required_skills = []
    matched_skills = []
    missing_skills = []

    for skill in jd_skills:
        skill_key = canonical_skill_key(skill)
        matched_in_skills = skill_key in candidate_skill_keys
        matched_in_projects = skill_key in project_tech_keys
        matched_in_raw_text = contains_skill(raw_text, skill)
        is_matched = matched_in_skills or matched_in_projects or matched_in_raw_text

        if is_matched:
            matched_skills.append(skill)
        else:
            missing_skills.append(skill)

        required_skills.append({
            "skill": skill,
            "status": "matched" if is_matched else "missing",
            "resume_evidence": build_resume_evidence(
                matched_in_skills,
                matched_in_projects,
                matched_in_raw_text,
            ),
            "jd_importance": detect_jd_importance(job_description, skill),
        })

    total_jd_skills = len(jd_skills)
    overall_match_score = round((len(matched_skills) / total_jd_skills) * 100) if total_jd_skills else 0

    return {
        "overall_match_score": overall_match_score,
        "required_skills": required_skills,
        "matched_skills": matched_skills,
        "missing_skills": missing_skills,
        "strengths": build_jd_strengths(candidate, matched_skills),
        "gaps": build_jd_gaps(required_skills),
        "recommendation": build_jd_recommendation(overall_match_score),
    }


def get_project_technologies(projects: object) -> list[str]:
    technologies = []
    if not isinstance(projects, list):
        return technologies

    for project in projects:
        if not isinstance(project, dict):
            continue
        stack = project.get("tech_stack") or project.get("technologies") or []
        if isinstance(stack, list):
            technologies.extend(str(item) for item in stack if item)
    return technologies


def clean_jd_skills(skills: list[str]) -> list[str]:
    cleaned = []
    seen = set()
    skill_keys = {canonical_skill_key(skill) for skill in skills}

    for skill in skills:
        key = canonical_skill_key(skill)
        if key == "api" and "rest api" in skill_keys:
            continue
        if key in seen:
            continue
        seen.add(key)
        cleaned.append(skill)
    return cleaned


def build_skill_key_set(skills: list[str]) -> set[str]:
    return {canonical_skill_key(str(skill)) for skill in skills if str(skill).strip()}


def canonical_skill_key(skill: str) -> str:
    key = re.sub(r"\s+", " ", str(skill or "").lower().replace(".", "")).strip()
    if key in {"rest apis", "restful api", "restful apis"}:
        return "rest api"
    if key == "apis":
        return "api"
    return key


def build_resume_evidence(in_skills: bool, in_projects: bool, in_raw_text: bool) -> str:
    evidence = []
    if in_skills:
        evidence.append("Technical Skills")
    if in_projects:
        evidence.append("Projects")
    if in_raw_text and not evidence:
        evidence.append("Resume text")
    if evidence:
        return f"Detected in {' and '.join(evidence)}"
    return "Not found in resume"


def detect_jd_importance(job_description: str, skill: str) -> str:
    for sentence in split_sentences(job_description):
        if not contains_skill(sentence, skill):
            continue
        lowered = sentence.lower()
        if any(keyword in lowered for keyword in ("preferred", "nice to have", "good to have", "plus")):
            return "preferred"
        if any(keyword in lowered for keyword in ("required", "must have", "mandatory", "need", "needs", "should have")):
            return "required"
    return "required"


def build_jd_strengths(candidate: dict, matched_skills: list[str]) -> list[str]:
    strengths = []
    lowered_matches = {skill.lower() for skill in matched_skills}
    project_count = get_project_count(candidate.get("projects", []))

    if {"python", "flask"} <= lowered_matches:
        strengths.append("Strong Python and Flask experience detected")
    if lowered_matches & {"nlp", "machine learning", "deep learning", "generative ai", "ai"} and project_count:
        strengths.append("Relevant AI/ML project experience found")
    if "rest api" in lowered_matches or "rest apis" in lowered_matches:
        strengths.append("Backend API experience aligns with role requirements")
    if len(matched_skills) >= 4:
        strengths.append("Candidate matches multiple JD technical requirements")
    if project_count >= 2:
        strengths.append("Multiple project examples support the candidate's technical profile")

    return strengths or ["Candidate has some overlap with the job description requirements"]


def build_jd_gaps(required_skills: list[dict]) -> list[str]:
    gaps = [
        f"{skill['skill']} is mentioned in JD but not found in resume"
        for skill in required_skills
        if skill.get("status") == "missing"
    ]
    return gaps or ["No major JD skill gaps detected"]


def build_jd_recommendation(overall_match_score: int) -> str:
    if overall_match_score >= 80:
        return "Candidate is a strong fit for this role."
    if overall_match_score >= 60:
        return "Candidate is a reasonable fit, with a few skill gaps to review."
    return "Candidate needs further review because several JD skills are missing."


def split_sentences(text: str) -> list[str]:
    return [part.strip() for part in re.split(r"(?<=[.!?])\s+|\n+", text) if part.strip()]


def contains_skill(text: str, skill: str) -> bool:
    if not text or not skill:
        return False
    variants = {str(skill).lower()}
    key = canonical_skill_key(skill)
    if key == "rest api":
        variants.update({"rest api", "rest apis", "restful api", "restful apis"})
    return any(
        re.search(rf"(?<![a-z0-9+#]){re.escape(variant)}(?![a-z0-9+#])", text.lower())
        for variant in variants
    )


def generate_hiring_verdict(candidate: dict, job_description: str | None = None) -> dict:
    skills = candidate.get("skills", [])
    projects = candidate.get("projects", [])
    certifications = candidate.get("certifications", [])
    experience = candidate.get("experience", [])
    ats_score = number(candidate.get("ats_score"))
    roles = recommend_roles(skills)
    lowered_skills = {skill.lower() for skill in skills}
    projects_count = get_project_count(projects)
    certifications_count = count_items(certifications)
    contact_score = calculate_contact_score(candidate)
    skills_score = min(len(skills) / 8 * 100, 100)
    projects_score = min(projects_count / 3 * 100, 100)
    certifications_score = min(certifications_count / 2 * 100, 100)
    job_match_score = None
    weights = {
        "ats": 0.35,
        "skills": 0.10,
        "projects": 0.10,
        "certifications": 0.05,
        "contact": 0.05,
    }

    if job_description and job_description.strip():
        job_match_score = calculate_match_score(skills, job_description).get("match_score")
        weights["job_match"] = 0.35
    elif candidate.get("match_score") is not None:
        job_match_score = number(candidate.get("match_score"))

    total = (
        ats_score * weights["ats"]
        + skills_score * weights["skills"]
        + projects_score * weights["projects"]
        + certifications_score * weights["certifications"]
        + contact_score * weights["contact"]
    )
    if "job_match" in weights:
        total += number(job_match_score) * weights["job_match"]
    confidence_score = round(total / sum(weights.values()))

    if confidence_score >= 80:
        verdict = "Strong Hire"
    elif confidence_score >= 60:
        verdict = "Consider"
    else:
        verdict = "Needs Review"

    if {"python", "flask"} <= lowered_skills and "Backend Intern" not in roles:
        roles.append("Backend Intern")

    reasons = build_verdict_reasons(ats_score, skills, projects_count, certifications_count, job_match_score, job_description)
    risks = build_verdict_risks(candidate, experience, skills, projects_count, certifications_count, job_match_score, job_description)
    recommendation_note = f"Candidate appears suitable for {format_roles(roles)} roles."

    return {
        "verdict": verdict,
        "confidence_score": max(0, min(100, confidence_score)),
        "reasons": reasons,
        "risks": risks,
        "recommendation_note": recommendation_note,
        "job_match_score": job_match_score,
        "recommended_role": roles[0] if roles else "Software Developer Intern",
        "ats_score": ats_score,
        "match_score": job_match_score,
        "projects_count": projects_count,
        "certifications_count": certifications_count,
    }


def build_verdict_reasons(
    ats_score: float,
    skills: list[str],
    projects_count: int,
    certifications_count: int,
    job_match_score: float | None,
    job_description: str | None,
) -> list[str]:
    reasons = []
    if ats_score >= 80:
        reasons.append("Strong ATS score")
    if len(skills) >= 5:
        reasons.append("Relevant technical skills detected")
    if projects_count:
        reasons.append("Relevant project experience detected")
    if certifications_count:
        reasons.append("Certification available")
    if job_description and job_description.strip() and number(job_match_score) >= 70:
        reasons.append("Strong job description alignment")
    return reasons or ["Candidate has parseable resume data for recruiter review"]


def build_verdict_risks(
    candidate: dict,
    experience: list,
    skills: list[str],
    projects_count: int,
    certifications_count: int,
    job_match_score: float | None,
    job_description: str | None,
) -> list[str]:
    risks = []
    if not experience:
        risks.append("Limited internship experience")
    if len(skills) < 5:
        risks.append("Limited detected technical skills")
    if not projects_count:
        risks.append("No project experience detected")
    if not certifications_count:
        risks.append("No certifications detected")
    if not candidate.get("email") or not candidate.get("phone"):
        risks.append("Contact details incomplete")
    if job_description and job_description.strip() and number(job_match_score) < 50:
        risks.append("Low job description skill overlap")
    return risks or ["No major risks detected"]


def build_recruiter_report(candidate: dict) -> dict:
    summary = build_recruiter_summary(candidate)
    verdict = generate_hiring_verdict(candidate)
    return {
        "candidate_profile": {
            "name": candidate.get("name", ""),
            "email": candidate.get("email", ""),
            "phone": candidate.get("phone", ""),
            "top_skills": candidate.get("skills", [])[:8],
            "ats_score": number(candidate.get("ats_score")),
            "job_match_score": candidate.get("match_score") if candidate.get("match_score") is not None else candidate.get("job_match_score", 0),
        },
        "hiring_verdict": verdict,
        "recruiter_summary": summary,
        "education": candidate.get("education", []),
        "projects": candidate.get("projects", []),
        "experience": candidate.get("experience", []),
        "certifications": candidate.get("certifications", []),
        "strengths": summary.get("strengths", []),
        "concerns": summary.get("concerns", []),
        "recommended_roles": summary.get("recommended_roles", []),
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }


def render_recruiter_report_html(report: dict) -> str:
    profile = report["candidate_profile"]
    verdict = report["hiring_verdict"]
    return f"""
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Recruiter Report - {escape(profile.get('name') or 'Candidate')}</title>
  <style>
    body {{ font-family: Inter, Arial, sans-serif; color: #0f172a; margin: 32px; line-height: 1.55; }}
    .card {{ border: 1px solid #e2e8f0; border-radius: 16px; padding: 18px; margin: 16px 0; }}
    .muted {{ color: #64748b; }}
    .badge {{ display: inline-block; border: 1px solid #d1fae5; background: #ecfdf5; color: #047857; padding: 4px 10px; border-radius: 999px; margin: 4px; font-size: 12px; }}
    h1, h2 {{ margin-bottom: 8px; }}
    ul {{ margin-top: 8px; }}
    @media print {{ body {{ margin: 18px; }} .no-print {{ display: none; }} }}
  </style>
</head>
<body>
  <button class="no-print" onclick="window.print()">Print Report</button>
  <h1>Recruiter One-Click Report</h1>
  <p class="muted">Generated at {escape(report.get('generated_at', ''))}</p>
  {html_profile_section(profile)}
  {html_verdict_section(verdict)}
  {html_list_section("Skills", profile.get("top_skills", []))}
  {html_list_section("Projects", [format_project(project) for project in report.get("projects", [])])}
  {html_list_section("Education", [format_education(item) for item in report.get("education", [])])}
  {html_list_section("Certifications", [format_certification(item) for item in report.get("certifications", [])])}
  {html_list_section("Strengths", report.get("strengths", []))}
  {html_list_section("Concerns", report.get("concerns", []))}
  {html_list_section("Recommended Roles", report.get("recommended_roles", []))}
</body>
</html>
"""


def html_profile_section(profile: dict) -> str:
    return f"""
<section class="card">
  <h2>{escape(profile.get('name') or 'Candidate')}</h2>
  <p>{escape(profile.get('email') or 'Email not found')} | {escape(profile.get('phone') or 'Phone not found')}</p>
  <p>ATS Score: {round(number(profile.get('ats_score')))}% | Job Match: {round(number(profile.get('job_match_score')))}%</p>
</section>
"""


def html_verdict_section(verdict: dict) -> str:
    return f"""
<section class="card">
  <h2>Hiring Verdict: {escape(verdict.get('verdict', 'Needs Review'))}</h2>
  <p>Confidence: {round(number(verdict.get('confidence_score')))}%</p>
  <p>{escape(verdict.get('recommendation_note', ''))}</p>
</section>
"""


def html_list_section(title: str, items: list) -> str:
    safe_items = "".join(f"<li>{escape(str(item))}</li>" for item in items if item)
    return f"<section class='card'><h2>{escape(title)}</h2><ul>{safe_items or '<li>Not found</li>'}</ul></section>"


def calculate_contact_score(candidate: dict) -> float:
    fields = [
        candidate.get("name") and candidate.get("name") != "Unknown Candidate",
        candidate.get("email"),
        candidate.get("phone"),
    ]
    return (sum(1 for field in fields if field) / len(fields)) * 100


def format_roles(roles: list[str]) -> str:
    if not roles:
        return "relevant entry-level"
    if len(roles) == 1:
        return roles[0]
    return f"{', '.join(roles[:-1])} and {roles[-1]}"


def format_project(project: object) -> str:
    if isinstance(project, dict):
        title = project.get("title", "Project")
        duration = project.get("duration") or project.get("year") or ""
        stack = project.get("tech_stack") or project.get("technologies") or []
        stack_text = f" ({', '.join(stack)})" if isinstance(stack, list) and stack else ""
        duration_text = f" - {duration}" if duration else ""
        return f"{title}{duration_text}{stack_text}"
    return str(project)


def format_education(item: object) -> str:
    if isinstance(item, dict):
        return " | ".join(
            str(value)
            for value in [
                item.get("level"),
                item.get("board_university"),
                item.get("year"),
                item.get("result"),
            ]
            if value
        )
    return str(item)


def format_certification(item: object) -> str:
    if isinstance(item, dict):
        date = f" - {item.get('date')}" if item.get("date") else ""
        return f"{item.get('name', 'Certification')}{date}"
    return str(item)


def build_short_summary(candidate: dict, skills: list[str], projects: list, roles: list[str], ats_score: float) -> str:
    name = candidate.get("name") or "This candidate"
    skill_text = ", ".join(skills[:4]) if skills else "limited detected skills"
    project_text = f"{get_project_count(projects)} parsed project(s)"
    role_text = roles[0] if roles else "general technical internship"

    return (
        f"{name} appears suited for {role_text} roles with {skill_text}. "
        f"The profile includes {project_text} and an ATS score of {round(ats_score)}%."
    )


def recommend_roles(skills: list[str]) -> list[str]:
    lowered = {skill.lower() for skill in skills}
    roles = []

    if {"python", "flask"} <= lowered and ("sql" in lowered or "sqlite" in lowered or "postgresql" in lowered):
        roles.append("Backend Intern")
    if "python" in lowered and ({"machine learning", "nlp"} & lowered):
        roles.append("AI/ML Intern")
    if {"html", "css", "javascript", "react"} <= lowered:
        roles.append("Frontend Intern")
    if "sql" in lowered and "data analysis" in lowered:
        roles.append("Data Analyst Intern")

    return roles or ["Software Developer Intern"]


def get_hiring_recommendation(ats_score: float, skills_count: int, projects_count: int) -> str:
    if ats_score >= 80 and skills_count >= 6 and projects_count >= 1:
        return "Strong Hire"
    if ats_score >= 60 and skills_count >= 4:
        return "Consider"
    return "Needs Review"


def normalize_skill_set(skills: list[str]) -> dict[str, str]:
    return {str(skill).lower(): str(skill) for skill in skills}


def count_items(items: object) -> int:
    return len(items) if isinstance(items, list) else 0


def get_project_count(projects: object) -> int:
    return len(normalize_projects_for_count(projects))


def normalize_projects_for_count(projects: object) -> list[dict]:
    if not isinstance(projects, list):
        return []
    if any(isinstance(project, dict) for project in projects):
        return [
            project
            for project in projects
            if isinstance(project, dict) and is_valid_project_title(str(project.get("title", "")))
        ]

    return [
        {"title": line}
        for value in projects
        if (line := str(value or "").strip()) and is_countable_project_title(line)
    ]


def is_countable_project_title(line: str) -> bool:
    if not is_valid_project_title(line):
        return False
    return bool("—" in line or "–" in line or " - " in line or " ? " in line)


def is_valid_project_title(title: str) -> bool:
    cleaned = title.strip()
    lowered = cleaned.lower()
    if not cleaned:
        return False
    if lowered in {"project", "project details detected, but no description bullets were found."}:
        return False
    if re.fullmatch(r"(?:(?:19|20)\d{2}\s+)?\(?\s*(in development|under development|in progress|ongoing|current|working)\s*\)?(?:\s+(?:19|20)\d{2})?", cleaned, re.IGNORECASE):
        return False
    if lowered.startswith(("live:", "github:", "tech stack:", "technologies:", "technology:", "tools:", "stack:")):
        return False
    if URL_PATTERN.search(cleaned) or "|" in cleaned or YEAR_PATTERN.fullmatch(cleaned):
        return False
    if cleaned.lstrip().startswith(("•", "-", "*")):
        return False
    return True




def number(value: object) -> float:
    try:
        return float(value or 0)
    except (TypeError, ValueError):
        return 0
