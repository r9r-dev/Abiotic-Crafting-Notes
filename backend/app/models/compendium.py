from sqlalchemy import Column, String, Integer, Boolean, Text, ForeignKey, Enum
from sqlalchemy.orm import relationship
import enum

from app.database import Base


class CompendiumCategory(enum.Enum):
    """Catégories d'entrées du Compendium."""
    ENTITY = "Entity"      # Créatures/ennemis
    IS = "IS"              # Items spéciaux (lore)
    PEOPLE = "People"      # Personnages non-hostiles
    LOCATION = "Location"  # Lieux
    THEORIES = "Theories"  # Théories/lore


class CompendiumUnlockType(enum.Enum):
    """Types de déblocage des sections."""
    EXPLORATION = "Exploration"
    EMAIL = "Email"
    NARRATIVE_NPC = "NarrativeNPC"
    KILL = "Kill"


class CompendiumEntry(Base):
    """Entrée principale du Compendium."""
    __tablename__ = "compendium_entries"

    id = Column(Integer, primary_key=True, autoincrement=True)
    row_id = Column(String(255), unique=True, nullable=False, index=True)

    # Infos de base
    title = Column(String(255))
    subtitle = Column(String(255))
    category = Column(Enum(CompendiumCategory), nullable=False, index=True)

    # Image principale (optionnelle)
    image_path = Column(String(512))

    # Relations vers NPC (optionnel, pour Entity)
    npc_row_id = Column(String(255), index=True)

    # Kill requirement (optionnel)
    has_kill_requirement = Column(Boolean, default=False)
    kill_required_count = Column(Integer, default=0)
    kill_section_text = Column(Text)
    kill_section_image_path = Column(String(512))

    # Relations
    sections = relationship(
        "CompendiumSection",
        back_populates="entry",
        cascade="all, delete-orphan",
        order_by="CompendiumSection.position"
    )
    recipe_unlocks = relationship(
        "CompendiumRecipeUnlock",
        back_populates="entry",
        cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<CompendiumEntry(row_id='{self.row_id}', title='{self.title}')>"


class CompendiumSection(Base):
    """Section de texte d'une entrée du Compendium."""
    __tablename__ = "compendium_sections"

    id = Column(Integer, primary_key=True, autoincrement=True)
    entry_id = Column(Integer, ForeignKey("compendium_entries.id", ondelete="CASCADE"), nullable=False, index=True)

    position = Column(Integer, default=0)
    unlock_type = Column(Enum(CompendiumUnlockType), nullable=False)
    text = Column(Text, nullable=False)
    image_path = Column(String(512))

    # Relations
    entry = relationship("CompendiumEntry", back_populates="sections")

    def __repr__(self):
        return f"<CompendiumSection(entry_id={self.entry_id}, position={self.position})>"


class CompendiumRecipeUnlock(Base):
    """Recettes débloquées par une entrée du Compendium."""
    __tablename__ = "compendium_recipe_unlocks"

    id = Column(Integer, primary_key=True, autoincrement=True)
    entry_id = Column(Integer, ForeignKey("compendium_entries.id", ondelete="CASCADE"), nullable=False, index=True)

    recipe_row_id = Column(String(255), nullable=False, index=True)
    from_kill_section = Column(Boolean, default=False)  # True si débloqué via kill requirement

    # Relations
    entry = relationship("CompendiumEntry", back_populates="recipe_unlocks")

    def __repr__(self):
        return f"<CompendiumRecipeUnlock(entry_id={self.entry_id}, recipe='{self.recipe_row_id}')>"
