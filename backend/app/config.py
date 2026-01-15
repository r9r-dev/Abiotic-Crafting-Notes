from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Database
    postgres_user: str = "postgres"
    postgres_password: str = "postgres"
    postgres_host: str = "localhost"
    postgres_port: int = 5432
    postgres_db: str = "abiotic"

    # API
    api_host: str = "0.0.0.0"
    api_port: int = 8080

    # Development
    dev_mode: bool = False
    dev_user_id: str = "dev-user-001"
    dev_user_email: str = "dev@local.dev"
    dev_user_name: str = "Dev User"

    @property
    def database_url(self) -> str:
        return f"postgresql://{self.postgres_user}:{self.postgres_password}@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
