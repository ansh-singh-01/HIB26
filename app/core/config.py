from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://shg_user:shg_pass@localhost:5432/smart_health_grid"
    DATABASE_URL_SYNC: str = "postgresql+psycopg2://shg_user:shg_pass@localhost:5432/smart_health_grid"

    # Auth
    SECRET_KEY: str = "dev-secret-change-me"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # AI
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-flash-latest"

    # Google Maps API (optional for Distance Matrix / Directions / Geocoding)
    GOOGLE_MAPS_API_KEY: str = ""

    # Firebase (optional for Emergency Push Notifications & FCM alerts)
    FIREBASE_PROJECT_ID: str = ""
    FIREBASE_SERVER_KEY: str = ""

    ENVIRONMENT: str = "development"


settings = Settings()
