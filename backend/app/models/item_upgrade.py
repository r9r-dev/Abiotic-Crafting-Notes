from sqlalchemy import Column, String, Integer, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class ItemUpgrade(Base):
    """Ameliorations d'items (ex: Tournevis -> Chignole)."""
    __tablename__ = "item_upgrades"

    id = Column(Integer, primary_key=True, autoincrement=True)

    # Item source (celui qu'on ameliore)
    source_item_row_id = Column(String(255), nullable=False, index=True)

    # Item resultat
    output_item_row_id = Column(String(255), nullable=False, index=True)

    # Position dans la liste des upgrades (un item peut avoir plusieurs upgrades)
    position = Column(Integer, default=0)

    # Relations
    ingredients = relationship("ItemUpgradeIngredient", back_populates="upgrade", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<ItemUpgrade(source='{self.source_item_row_id}', output='{self.output_item_row_id}')>"


class ItemUpgradeIngredient(Base):
    """Ingredients requis pour une amelioration."""
    __tablename__ = "item_upgrade_ingredients"

    id = Column(Integer, primary_key=True, autoincrement=True)
    upgrade_id = Column(Integer, ForeignKey("item_upgrades.id", ondelete="CASCADE"), nullable=False)

    # Item requis
    item_row_id = Column(String(255), nullable=False, index=True)
    quantity = Column(Integer, default=1)

    # Position dans la liste
    position = Column(Integer, default=0)

    # Relation
    upgrade = relationship("ItemUpgrade", back_populates="ingredients")

    def __repr__(self):
        return f"<ItemUpgradeIngredient(upgrade_id={self.upgrade_id}, item='{self.item_row_id}', qty={self.quantity})>"
