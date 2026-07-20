import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  FormControl,
  FormControlLabel,
  LinearProgress,
  Paper,
  Radio,
  RadioGroup,
  Stack,
  Typography,
} from "@mui/material";
import { ArrowBack, ArrowForward, CheckCircle, Fullscreen } from "@mui/icons-material";

function preventClipboardAction(event) {
  event.preventDefault();
}

export default function QuizCard({ quiz, onSubmit, submitting }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [isFullscreen, setIsFullscreen] = useState(Boolean(document.fullscreenElement));
  const [fullscreenNotice, setFullscreenNotice] = useState("");
  const [timeLeft, setTimeLeft] = useState(quiz?.time_limit_seconds || 0);
  const examRef = useRef(null);
  const autoSubmitTriggered = useRef(false);

  const currentQuestion = quiz?.questions?.[currentIndex];
  const totalQuestions = quiz?.questions?.length || 0;
  const answeredCount = useMemo(
    () => Object.values(answers).filter(Boolean).length,
    [answers]
  );
  const progress = totalQuestions ? ((currentIndex + 1) / totalQuestions) * 100 : 0;
  const isLastTwoMinutes = timeLeft > 0 && timeLeft <= 120;

  const formatSeconds = (seconds) => {
    const safeSeconds = Math.max(0, seconds);
    const mins = Math.floor(safeSeconds / 60);
    const secs = safeSeconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const buildFormattedAnswers = useCallback(
    () =>
      quiz.questions.map((question) => ({
        question_id: question.question_id,
        selected_option: answers[question.question_id] || "",
      })),
    [answers, quiz.questions]
  );

  const enterFullscreen = async () => {
    const node = examRef.current;
    if (!node?.requestFullscreen || document.fullscreenElement === node) {
      return;
    }

    try {
      await node.requestFullscreen();
      setFullscreenNotice("");
    } catch {
      setFullscreenNotice("Fullscreen was blocked by the browser. Tap below to continue in fullscreen mode.");
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    const handleShortcutBlock = (event) => {
      const key = event.key.toLowerCase();
      if ((event.ctrlKey || event.metaKey) && ["c", "v", "x"].includes(key)) {
        event.preventDefault();
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    window.addEventListener("keydown", handleShortcutBlock);
    const fullscreenTimer = window.setTimeout(() => {
      void enterFullscreen();
    }, 0);

    return () => {
      window.clearTimeout(fullscreenTimer);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      window.removeEventListener("keydown", handleShortcutBlock);

      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => { });
      }
    };
  }, []);

  useEffect(() => {
    if (!quiz?.time_limit_seconds || submitting || autoSubmitTriggered.current) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setTimeLeft((previous) => {
        // Stop timer at 0, don't go negative
        if (previous <= 1) {
          window.clearInterval(timer);
          return 0;
        }
        return previous - 1;
      });
    }, 1000);

    return () => {
      if (timer) window.clearInterval(timer);
    };
  }, [quiz?.time_limit_seconds, submitting]);

  // Handle automatic submission when time expires
  useEffect(() => {
    // Only auto-submit when time hits exactly 0, not during pending or already submitted
    if (timeLeft !== 0 || autoSubmitTriggered.current || submitting) {
      return;
    }

    // Prevent duplicate submission attempts
    autoSubmitTriggered.current = true;

    const formattedAnswers = buildFormattedAnswers();
    void onSubmit({ answers: formattedAnswers, isAutoSubmitted: true }).catch((err) => {
      console.error("Auto submission failed:", err);
      // Reset flag on error to allow manual recovery
      autoSubmitTriggered.current = false;
    });
  }, [timeLeft, submitting, onSubmit, buildFormattedAnswers]);

  const handleSelect = (questionId, selectedOption) => {
    setAnswers((previous) => ({
      ...previous,
      [questionId]: selectedOption,
    }));
  };

  const handleNext = () => {
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex((value) => value + 1);
    }
  };

  const handleBack = () => {
    if (currentIndex > 0) {
      setCurrentIndex((value) => value - 1);
    }
  };

  const handleSubmit = async () => {
    const formattedAnswers = buildFormattedAnswers();

    try {
      await onSubmit({ answers: formattedAnswers, isAutoSubmitted: false });
    } catch (err) {
      console.error("Quiz submission failed:", err);
    }
  };

  if (!currentQuestion) {
    return null;
  }

  return (
    <Box
      ref={examRef}
      onCopy={preventClipboardAction}
      onCut={preventClipboardAction}
      onPaste={preventClipboardAction}
      onContextMenu={preventClipboardAction}
      sx={{
        minHeight: "100vh",
        px: { xs: 2, md: 4 },
        py: { xs: 3, md: 5 },
        background:
          "radial-gradient(circle at top, rgba(14,165,233,0.18), transparent 36%), linear-gradient(180deg, #0f172a 0%, #111827 100%)",
      }}
    >
      <Box sx={{ maxWidth: 920, mx: "auto" }}>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2.5, md: 4 },
            borderRadius: 5,
            background: "rgba(15, 23, 42, 0.86)",
            border: "1px solid rgba(148, 163, 184, 0.2)",
            backdropFilter: "blur(16px)",
            color: "white",
            userSelect: "none",
          }}
        >
          <Stack spacing={3}>
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={2}
              justifyContent="space-between"
              alignItems={{ xs: "flex-start", md: "center" }}
            >
              <Box>
                <Typography variant="overline" sx={{ letterSpacing: 2, color: "#38bdf8" }}>
                  Secure Quiz Mode
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
                  {quiz.topic}
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Chip label={quiz.difficulty} sx={{ bgcolor: "rgba(56,189,248,0.18)", color: "#bae6fd" }} />
                  <Chip
                    label={`${answeredCount}/${totalQuestions} answered`}
                    sx={{ bgcolor: "rgba(129,140,248,0.18)", color: "#c7d2fe" }}
                  />
                  <Chip
                    label={`Timer ${formatSeconds(timeLeft)}`}
                    sx={{
                      bgcolor: isLastTwoMinutes ? "rgba(239,68,68,0.24)" : "rgba(16,185,129,0.22)",
                      color: isLastTwoMinutes ? "#fecaca" : "#bbf7d0",
                      fontWeight: 700,
                    }}
                  />
                  <Chip
                    label={isFullscreen ? "Fullscreen active" : "Fullscreen recommended"}
                    sx={{ bgcolor: "rgba(34,197,94,0.16)", color: "#bbf7d0" }}
                  />
                </Stack>
              </Box>

              {!isFullscreen && (
                <Button
                  variant="outlined"
                  startIcon={<Fullscreen />}
                  onClick={enterFullscreen}
                  sx={{
                    color: "white",
                    borderColor: "rgba(148, 163, 184, 0.32)",
                    borderRadius: 999,
                  }}
                >
                  Enter Fullscreen
                </Button>
              )}
            </Stack>

            {fullscreenNotice && (
              <Alert
                severity="warning"
                sx={{
                  borderRadius: 3,
                  bgcolor: "rgba(251, 191, 36, 0.14)",
                  color: "#fde68a",
                  "& .MuiAlert-icon": { color: "#fbbf24" },
                }}
              >
                {fullscreenNotice}
              </Alert>
            )}

            {isLastTwoMinutes && (
              <Alert
                severity="warning"
                sx={{
                  borderRadius: 3,
                  bgcolor: "rgba(239,68,68,0.14)",
                  color: "#fecaca",
                  "& .MuiAlert-icon": { color: "#f87171" },
                }}
              >
                Quick reminder: only {formatSeconds(timeLeft)} left. Please complete and submit.
              </Alert>
            )}

            {timeLeft === 0 && (
              <Alert
                severity="info"
                sx={{
                  borderRadius: 3,
                  bgcolor: "rgba(56,189,248,0.12)",
                  color: "#bae6fd",
                  "& .MuiAlert-icon": { color: "#38bdf8" },
                }}
              >
                Time is up. Your quiz is being submitted automatically.
              </Alert>
            )}

            <Box>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                justifyContent="space-between"
                sx={{ mb: 1 }}
              >
                <Typography variant="body2" sx={{ color: "rgba(226,232,240,0.82)" }}>
                  Question {currentIndex + 1} of {totalQuestions}
                </Typography>
                <hr />
                <Typography variant="body2" sx={{ color: "rgba(226,232,240,0.82)", marginX: 5 }}>
                  Progress {Math.round(progress)}%
                </Typography>
              </Stack>
              <LinearProgress
                variant="determinate"
                value={progress}
                sx={{
                  height: 10,
                  borderRadius: 999,
                  bgcolor: "rgba(148,163,184,0.16)",
                  "& .MuiLinearProgress-bar": {
                    borderRadius: 999,
                    background: "linear-gradient(90deg, #38bdf8, #818cf8)",
                  },
                }}
              />
            </Box>

            <Card
              sx={{
                borderRadius: 4,
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(241,245,249,0.98) 100%)",
                boxShadow: "0 24px 60px rgba(15, 23, 42, 0.22)",
              }}
            >
              <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 700,
                    color: "#0f172a",
                    lineHeight: 1.5,
                    mb: 3,
                  }}
                >
                  {currentQuestion.question}
                </Typography>

                <FormControl fullWidth>
                  <RadioGroup
                    value={answers[currentQuestion.question_id] || ""}
                    onChange={(event) =>
                      handleSelect(currentQuestion.question_id, event.target.value)
                    }
                  >
                    <Stack spacing={1.5}>
                      {currentQuestion.options.map((option, index) => {
                        const isSelected = answers[currentQuestion.question_id] === option;
                        const optionLabel = String.fromCharCode(65 + index); // A, B, C, D

                        return (
                          <Paper
                            key={option}
                            elevation={0}
                            sx={{
                              px: 2.5,
                              py: 2,
                              borderRadius: 3,
                              border: "2px solid",
                              borderColor: isSelected ? "#4f46e5" : "#cbd5e1",
                              background: isSelected ? "rgba(79,70,229,0.12)" : "#fff",
                              transition: "all 0.25s cubic-bezier(0.4,0,0.2,1)",
                              cursor: "pointer",
                              "&:hover": {
                                borderColor: "#4f46e5",
                                background: isSelected ? "rgba(79,70,229,0.15)" : "rgba(79,70,229,0.08)",
                                transform: "translateY(-2px)",
                                boxShadow: "0 4px 12px rgba(79,70,229,0.15)",
                              },
                            }}
                          >
                            <FormControlLabel
                              value={option}
                              control={
                                <Radio
                                  sx={{
                                    color: isSelected ? "#4f46e5" : "#cbd5e1",
                                    "&.Mui-checked": {
                                      color: "#4f46e5",
                                    },
                                  }}
                                />
                              }
                              label={
                                <Stack direction="row" spacing={1.5} sx={{ alignItems: "flex-start", flex: 1 }}>
                                  <Box
                                    sx={{
                                      minWidth: 36,
                                      height: 36,
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      borderRadius: "50%",
                                      background: isSelected ? "#4f46e5" : "rgba(79,70,229,0.1)",
                                      color: isSelected ? "white" : "#4f46e5",
                                      fontWeight: 700,
                                      fontSize: "0.9rem",
                                    }}
                                  >
                                    {optionLabel}
                                  </Box>
                                  <Box sx={{ flex: 1 }}>
                                    <Typography
                                      sx={{
                                        fontWeight: isSelected ? 600 : 500,
                                        color: "#0f172a",
                                        lineHeight: 1.6,
                                        wordBreak: "break-word",
                                      }}
                                    >
                                      {option}
                                    </Typography>
                                  </Box>
                                </Stack>
                              }
                              sx={{
                                width: "100%",
                                alignItems: "flex-start",
                                m: 0,
                                "& .MuiFormControlLabel-label": {
                                  flex: 1,
                                },
                              }}
                            />
                          </Paper>
                        );
                      })}
                    </Stack>
                  </RadioGroup>
                </FormControl>
              </CardContent>
            </Card>

            <Stack
              direction={{ xs: "column-reverse", sm: "row" }}
              spacing={1.5}
              justifyContent="space-between"
            >
              <Button
                variant="outlined"
                startIcon={<ArrowBack />}
                onClick={handleBack}
                disabled={currentIndex === 0 || submitting}
                sx={{ borderRadius: 999, px: 3 }}
              >
                Previous
              </Button>

              {currentIndex < totalQuestions - 1 ? (
                <Button
                  variant="contained"
                  endIcon={<ArrowForward />}
                  onClick={handleNext}
                  disabled={!answers[currentQuestion.question_id] || submitting}
                  sx={{
                    borderRadius: 999,
                    px: 3.5,
                    py: 1.25,
                    background: "linear-gradient(90deg, #0ea5e9, #4f46e5)",
                  }}
                >
                  Next Question
                </Button>
              ) : (
                <Button
                  variant="contained"
                  endIcon={<CheckCircle />}
                  onClick={handleSubmit}
                  disabled={answeredCount !== totalQuestions || submitting}
                  sx={{
                    borderRadius: 999,
                    px: 3.5,
                    py: 1.25,
                    background: "linear-gradient(90deg, #10b981, #0ea5e9)",
                  }}
                >
                  {submitting ? "Submitting..." : "Submit Quiz"}
                </Button>
              )}
            </Stack>
          </Stack>
        </Paper>
      </Box>
    </Box>
  );
}
