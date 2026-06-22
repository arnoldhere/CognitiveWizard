from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api._errors import (
    TranscriptsDisabled,
    NoTranscriptFound,
    VideoUnavailable,
    RequestBlocked,
)
import re
from services.summarization.preprocess.text_cleaner import TextCleaner


def _extract_video_id(url: str) -> str:
    """
    Extract video ID from various YouTube URL formats.
    """
    patterns = [
        r"(?:v=|youtu\.be/)([a-zA-Z0-9_-]{11})",  # Standard and short URLs
        r"youtube\.com/embed/([a-zA-Z0-9_-]{11})",  # Embed URLs
        r"youtube\.com/v/([a-zA-Z0-9_-]{11})",  # Old embed format
    ]

    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)

    raise ValueError("Invalid YouTube URL format")


def extract_text(url: str) -> str:
    """
    Extract transcript text from YouTube videos.
    """
    try:
        # Validate and extract video ID
        video_id = _extract_video_id(url)
        # print(f"Extracted video ID: {video_id}")
        # Try to get transcript
        try:
            ytt_api = YouTubeTranscriptApi()
            transcript = ytt_api.fetch(video_id=video_id)
        except TranscriptsDisabled:
            raise ValueError("Transcripts are disabled for this video")
        except NoTranscriptFound:
            raise ValueError("No transcript found for this video")
        except VideoUnavailable:
            raise ValueError("Video is unavailable or private")
        except RequestBlocked:
            raise ValueError("Too many requests to YouTube API. Please try again later")
        except Exception as e:
            raise ValueError(f"Failed to retrieve transcript: {str(e)}")

        if not transcript:
            raise ValueError("Empty transcript received")

        # Extract and combine text
        text_parts = []
        for entry in transcript:
            if hasattr(entry, "text") and entry.text.strip():
                text_parts.append(entry.text.strip())

        full_text = " ".join(text_parts)

        if not full_text.strip():
            raise ValueError("No meaningful text found in transcript")

        # Validate content
        is_valid, validation_msg = TextCleaner.validate_content(full_text)
        if not is_valid:
            raise ValueError(f"Transcript content validation failed: {validation_msg}")

        return full_text.strip()

    except ValueError:
        # Re-raise ValueError as-is
        raise
    except Exception as e:
        raise ValueError(f"YouTube extraction failed: {str(e)}")
