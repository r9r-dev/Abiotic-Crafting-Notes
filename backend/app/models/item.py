from sqlalchemy import Column, String, DateTime, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import column_property
from app.database import Base


class Item(Base):
    """
    Modèle Item avec stockage JSONB hybride.

    Les données sont stockées dans une colonne JSONB flexible,
    avec des colonnes générées pour l'indexation et la recherche.
    """

    __tablename__ = "items"

    id = Column(String(100), primary_key=True)
    data = Column(JSONB, nullable=False)

    # Colonnes générées par PostgreSQL (read-only en SQLAlchemy)
    # Ces colonnes sont définies par le schéma SQL, pas par SQLAlchemy
    name = Column(String(255))
    category = Column(String(100))

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Propriétés calculées pour accès facile aux données JSONB
    @property
    def icon_url(self) -> str | None:
        return self.data.get("icon_url") if self.data else None

    @property
    def icon_local(self) -> str | None:
        return self.data.get("icon_local") if self.data else None

    @property
    def wiki_url(self) -> str | None:
        return self.data.get("wiki_url") if self.data else None

    @property
    def description(self) -> str | None:
        return self.data.get("description") if self.data else None

    @property
    def weight(self) -> float | None:
        return self.data.get("weight") if self.data else None

    @property
    def stack_size(self) -> int | None:
        return self.data.get("stack_size") if self.data else None

    @property
    def durability(self) -> int | None:
        return self.data.get("durability") if self.data else None

    @property
    def research_category(self) -> str | None:
        return self.data.get("research_category") if self.data else None

    @property
    def source_types(self) -> list:
        return self.data.get("source_types", []) if self.data else []

    @property
    def variants(self) -> list:
        return self.data.get("variants", []) if self.data else []

    @property
    def locations(self) -> list:
        return self.data.get("locations", []) if self.data else []

    @property
    def salvage(self) -> list:
        return self.data.get("salvage", []) if self.data else []

    @property
    def repair_item(self) -> str | None:
        return self.data.get("repair_item") if self.data else None

    @property
    def repair_quantity(self) -> int | None:
        return self.data.get("repair_quantity") if self.data else None

    def has_source_type(self, source_type: str) -> bool:
        """Vérifie si l'item a un type de source spécifique."""
        return any(s.get("type") == source_type for s in self.source_types)

    def to_dict(self) -> dict:
        """Retourne les données complètes de l'item."""
        return self.data if self.data else {}

    def __repr__(self):
        return f"<Item {self.id}: {self.name}>"
