"""
Tests for quiz_generator module
"""

import pytest
import json
from unittest.mock import patch, MagicMock
from services.quiz import quiz_generator


class TestExtractJson:
    """Test JSON extraction from various formats"""

    def test_extract_valid_json_array(self):
        """Test extracting valid JSON array"""
        text = '[{"question": "Q", "options": ["A", "B", "C", "D"], "answer": "A"}]'

        success, json_str = quiz_generator._extract_json(text)

        assert success is True
        assert json.loads(json_str) is not None

    def test_extract_json_from_text(self):
        """Test extracting JSON embedded in text"""
        text = """
        Here's the quiz:
        [{"question": "Q", "options": ["A", "B", "C", "D"], "answer": "A"}]
        Hope you like it!
        """

        success, json_str = quiz_generator._extract_json(text)

        assert success is True
        assert json.loads(json_str) is not None

    def test_extract_json_from_code_block(self):
        """Test extracting JSON from markdown code block"""
        text = """
        ```json
        [{"question": "Q", "options": ["A", "B", "C", "D"], "answer": "A"}]
        ```
        """

        success, json_str = quiz_generator._extract_json(text)

        assert success is True
        assert json.loads(json_str) is not None

    def test_extract_json_invalid(self):
        """Test extraction fails for truly invalid input"""
        text = "This is not JSON at all"

        success, json_str = quiz_generator._extract_json(text)

        assert success is False
        assert json_str == ""

    def test_extract_empty_string(self):
        """Test extraction from empty string"""
        success, json_str = quiz_generator._extract_json("")

        assert success is False


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

    @patch("services.quiz.quiz_generator.HFClientManager.get_client")
    @patch("services.quiz.quiz_generator.build_quiz_prompt")
    def test_generate_quiz_success(self, mock_prompt, mock_client):
        """Test successful quiz generation"""
        # Setup mocks
        mock_prompt.return_value = "Mock prompt"

        mock_response = MagicMock()
        mock_response.choices[0].message = {
            "content": json.dumps(
                [
                    {"question": "Q", "options": ["A", "B", "C", "D"], "answer": "A"},
                    {"question": "Q2", "options": ["A", "B", "C", "D"], "answer": "B"},
                ]
            )
        }

        mock_client_instance = MagicMock()
        mock_client_instance.chat_completion.return_value = mock_response
        mock_client.return_value = mock_client_instance

        # Call function
        success, data = quiz_generator.generate_quiz("Python", "beginner", 2)

        # Verify
        assert success is True
        assert len(data) == 2
        assert data[0]["question"] == "Q"

    @patch("services.quiz.quiz_generator.HFClientManager.get_client")
    @patch("services.quiz.quiz_generator.build_quiz_prompt")
    def test_generate_quiz_invalid_response(self, mock_prompt, mock_client):
        """Test handling of invalid LLM response"""
        mock_prompt.return_value = "Mock prompt"

        mock_response = MagicMock()
        mock_response.choices[0].message = {"content": "This is not valid JSON"}

        mock_client_instance = MagicMock()
        mock_client_instance.chat_completion.return_value = mock_response
        mock_client.return_value = mock_client_instance

        # Call function
        success, data = quiz_generator.generate_quiz("Python", "beginner", 2)

        # Should fail gracefully
        assert success is False
        assert data == []

    @patch("services.quiz.quiz_generator.HFClientManager.get_client")
    @patch("services.quiz.quiz_generator.build_quiz_prompt")
    def test_generate_quiz_api_error(self, mock_prompt, mock_client):
        """Test handling of API errors"""
        mock_prompt.return_value = "Mock prompt"
        mock_client.side_effect = Exception("API Error")

        # Call function
        success, data = quiz_generator.generate_quiz("Python", "beginner", 2)

        # Should fail gracefully
        assert success is False
        assert data == []

    @patch("services.quiz.quiz_generator.HFClientManager.get_client")
    @patch("services.quiz.quiz_generator.build_quiz_prompt")
    def test_generate_quiz_with_auto_fix(self, mock_prompt, mock_client):
        """Test that auto-fix is applied"""
        mock_prompt.return_value = "Mock prompt"

        # Response with issues that should be auto-fixed
        mock_response = MagicMock()
        mock_response.choices[0].message = {
            "content": json.dumps(
                [
                    {
                        "question": "Q",
                        "options": ["A", "B", "C"],  # Only 3 options
                        "answer": "A",
                    }
                ]
            )
        }

        mock_client_instance = MagicMock()
        mock_client_instance.chat_completion.return_value = mock_response
        mock_client.return_value = mock_client_instance

        # Call function
        success, data = quiz_generator.generate_quiz("Python", "beginner", 1)

        # Should succeed with auto-fixed data
        assert success is True
        assert len(data[0]["options"]) == 4
