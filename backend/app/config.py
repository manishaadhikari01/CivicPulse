from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    anthropic_api_key: str = ""
    gemini_api_key: str = ""
    secret_key: str = "dev-secret-change-in-production"
    recaptcha_secret_key: str = ""
    recaptcha_site_key: str = ""
    database_url: str = "sqlite:///./civicpulse.db"
    cors_origins: str = "http://localhost:5173"
    access_token_expire_minutes: int = 60 * 24 * 7

    class Config:
        env_file = ".env"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
