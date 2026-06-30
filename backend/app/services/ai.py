import base64
import json

import httpx

from app.config import settings

CONFIDENCE_THRESHOLD = 0.65
VALID_DEPARTMENTS = {"PWD", "Jal Sansthan", "UPCL", "Nagar Nigam"}
VALID_SEVERITIES = {"critical", "high", "medium", "low"}

NO_ISSUE_RESPONSE = {
    "issue_detected": False,
    "title": "No issue found",
    "description": "-",
    "category": "none",
    "issue_type": "none",
    "severity": "none",
    "department": "-",
    "confidence": 0.0,
    "reason": "This image does not appear to contain a reportable civic infrastructure issue.",
}

ANALYSIS_PROMPT = """You are a civic infrastructure image validator for Dehradun, India municipal reporting.

First determine whether the uploaded image clearly shows a REPORTABLE civic infrastructure issue.

Valid reportable issues include:
- Potholes
- Broken streetlights
- Garbage accumulation
- Water leakage
- Damaged roads
- Broken sidewalks
- Drain blockage
- Fallen trees blocking roads
- Traffic signal damage
- Public infrastructure defects

Invalid images (NOT reportable):
- Flowers, selfies, people, pets
- Indoor objects
- Random vehicles without visible damage
- Buildings without visible damage
- Landscapes or scenery without civic issues

Return ONLY valid JSON with these keys:
- issue_detected (boolean): true ONLY if a clear, reportable civic infrastructure defect is visible
- confidence (number 0-1): certainty in your assessment; use values below 0.5 when unsure
- category (string): e.g. "Pothole", "Broken Streetlight", or "none"
- issue_type (string): same value as category
- severity (string): critical|high|medium|low, or "none" if not detected
- department (string): one of PWD, Jal Sansthan, UPCL, Nagar Nigam, or "-" if not detected
- title (string): concise issue title, or "No issue found"
- description (string): factual description of the visible issue, or "-" if not detected
- reason (string): brief explanation of your decision

Rules:
- Do NOT hallucinate or invent issues that are not clearly visible.
- If uncertain, set issue_detected to false and keep confidence low.
- Only set issue_detected to true when you are reasonably confident (>= 0.65) and the defect is clearly visible.
- Route sanitation/garbage to Nagar Nigam, water/drainage to Jal Sansthan, power/streetlights to UPCL, roads/potholes/sidewalks to PWD.
"""


def _no_issue(reason: str | None = None, mock: bool = False) -> dict:
    return {**NO_ISSUE_RESPONSE, "reason": reason or NO_ISSUE_RESPONSE["reason"], "mock": mock}


def normalize_analysis(raw: dict) -> dict:
    issue_detected = bool(raw.get("issue_detected", False))
    try:
        confidence = float(raw.get("confidence", 0))
    except (TypeError, ValueError):
        confidence = 0.0
    confidence = max(0.0, min(1.0, confidence))

    if not issue_detected:
        return _no_issue(raw.get("reason"))

    if confidence < CONFIDENCE_THRESHOLD:
        return _no_issue(
            raw.get("reason")
            or f"Confidence too low ({confidence:.0%}) to classify this as a reportable civic issue."
        )

    category = (raw.get("category") or raw.get("issue_type") or "").strip()
    severity = str(raw.get("severity", "none")).lower().strip()
    department = str(raw.get("department", "-")).strip()
    title = (raw.get("title") or "").strip()
    description = (raw.get("description") or "").strip()

    if (
        not category
        or category.lower() == "none"
        or severity not in VALID_SEVERITIES
        or department not in VALID_DEPARTMENTS
        or not title
        or title.lower() == "no issue found"
        or description in ("", "-")
    ):
        return _no_issue(
            raw.get("reason") or "Could not confidently identify a reportable civic infrastructure issue."
        )

    return {
        "issue_detected": True,
        "title": title,
        "description": description,
        "category": category,
        "issue_type": category,
        "severity": severity,
        "department": department,
        "confidence": confidence,
        "reason": raw.get("reason") or "",
        "mock": False,
    }


async def analyze_issue_image(image_bytes: bytes, mime_type: str = "image/jpeg") -> dict:
    if not settings.gemini_api_key:
        return _no_issue("AI analysis unavailable (Gemini API key not configured).", mock=True)

    b64 = base64.standard_b64encode(image_bytes).decode("utf-8")
    url = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"gemini-2.5-flash:generateContent?key={settings.gemini_api_key}"
    )

    payload = {
        "contents": [
            {
                "parts": [
                    {"text": ANALYSIS_PROMPT},
                    {"inlineData": {"mimeType": mime_type, "data": b64}},
                ]
            }
        ],
        "generationConfig": {"responseMimeType": "application/json"},
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            res = await client.post(url, json=payload)
            if res.status_code != 200:
                print(f"Gemini API Error: {res.status_code} - {res.text}")
                return _no_issue("AI analysis temporarily unavailable. Please try again.")

            data = res.json()
            text = data["candidates"][0]["content"]["parts"][0]["text"]
            raw = json.loads(text)
            return normalize_analysis(raw)
    except (KeyError, IndexError, json.JSONDecodeError) as e:
        print(f"Failed to parse Gemini response: {e}")
        return _no_issue("Could not analyze this image. Please upload a clearer photo of the civic issue.")
    except Exception as e:
        print(f"Failed to analyze image with Gemini: {e}")
        return _no_issue("AI analysis failed. Please try again with a clear photo of the infrastructure issue.")
