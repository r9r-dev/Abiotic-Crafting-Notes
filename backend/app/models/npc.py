from sqlalchemy import Column, String, Integer, Float, Boolean, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class NPC(Base):
    """NPCs et ennemis du jeu."""
    __tablename__ = "npcs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    row_id = Column(String(255), unique=True, nullable=False, index=True)

    # Traductions
    name = Column(String(255))
    description = Column(Text)

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

    # Loot à la mort (référence vers salvage)
    loot_table_row_id = Column(String(255))
    # Loot de découpe/gib (référence vers salvage)
    gib_salvage_row_id = Column(String(255))

    # Spawn
    spawn_weight = Column(Float, default=1.0)
    min_spawn_level = Column(Integer)
    max_spawn_level = Column(Integer)

    # Assets
    icon_path = Column(String(512))
    mesh_path = Column(String(512))

    # Catégorie (faction)
    category = Column(String(100))

    # Relations
    loot_tables = relationship("NpcLootTable", back_populates="npc", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<NPC(row_id='{self.row_id}', name='{self.name}')>"


class NpcLootTable(Base):
    """Tables de loot associées aux NPCs (peut en avoir plusieurs par NPC)."""
    __tablename__ = "npc_loot_tables"

    id = Column(Integer, primary_key=True, autoincrement=True)
    npc_id = Column(Integer, ForeignKey("npcs.id", ondelete="CASCADE"), nullable=False, index=True)
    salvage_row_id = Column(String(255), nullable=False, index=True)
    loot_type = Column(String(50), default="death")  # 'death', 'gib'
    position = Column(Integer, default=0)

    # Relations
    npc = relationship("NPC", back_populates="loot_tables")

    def __repr__(self):
        return f"<NpcLootTable(npc_id={self.npc_id}, salvage='{self.salvage_row_id}', type='{self.loot_type}')>"
