import pytest
from unittest.mock import patch

@pytest.mark.asyncio
async def test_provider_failure_fallback():
    from providers.llm.factory import get_llm_for_course_task
    from providers.llm.tasks import TaskType
    from providers.llm.provider_errors import AllProvidersFailedError

    with patch('providers.llm.factory.settings.LLM_PROVIDER_ORDER', 'bad_provider, another_bad'):
        with pytest.raises(AllProvidersFailedError):
            await get_llm_for_course_task(TaskType.COURSE_LESSON)

@pytest.mark.asyncio
async def test_quality_gate_invalid_lesson():
    from agents.nodes.quality_gate_node import _validate_lesson

    bad_lesson = {
        "lesson": {
            "title": "Bad Lesson",
            "overview": "Short",
            "sections": [], # invalid
            "exercises": [],
            "resources": []
        },
        "generation_status": "generated"
    }

    is_valid, issues = _validate_lesson(bad_lesson, {})
    assert not is_valid
    assert len(issues) > 0
