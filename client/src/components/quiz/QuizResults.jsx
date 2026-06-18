import {
  Box,
  Button,
  Chip,
  Grid,
  Paper,
  Stack,
  Typography,
  Card,
  CardContent,
  Divider,
  Alert,
  Container,
  LinearProgress,
} from "@mui/material";
import {
  CheckCircle,
  Replay,
  TrendingUp,
  Close,
  Info,
} from "@mui/icons-material";

export default function QuizResults({ result, onStartAgain }) {
  const passPercentage = result.result === "pass" ? 100 : (result.score_percentage / 100) * 100;
  const isPass = result.result === "pass";

  const formatDuration = (seconds) => {
    if (seconds === null || seconds === undefined) return "N/A";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Stack spacing={4}>
        {/* Results Summary Card */}
        <Paper
          elevation={0}
          sx={{
            p: { xs: 3, md: 4 },
            borderRadius: 4,
            background: isPass
              ? "linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.05) 100%)"
              : "linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(220, 38, 38, 0.05) 100%)",
            border: `1.5px solid ${isPass ? "rgba(16, 185, 129, 0.35)" : "rgba(239, 68, 68, 0.35)"}`,
            position: "relative",
            overflow: "hidden",
            boxShadow: isPass 
              ? "0 8px 32px rgba(16, 185, 129, 0.1)"
              : "0 8px 32px rgba(239, 68, 68, 0.1)",
          }}
        >
          <Stack spacing={2.5}>
            <Stack
              direction={{ xs: "column", md: "row" }}
              justifyContent="space-between"
              alignItems={{ xs: "flex-start", md: "center" }}
              spacing={2}
            >
              <Box>
                <Typography
                  variant="overline"
                  sx={{
                    letterSpacing: 2,
                    color: isPass ? "#34d399" : "#f87171",
                    fontWeight: 700,
                  }}
                >
                  Quiz Completed
                </Typography>
                <Typography
                  variant="h3"
                  sx={{
                    fontWeight: 800,
                    mb: 1,
                    color: "#f1f5f9",
                  }}
                >
                  {result.topic}
                </Typography>
                <Typography
                  variant="body1"
                  sx={{
                    color: "#94a3b8",
                    fontWeight: 500,
                  }}
                >
                  {result.summary}
                </Typography>
                {result.is_auto_submitted ? (
                  <Alert 
                    severity="warning" 
                    sx={{ 
                      mt: 2, 
                      borderRadius: 2,
                      bgcolor: "rgba(245, 158, 11, 0.1)",
                      color: "#fde68a",
                      border: "1px solid rgba(245, 158, 11, 0.25)",
                      "& .MuiAlert-icon": { color: "#fbbf24" }
                    }}
                  >
                    Time limit reached. This quiz was submitted automatically.
                  </Alert>
                ) : null}
              </Box>
              <Chip
                label={result.result.toUpperCase()}
                icon={isPass ? <CheckCircle style={{ color: "#10b981" }} /> : <Close style={{ color: "#ef4444" }} />}
                variant="outlined"
                sx={{
                  fontWeight: 700,
                  fontSize: "1rem",
                  py: 3,
                  px: 2,
                  color: isPass ? "#34d399" : "#f87171",
                  borderColor: isPass ? "rgba(16, 185, 129, 0.4)" : "rgba(239, 68, 68, 0.4)",
                  backgroundColor: isPass ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
                }}
              />
            </Stack>

            <Divider sx={{ borderColor: "rgba(255,255,255,0.08)" }} />

            <Grid container spacing={2}>
              {/* Score card */}
              <Grid item xs={12} sm={6} md={3}>
                <Card
                  elevation={0}
                  sx={{
                    p: 2.5,
                    borderRadius: 3,
                    background: "rgba(255, 255, 255, 0.03)",
                    border: "1px solid rgba(255, 255, 255, 0.05)",
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: "#94a3b8" }}>
                    Score
                  </Typography>
                  <Typography
                    variant="h2"
                    sx={{
                      fontWeight: 800,
                      background: `linear-gradient(45deg, ${result.score_percentage >= 60 ? "#10b981" : "#f59e0b"
                        } 30%, ${result.score_percentage >= 60 ? "#34d399" : "#fbbf24"} 90%)`,
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                    }}
                  >
                    {result.score_percentage}%
                  </Typography>
                </Card>
              </Grid>

              {/* Time taken card */}
              <Grid item xs={12} sm={6} md={3}>
                <Card
                  elevation={0}
                  sx={{
                    p: 2.5,
                    borderRadius: 3,
                    background: "rgba(255, 255, 255, 0.03)",
                    border: "1px solid rgba(255, 255, 255, 0.05)",
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: "#94a3b8" }}>
                    Time Taken
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, color: "#f1f5f9", mb: 0.5 }}>
                    {formatDuration(result.time_taken)}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "#64748b" }}>
                    Limit: {formatDuration(result.time_limit_seconds)}
                  </Typography>
                </Card>
              </Grid>

              {/* Correct answers card */}
              <Grid item xs={12} sm={6} md={3}>
                <Card
                  elevation={0}
                  sx={{
                    p: 2.5,
                    borderRadius: 3,
                    background: "rgba(255, 255, 255, 0.03)",
                    border: "1px solid rgba(255, 255, 255, 0.05)",
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: "#94a3b8" }}>
                    Correct Answers
                  </Typography>
                  <Typography variant="h3" sx={{ fontWeight: 800, color: "#34d399" }}>
                    {result.correct_answers}/{result.total_questions}
                  </Typography>
                </Card>
              </Grid>

              {/* Difficulty card */}
              <Grid item xs={12} sm={6} md={3}>
                <Card
                  elevation={0}
                  sx={{
                    p: 2.5,
                    borderRadius: 3,
                    background: "rgba(255, 255, 255, 0.03)",
                    border: "1px solid rgba(255, 255, 255, 0.05)",
                  }}
                >
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                    <TrendingUp sx={{ color: "#818cf8" }} />
                    <Typography variant="body2" sx={{ fontWeight: 600, color: "#94a3b8" }}>
                      Difficulty
                    </Typography>
                  </Stack>
                  <Typography
                    variant="h4"
                    sx={{
                      fontWeight: 800,
                      textTransform: "capitalize",
                      color: "#818cf8",
                    }}
                  >
                    {result.difficulty}
                  </Typography>
                </Card>
              </Grid>

              {/* Accuracy progress card */}
              <Grid item xs={12} sm={6} md={3}>
                <Card
                  elevation={0}
                  sx={{
                    p: 2.5,
                    borderRadius: 3,
                    background: "rgba(255, 255, 255, 0.03)",
                    border: "1px solid rgba(255, 255, 255, 0.05)",
                  }}
                >
                  <Box sx={{ mb: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: "#94a3b8" }}>
                      Accuracy
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={passPercentage}
                    sx={{
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: "rgba(255,255,255,0.06)",
                      "& .MuiLinearProgress-bar": {
                        background: `linear-gradient(90deg, ${result.score_percentage >= 60 ? "#10b981" : "#f59e0b"
                          }, ${result.score_percentage >= 60 ? "#34d399" : "#fbbf24"})`,
                        borderRadius: 3,
                      },
                    }}
                  />
                  <Typography
                    variant="caption"
                    sx={{ display: "block", mt: 1, fontWeight: 600, color: "#94a3b8" }}
                  >
                    {Math.round(passPercentage)}% Achieved
                  </Typography>
                </Card>
              </Grid>
            </Grid>

            <Button
              variant="contained"
              startIcon={<Replay />}
              onClick={onStartAgain}
              sx={{
                alignSelf: "flex-start",
                borderRadius: 999,
                px: 4,
                py: 1.5,
                fontSize: "1rem",
                fontWeight: 700,
                background: "linear-gradient(90deg, #7c3aed, #06b6d4)",
                boxShadow: "0 6px 20px rgba(124,58,237,0.3)",
                color: "#ffffff",
                border: "none",
                "&:hover": {
                  background: "linear-gradient(90deg, #6d28d9, #0891b2)",
                }
              }}
            >
              Start Another Quiz
            </Button>
          </Stack>
        </Paper>

        {/* Detailed Feedback Section */}
        <Box>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 800,
              mb: 2.5,
              display: "flex",
              alignItems: "center",
              gap: 1,
              color: "#f1f5f9",
            }}
          >
            <Info sx={{ color: "#a78bfa" }} />
            Detailed Feedback
          </Typography>

          <Stack spacing={2.5}>
            {result.feedback && result.feedback.length > 0 ? (
              result.feedback.map((item, index) => (
                <Paper
                  key={item.question_id}
                  elevation={0}
                  sx={{
                    p: 3,
                    borderRadius: 3,
                    border: `1.5px solid ${item.is_correct ? "rgba(52, 211, 153, 0.25)" : "rgba(248, 113, 113, 0.25)"}`,
                    background: item.is_correct
                      ? "linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(5, 150, 105, 0.02) 100%)"
                      : "linear-gradient(135deg, rgba(239, 68, 68, 0.05) 0%, rgba(220, 38, 38, 0.02) 100%)",
                  }}
                >
                  <Stack spacing={2}>
                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      justifyContent="space-between"
                      alignItems={{ xs: "flex-start", sm: "center" }}
                      spacing={1.5}
                    >
                      <Typography
                        variant="h6"
                        sx={{
                          fontWeight: 700,
                          color: "#f1f5f9",
                        }}
                      >
                        Q{index + 1}. {item.question}
                      </Typography>
                      <Chip
                        icon={item.is_correct ? <CheckCircle style={{ color: "#34d399" }} /> : <Close style={{ color: "#f87171" }} />}
                        label={item.is_correct ? "Correct" : "Incorrect"}
                        variant="outlined"
                        sx={{
                          color: item.is_correct ? "#34d399" : "#f87171",
                          borderColor: item.is_correct ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)",
                          backgroundColor: item.is_correct ? "rgba(16, 185, 129, 0.06)" : "rgba(239, 68, 68, 0.06)",
                          fontWeight: 700,
                        }}
                      />
                    </Stack>

                    <Divider sx={{ borderColor: "rgba(255,255,255,0.06)" }} />

                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <Box>
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 600,
                              color: "#94a3b8",
                              mb: 1,
                            }}
                          >
                            Your Answer
                          </Typography>
                          <Paper
                            elevation={0}
                            sx={{
                              p: 1.5,
                              borderRadius: 2,
                              background: item.is_correct
                                ? "rgba(16, 185, 129, 0.08)"
                                : "rgba(239, 68, 68, 0.08)",
                              borderLeft: `4px solid ${item.is_correct ? "#10b981" : "#ef4444"}`,
                            }}
                          >
                            <Typography
                              variant="body2"
                              sx={{
                                color: item.is_correct ? "#6ee7b7" : "#fca5a5",
                                fontWeight: 600,
                              }}
                            >
                              {item.selected_option || "Not answered"}
                            </Typography>
                          </Paper>
                        </Box>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Box>
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 600,
                              color: "#94a3b8",
                              mb: 1,
                            }}
                          >
                            Correct Answer
                          </Typography>
                          <Paper
                            elevation={0}
                            sx={{
                              p: 1.5,
                              borderRadius: 2,
                              background: "rgba(16, 185, 129, 0.08)",
                              borderLeft: "4px solid #10b981",
                            }}
                          >
                            <Typography
                              variant="body2"
                              sx={{
                                color: "#6ee7b7",
                                fontWeight: 700,
                              }}
                            >
                              {item.correct_answer}
                            </Typography>
                          </Paper>
                        </Box>
                      </Grid>
                    </Grid>

                    <Alert
                      severity={item.is_correct ? "success" : "warning"}
                      sx={{
                        borderRadius: 2,
                        bgcolor: item.is_correct ? "rgba(16, 185, 129, 0.06)" : "rgba(245, 158, 11, 0.06)",
                        color: item.is_correct ? "#a7f3d0" : "#fde68a",
                        border: `1px solid ${item.is_correct ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.15)"}`,
                        "& .MuiAlert-message": {
                          fontWeight: 500,
                        },
                        "& .MuiAlert-icon": {
                          color: item.is_correct ? "#34d399" : "#fbbf24",
                        }
                      }}
                    >
                      {item.feedback}
                    </Alert>
                  </Stack>
                </Paper>
              ))
            ) : (
              <Alert 
                severity="info" 
                sx={{ 
                  borderRadius: 2,
                  bgcolor: "rgba(59, 130, 246, 0.1)",
                  color: "#93c5fd",
                  border: "1px solid rgba(59, 130, 246, 0.2)"
                }}
              >
                No feedback available
              </Alert>
            )}
          </Stack>
        </Box>
      </Stack>
    </Container>
  );
}
