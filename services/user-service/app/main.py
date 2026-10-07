import asyncio
import logging
import uuid
from contextlib import asynccontextmanager
from typing import Generator

import grpc
from fastapi import Depends, FastAPI, HTTPException, Request, status
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.config import settings
from app.database import Base, SessionLocal, engine
from app.models import Role, User
from app.security import create_access_token, hash_password, verify_password
from app.generated import user_pb2, user_pb2_grpc

logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger("user-service")


class UserInput(BaseModel):
    email: str = Field(min_length=5, max_length=320)
    password: str = Field(min_length=10, max_length=128)

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        normalized = value.strip().lower()
        if normalized.count("@") != 1 or "." not in normalized.rsplit("@", 1)[-1]:
            raise ValueError("A valid email address is required")
        return normalized


class UserPublic(BaseModel):
    id: str
    email: str
    role: str
    active: bool


class LoginInput(UserInput):
    pass


def get_db() -> Generator[Session, None, None]:
    with SessionLocal() as db:
        yield db


def primary_role(user: User) -> str:
    return user.roles[0].name if user.roles else "CUSTOMER"


class UserRpc(user_pb2_grpc.UserServiceServicer):
    async def GetUser(self, request, context):
        with SessionLocal() as db:
            user = db.get(User, request.user_id)
            if user is None:
                await context.abort(grpc.StatusCode.NOT_FOUND, "User was not found")
            return user_pb2.UserResponse(
                user_id=user.id, email=user.email, role=primary_role(user), active=user.active
            )

    async def ValidateUser(self, request, context):
        with SessionLocal() as db:
            user = db.get(User, request.user_id)
            return user_pb2.ValidateUserResponse(
                valid=bool(user and user.active), role=primary_role(user) if user else ""
            )


async def run_grpc_server() -> None:
    server = grpc.aio.server()
    user_pb2_grpc.add_UserServiceServicer_to_server(UserRpc(), server)
    server.add_insecure_port(f"[::]:{settings.grpc_port}")
    await server.start()
    try:
        await server.wait_for_termination()
    finally:
        await server.stop(grace=2)


@asynccontextmanager
async def lifespan(_: FastAPI):
    if len(settings.jwt_secret) < 32:
        raise RuntimeError("JWT_SECRET must contain at least 32 characters")
    with SessionLocal() as db:
        for role_name in ("CUSTOMER", "ADMIN"):
            if db.scalar(select(Role).where(Role.name == role_name)) is None:
                db.add(Role(name=role_name))
        db.commit()
    grpc_task = asyncio.create_task(run_grpc_server())
    yield
    grpc_task.cancel()
    try:
        await grpc_task
    except asyncio.CancelledError:
        pass


app = FastAPI(title="OrderFlow User Service", version="1.0.0", lifespan=lifespan)


@app.middleware("http")
async def request_context(request: Request, call_next):
    request_id = request.headers.get("x-request-id") or f"req_{uuid.uuid4().hex[:12]}"
    response = await call_next(request)
    response.headers["x-request-id"] = request_id
    return response


@app.get("/health")
def health():
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        return {"service": "user-service", "status": "healthy", "database": "healthy"}
    except Exception as exc:
        logger.error("health check failed: %s", exc)
        raise HTTPException(status_code=503, detail="Database unavailable") from exc


@app.post("/internal/users", response_model=UserPublic, status_code=status.HTTP_201_CREATED)
def register(payload: UserInput, db: Session = Depends(get_db)):
    configured_admins = {email.strip().lower() for email in settings.admin_emails.split(",") if email.strip()}
    role_name = "ADMIN" if payload.email in configured_admins else "CUSTOMER"
    user_role = db.scalar(select(Role).where(Role.name == role_name))
    user = User(
        id=str(uuid.uuid4()), email=payload.email, password_hash=hash_password(payload.password),
        roles=[user_role] if user_role else [],
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="Email is already registered") from exc
    db.refresh(user)
    return UserPublic(id=user.id, email=user.email, role=primary_role(user), active=user.active)


@app.post("/internal/login")
def login(payload: LoginInput, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == payload.email))
    if user is None or not user.active or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return {
        "access_token": create_access_token(user.id, primary_role(user)),
        "token_type": "bearer",
        "user": UserPublic(id=user.id, email=user.email, role=primary_role(user), active=user.active),
    }


@app.get("/internal/users/{user_id}", response_model=UserPublic)
def get_user(user_id: str, db: Session = Depends(get_db)):
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User was not found")
    return UserPublic(id=user.id, email=user.email, role=primary_role(user), active=user.active)
