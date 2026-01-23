from sqlalchemy import Column, String, Integer, Float, Text, ForeignKey, Enum
from sqlalchemy.orm import relationship
import enum

from app.database import Base


class DialogueLineType(enum.Enum):
    """Types de lignes de dialogue."""
    BECKONING = "BeckoningLines"
    IDLE = "IdleLines"
    INITIAL_CONTACT = "InitalContactMessages"  # Typo originale du jeu
    RETURN = "ReturnMessages"
    VENDOR_POSITIVE = "VendorInteraction_Positive"
    VENDOR_NEGATIVE = "VendorInteraction_Negative"


class DialogueUnlockType(enum.Enum):
    """Types de deblocages declenches par un dialogue."""
    RECIPE = "recipe"
    JOURNAL = "journal"
    COMPENDIUM = "compendium"
    WORLD_FLAG = "world_flag"


class NpcConversation(Base):
    """Conversations d'un NPC narratif."""
    __tablename__ = "npc_conversations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    row_id = Column(String(255), unique=True, nullable=False, index=True)

    # Nom du NPC (traduit)
    npc_name = Column(String(255))

    # Lien vers le NPC (optionnel, certains NPCs narratifs n'ont pas d'entite NPC)
    npc_row_id = Column(String(255), index=True)

    # Flag de completion
    world_flag_to_complete = Column(String(255))

    # Relations
    dialogue_lines = relationship(
        "DialogueLine",
        back_populates="conversation",
        cascade="all, delete-orphan",
        order_by="DialogueLine.line_type, DialogueLine.position"
    )

    def __repr__(self):
        return f"<NpcConversation(row_id='{self.row_id}', npc_name='{self.npc_name}')>"


class DialogueLine(Base):
    """Ligne de dialogue individuelle."""
    __tablename__ = "dialogue_lines"

    id = Column(Integer, primary_key=True, autoincrement=True)
    conversation_id = Column(
        Integer,
        ForeignKey("npc_conversations.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # Type et position
    line_type = Column(Enum(DialogueLineType), nullable=False, index=True)
    position = Column(Integer, default=0)

    # Reference audio (pour identifier le dialogue)
    audio_asset_name = Column(String(512))

    # Texte traduit du dialogue (rempli apres mapping avec en.json/fr.json)
    text = Column(Text)

    # Animation
    montage_delay = Column(Float, default=0.0)

    # Relations
    conversation = relationship("NpcConversation", back_populates="dialogue_lines")
    unlocks = relationship(
        "DialogueUnlock",
        back_populates="dialogue_line",
        cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<DialogueLine(conversation_id={self.conversation_id}, type={self.line_type.value}, pos={self.position})>"


class DialogueUnlock(Base):
    """Deblocage declenche par une ligne de dialogue."""
    __tablename__ = "dialogue_unlocks"

    id = Column(Integer, primary_key=True, autoincrement=True)
    dialogue_line_id = Column(
        Integer,
        ForeignKey("dialogue_lines.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # Type et reference du deblocage
    unlock_type = Column(Enum(DialogueUnlockType), nullable=False)
    unlock_row_id = Column(String(255), nullable=False, index=True)

    # Nom traduit du deblocage (titre pour journal, nom pour recette/compendium)
    unlock_name = Column(String(512))

    # Relations
    dialogue_line = relationship("DialogueLine", back_populates="unlocks")

    def __repr__(self):
        return f"<DialogueUnlock(line_id={self.dialogue_line_id}, type={self.unlock_type.value}, row_id='{self.unlock_row_id}')>"
