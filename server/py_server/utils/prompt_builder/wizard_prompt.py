def build_wizard_prompt(topic: str, content_type: str, details: str = None) -> str:
    prompt = f"""
    You are an expert AI educational planner and structured content generator.
    Your task is to generate a comprehensive, structured {content_type} on the topic of "{topic}".
    """
    if details:
        prompt += f"\nAdditional details/requirements from the user:\n{details}\n"

    if content_type.lower() == "roadmap":
        json_structure = """
    {
      "title": "A catchy and professional title for the Roadmap",
      "description": "A comprehensive overview of the learning path",
      "target_audience": "Who is this for?",
      "modules": [
        {
          "title": "Milestone/Phase Name",
          "description": "Detailed explanation of what will be covered and why it is important",
          "estimated_time": "Estimated duration (e.g., '1 week', '1 month')",
          "topics": [
            {
              "name": "Specific sub-topic 1",
              "details": "A brief description of this sub-topic"
            },
            {
              "name": "Specific sub-topic 2",
              "details": "A brief description of this sub-topic"
            }
          ]
        }
      ]
    }"""
    elif content_type.lower() in ["course", "syllabus", "course/syllabus"]:
        json_structure = """
    {
      "title": "A catchy and professional title for the Course/Syllabus",
      "description": "A very detailed course overview",
      "target_audience": "Who is this for?",
      "course_outcomes": ["Outcome 1", "Outcome 2", "Outcome 3"],
      "modules": [
        {
          "title": "Module/Week Name",
          "description": "Extensive paragraph describing the module's core philosophy and focus.",
          "estimated_time": "Estimated duration (e.g., '2 hours')",
          "key_takeaways": ["Takeaway 1", "Takeaway 2"],
          "topics": [
            {
              "name": "Lecture 1 Topic",
              "content": "Deep dive paragraph explaining the lecture content.",
              "practical_task": "A specific hands-on task or assignment for this lecture"
            }
          ]
        }
      ]
    }"""
    elif content_type.lower() == "guide":
        json_structure = """
    {
      "title": "A catchy and professional title for the Guide",
      "description": "A short 1-2 sentence overview of what the user will achieve",
      "target_audience": "Who is this for?",
      "modules": [
        {
          "title": "Step 1: Name of the Step",
          "description": "Detailed instruction for this step",
          "estimated_time": "Estimated time to complete this step",
          "topics": [
            {
               "name": "Key tip or instruction",
               "details": "Explanation"
            }
          ]
        }
      ]
    }"""
    elif content_type.lower() == "schedule":
        json_structure = """
    {
      "title": "A personalized Schedule",
      "description": "A short overview of the study plan",
      "target_audience": "Who is this for?",
      "modules": [
        {
          "title": "Day 1 / Week 1 Focus",
          "description": "Main objective for this time period",
          "estimated_time": "Time block (e.g., '2 hours/day')",
          "topics": [
            {
              "name": "Task 1",
              "details": "What to study during this task"
            }
          ]
        }
      ]
    }"""
    else:
        json_structure = """
    {
      "title": "A catchy and professional title",
      "description": "A short 1-2 sentence overview",
      "target_audience": "Who is this for?",
      "modules": [
        {
          "title": "Name of the module/section/day",
          "description": "What will be covered in this section",
          "estimated_time": "Estimated duration",
          "topics": [
            {
               "name": "Specific topic",
               "details": "Topic details"
            }
          ]
        }
      ]
    }"""

    prompt += f"""
    Generate ONLY valid JSON matching this exact structure:
    {json_structure}
    
    Ensure you provide at least 4-8 well-structured modules/steps. Do not output any markdown formatting, only pure JSON.
    Make the content highly detailed and practical.
    """
    return prompt
