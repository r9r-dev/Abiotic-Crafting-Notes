from sqlalchemy import Column, String, Integer, Float, Boolean, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database import Base


class Deployable(Base):
    """Données spécifiques aux objets déployables (meubles, stations, etc.)."""
    __tablename__ = "deployables"

    id = Column(Integer, primary_key=True, autoincrement=True)
    item_id = Column(Integer, ForeignKey("items.id", ondelete="CASCADE"), unique=True, nullable=False)

    # Classe déployée
    deployed_class_path = Column(String(512))

    # Placement
    placement_orientations = Column(Text)  # JSON array des orientations autorisées
    hologram_mesh_path = Column(String(512))
    hologram_scale = Column(Float, default=1.0)

    # Taille
    is_small = Column(Boolean, default=False)

    # Établi (si c'est une station de craft)
    is_crafting_bench = Column(Boolean, default=False)

    # Variantes de texture
    texture_variant_row_id = Column(String(255))

    # Relation
    item = relationship("Item", back_populates="deployable")

    def __repr__(self):
        return f"<Deployable(item_id={self.item_id}, is_bench={self.is_crafting_bench})>"
