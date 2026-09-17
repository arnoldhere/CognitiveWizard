"""
Tests for quiz_generator module
"""

import pytest
import json
from unittest.mock import patch, MagicMock
from utils.json_extractor import extract_json
from services.quiz import quiz_generator


class TestExtractJson:
    """Test JSON extraction from various formats"""

    def test_extract_valid_json_array(self):
        """Test extracting valid JSON array"""
        text = '[{"question": "Q", "options": ["A", "B", "C", "D"], "answer": "A"}]'

        success, json_str = extract_json(text)

        assert success is True
        assert json.loads(json_str) is not None

    def test_extract_json_from_text(self):
        """Test extracting JSON embedded in text"""
        text = """
        Here's the quiz:
        [{"question": "Q", "options": ["A", "B", "C", "D"], "answer": "A"}]
        Hope you like it!
        """
        success, json_str = extract_json(text)

        assert success is True
        assert json.loads(json_str) is not None

    def test_extract_json_from_code_block(self):
        """Test extracting JSON from markdown code block"""
        text = """
        ```json
        [{"question": "Q", "options": ["A", "B", "C", "D"], "answer": "A"}]
        ```
        """
        success, json_str = extract_json(text)

        assert success is True
        assert json.loads(json_str) is not None

    def test_extract_json_invalid(self):
        """Test extraction fails for truly invalid input"""
        text = "This is not JSON at all"
        success, json_str = extract_json(text)

        assert success is False
        assert json_str == ""

    def test_extract_empty_string(self):
        """Test extraction from empty string"""
        success, json_str = extract_json("")

        assert success is False

    def test_extract_object_with_nested_arrays(self):
        """Test that an object containing inner arrays is extracted as the root object, not inner array."""
        text = """
        Here is your requested course blueprint:
        ```json
        {
            "title": "Python for Everyone",
            "course_outcomes": ["Write clean code", "Master Pythonic syntax"],
            "chapters": [
                {"title": "Chapter 1", "modules": []}
            ]
        }
        ```
        Hope you find this helpful!
        """
        success, json_str = extract_json(text)
        assert success is True
        parsed = json.loads(json_str)
        assert isinstance(parsed, dict)
        assert parsed["title"] == "Python for Everyone"
        assert len(parsed["course_outcomes"]) == 2
        assert len(parsed["chapters"]) == 1

    def test_extract_object_without_code_fences_containing_array(self):
        """Test scanner prioritizes root object when no markdown fences exist."""
        text = 'Pre-text { "title": "Test", "items": ["a", "b"] } Post-text'
        success, json_str = extract_json(text)
        assert success is True
        parsed = json.loads(json_str)
        assert isinstance(parsed, dict)
        assert parsed["title"] == "Test"
        assert parsed["items"] == ["a", "b"]

    def test_truncated_json_repair_recovers_object(self):
        """Test that a long JSON object cut off by token limit is repaired to valid JSON."""
        truncated_text = (
            '{"title": "Python for Beginners", '
            '"description": "A comprehensive guide to learning Python programming from scratch.", '
            '"course_outcomes": ["Understand syntax", "Write functions"], '
            '"chapters": [{"title": "Chapter 1", "description": "Introduction to Python", "modules": ['
            '{"title": "Module 1", "lessons": [{"title": "Lesson 1", "learning_objectives": ["Syntax'
        )
        assert len(truncated_text) >= 100
        success, json_str = extract_json(truncated_text)
        assert success is True
        parsed = json.loads(json_str)
        assert isinstance(parsed, dict)
        assert parsed["title"] == "Python for Beginners"
        assert "course_outcomes" in parsed
        assert "chapters" in parsed

    def test_truncated_object_does_not_extract_nested_array(self):
        """Test that if an object is truncated, it NEVER falls back to returning an inner array."""
        truncated_text = (
            '{"title": "Advanced AI Engineering with LangChain and Python", '
            '"description": "Complete production engineering curriculum for building agent systems.", '
            '"course_outcomes": ["Build agents", "Deploy production LLMs"], '
            '"chapters": [{"title": "Module 1", "topics": ['
        )
        assert len(truncated_text) >= 100
        success, json_str = extract_json(truncated_text)
        if success:
            parsed = json.loads(json_str)
            assert isinstance(parsed, dict)
            assert parsed["title"] == "Advanced AI Engineering with LangChain and Python"


class TestParseResponse:
    """Test response parsing"""

    def test_parse_valid_array(self):
        """Test parsing valid quiz array"""
        response = json.dumps(
            [
                {"question": "Q", "options": ["A", "B", "C", "D"], "answer": "A"},
                {"question": "Q2", "options": ["A", "B", "C", "D"], "answer": "B"},
            ]
        )

        success, data = quiz_generator._parse_response(response)

        assert success is True
        assert len(data) == 2

    def test_parse_wrapped_in_dict(self):
        """Test parsing response wrapped in dict"""
        response = json.dumps(
            {
                "quizzes": [
                    {"question": "Q", "options": ["A", "B", "C", "D"], "answer": "A"}
                ]
            }
        )

        success, data = quiz_generator._parse_response(response)

        assert success is True
        assert len(data) == 1

    def test_parse_wrapped_in_quiz_key(self):
        """Test parsing response with 'quiz' key"""
        response = json.dumps(
            {
                "quiz": [
                    {"question": "Q", "options": ["A", "B", "C", "D"], "answer": "A"}
                ]
            }
        )

        success, data = quiz_generator._parse_response(response)

        assert success is True
        assert len(data) == 1

    def test_parse_invalid_json(self):
        """Test parsing invalid JSON"""
        response = "This is not valid JSON {}"

        success, data = quiz_generator._parse_response(response)

        # Should handle gracefully
        assert success is False
        assert data == []

    def test_parse_malformed_json(self):
        """Test parsing malformed JSON"""
        response = '[{"question": "Q"'  # Incomplete

        success, data = quiz_generator._parse_response(response)

        assert success is False


class TestGenerateQuiz:
    """Tests for main generate_quiz function"""

    @patch("services.quiz.quiz_generator.get_llm_for_task")
    @patch("services.quiz.quiz_generator.build_quiz_prompt")
    def test_generate_quiz_success(self, mock_prompt, mock_get_llm):
        """Test successful quiz generation"""
        mock_prompt.return_value = "Mock prompt"

        mock_response = MagicMock()
        mock_generation = MagicMock(
            text=json.dumps(
                [
                    {"question": "Q", "options": ["A", "B", "C", "D"], "answer": "A"},
                    {"question": "Q2", "options": ["A", "B", "C", "D"], "answer": "B"},
                ]
            )
        )
        mock_response.generations = [[mock_generation]]
        mock_response.content = mock_response.generations[0][0].text

        mock_client_instance = MagicMock()
        mock_client_instance.invoke.return_value = mock_response
        mock_get_llm.return_value = mock_client_instance

        success, data = quiz_generator.generate_quiz("Python", "beginner", 2)

        # Verify
        assert success is True
        assert len(data) == 2
        assert data[0]["question"] == "Q"

    @patch("services.quiz.quiz_generator.get_llm_for_task")
    @patch("services.quiz.quiz_generator.build_quiz_prompt")
    def test_generate_quiz_invalid_response(self, mock_prompt, mock_get_llm):
        """Test handling of invalid LLM response"""
        mock_prompt.return_value = "Mock prompt"

        mock_response = MagicMock()
        mock_generation = MagicMock(text="This is not valid JSON")
        mock_response.generations = [[mock_generation]]
        mock_response.content = mock_generation.text

        mock_client_instance = MagicMock()
        mock_client_instance.invoke.return_value = mock_response
        mock_get_llm.return_value = mock_client_instance

        success, data = quiz_generator.generate_quiz("Python", "beginner", 2)

        # Should fail gracefully
        assert success is False
        assert data == []

    @patch("services.quiz.quiz_generator.get_llm_for_task")
    @patch("services.quiz.quiz_generator.build_quiz_prompt")
    def test_generate_quiz_api_error(self, mock_prompt, mock_get_llm):
        """Test handling of API errors"""
        mock_prompt.return_value = "Mock prompt"
        mock_get_llm.side_effect = Exception("API Error")

        success, data = quiz_generator.generate_quiz("Python", "beginner", 2)

        # Should fail gracefully
        assert success is False
        assert data == []

    @patch("services.quiz.quiz_generator.get_llm_for_task")
    @patch("services.quiz.quiz_generator.build_quiz_prompt")
    def test_generate_quiz_with_auto_fix(self, mock_prompt, mock_get_llm):
        """Test that auto-fix is applied"""
        mock_prompt.return_value = "Mock prompt"

        mock_response = MagicMock()
        mock_generation = MagicMock(
            text=json.dumps(
                [
                    {
                        "question": "Q",
                        "options": ["A", "B", "C"],  # Only 3 options
                        "answer": "A",
                    }
                ]
            )
        )
        mock_response.generations = [[mock_generation]]
        mock_response.content = mock_generation.text

        mock_client_instance = MagicMock()
        mock_client_instance.invoke.return_value = mock_response
        mock_get_llm.return_value = mock_client_instance

        success, data = quiz_generator.generate_quiz("Python", "beginner", 1)

        # Should succeed with auto-fixed data
        assert success is True
        assert len(data[0]["options"]) == 4
