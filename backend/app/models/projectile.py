from sqlalchemy import Column, String, Integer, Float, Boolean, Text
from app.database import Base


class Projectile(Base):
    """Projectiles et munitions."""
    __tablename__ = "projectiles"

    id = Column(Integer, primary_key=True, autoincrement=True)
    row_id = Column(String(255), unique=True, nullable=False, index=True)

    # Traductions
    name = Column(String(255))
    description = Column(Text)

    # Dégâts
    base_damage = Column(Float, default=0.0)
    damage_type = Column(String(255))

    # Vitesse
    initial_speed = Column(Float, default=0.0)
    max_speed = Column(Float, default=0.0)
    gravity_scale = Column(Float, default=1.0)

    # Portée
    max_range = Column(Float, default=0.0)
    lifetime = Column(Float, default=0.0)  # Durée de vie en secondes

    # Explosion
    has_explosion = Column(Boolean, default=False)
    explosion_radius = Column(Float, default=0.0)
    explosion_damage = Column(Float, default=0.0)

    # Effets
    applies_status_effects = Column(Text)  # JSON array des effets

    # Visuels
    mesh_path = Column(String(512))

    # Item munition associé
    ammo_item_row_id = Column(String(255))

    def __repr__(self):
        return f"<Projectile(row_id='{self.row_id}', damage={self.base_damage})>"
