import httpx

from app.config import settings


async def verify_recaptcha(token: str) -> bool:
    if not settings.recaptcha_secret_key:
        return True
    if not token:
        return False

    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://www.google.com/recaptcha/api/siteverify",
            data={"secret": settings.recaptcha_secret_key, "response": token},
            timeout=10.0,
        )
        result = response.json()
        return result.get("success", False)
