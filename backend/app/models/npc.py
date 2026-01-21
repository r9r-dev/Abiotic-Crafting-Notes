from sqlalchemy import Column, String, Integer, Float, Boolean, Text
from app.database import Base


class NPC(Base):
    """NPCs et ennemis du jeu."""
    __tablename__ = "npcs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    row_id = Column(String(255), unique=True, nullable=False, index=True)

    # Traductions
    name_fr = Column(String(255))
    description_fr = Column(Text)

    # Points de vie par zone
    hp_head = Column(Float, default=100.0)
    hp_body = Column(Float, default=100.0)
    hp_limbs = Column(Float, default=100.0)

    # Combat
    melee_attack_damage = Column(Float, default=0.0)
    ranged_attack_damage = Column(Float, default=0.0)
    attack_range = Column(Float, default=0.0)

    # Mouvement
    default_walk_speed = Column(Float, default=100.0)
    default_run_speed = Column(Float, default=200.0)

    # Comportement
    is_hostile = Column(Boolean, default=True)
    is_passive = Column(Boolean, default=False)
    aggro_range = Column(Float, default=0.0)

    # Résistances (JSON array)
    damage_resistances = Column(Text)
    damage_weaknesses = Column(Text)

    # Drops à la mort (référence vers une table de loot)
    loot_table_row_id = Column(String(255))

    # Spawn
    spawn_weight = Column(Float, default=1.0)

    # Catégorie (faction)
    category = Column(String(100))

    def __repr__(self):
        return f"<NPC(row_id='{self.row_id}', name='{self.name_fr}')>"
