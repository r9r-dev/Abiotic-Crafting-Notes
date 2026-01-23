from pydantic import BaseModel
from typing import Optional, List


class CompendiumSectionResponse(BaseModel):
    """Section de texte d'une entrée du Compendium."""
    position: int
    unlock_type: str
    text: str
    image_path: Optional[str] = None

    class Config:
        from_attributes = True


class CompendiumRecipeUnlockResponse(BaseModel):
    """Recette débloquée par une entrée du Compendium."""
    recipe_row_id: str
    recipe_name: Optional[str] = None
    from_kill_section: bool = False

    class Config:
        from_attributes = True


class CompendiumEntryMinimal(BaseModel):
    """Entrée du Compendium minimale pour les références."""
    row_id: str
    title: Optional[str] = None
    subtitle: Optional[str] = None
    category: str
    image_path: Optional[str] = None

    class Config:
        from_attributes = True


class CompendiumSearchResult(BaseModel):
    """Résultat de recherche Compendium."""
    type: str = "compendium"
    row_id: str
    title: Optional[str] = None
    subtitle: Optional[str] = None
    category: str
    image_path: Optional[str] = None
    npc_row_id: Optional[str] = None

    class Config:
        from_attributes = True


class CompendiumSearchResponse(BaseModel):
    """Réponse de recherche Compendium."""
    query: str
    count: int
    results: List[CompendiumSearchResult]


class CompendiumListResult(BaseModel):
    """Résultat Compendium pour la galerie."""
    row_id: str
    title: Optional[str] = None
    subtitle: Optional[str] = None
    category: str
    image_path: Optional[str] = None
    npc_row_id: Optional[str] = None
    has_kill_requirement: bool = False

    class Config:
        from_attributes = True


class CompendiumListResponse(BaseModel):
    """Réponse paginée pour la galerie Compendium."""
    entries: List[CompendiumListResult]
    total: int
    skip: int
    limit: int
    has_more: bool


class CompendiumNPCLink(BaseModel):
    """Lien vers un NPC depuis le Compendium."""
    row_id: str
    name: Optional[str] = None
    icon_path: Optional[str] = None

    class Config:
        from_attributes = True


class CompendiumResponse(BaseModel):
    """Réponse détaillée d'une entrée du Compendium."""
    row_id: str
    title: Optional[str] = None
    subtitle: Optional[str] = None
    category: str
    image_path: Optional[str] = None

    # Lien vers NPC (si Entity)
    npc_row_id: Optional[str] = None
    npc: Optional[CompendiumNPCLink] = None

    # Sections de texte
    sections: List[CompendiumSectionResponse] = []

    # Kill requirement
    has_kill_requirement: bool = False
    kill_required_count: int = 0
    kill_section_text: Optional[str] = None
    kill_section_image_path: Optional[str] = None

    # Recettes débloquées
    recipe_unlocks: List[CompendiumRecipeUnlockResponse] = []

    class Config:
        from_attributes = True
