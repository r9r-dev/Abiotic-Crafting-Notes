from sqlalchemy import Column, String, Integer, Float, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database import Base


class Bench(Base):
    """Établis de craft."""
    __tablename__ = "benches"

    id = Column(Integer, primary_key=True, autoincrement=True)
    row_id = Column(String(255), unique=True, nullable=False, index=True)

    # Référence vers l'item déployable
    item_row_id = Column(String(255), index=True)

    # Traductions
    name = Column(String(255))
    description = Column(Text)

    # Tier de l'établi
    tier = Column(Integer, default=1)

    # Relations
    recipes = relationship("Recipe", back_populates="bench")
    upgrades = relationship("BenchUpgrade", back_populates="bench")

    def __repr__(self):
        return f"<Bench(row_id='{self.row_id}', tier={self.tier})>"


class BenchUpgrade(Base):
    """Améliorations des établis."""
    __tablename__ = "bench_upgrades"

    id = Column(Integer, primary_key=True, autoincrement=True)
    row_id = Column(String(255), unique=True, nullable=False, index=True)

    bench_id = Column(Integer, ForeignKey("benches.id", ondelete="CASCADE"))
    upgrade_from_row_id = Column(String(255))  # Upgrade précédent (si applicable)

    # Traductions
    name = Column(String(255))
    description = Column(Text)

    # Tier atteint après upgrade
    tier = Column(Integer, default=1)

    # Coût de l'upgrade (sera lié via recipe)
    recipe_row_id = Column(String(255))

    # Relation
    bench = relationship("Bench", back_populates="upgrades")

    def __repr__(self):
        return f"<BenchUpgrade(row_id='{self.row_id}', tier={self.tier})>"
