from sqlalchemy import Column, String, Integer, Float, Boolean, ForeignKey, Text, Enum as SQLEnum
from sqlalchemy.orm import relationship
from app.database import Base
import enum


class EquipSlot(str, enum.Enum):
    HEAD = "Head"
    TORSO = "Torso"
    LEGS = "Legs"
    FEET = "Feet"
    HANDS = "Hands"
    BACK = "Back"
    FACE = "Face"
    ACCESSORY = "Accessory"


class Equipment(Base):
    """Données spécifiques à l'équipement (armures, sacs, etc.)."""
    __tablename__ = "equipment"

    id = Column(Integer, primary_key=True, autoincrement=True)
    item_id = Column(Integer, ForeignKey("items.id", ondelete="CASCADE"), unique=True, nullable=False)

    # Slot d'équipement
    equip_slot = Column(SQLEnum(EquipSlot))
    can_auto_equip = Column(Boolean, default=True)

    # Protection
    armor_bonus = Column(Integer, default=0)
    heat_resist = Column(Integer, default=0)
    cold_resist = Column(Integer, default=0)
    damage_mitigation_types = Column(Text)  # JSON array des types de dégâts mitigés

    # Conteneur (sacs à dos)
    is_container = Column(Boolean, default=False)
    container_capacity = Column(Integer, default=0)
    container_weight_reduction = Column(Float, default=0.0)  # 0.0-1.0

    # Set bonus
    set_bonus_row_id = Column(String(255))  # Référence vers DT_SetBonuses

    # Relation
    item = relationship("Item", back_populates="equipment")

    def __repr__(self):
        return f"<Equipment(item_id={self.item_id}, slot={self.equip_slot})>"
