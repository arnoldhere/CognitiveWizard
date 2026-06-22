from datetime import datetime
from uuid import uuid4
from sqlalchemy.orm import Session
from models.chat_session import ChatSession


def _generate_session_id() -> str:
    """
    Generate a unique session ID for a new chat session.
    """
    return uuid4().hex


def _generate_session_title(title: str | None, initial_prompt: str | None) -> str:
    """
    Generate a title for a chat session.
    Priority:
    1. Use the provided title if available.
    2. Generate a title from the initial prompt.
    3. Fallback to a timestamp-based default title.
    """

    # Use explicit title if provided
    if title and title.strip():
        return title.strip()

    # Generate title from first few words of the initial prompt
    if initial_prompt and initial_prompt.strip():
        words = initial_prompt.strip().split()
        return "Chat: " + " ".join(words[:6])

    # Default title with timestamp
    return f"New Chat • {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')}"


def create_chat_session(
    db: Session,
    user_id: int,
    title: str | None = None,
    initial_prompt: str | None = None,
    metadata: dict | None = None,
) -> ChatSession:
    """
    Create and store a new chat session.
    Args:
        db (Session):
            Active SQLAlchemy database session.
        user_id (int):
            ID of the user creating the session.
        title (str | None):
            Optional custom session title.
        initial_prompt (str | None):
            Optional initial user prompt used for auto-title generation.
        metadata (dict | None):
            Optional additional metadata related to the session.
    Returns:
        ChatSession:
            Newly created chat session object.
    """

    # Generate unique session identifier
    session_id = _generate_session_id()

    # Generate session title
    session_title = _generate_session_title(title, initial_prompt)

    # Create ChatSession ORM object
    chat_session = ChatSession(
        session_id=session_id,
        user_id=user_id,
        title=session_title,
        active=True,
        chat_metadata=metadata or {},
        created_at=datetime.utcnow(),
        last_message_at=None,
        message_count=0,
    )

    # Persist session in database
    db.add(chat_session)
    db.commit()
    db.refresh(chat_session)

    return chat_session


def get_chat_session(
    db: Session,
    user_id: int,
    session_id: str,
) -> ChatSession | None:
    """
    Retrieve a specific chat session for a user.
    Args:
        db (Session):
            Active SQLAlchemy database session.
        user_id (int):
            ID of the session owner.
        session_id (str):
            Unique session identifier.
    Returns:
        ChatSession | None:
            Matching chat session if found, otherwise None.
    """

    return (
        db.query(ChatSession)
        .filter(
            ChatSession.user_id == user_id,
            ChatSession.session_id == session_id,
        )
        .first()
    )


def list_chat_sessions(db: Session, user_id: int) -> list[ChatSession]:
    """
    Retrieve all active chat sessions for a user.
    Sessions are ordered by:
    1. Most recent message activity
    2. Creation date (fallback ordering)
    """

    return (
        db.query(ChatSession)
        .filter(
            ChatSession.user_id == user_id,
            ChatSession.active == True,
        )
        .order_by(
            ChatSession.last_message_at.is_(None),
            ChatSession.last_message_at.desc(),
            ChatSession.created_at.desc(),
        )
        .all()
    )


def soft_delete_chat_session(
    db: Session,
    user_id: int,
    session_id: str,
) -> ChatSession | None:
    """
    Soft delete a chat session by marking it inactive. (imp)
    The session is not permanently removed from the database.

    Args:
        db (Session):
            Active SQLAlchemy database session.
        user_id (int):
            Owner of the session.
        session_id (str):
            Session identifier to deactivate.
    Returns:
        ChatSession | None:
            Updated session object if found, otherwise None.
    """

    # Fetch target session
    chat_session = get_chat_session(db, user_id, session_id)

    if not chat_session:
        return None

    # Mark session as inactive
    chat_session.active = False

    # Save changes
    db.commit()
    db.refresh(chat_session)

    return chat_session


def update_chat_session_activity(
    db: Session,
    session_id: str,
    user_id: int,
    last_message_at: datetime | None = None,
    increment_messages: int = 0,
) -> ChatSession | None:
    """
    Update chat session activity details.
    Supports:
    - Updating the timestamp of the last message
    - Incrementing the total message count

    Args:
        db (Session):
            Active SQLAlchemy database session.
        session_id (str):
            Unique chat session identifier.
        user_id (int):
            Owner of the session.
        last_message_at (datetime | None):
            Timestamp of the latest message.
        increment_messages (int):
            Number of messages to increment.
            Default is 0.
    Returns:
        ChatSession | None:
            Updated session object if found, otherwise None.
    """
    # Retrieve session
    chat_session = get_chat_session(db, user_id, session_id)
    if not chat_session:
        return None
    # Update last message timestamp
    if last_message_at:
        chat_session.last_message_at = last_message_at
    # Increment message counter
    if increment_messages:
        chat_session.message_count = (
            chat_session.message_count or 0
        ) + increment_messages

    # Persist updates
    db.commit()
    db.refresh(chat_session)

    return chat_session


def rename_chat_session(
    db: Session,
    user_id: int,
    session_id: str,
    new_title: str,
) -> ChatSession | None:
    """
    Rename a chat session.
    Args:
        db (Session):
            Active SQLAlchemy database session.
        user_id (int):
            Owner of the session.
        session_id (str):
            Session identifier to rename.
        new_title (str):
            New title for the session.
    Returns:
        ChatSession | None:
            Updated session object if found, otherwise None.
    """
    # Retrieve session
    chat_session = get_chat_session(db, user_id, session_id)
    if not chat_session:
        return None

    # Update title
    chat_session.title = new_title.strip()

    # Persist updates
    db.commit()
    db.refresh(chat_session)

    return chat_session
