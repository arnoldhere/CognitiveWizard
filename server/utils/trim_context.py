from tiktoken import encoding_for_model


def trim_context_to_budget(sources, max_tokens=3000, model="gpt-4o-mini"):
    enc = encoding_for_model(model)

    total_tokens = 0
    selected_chunks = []

    for s in sources:
        tokens = len(enc.encode(s["text"]))

        if total_tokens + tokens > max_tokens:
            break

        selected_chunks.append(s["text"])
        total_tokens += tokens

    return "\n\n".join(selected_chunks)
