from pydantic import BaseModel
from typing import Optional, List


class DialogueUnlockResponse(BaseModel):
    """Deblocage declenche par un dialogue."""
    unlock_type: str
    unlock_row_id: str
    # Infos enrichies (nom de la recette, etc.)
    unlock_name: Optional[str] = None

    class Config:
        from_attributes = True


class DialogueLineResponse(BaseModel):
    """Ligne de dialogue individuelle."""
    line_type: str
    position: int
    audio_asset_name: Optional[str] = None
    text: Optional[str] = None
    montage_delay: float = 0.0
    unlocks: List[DialogueUnlockResponse] = []

    class Config:
        from_attributes = True


class DialogueLinesByType(BaseModel):
    """Lignes de dialogue groupees par type."""
    beckoning: List[DialogueLineResponse] = []
    idle: List[DialogueLineResponse] = []
    initial_contact: List[DialogueLineResponse] = []
    return_messages: List[DialogueLineResponse] = []
    vendor_positive: List[DialogueLineResponse] = []
    vendor_negative: List[DialogueLineResponse] = []


class NpcConversationMinimal(BaseModel):
    """Conversation NPC minimale pour les listes."""
    row_id: str
    npc_name: Optional[str] = None
    npc_row_id: Optional[str] = None
    total_lines: int = 0

    class Config:
        from_attributes = True


class NpcConversationSearchResult(BaseModel):
    """Resultat de recherche dialogue."""
    type: str = "dialogue"
    row_id: str
    npc_name: Optional[str] = None
    npc_row_id: Optional[str] = None
    # Extrait du dialogue trouve
    matched_text: Optional[str] = None

    class Config:
        from_attributes = True


class DialogueSearchResponse(BaseModel):
    """Reponse de recherche dialogues."""
    query: str
    count: int
    results: List[NpcConversationSearchResult]


class DialogueListResult(BaseModel):
    """Resultat dialogue pour la galerie."""
    row_id: str
    npc_name: Optional[str] = None
    npc_row_id: Optional[str] = None
    npc_icon_path: Optional[str] = None
    total_lines: int = 0
    has_vendor_lines: bool = False

    class Config:
        from_attributes = True


class DialogueListResponse(BaseModel):
    """Reponse paginee pour la galerie dialogues."""
    conversations: List[DialogueListResult]
    total: int
    skip: int
    limit: int
    has_more: bool


class NPCLinkResponse(BaseModel):
    """Lien vers un NPC depuis les dialogues."""
    row_id: str
    name: Optional[str] = None
    icon_path: Optional[str] = None

    class Config:
        from_attributes = True


class NpcConversationResponse(BaseModel):
    """Reponse detaillee d'une conversation NPC."""
    row_id: str
    npc_name: Optional[str] = None
    npc_row_id: Optional[str] = None
    world_flag_to_complete: Optional[str] = None

    # Lien vers le NPC (si existe)
    npc: Optional[NPCLinkResponse] = None

    # Lignes de dialogue groupees par type
    lines_by_type: DialogueLinesByType

    # Stats
    total_lines: int = 0

    class Config:
        from_attributes = True
