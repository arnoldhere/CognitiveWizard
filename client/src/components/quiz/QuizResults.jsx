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

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Stack spacing={4}>
        {/* Results Summary Card */}
        <Paper
          elevation={0}
          sx={{
            p: { xs: 3, md: 4 },
            borderRadius: 4,
            background:
              result.result === "pass"
                ? "linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)"
                : "linear-gradient(135deg, #ffedd5 0%, #fed7aa 100%)",
            border: `2px solid ${result.result === "pass" ? "#10b981" : "#f59e0b"}`,
            position: "relative",
            overflow: "hidden",
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
                    color: result.result === "pass" ? "#047857" : "#b45309",
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
                    color: result.result === "pass" ? "#065f46" : "#92400e",
                  }}
                >
                  {result.topic}
                </Typography>
                <Typography
                  variant="body1"
                  sx={{
                    color: result.result === "pass" ? "#047857" : "#b45309",
                    fontWeight: 500,
                  }}
                >
                  {result.summary}
                </Typography>
              </Box>
              <Chip
                label={result.result.toUpperCase()}
                icon={result.result === "pass" ? <CheckCircle /> : <Close />}
                color={result.result === "pass" ? "success" : "warning"}
                sx={{
                  fontWeight: 700,
                  fontSize: "1rem",
                  py: 3,
                  px: 2,
                }}
              />
            </Stack>

            <Divider />

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <Card
                  elevation={0}
                  sx={{
                    p: 2.5,
                    borderRadius: 3,
                    background: "rgba(255,255,255,0.7)",
                    backdropFilter: "blur(10px)",
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: "text.secondary" }}>
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
              <Grid item xs={12} sm={6} md={3}>
                <Card
                  elevation={0}
                  sx={{
                    p: 2.5,
                    borderRadius: 3,
                    background: "rgba(255,255,255,0.7)",
                    backdropFilter: "blur(10px)",
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: "text.secondary" }}>
                    Correct Answers
                  </Typography>
                  <Typography variant="h3" sx={{ fontWeight: 800, color: "success.main" }}>
                    {result.correct_answers}/{result.total_questions}
                  </Typography>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card
                  elevation={0}
                  sx={{
                    p: 2.5,
                    borderRadius: 3,
                    background: "rgba(255,255,255,0.7)",
                    backdropFilter: "blur(10px)",
                  }}
                >
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                    <TrendingUp sx={{ color: "primary.main" }} />
                    <Typography variant="body2" sx={{ fontWeight: 600, color: "text.secondary" }}>
                      Difficulty
                    </Typography>
                  </Stack>
                  <Typography
                    variant="h4"
                    sx={{
                      fontWeight: 800,
                      textTransform: "capitalize",
                      color: "primary.main",
                    }}
                  >
                    {result.difficulty}
                  </Typography>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card
                  elevation={0}
                  sx={{
                    p: 2.5,
                    borderRadius: 3,
                    background: "rgba(255,255,255,0.7)",
                    backdropFilter: "blur(10px)",
                  }}
                >
                  <Box sx={{ mb: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: "text.secondary" }}>
                      Accuracy
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={passPercentage}
                    sx={{
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: "rgba(0,0,0,0.1)",
                      "& .MuiLinearProgress-bar": {
                        background: `linear-gradient(90deg, ${result.score_percentage >= 60 ? "#10b981" : "#f59e0b"
                          }, ${result.score_percentage >= 60 ? "#34d399" : "#fbbf24"})`,
                        borderRadius: 3,
                      },
                    }}
                  />
                  <Typography
                    variant="caption"
                    sx={{ display: "block", mt: 1, fontWeight: 600, color: "text.secondary" }}
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
                fontWeight: 600,
                background: "linear-gradient(90deg, #0ea5e9, #4f46e5)",
                boxShadow: "0 6px 20px rgba(79,70,229,0.4)",
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
              fontWeight: 700,
              mb: 2.5,
              display: "flex",
              alignItems: "center",
              gap: 1,
            }}
          >
            <Info sx={{ color: "primary.main" }} />
            Detailed Feedback
          </Typography>

          <Stack spacing={2}>
            {result.feedback && result.feedback.length > 0 ? (
              result.feedback.map((item, index) => (
                <Paper
                  key={item.question_id}
                  elevation={0}
                  sx={{
                    p: 3,
                    borderRadius: 3,
                    border: `2px solid ${item.is_correct ? "#d1fae5" : "#fecaca"}`,
                    background: item.is_correct
                      ? "linear-gradient(135deg, #f0fdf4 0%, #e8f8f5 100%)"
                      : "linear-gradient(135deg, #fef5f5 0%, #feeaea 100%)",
                  }}
                >
                  <Stack spacing={1.5}>
                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      justifyContent="space-between"
                      alignItems={{ xs: "flex-start", sm: "center" }}
                      spacing={1}
                    >
                      <Typography
                        variant="h6"
                        sx={{
                          fontWeight: 700,
                          color: "#0f172a",
                        }}
                      >
                        Q{index + 1}. {item.question}
                      </Typography>
                      <Chip
                        icon={item.is_correct ? <CheckCircle /> : <Close />}
                        label={item.is_correct ? "Correct" : "Incorrect"}
                        color={item.is_correct ? "success" : "error"}
                        variant="filled"
                      />
                    </Stack>

                    <Divider />

                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <Box>
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 600,
                              color: "text.secondary",
                              mb: 0.5,
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
                                ? "rgba(16, 185, 129, 0.1)"
                                : "rgba(239, 68, 68, 0.1)",
                              borderLeft: `4px solid ${item.is_correct ? "#10b981" : "#ef4444"
                                }`,
                            }}
                          >
                            <Typography
                              variant="body2"
                              sx={{
                                color: item.is_correct ? "#065f46" : "#7f1d1d",
                                fontWeight: 500,
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
                              color: "text.secondary",
                              mb: 0.5,
                            }}
                          >
                            Correct Answer
                          </Typography>
                          <Paper
                            elevation={0}
                            sx={{
                              p: 1.5,
                              borderRadius: 2,
                              background: "rgba(16, 185, 129, 0.1)",
                              borderLeft: "4px solid #10b981",
                            }}
                          >
                            <Typography
                              variant="body2"
                              sx={{
                                color: "#065f46",
                                fontWeight: 600,
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
                        "& .MuiAlert-message": {
                          fontWeight: 500,
                        },
                      }}
                    >
                      {item.feedback}
                    </Alert>
                  </Stack>
                </Paper>
              ))
            ) : (
              <Alert severity="info">No feedback available</Alert>
            )}
          </Stack>
        </Box>
      </Stack>
    </Container>
  );
}
