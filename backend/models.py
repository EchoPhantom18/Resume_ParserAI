from typing import Any

from pydantic import BaseModel, Field


class SignupRequest(BaseModel):
    name: str = Field(..., min_length=2)
    email: str = Field(..., min_length=5)
    password: str = Field(..., min_length=6)


class LoginRequest(BaseModel):
    email: str = Field(..., min_length=5)
    password: str = Field(..., min_length=6)


class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    created_at: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class CandidateResponse(BaseModel):
    id: int
    name: str
    email: str
    phone: str
    skills: list[str]
    education: list[dict[str, Any] | str]
    experience: list[str]
    projects: list[dict[str, Any] | str]
    certifications: list[dict[str, Any] | str]
    ats_score: float
    job_match_score: float = 0
    match_score: float | None = None
    job_description: str = ""
    job_skills: list[str] = Field(default_factory=list)
    matched_skills: list[str] = Field(default_factory=list)
    missing_skills: list[str] = Field(default_factory=list)
    match_message: str = ""
    raw_text: str
    file_name: str
    file_url: str = ""
    uploaded_at: str


class CandidateListItem(BaseModel):
    id: int
    name: str
    email: str
    phone: str
    skills: list[str]
    ats_score: float
    job_match_score: float = 0
    match_score: float | None = None
    job_description: str = ""
    job_skills: list[str] = Field(default_factory=list)
    matched_skills: list[str] = Field(default_factory=list)
    missing_skills: list[str] = Field(default_factory=list)
    match_message: str = ""
    file_name: str
    uploaded_at: str


class MatchRequest(BaseModel):
    candidate_id: int = Field(..., gt=0)
    job_description: str = ""


class MatchResponse(BaseModel):
    candidate_id: int
    job_skills: list[str]
    matched_skills: list[str]
    missing_skills: list[str]
    match_score: float | None = None
    message: str = ""


class CompareCandidatesRequest(BaseModel):
    candidate_1_id: int = Field(..., gt=0)
    candidate_2_id: int = Field(..., gt=0)
    job_description: str = ""


class CompareCandidatesResponse(BaseModel):
    candidate_1: dict[str, Any]
    candidate_2: dict[str, Any]
    comparison: dict[str, Any]


class RecruiterSummaryResponse(BaseModel):
    candidate_id: int
    summary: dict[str, Any]


class HiringVerdictRequest(BaseModel):
    job_description: str = ""


class HiringVerdictResponse(BaseModel):
    candidate_id: int
    hiring_verdict: dict[str, Any]


class JDAnalysisRequest(BaseModel):
    job_description: str = ""


class JDAnalysisResponse(BaseModel):
    candidate_id: int
    analysis: dict[str, Any]


class RecruiterReportResponse(BaseModel):
    candidate_profile: dict[str, Any]
    hiring_verdict: dict[str, Any]
    recruiter_summary: dict[str, Any]
    education: list[Any]
    projects: list[Any]
    experience: list[Any]
    certifications: list[Any]
    strengths: list[str]
    concerns: list[str]
    recommended_roles: list[str]
    generated_at: str
