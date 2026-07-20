import React from "react";
import {
  Box,
  Button,
  Chip,
  Grid,
  Paper,
  Stack,
  Typography,
  Card,
  Divider,
  Alert,
  Container,
  LinearProgress,
  ThemeProvider,
  createTheme,
} from "@mui/material";
import {
  CheckCircle,
  Replay,
  TrendingUp,
  Close,
  Info,
} from "@mui/icons-material";

// Create a premium custom theme for the component
const theme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#6366f1", // Indigo
      light: "#818cf8",
      dark: "#4f46e5",
    },
    success: {
      main: "#10b981", // Emerald
      light: "#34d399",
      dark: "#059669",
    },
    error: {
      main: "#f43f5e", // Rose
      light: "#fb7185",
      dark: "#e11d48",
    },
    warning: {
      main: "#f59e0b", // Amber
      light: "#fbbf24",
    },
    background: {
      default: "#0f172a", // Slate 900
      paper: "rgba(30, 41, 59, 0.7)", // Slate 800 with transparency
    },
    text: {
      primary: "#f8fafc",
      secondary: "#94a3b8",
    },
  },
  typography: {
    fontFamily: '"Plus Jakarta Sans", "Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h2: { fontWeight: 800, letterSpacing: "-0.02em" },
    h3: { fontWeight: 800, letterSpacing: "-0.02em" },
    h4: { fontWeight: 700, letterSpacing: "-0.01em" },
    h5: { fontWeight: 700, letterSpacing: "-0.01em" },
    h6: { fontWeight: 600 },
    overline: { letterSpacing: "0.1em", fontWeight: 700 },
    button: { textTransform: "none", fontWeight: 600 },
  },
  shape: {
    borderRadius: 16,
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          backdropFilter: "blur(12px)",
          backgroundImage: "none",
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backdropFilter: "blur(12px)",
          backgroundImage: "none",
        },
      },
    },
  },
});

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
    <ThemeProvider theme={theme}>
      {/* 
        Optional: If you want to use the web font, include this snippet in your public/index.html or root component:
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap" rel="stylesheet" />
      */}
      <Box sx={{ minHeight: "100vh", bgcolor: "background.default", py: 6 }}>
        <Container maxWidth="lg">
          <Stack spacing={5}>
            {/* Results Summary Card */}
            <Paper
              elevation={0}
              sx={{
                p: { xs: 4, md: 5 },
                borderRadius: 4,
                background: isPass
                  ? "linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(5, 150, 105, 0.02) 100%)"
                  : "linear-gradient(135deg, rgba(244, 63, 94, 0.08) 0%, rgba(225, 29, 72, 0.02) 100%)",
                border: `1px solid ${isPass ? "rgba(16, 185, 129, 0.2)" : "rgba(244, 63, 94, 0.2)"
                  }`,
                position: "relative",
                overflow: "hidden",
                boxShadow: isPass
                  ? "0 20px 40px -10px rgba(16, 185, 129, 0.15)"
                  : "0 20px 40px -10px rgba(244, 63, 94, 0.15)",
              }}
            >
              <Stack spacing={4}>
                <Stack
                  direction={{ xs: "column", md: "row" }}
                  justifyContent="space-between"
                  alignItems={{ xs: "flex-start", md: "center" }}
                  spacing={3}
                >
                  <Box>
                    <Typography
                      variant="overline"
                      sx={{ color: isPass ? "success.light" : "error.light" }}
                    >
                      Quiz Completed
                    </Typography>
                    <Typography variant="h3" sx={{ mt: 0.5, mb: 1.5, color: "text.primary" }}>
                      {result.topic}
                    </Typography>
                    <Typography variant="body1" sx={{ color: "text.secondary", fontSize: "1.1rem" }}>
                      {result.summary}
                    </Typography>

                    {result.is_auto_submitted && (
                      <Alert
                        severity="warning"
                        variant="outlined"
                        sx={{
                          mt: 3,
                          borderRadius: 3,
                          borderColor: "warning.dark",
                          bgcolor: "rgba(245, 158, 11, 0.05)",
                          "& .MuiAlert-icon": { color: "warning.main" },
                        }}
                      >
                        Time limit reached. This quiz was submitted automatically.
                      </Alert>
                    )}
                  </Box>

                  <Chip
                    label={result.result.toUpperCase()}
                    icon={isPass ? <CheckCircle /> : <Close />}
                    sx={{
                      fontWeight: 800,
                      fontSize: "1.25rem",
                      py: 3.5,
                      px: 2.5,
                      borderRadius: 4,
                      color: isPass ? "success.main" : "error.main",
                      borderColor: isPass ? "rgba(16, 185, 129, 0.3)" : "rgba(244, 63, 94, 0.3)",
                      backgroundColor: isPass ? "rgba(16, 185, 129, 0.1)" : "rgba(244, 63, 94, 0.1)",
                      border: "1px solid",
                    }}
                  />
                </Stack>

                <Divider sx={{ borderColor: "rgba(255,255,255,0.05)" }} />

                <Grid container spacing={3}>
                  {/* Score card */}
                  <Grid item xs={12} sm={6} md={3}>
                    <Card
                      sx={{
                        p: 3,
                        background: "rgba(255, 255, 255, 0.02)",
                        border: "1px solid rgba(255, 255, 255, 0.05)",
                        transition: "transform 0.2s ease-in-out",
                        "&:hover": { transform: "translateY(-4px)" },
                      }}
                    >
                      <Typography variant="body2" sx={{ fontWeight: 600, mb: 1.5, color: "text.secondary" }}>
                        Final Score
                      </Typography>
                      <Typography
                        variant="h2"
                        sx={{
                          background: `linear-gradient(135deg, ${result.score_percentage >= 60 ? "#10b981, #34d399" : "#f59e0b, #fbbf24"
                            })`,
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
                      sx={{
                        p: 3,
                        background: "rgba(255, 255, 255, 0.02)",
                        border: "1px solid rgba(255, 255, 255, 0.05)",
                        transition: "transform 0.2s ease-in-out",
                        "&:hover": { transform: "translateY(-4px)" },
                      }}
                    >
                      <Typography variant="body2" sx={{ fontWeight: 600, mb: 1.5, color: "text.secondary" }}>
                        Time Taken
                      </Typography>
                      <Typography variant="h4" sx={{ color: "text.primary", mb: 0.5 }}>
                        {formatDuration(result.time_taken)}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 500 }}>
                        Limit: {formatDuration(result.time_limit_seconds)}
                      </Typography>
                    </Card>
                  </Grid>

                  {/* Correct answers card */}
                  <Grid item xs={12} sm={6} md={3}>
                    <Card
                      sx={{
                        p: 3,
                        background: "rgba(255, 255, 255, 0.02)",
                        border: "1px solid rgba(255, 255, 255, 0.05)",
                        transition: "transform 0.2s ease-in-out",
                        "&:hover": { transform: "translateY(-4px)" },
                      }}
                    >
                      <Typography variant="body2" sx={{ fontWeight: 600, mb: 1.5, color: "text.secondary" }}>
                        Correct Answers
                      </Typography>
                      <Typography variant="h3" sx={{ color: "text.primary" }}>
                        <Box component="span" sx={{ color: "success.light" }}>
                          {result.correct_answers}
                        </Box>
                        <Box component="span" sx={{ color: "text.secondary", fontSize: "1.5rem", ml: 0.5 }}>
                          / {result.total_questions}
                        </Box>
                      </Typography>
                    </Card>
                  </Grid>

                  {/* Difficulty card */}
                  <Grid item xs={12} sm={6} md={3}>
                    <Card
                      sx={{
                        p: 3,
                        background: "rgba(255, 255, 255, 0.02)",
                        border: "1px solid rgba(255, 255, 255, 0.05)",
                        transition: "transform 0.2s ease-in-out",
                        "&:hover": { transform: "translateY(-4px)" },
                      }}
                    >
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                        <TrendingUp sx={{ color: "primary.light", fontSize: 20 }} />
                        <Typography variant="body2" sx={{ fontWeight: 600, color: "text.secondary" }}>
                          Difficulty
                        </Typography>
                      </Stack>
                      <Typography
                        variant="h4"
                        sx={{
                          textTransform: "capitalize",
                          color: "primary.light",
                        }}
                      >
                        {result.difficulty}
                      </Typography>
                    </Card>
                  </Grid>
                </Grid>

                <Box sx={{ mt: 2 }}>
                  <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: "text.secondary" }}>
                      Passing Accuracy Target
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: "text.primary" }}>
                      {Math.round(passPercentage)}% Achieved
                    </Typography>
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={passPercentage}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: "rgba(255,255,255,0.05)",
                      "& .MuiLinearProgress-bar": {
                        background: `linear-gradient(90deg, ${result.score_percentage >= 60 ? "#10b981, #34d399" : "#f59e0b, #fbbf24"
                          })`,
                        borderRadius: 4,
                      },
                    }}
                  />
                </Box>

                <Box pt={2}>
                  <Button
                    variant="contained"
                    startIcon={<Replay />}
                    onClick={onStartAgain}
                    sx={{
                      borderRadius: 8,
                      px: 5,
                      py: 1.8,
                      fontSize: "1.05rem",
                      background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
                      boxShadow: "0 8px 25px -8px rgba(99, 102, 241, 0.6)",
                      "&:hover": {
                        background: "linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)",
                        boxShadow: "0 12px 30px -8px rgba(99, 102, 241, 0.8)",
                        transform: "translateY(-2px)",
                      },
                      transition: "all 0.2s ease",
                    }}
                  >
                    Start Another Quiz
                  </Button>
                </Box>
              </Stack>
            </Paper>

            {/* Detailed Feedback Section */}
            <Box>
              <Typography
                variant="h4"
                sx={{
                  mb: 4,
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  color: "text.primary",
                }}
              >
                <Info sx={{ color: "primary.main", fontSize: 32 }} />
                Question Analysis
              </Typography>

              <Stack spacing={3}>
                {result.feedback && result.feedback.length > 0 ? (
                  result.feedback.map((item, index) => (
                    <Paper
                      key={item.question_id}
                      elevation={0}
                      sx={{
                        p: { xs: 3, md: 4 },
                        borderRadius: 4,
                        border: `1px solid ${item.is_correct ? "rgba(16, 185, 129, 0.15)" : "rgba(244, 63, 94, 0.15)"
                          }`,
                        background: item.is_correct
                          ? "linear-gradient(135deg, rgba(16, 185, 129, 0.03) 0%, rgba(5, 150, 105, 0.01) 100%)"
                          : "linear-gradient(135deg, rgba(244, 63, 94, 0.03) 0%, rgba(225, 29, 72, 0.01) 100%)",
                        transition: "all 0.2s ease-in-out",
                        "&:hover": {
                          borderColor: item.is_correct ? "rgba(16, 185, 129, 0.3)" : "rgba(244, 63, 94, 0.3)",
                          backgroundColor: "rgba(255,255,255,0.02)",
                        },
                      }}
                    >
                      <Stack spacing={3}>
                        <Stack
                          direction={{ xs: "column", sm: "row" }}
                          justifyContent="space-between"
                          alignItems={{ xs: "flex-start", sm: "center" }}
                          spacing={2}
                        >
                          <Typography variant="h6" sx={{ color: "text.primary", lineHeight: 1.5 }}>
                            <Box component="span" sx={{ color: "text.secondary", mr: 1 }}>
                              {index + 1}.
                            </Box>
                            {item.question}
                          </Typography>
                          <Chip
                            icon={item.is_correct ? <CheckCircle /> : <Close />}
                            label={item.is_correct ? "Correct" : "Incorrect"}
                            sx={{
                              color: item.is_correct ? "success.light" : "error.light",
                              borderColor: item.is_correct ? "rgba(16, 185, 129, 0.3)" : "rgba(244, 63, 94, 0.3)",
                              backgroundColor: item.is_correct ? "rgba(16, 185, 129, 0.1)" : "rgba(244, 63, 94, 0.1)",
                              fontWeight: 700,
                              px: 1,
                              border: "1px solid",
                            }}
                          />
                        </Stack>

                        <Grid container spacing={3}>
                          <Grid item xs={12} sm={6}>
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 600, color: "text.secondary", mb: 1.5 }}>
                                Your Answer
                              </Typography>
                              <Paper
                                elevation={0}
                                sx={{
                                  p: 2.5,
                                  borderRadius: 3,
                                  background: item.is_correct ? "rgba(16, 185, 129, 0.05)" : "rgba(244, 63, 94, 0.05)",
                                  border: "1px solid",
                                  borderColor: item.is_correct ? "rgba(16, 185, 129, 0.2)" : "rgba(244, 63, 94, 0.2)",
                                }}
                              >
                                <Typography
                                  variant="body1"
                                  sx={{
                                    color: item.is_correct ? "success.light" : "error.light",
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
                              <Typography variant="body2" sx={{ fontWeight: 600, color: "text.secondary", mb: 1.5 }}>
                                Correct Answer
                              </Typography>
                              <Paper
                                elevation={0}
                                sx={{
                                  p: 2.5,
                                  borderRadius: 3,
                                  background: "rgba(16, 185, 129, 0.05)",
                                  border: "1px solid rgba(16, 185, 129, 0.2)",
                                }}
                              >
                                <Typography variant="body1" sx={{ color: "success.light", fontWeight: 700 }}>
                                  {item.correct_answer}
                                </Typography>
                              </Paper>
                            </Box>
                          </Grid>
                        </Grid>

                        <Alert
                          severity={item.is_correct ? "success" : "info"}
                          icon={item.is_correct ? <CheckCircle /> : <Info />}
                          sx={{
                            borderRadius: 3,
                            bgcolor: item.is_correct ? "rgba(16, 185, 129, 0.05)" : "rgba(99, 102, 241, 0.05)",
                            color: item.is_correct ? "success.light" : "primary.light",
                            border: `1px solid ${item.is_correct ? "rgba(16, 185, 129, 0.15)" : "rgba(99, 102, 241, 0.15)"
                              }`,
                            alignItems: "center",
                            "& .MuiAlert-message": {
                              fontWeight: 500,
                              fontSize: "0.95rem",
                              lineHeight: 1.6,
                            },
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
                      borderRadius: 3,
                      bgcolor: "rgba(99, 102, 241, 0.1)",
                      color: "primary.light",
                      border: "1px solid rgba(99, 102, 241, 0.2)",
                    }}
                  >
                    No detailed feedback is available for this quiz.
                  </Alert>
                )}
              </Stack>
            </Box>
          </Stack>
        </Container>
      </Box>
    </ThemeProvider>
  );
}