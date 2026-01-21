from pydantic import BaseModel
from typing import Optional, List


class IngredientItemMinimal(BaseModel):
    """Info minimale d'un item pour affichage."""
    row_id: str
    name: Optional[str] = None
    icon_path: Optional[str] = None

    class Config:
        from_attributes = True


class RecipeIngredientSchema(BaseModel):
    item_row_id: str
    quantity: int
    is_substitute_group: bool
    substitute_group_row_id: Optional[str] = None
    position: int
    item: Optional[IngredientItemMinimal] = None

    class Config:
        from_attributes = True


class BenchMinimal(BaseModel):
    """Info minimale d'un etabli."""
    row_id: str
    name: Optional[str] = None
    item_row_id: Optional[str] = None
    tier: int

    class Config:
        from_attributes = True


class RecipeSchema(BaseModel):
    row_id: str
    output_item_row_id: str
    count_to_create: int
    bench_row_id: Optional[str] = None
    unlock_condition: Optional[str] = None
    is_default_unlocked: bool
    category: Optional[str] = None
    subcategory: Optional[str] = None
    craft_time: float
    name: Optional[str] = None
    ingredients: List[RecipeIngredientSchema] = []
    bench: Optional[BenchMinimal] = None

    class Config:
        from_attributes = True


class RecipeSubstituteSchema(BaseModel):
    row_id: str
    name: Optional[str] = None
    description: Optional[str] = None
    icon_path: Optional[str] = None

    class Config:
        from_attributes = True
