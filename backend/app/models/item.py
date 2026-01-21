from sqlalchemy import Column, String, Integer, Float, Boolean, Text, Enum as SQLEnum
from sqlalchemy.orm import relationship
from app.database import Base
import enum


class ItemCategory(str, enum.Enum):
    WEAPON = "weapon"
    EQUIPMENT = "equipment"
    CONSUMABLE = "consumable"
    DEPLOYABLE = "deployable"
    DEPLOYABLE_SMALL = "deployable_small"
    CRAFTING_BENCH = "crafting_bench"
    PICKUP = "pickup"
    PLANT = "plant"
    PET = "pet"


class ReleaseGroup(str, enum.Enum):
    CORE = "Core"
    DARK_ENERGY = "DarkEnergy"
    COMMUNITY = "Community"


class Item(Base):
    """Table centrale de tous les items du jeu."""
    __tablename__ = "items"

    id = Column(Integer, primary_key=True, autoincrement=True)
    row_id = Column(String(255), unique=True, nullable=False, index=True)
    category = Column(SQLEnum(ItemCategory), nullable=False, index=True)
    release_group = Column(SQLEnum(ReleaseGroup), default=ReleaseGroup.CORE)

    # Traductions FR
    name_fr = Column(String(255))
    description_fr = Column(Text)
    flavor_text_fr = Column(Text)

    # Propriétés de base
    stack_size = Column(Integer, default=1)
    weight = Column(Float, default=0.0)
    max_durability = Column(Float, default=0.0)
    can_lose_durability = Column(Boolean, default=False)
    chance_to_lose_durability = Column(Float, default=0.0)

    # Visuels
    icon_path = Column(String(512))
    mesh_path = Column(String(512))

    # Gameplay tags (stockés en JSON string)
    gameplay_tags = Column(Text)  # JSON array as string

    # Relations
    weapon = relationship("Weapon", back_populates="item", uselist=False, cascade="all, delete-orphan")
    equipment = relationship("Equipment", back_populates="item", uselist=False, cascade="all, delete-orphan")
    consumable = relationship("Consumable", back_populates="item", uselist=False, cascade="all, delete-orphan")
    deployable = relationship("Deployable", back_populates="item", uselist=False, cascade="all, delete-orphan")

    # Réparation
    repair_item_id = Column(String(255))  # row_id de l'item de réparation
    repair_quantity_min = Column(Integer, default=0)
    repair_quantity_max = Column(Integer, default=0)

    # Salvage
    salvage_row_id = Column(String(255))  # Référence vers la table salvage

    def __repr__(self):
        return f"<Item(row_id='{self.row_id}', name='{self.name_fr}')>"
