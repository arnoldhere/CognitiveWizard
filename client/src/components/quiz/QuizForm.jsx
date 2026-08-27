import { useState } from "react";
import Button from "../ui/Button";

export default function QuizForm({ onSubmit, disabled = false }) {
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState("medium");
  const [numQuestions, setNumQuestions] = useState(5);
  const [mode, setMode] = useState("api");

  const handleSubmit = (event) => {
    event.preventDefault();
    setMode("api");
    onSubmit({
      topic,
      difficulty,
      num_questions: Number(numQuestions),
      mode: "api",
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 w-full">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-slate-700">Topic</label>
        <input
          type="text"
          className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
          placeholder="e.g. NLP, Machine Learning"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          disabled={disabled}
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-slate-700">Difficulty</label>
          <select
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none bg-white"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            disabled={disabled}
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-slate-700">Questions</label>
          <input
            type="number"
            min="1"
            max="20"
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
            value={numQuestions}
            onChange={(e) => setNumQuestions(e.target.value)}
            disabled={disabled}
            required
          />
        </div>
      </div>

      <Button
        type="submit"
        variant="primary"
        className="w-full mt-4"
        disabled={disabled}
      >
        {disabled ? "Preparing Quiz..." : "Generate Quiz"}
      </Button>
    </form>
  );
}
