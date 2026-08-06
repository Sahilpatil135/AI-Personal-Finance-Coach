from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

from app.database.database import Base, engine

from app.models import User, Income, Expense, Goal

Base.metadata.create_all(bind=engine)

app = FastAPI()

load_dotenv()

Frontend_URL = os.getenv("FRONTEND_URL")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[Frontend_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

@app.get("/")
def home():
    return {"message": "Welcome to the AI Personal Finance Coach API!"}
