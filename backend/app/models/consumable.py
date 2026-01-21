from sqlalchemy import Column, String, Integer, Float, Boolean, ForeignKey, Text, Enum as SQLEnum
from sqlalchemy.orm import relationship
from app.database import Base
import enum


class DecayTemperature(str, enum.Enum):
    NONE = "None"
    COLD = "Cold"
    WARM = "Warm"
    HOT = "Hot"


class Consumable(Base):
    """Données spécifiques aux consommables (nourriture, boissons, médicaments)."""
    __tablename__ = "consumables"

    id = Column(Integer, primary_key=True, autoincrement=True)
    item_id = Column(Integer, ForeignKey("items.id", ondelete="CASCADE"), unique=True, nullable=False)

    # Temps de consommation
    time_to_consume = Column(Float, default=1.0)

    # Effets sur les besoins
    hunger_fill = Column(Float, default=0.0)
    thirst_fill = Column(Float, default=0.0)
    fatigue_fill = Column(Float, default=0.0)
    continence_fill = Column(Float, default=0.0)
    sanity_fill = Column(Float, default=0.0)

    # Effets sur la santé
    health_change = Column(Float, default=0.0)
    armor_change = Column(Float, default=0.0)
    temperature_change = Column(Float, default=0.0)
    radiation_change = Column(Float, default=0.0)
    radioactivity = Column(Float, default=0.0)

    # Buffs
    buffs_to_add = Column(Text)  # JSON array des buffs
    buffs_to_remove = Column(Text)  # JSON array des buffs à retirer

    # Tag et action
    consumable_tag = Column(String(100))
    consumed_action = Column(String(255))

    # Cuisson
    can_be_cooked = Column(Boolean, default=False)
    is_cookware = Column(Boolean, default=False)
    cooked_item_row_id = Column(String(255))  # Item obtenu après cuisson
    burned_item_row_id = Column(String(255))  # Item si brûlé
    time_to_cook_baseline = Column(Float, default=0.0)
    time_to_burn_baseline = Column(Float, default=0.0)
    requires_baking = Column(Boolean, default=False)
    starting_portions = Column(Integer, default=1)

    # Pourrissement
    can_item_decay = Column(Boolean, default=False)
    item_decay_temperature = Column(SQLEnum(DecayTemperature), default=DecayTemperature.NONE)
    decay_to_item_row_id = Column(String(255))  # Item après pourrissement

    # Liquides
    max_liquid = Column(Integer, default=0)
    allowed_liquids = Column(Text)  # JSON array des liquides autorisés

    # Relation
    item = relationship("Item", back_populates="consumable")

    def __repr__(self):
        return f"<Consumable(item_id={self.item_id}, hunger={self.hunger_fill})>"
