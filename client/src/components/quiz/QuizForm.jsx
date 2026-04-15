import { useState } from "react";
import {
  Box,
  TextField,
  MenuItem,
  Button,
  Grid,
  Typography
} from "@mui/material";

export default function QuizForm({ onSubmit, disabled = false }) {
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState("medium");
  const [numQuestions, setNumQuestions] = useState(5);
  const [mode, setMode] = useState("api");

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit({
      topic,
      difficulty,
      num_questions: Number(numQuestions),
      mode,
    });
  };

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Grid container spacing={3}>
        {/* Topic */}
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Topic"
            placeholder="e.g. NLP, Machine Learning"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            disabled={disabled}
            required
          />
        </Grid>

        {/* Difficulty */}
        <Grid item xs={12} md={6}>
          <TextField
            select
            fullWidth
            label="Difficulty"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            disabled={disabled}
          >
            <MenuItem value="easy">Easy</MenuItem>
            <MenuItem value="medium">Medium</MenuItem>
            <MenuItem value="hard">Hard</MenuItem>
          </TextField>
        </Grid>

        {/* Quiz Mode */}
        <Grid item xs={12} md={6}>
          <TextField
            select
            fullWidth
            label="Quiz Mode"
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            disabled={disabled}
            helperText={
              mode === "api"
                ? "Uses the remote inference API for generation."
                : "Uses the locally saved model for generation."
            }
          >
            <MenuItem value="api">Inference API</MenuItem>
            <MenuItem value="local">Local</MenuItem>
          </TextField>
        </Grid>

        {/* Questions */}
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            type="number"
            label="Questions"
            inputProps={{ min: 1, max: 20 }}
            value={numQuestions}
            onChange={(e) => setNumQuestions(e.target.value)}
            disabled={disabled}
            required
          />
        </Grid>

        {/* Submit */}
        <Grid item xs={12}>
          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={disabled}
            sx={{
              py: 1.5,
              fontWeight: 700,
              fontSize: "1rem",
              borderRadius: 2,
              background: "linear-gradient(90deg, #4f46e5, #7c3aed)",
              boxShadow: "0 6px 20px rgba(79,70,229,0.4)",
              "&:hover": {
                background: "linear-gradient(90deg, #4338ca, #6d28d9)",
              },
            }}
          >
            {disabled ? "Preparing Quiz..." : "Generate Quiz"}
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
}
