from sqlalchemy import Column, String, Integer, Float, Boolean, Text
from app.database import Base


class Plant(Base):
    """Plantes cultivables."""
    __tablename__ = "plants"

    id = Column(Integer, primary_key=True, autoincrement=True)
    row_id = Column(String(255), unique=True, nullable=False, index=True)

    # Traductions
    name = Column(String(255))
    description = Column(Text)

    # Items liés
    seed_item_row_id = Column(String(255))  # Graine pour planter
    harvest_item_row_id = Column(String(255))  # Item récolté

    # Temps de croissance (en secondes)
    grow_time = Column(Float, default=0.0)

    # Rendement
    harvest_quantity_min = Column(Integer, default=1)
    harvest_quantity_max = Column(Integer, default=1)

    # Besoins
    water_requirement = Column(Float, default=0.0)
    light_requirement = Column(Float, default=0.0)
    fertilizer_bonus = Column(Float, default=0.0)

    # Repousse
    can_regrow = Column(Boolean, default=False)
    regrow_time = Column(Float, default=0.0)

    # Saisons/Conditions
    growth_conditions = Column(Text)  # JSON des conditions

    # Visuels
    icon_path = Column(String(512))

    def __repr__(self):
        return f"<Plant(row_id='{self.row_id}', name='{self.name}')>"
