import unicodedata
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, func, case

from app.database import get_db
from app.models import (
    NpcConversation,
    DialogueLine,
    DialogueUnlock,
    DialogueLineType,
    DialogueUnlockType,
    NPC,
)
from app.schemas.dialogue import (
    NpcConversationSearchResult,
    DialogueSearchResponse,
    DialogueListResult,
    DialogueListResponse,
    DialogueLineResponse,
    DialogueLinesByType,
    DialogueUnlockResponse,
    NPCLinkResponse,
    NpcConversationResponse,
)

router = APIRouter(prefix="/dialogues", tags=["dialogues"])


def normalize_search_text(text: str) -> str:
    """Normalise le texte pour la recherche (accents, ligatures, points)."""
    text = text.replace("oe", "oe").replace("OE", "OE")
    text = text.replace("ae", "ae").replace("AE", "AE")
    text = text.replace(".", "")
    text = "".join(
        c for c in unicodedata.normalize("NFD", text)
        if unicodedata.category(c) != "Mn"
    )
    return text


@router.get("/search", response_model=DialogueSearchResponse)
def search_dialogues(
    q: str = Query(..., min_length=1, description="Terme de recherche"),
    db: Session = Depends(get_db),
):
    """
    Recherche dans les dialogues par nom de NPC ou contenu du texte.
    Retourne jusqu'a 20 resultats.
    """
    search_normalized = f"%{normalize_search_text(q.lower())}%"

    def normalize_column(col):
        normalized = func.replace(func.replace(col, "oe", "oe"), "OE", "OE")
        normalized = func.replace(func.replace(normalized, "ae", "ae"), "AE", "AE")
        normalized = func.replace(normalized, ".", "")
        accents_from = "àâäéèêëïîôùûüçÀÂÄÉÈÊËÏÎÔÙÛÜÇ"
        accents_to = "aaaeeeeiioouucAAAEEEEIIOOUUC"
        normalized = func.translate(func.lower(normalized), accents_from, accents_to)
        return normalized

    # Recherche dans les conversations par nom de NPC
    conversations = db.query(NpcConversation).filter(
        or_(
            normalize_column(func.coalesce(NpcConversation.npc_name, '')).like(search_normalized),
            normalize_column(NpcConversation.row_id).like(search_normalized),
        )
    ).limit(20).all()

    # Recherche dans les textes de dialogue
    if len(conversations) < 20:
        remaining = 20 - len(conversations)
        conversation_ids = [c.id for c in conversations]

        lines_with_text = db.query(DialogueLine).filter(
            DialogueLine.text.isnot(None),
            normalize_column(DialogueLine.text).like(search_normalized),
        ).limit(remaining).all()

        # Ajouter les conversations des lignes trouvees
        for line in lines_with_text:
            if line.conversation_id not in conversation_ids:
                conv = db.query(NpcConversation).filter(
                    NpcConversation.id == line.conversation_id
                ).first()
                if conv:
                    conversations.append(conv)
                    conversation_ids.append(conv.id)

    results = []
    for conv in conversations[:20]:
        # Chercher un extrait de texte correspondant
        matched_text = None
        line = db.query(DialogueLine).filter(
            DialogueLine.conversation_id == conv.id,
            DialogueLine.text.isnot(None),
            normalize_column(DialogueLine.text).like(search_normalized),
        ).first()
        if line and line.text:
            matched_text = line.text[:100] + "..." if len(line.text) > 100 else line.text

        results.append(NpcConversationSearchResult(
            type="dialogue",
            row_id=conv.row_id,
            npc_name=conv.npc_name,
            npc_row_id=conv.npc_row_id,
            matched_text=matched_text,
        ))

    return DialogueSearchResponse(
        query=q,
        count=len(results),
        results=results,
    )


@router.get("/list", response_model=DialogueListResponse)
def list_dialogues(
    skip: int = Query(0, ge=0, description="Nombre d'entrées a sauter"),
    limit: int = Query(50, ge=1, le=100, description="Nombre d'entrées a retourner"),
    db: Session = Depends(get_db),
):
    """
    Liste les conversations NPC avec pagination.
    """
    query = db.query(NpcConversation)

    total = query.count()
    conversations = query.order_by(NpcConversation.npc_name).offset(skip).limit(limit).all()

    results = []
    for conv in conversations:
        # Compter les lignes
        total_lines = db.query(DialogueLine).filter(
            DialogueLine.conversation_id == conv.id
        ).count()

        # Verifier si a des lignes vendor
        has_vendor = db.query(DialogueLine).filter(
            DialogueLine.conversation_id == conv.id,
            or_(
                DialogueLine.line_type == DialogueLineType.VENDOR_POSITIVE,
                DialogueLine.line_type == DialogueLineType.VENDOR_NEGATIVE,
            )
        ).first() is not None

        # Recuperer l'icone du NPC si lie
        npc_icon_path = None
        if conv.npc_row_id:
            npc = db.query(NPC).filter(NPC.row_id == conv.npc_row_id).first()
            if npc:
                npc_icon_path = npc.icon_path

        results.append(DialogueListResult(
            row_id=conv.row_id,
            npc_name=conv.npc_name,
            npc_row_id=conv.npc_row_id,
            npc_icon_path=npc_icon_path,
            total_lines=total_lines,
            has_vendor_lines=has_vendor,
        ))

    return DialogueListResponse(
        conversations=results,
        total=total,
        skip=skip,
        limit=limit,
        has_more=skip + limit < total,
    )


@router.get("/by-npc/{npc_row_id}", response_model=Optional[NpcConversationResponse])
def get_dialogue_by_npc(
    npc_row_id: str,
    db: Session = Depends(get_db),
):
    """
    Recupere la conversation liee a un NPC.
    Cherche d'abord par npc_row_id, puis par row_id de la conversation.
    """
    # D'abord chercher par npc_row_id
    conversation = db.query(NpcConversation).options(
        joinedload(NpcConversation.dialogue_lines).joinedload(DialogueLine.unlocks),
    ).filter(
        NpcConversation.npc_row_id == npc_row_id
    ).first()

    # Si non trouve, chercher par row_id (nom du personnage narratif)
    if not conversation:
        conversation = db.query(NpcConversation).options(
            joinedload(NpcConversation.dialogue_lines).joinedload(DialogueLine.unlocks),
        ).filter(
            NpcConversation.row_id == npc_row_id
        ).first()

    if not conversation:
        return None

    return _build_conversation_response(db, conversation)


@router.get("/by-name/{name}", response_model=list[NpcConversationResponse])
def get_dialogue_by_name(
    name: str,
    db: Session = Depends(get_db),
):
    """
    Recupere toutes les conversations par nom de personnage (recherche partielle).
    Utile pour lier les entrées Compendium aux dialogues.
    """
    # Normaliser le nom pour la recherche
    search_name = name.lower().strip()

    # Chercher toutes les correspondances sur npc_name ou row_id
    # Tri: dialogue de base en premier (row_id == npc_name), puis alphabétique
    conversations = db.query(NpcConversation).options(
        joinedload(NpcConversation.dialogue_lines).joinedload(DialogueLine.unlocks),
    ).filter(
        or_(
            func.lower(NpcConversation.npc_name).like(f"%{search_name}%"),
            func.lower(NpcConversation.row_id).like(f"%{search_name}%"),
        )
    ).order_by(
        case((NpcConversation.row_id == NpcConversation.npc_name, 0), else_=1),
        NpcConversation.row_id,
    ).all()

    return [_build_conversation_response(db, conv) for conv in conversations]


@router.get("/{row_id}", response_model=NpcConversationResponse)
def get_dialogue(
    row_id: str,
    db: Session = Depends(get_db),
):
    """
    Recupere une conversation NPC par son row_id.
    """
    conversation = db.query(NpcConversation).options(
        joinedload(NpcConversation.dialogue_lines).joinedload(DialogueLine.unlocks),
    ).filter(
        NpcConversation.row_id == row_id
    ).first()

    if not conversation:
        raise HTTPException(status_code=404, detail=f"Conversation '{row_id}' non trouvee")

    return _build_conversation_response(db, conversation)


def _build_conversation_response(db: Session, conversation: NpcConversation) -> NpcConversationResponse:
    """Construit une reponse complete pour une conversation NPC."""
    # Charger le NPC lie si existe
    npc_link = None
    if conversation.npc_row_id:
        npc = db.query(NPC).filter(NPC.row_id == conversation.npc_row_id).first()
        if npc:
            npc_link = NPCLinkResponse(
                row_id=npc.row_id,
                name=npc.name,
                icon_path=npc.icon_path,
            )

    # Grouper les lignes par type
    lines_by_type = DialogueLinesByType()

    for line in conversation.dialogue_lines:
        line_response = _build_line_response(db, line)

        if line.line_type == DialogueLineType.BECKONING:
            lines_by_type.beckoning.append(line_response)
        elif line.line_type == DialogueLineType.IDLE:
            lines_by_type.idle.append(line_response)
        elif line.line_type == DialogueLineType.INITIAL_CONTACT:
            lines_by_type.initial_contact.append(line_response)
        elif line.line_type == DialogueLineType.RETURN:
            lines_by_type.return_messages.append(line_response)
        elif line.line_type == DialogueLineType.VENDOR_POSITIVE:
            lines_by_type.vendor_positive.append(line_response)
        elif line.line_type == DialogueLineType.VENDOR_NEGATIVE:
            lines_by_type.vendor_negative.append(line_response)

    total_lines = len(conversation.dialogue_lines)

    return NpcConversationResponse(
        row_id=conversation.row_id,
        npc_name=conversation.npc_name,
        npc_row_id=conversation.npc_row_id,
        world_flag_to_complete=conversation.world_flag_to_complete,
        npc=npc_link,
        lines_by_type=lines_by_type,
        total_lines=total_lines,
    )


def _build_line_response(db: Session, line: DialogueLine) -> DialogueLineResponse:
    """Construit une reponse pour une ligne de dialogue."""
    unlocks = []
    for unlock in line.unlocks:
        unlocks.append(DialogueUnlockResponse(
            unlock_type=unlock.unlock_type.value,
            unlock_row_id=unlock.unlock_row_id,
            unlock_name=unlock.unlock_name,  # Utilise le nom stocké
        ))

    return DialogueLineResponse(
        line_type=line.line_type.value,
        position=line.position,
        audio_asset_name=line.audio_asset_name,
        text=line.text,
        montage_delay=line.montage_delay,
        unlocks=unlocks,
    )
