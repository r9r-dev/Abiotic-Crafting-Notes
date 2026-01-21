from sqlalchemy import Column, String, Integer, Float, Boolean, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database import Base


class Recipe(Base):
    """Recettes de fabrication."""
    __tablename__ = "recipes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    row_id = Column(String(255), unique=True, nullable=False, index=True)

    # Item créé
    output_item_row_id = Column(String(255), nullable=False, index=True)
    count_to_create = Column(Integer, default=1)

    # Établi requis
    bench_id = Column(Integer, ForeignKey("benches.id", ondelete="SET NULL"), nullable=True)
    bench_row_id = Column(String(255), index=True)  # Pour référence directe

    # Conditions de déblocage
    unlock_condition = Column(Text)  # JSON ou string décrivant la condition
    is_default_unlocked = Column(Boolean, default=False)

    # Catégorie dans l'interface
    category = Column(String(100))
    subcategory = Column(String(100))

    # Temps de craft
    craft_time = Column(Float, default=0.0)

    # Traductions
    name_fr = Column(String(255))

    # Relations
    bench = relationship("Bench", back_populates="recipes")
    ingredients = relationship("RecipeIngredient", back_populates="recipe", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Recipe(row_id='{self.row_id}', output='{self.output_item_row_id}')>"


class RecipeIngredient(Base):
    """Ingrédients d'une recette."""
    __tablename__ = "recipe_ingredients"

    id = Column(Integer, primary_key=True, autoincrement=True)
    recipe_id = Column(Integer, ForeignKey("recipes.id", ondelete="CASCADE"), nullable=False)

    # Item requis
    item_row_id = Column(String(255), nullable=False, index=True)
    quantity = Column(Integer, default=1)

    # Si c'est un substitut (groupe d'items interchangeables)
    is_substitute_group = Column(Boolean, default=False)
    substitute_group_row_id = Column(String(255))  # Référence vers RecipeSubstitutes

    # Position dans la liste des ingrédients
    position = Column(Integer, default=0)

    # Relation
    recipe = relationship("Recipe", back_populates="ingredients")

    def __repr__(self):
        return f"<RecipeIngredient(recipe_id={self.recipe_id}, item='{self.item_row_id}', qty={self.quantity})>"


class RecipeSubstitute(Base):
    """Groupes de substitution pour les recettes (ex: AnyDesk, AnyTomato)."""
    __tablename__ = "recipe_substitutes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    row_id = Column(String(255), unique=True, nullable=False, index=True)

    # Traductions
    name_fr = Column(String(255))
    description_fr = Column(Text)

    # Icône
    icon_path = Column(String(512))

    def __repr__(self):
        return f"<RecipeSubstitute(row_id='{self.row_id}', name='{self.name_fr}')>"


class RecipeSubstituteItem(Base):
    """Items appartenant à un groupe de substitution."""
    __tablename__ = "recipe_substitute_items"

    id = Column(Integer, primary_key=True, autoincrement=True)
    substitute_id = Column(Integer, ForeignKey("recipe_substitutes.id", ondelete="CASCADE"), nullable=False)
    item_row_id = Column(String(255), nullable=False, index=True)

    def __repr__(self):
        return f"<RecipeSubstituteItem(substitute_id={self.substitute_id}, item='{self.item_row_id}')>"
