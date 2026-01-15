from pydantic import BaseModel
from typing import Optional


class Ingredient(BaseModel):
    item_id: str
    item_name: str
    quantity: int


class RecipeVariant(BaseModel):
    ingredients: list[Ingredient]
    station: Optional[str] = None


class Recipe(BaseModel):
    id: str
    name: str
    icon_url: Optional[str] = None
    category: str
    weight: Optional[float] = None
    stack_size: Optional[int] = None
    durability: Optional[int] = None
    variants: list[RecipeVariant] = []
    repair_material: Optional[str] = None
    repair_quantity: Optional[int] = None
    wiki_url: Optional[str] = None


class RecipeSearchResult(BaseModel):
    id: str
    name: str
    icon_url: Optional[str] = None
    category: str
    craftable: bool


class DependencyNode(BaseModel):
    item_id: str
    item_name: str
    quantity: int
    craftable: bool
    children: list["DependencyNode"] = []


class ResourceCalculation(BaseModel):
    item_id: str
    item_name: str
    total_quantity: int
    is_base_resource: bool
