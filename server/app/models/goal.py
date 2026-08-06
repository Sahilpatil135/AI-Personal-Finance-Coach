from sqlalchemy import Column, Integer, String, Float, ForeignKey, Date
from sqlalchemy.orm import relationship
from app.database.database import Base

class Goal(Base):
    __tablename__ = "goals"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    goal_name = Column(String, nullable=False)
    target_amount = Column(Float, nullable=False)
    current_saved = Column(Float, default=0.0)
    deadline = Column(Date)
    status = Column(String, default="In Progress")  # e.g., In Progress, Completed, Failed

    user = relationship("User", back_populates="goals")