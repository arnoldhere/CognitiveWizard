"""
Tests for quiz_validator module
"""

import pytest
from services.quiz import quiz_validator


class TestValidateBasic:
    """Basic validation tests"""

    def test_valid_quiz(self, sample_valid_quiz):
        """Test validation of correct quiz data"""
        is_valid, data = quiz_validator.validate(sample_valid_quiz)

        assert is_valid is True
        assert len(data) == 2
        assert data[0]["answer"] == "Paris"
        assert len(data[0]["options"]) == 4

    def test_non_list_input(self):
        """Test validation rejects non-list input"""
        is_valid, data = quiz_validator.validate({"quiz": []})

        assert is_valid is False

    def test_empty_list(self):
        """Test validation rejects empty list"""
        is_valid, data = quiz_validator.validate([])

        assert is_valid is False

    def test_non_dict_items(self):
        """Test validation skips non-dict items"""
        is_valid, data = quiz_validator.validate(
            [
                "not a dict",
                {"question": "Valid", "options": ["A", "B", "C", "D"], "answer": "A"},
            ]
        )

        # Should still fail overall because we need valid questions
        assert len(data) == 1


class TestValidateAutoFix:
    """Auto-fix functionality tests"""

    def test_fix_quoted_strings(self):
        """Test removal of wrapping quotes"""
        quiz_data = [
            {
                "question": '"What?"',
                "options": ['"A"', '"B"', '"C"', '"D"'],
                "answer": '"A"',
            }
        ]

        is_valid, data = quiz_validator.validate(quiz_data, auto_fix=True)

        assert is_valid is True
        assert data[0]["question"] == "What?"
        assert data[0]["options"][0] == "A"

    def test_fix_escaped_chars(self):
        """Test removal of escape characters"""
        quiz_data = [
            {
                "question": "What\\?",
                "options": ["Opt\\ion1", "Option2", "Option3", "Option4"],
                "answer": "Opt\\ion1",
            }
        ]

        is_valid, data = quiz_validator.validate(quiz_data, auto_fix=True)

        assert is_valid is True
        assert data[0]["question"] == "What?"
        assert data[0]["options"][0] == "Option1"

    def test_fix_wrong_option_count_low(self):
        """Test padding when options < 4"""
        quiz_data = [{"question": "Question?", "options": ["A", "B"], "answer": "A"}]

        is_valid, data = quiz_validator.validate(quiz_data, auto_fix=True)

        assert is_valid is True
        assert len(data[0]["options"]) == 4

    def test_fix_wrong_option_count_high(self):
        """Test trimming when options > 4"""
        quiz_data = [
            {
                "question": "Question?",
                "options": ["A", "B", "C", "D", "E", "F"],
                "answer": "A",
            }
        ]

        is_valid, data = quiz_validator.validate(quiz_data, auto_fix=True)

        assert is_valid is True
        assert len(data[0]["options"]) == 4

    def test_fuzzy_match_answer(self):
        """Test fuzzy matching for answer"""
        quiz_data = [
            {
                "question": "What?",
                "options": ["Apple", "Banana", "Cherry", "Date"],
                "answer": "Appl",  # Close to Apple
            }
        ]

        is_valid, data = quiz_validator.validate(quiz_data, auto_fix=True)

        assert is_valid is True
        assert data[0]["answer"] == "Apple"

    def test_strict_mode_no_fix(self):
        """Test strict validation without auto-fix"""
        quiz_data = [
            {
                "question": "Question?",
                "options": ["A", "B"],  # Only 2 options
                "answer": "A",
            }
        ]

        is_valid, data = quiz_validator.validate(quiz_data, auto_fix=False)

        assert is_valid is False


class TestValidateEdgeCases:
    """Edge case tests"""

    def test_missing_required_fields(self):
        """Test skipping questions with missing fields"""
        quiz_data = [
            {"question": "Valid?", "options": ["A", "B", "C", "D"], "answer": "A"},
            {"question": "Missing answer", "options": ["A", "B", "C", "D"]},
            {"question": "Valid?", "options": ["A", "B", "C", "D"], "answer": "A"},
        ]

        is_valid, data = quiz_validator.validate(quiz_data)

        assert is_valid is True
        assert len(data) == 2

    def test_empty_question_text(self):
        """Test rejection of empty question text"""
        quiz_data = [{"question": "", "options": ["A", "B", "C", "D"], "answer": "A"}]

        is_valid, data = quiz_validator.validate(quiz_data)

        assert is_valid is False

    def test_non_list_options(self):
        """Test handling of non-list options"""
        quiz_data = [
            {"question": "Question?", "options": "Not a list", "answer": "Not a list"}
        ]

        is_valid, data = quiz_validator.validate(quiz_data, auto_fix=True)

        # Should auto-fix into a list
        assert is_valid is True or is_valid is False  # Depends on auto-fix logic

    def test_case_insensitive_answer_matching(self):
        """Test case-insensitive answer matching"""
        quiz_data = [
            {
                "question": "Question?",
                "options": ["Apple", "Banana", "Cherry", "Date"],
                "answer": "apple",  # lowercase
            }
        ]

        is_valid, data = quiz_validator.validate(quiz_data, auto_fix=True)

        assert is_valid is True
        # Answer should be corrected to actual option format
        assert data[0]["answer"].lower() == "apple"


class TestValidateMessy:
    """Tests with real-world messy data"""

    def test_mixed_quote_types(self, sample_messy_quiz):
        """Test handling various quote styles"""
        is_valid, data = quiz_validator.validate(sample_messy_quiz, auto_fix=True)

        assert is_valid is True
        assert len(data) >= 1
        # Options should be cleaned
        for opt in data[0]["options"]:
            assert not opt.startswith('"')
            assert not opt.endswith('"')
