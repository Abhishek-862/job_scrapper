from pydantic_settings import BaseSettings
from pydantic import ConfigDict


class Settings(BaseSettings):
    model_config = ConfigDict(env_file=".env", extra="ignore")

    api_token: str = "dev-token"
    openai_api_key: str = ""
    database_url: str = "postgresql://user:pass@db:5432/jobs"
    redis_url: str = "redis://redis:6379/0"


settings = Settings()
