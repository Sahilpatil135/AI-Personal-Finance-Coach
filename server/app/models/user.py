from sqlalchemy import Column
from sqlalchemy import Integer
from sqlalchemy import String
from sqlalchemy import DateTime
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

from app.database.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    incomes = relationship("Income", back_populates="user", cascade="all, delete")
    expenses = relationship("Expense", back_populates="user", cascade="all, delete")
    goals = relationship("Goal", back_populates="user", cascade="all, delete")