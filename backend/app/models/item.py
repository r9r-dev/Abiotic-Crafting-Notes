from sqlalchemy import Column, String, Integer, Numeric, Text, DateTime, func
from sqlalchemy.dialects.postgresql import JSONB
from app.database import Base


class Item(Base):
    __tablename__ = "items"

    id = Column(String(100), primary_key=True)
    name = Column(String(255), nullable=False)
    name_fr = Column(String(255), nullable=True)
    description_fr = Column(Text, nullable=True)
    icon_url = Column(String(500), nullable=True)
    icon_local = Column(String(100), nullable=True)
    category = Column(String(100), nullable=False)
    weight = Column(Numeric(10, 2), nullable=True)
    stack_size = Column(Integer, nullable=True)
    durability = Column(Integer, nullable=True)
    repair_material = Column(String(100), nullable=True)
    repair_quantity = Column(Integer, nullable=True)
    wiki_url = Column(String(500), nullable=True)
    variants = Column(JSONB, default=[])
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
