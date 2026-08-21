from sqlalchemy import Column, Integer, String, Numeric, ForeignKey, Date
from sqlalchemy.orm import relationship
from app.database.database import Base

class Goal(Base):
    __tablename__ = "goals"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    goal_name = Column(String, nullable=False)
    target_amount = Column(Numeric(12, 2), nullable=False)
    current_saved = Column(Numeric(12, 2), default=0.00)
    deadline = Column(Date)
    status = Column(String, default="In Progress")  # e.g., In Progress, Completed, Failed

    user = relationship("User", back_populates="goals")
    investments = relationship("Investment", back_populates="goal")