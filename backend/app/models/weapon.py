from sqlalchemy import Column, String, Integer, Float, Boolean, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database import Base


class Weapon(Base):
    """Données spécifiques aux armes."""
    __tablename__ = "weapons"

    id = Column(Integer, primary_key=True, autoincrement=True)
    item_id = Column(Integer, ForeignKey("items.id", ondelete="CASCADE"), unique=True, nullable=False)

    # Type d'arme
    is_melee = Column(Boolean, default=False)

    # Dégâts
    damage_per_hit = Column(Float, default=0.0)
    damage_type = Column(String(255))  # Classe de dégâts Unreal

    # Cadence de tir
    time_between_shots = Column(Float, default=0.0)
    burst_fire_count = Column(Integer, default=1)

    # Précision
    bullet_spread_min = Column(Float, default=0.0)
    bullet_spread_max = Column(Float, default=0.0)
    max_aim_correction = Column(Float, default=0.0)
    recoil_amount = Column(Float, default=0.0)

    # Portée
    maximum_hitscan_range = Column(Float, default=0.0)

    # Munitions
    magazine_size = Column(Integer, default=0)
    require_ammo = Column(Boolean, default=False)
    ammo_type_row_id = Column(String(255))  # row_id de l'item munition

    # Projectile (pour armes à projectiles)
    projectile_row_id = Column(String(255))
    pellet_count = Column(Integer, default=1)
    tracer_per_shots = Column(Integer, default=1)

    # Sons et effets
    loudness_primary = Column(Float, default=0.0)
    loudness_secondary = Column(Float, default=0.0)

    # Attaque secondaire
    secondary_attack_type = Column(String(100))

    # État sous l'eau
    underwater_state = Column(String(100))

    # Relation
    item = relationship("Item", back_populates="weapon")

    def __repr__(self):
        return f"<Weapon(item_id={self.item_id}, damage={self.damage_per_hit})>"
