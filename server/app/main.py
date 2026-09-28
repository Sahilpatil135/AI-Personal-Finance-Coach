from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

from app.database.database import Base, engine

from app.models import User, Income, Expense, Goal

from app.api import auth
from app.api import income
from app.api import expense

Base.metadata.create_all(bind=engine)

# Keep existing installations compatible with the new expense fields.
with engine.begin() as connection:
    connection.exec_driver_sql(
        "ALTER TABLE expenses ADD COLUMN IF NOT EXISTS payment_mode VARCHAR DEFAULT 'Online/UPI'"
    )

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
app.include_router(income.router)
app.include_router(expense.router)

@app.get("/")
def home():
    return {"message": "Welcome to the AI Personal Finance Coach API!"}

