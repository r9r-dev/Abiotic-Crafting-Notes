from sqlalchemy import Column, String, Integer, Text
from app.database import Base


class Buff(Base):
    """Buffs et debuffs du jeu."""
    __tablename__ = "buffs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    row_id = Column(String(255), unique=True, nullable=False, index=True)
    name = Column(String(255))
    description = Column(Text)

    def __repr__(self):
        return f"<Buff(row_id={self.row_id}, name={self.name})>"
