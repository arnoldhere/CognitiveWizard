import pytest
import sys
from pathlib import Path

# Add server directory to path
server_dir = Path(__file__).parent.parent
sys.path.insert(0, str(server_dir))


@pytest.fixture
def sample_valid_quiz():
    """Sample valid quiz data"""
    return [
        {
            "question": "What is the capital of France?",
            "options": ["London", "Berlin", "Paris", "Madrid"],
            "answer": "Paris",
        },
        {
            "question": "Which planet is closest to the Sun?",
            "options": ["Venus", "Mercury", "Earth", "Mars"],
            "answer": "Mercury",
        },
    ]


@pytest.fixture
def sample_invalid_quiz():
    """Sample quiz data with various issues"""
    return [
        {
            "question": "What is Python?",
            "options": ["Language", "Snake"],  # Only 2 options
            "answer": "Language",
        },
        {
            "question": "What is 2+2?",
            "options": ["3", "4", "5", "6"],
            "answer": "four",  # Not in options
        },
        {
            # Missing required field
            "question": "What color?",
            "options": ["Red", "Blue", "Green", "Yellow"],
        },
    ]


@pytest.fixture
def sample_messy_quiz():
    """Quiz data with formatting issues"""
    return [
        {
            "question": 'What is "Python"?',
            "options": ['"Language"', '"Snake"', '"Tool"', '"Library"'],
            "answer": '"Language"',
        },
        {
            "question": "Escape test",
            "options": ["Option\\ 1", "Option 2", "Option 3", "Option 4"],
            "answer": "Option\\ 1",
        },
    ]
