from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

from app.database.database import Base, engine

from app.models import User, Income, Expense, Goal

from app.api import auth

Base.metadata.create_all(bind=engine)

app = FastAPI(title="AI Personal Finance Coach API", version="1.0.0")

load_dotenv()

Frontend_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

origins = [Frontend_URL, "http://localhost:5173", "http://127.0.0.1:5173"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

app.include_router(auth.router)

@app.get("/")
def home():
    return {"message": "Welcome to the AI Personal Finance Coach API!"}

