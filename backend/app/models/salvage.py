from sqlalchemy import Column, String, Integer, Float, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database import Base


class Salvage(Base):
    """Profils de désassemblage."""
    __tablename__ = "salvage"

    id = Column(Integer, primary_key=True, autoincrement=True)
    row_id = Column(String(255), unique=True, nullable=False, index=True)

    # Item source (celui qu'on désassemble)
    source_item_row_id = Column(String(255), index=True)

    # Temps de désassemblage
    salvage_time = Column(Float, default=0.0)

    # Établi requis (si applicable)
    bench_row_id = Column(String(255))

    # Relations
    drops = relationship("SalvageDrop", back_populates="salvage", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Salvage(row_id='{self.row_id}', source='{self.source_item_row_id}')>"


class SalvageDrop(Base):
    """Items obtenus lors du désassemblage."""
    __tablename__ = "salvage_drops"

    id = Column(Integer, primary_key=True, autoincrement=True)
    salvage_id = Column(Integer, ForeignKey("salvage.id", ondelete="CASCADE"), nullable=False)

    # Item obtenu
    item_row_id = Column(String(255), nullable=False, index=True)

    # Quantités
    quantity_min = Column(Integer, default=1)
    quantity_max = Column(Integer, default=1)

    # Probabilité de drop (0.0-1.0)
    drop_chance = Column(Float, default=1.0)

    # Position dans la liste des drops
    position = Column(Integer, default=0)

    # Relation
    salvage = relationship("Salvage", back_populates="drops")

    def __repr__(self):
        return f"<SalvageDrop(salvage_id={self.salvage_id}, item='{self.item_row_id}', chance={self.drop_chance})>"
