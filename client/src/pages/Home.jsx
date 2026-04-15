import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import {
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Box,
  Chip,
} from "@mui/material";
import {
  AutoAwesome,
  Security,
  Quiz,
  Psychology,
} from "@mui/icons-material";
import { motion } from "framer-motion";

const MotionDiv = motion.div;

export default function Home() {
  const { isAuthenticated, user } = useAuth();

  return (
    <Box sx={{ py: { xs: 4, md: 10 }, position: "relative", overflow: "hidden" }}>

      {/* 🧙 Animated Wizard (Top Right) */}
      <MotionDiv
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 1 }}
        style={{
          position: "absolute",
          top: 20,
          right: 20,
          color: "#7c3aed",
        }}
      >
        <MotionDiv
          animate={{ rotate: [0, 12, -12, 0] }}
          transition={{ repeat: Infinity, duration: 3 }}
        >
          <AutoAwesome style={{ fontSize: 60 }} />
        </MotionDiv>
      </MotionDiv>

      <Container maxWidth="lg">
        <Grid container spacing={5} alignItems="center">

          {/* 🟣 LEFT CONTENT */}
          <Grid item xs={12} md={7}>

            <Chip
              label="CognitiveWizard ⚡ AI Learning"
              sx={{
                mb: 2,
                background: "linear-gradient(45deg, #6366f1, #a855f7)",
                color: "white",
                fontWeight: 600,
              }}
            />

            <Typography
              variant="h1"
              sx={{
                mb: 3,
                fontWeight: 800,
                fontSize: { xs: "2.5rem", md: "3.5rem" },
                background:
                  "linear-gradient(45deg, #4f46e5 20%, #9333ea 60%, #f59e0b 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Learn Smarter.
              <br />
              Practice Faster.
              <br />
              Master Anything.
            </Typography>

            <Typography
              variant="body1"
              sx={{
                mb: 4,
                fontSize: "1.2rem",
                color: "text.secondary",
                lineHeight: 1.8,
              }}
            >
              CognitiveWizard uses AI to generate personalized quizzes,
              analyze your performance, and help you retain concepts faster.
              No more passive studying — only active learning.
            </Typography>

            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
              {isAuthenticated ? (
                <Button
                  component={Link}
                  to="/quiz"
                  variant="contained"
                  size="large"
                  startIcon={<AutoAwesome />}
                  sx={{
                    px: 4,
                    py: 1.5,
                    fontSize: "1.1rem",
                    fontWeight: 600,
                    borderRadius: "12px",
                  }}
                >
                  Generate Quiz 🚀
                </Button>
              ) : (
                <>
                  <Button
                    component={Link}
                    to="/signup"
                    variant="contained"
                    size="large"
                    sx={{
                      px: 4,
                      py: 1.5,
                      fontSize: "1.1rem",
                      fontWeight: 600,
                      borderRadius: "12px",
                    }}
                  >
                    Get Started Free
                  </Button>

                  <Button
                    component={Link}
                    to="/login"
                    variant="outlined"
                    size="large"
                    sx={{
                      px: 4,
                      py: 1.5,
                      fontSize: "1.1rem",
                      fontWeight: 600,
                      borderRadius: "12px",
                    }}
                  >
                    Login
                  </Button>
                </>
              )}
            </Box>
          </Grid>

          {/* 🔵 RIGHT CARD */}
          <Grid item xs={12} md={5}>
            <motion.div
              whileHover={{ scale: 1.03 }}
              transition={{ duration: 0.3 }}
            >
              <Card
                sx={{
                  p: 3,
                  borderRadius: 4,
                  background:
                    "linear-gradient(135deg, #ffffff 0%, #f3f4f6 100%)",
                  boxShadow: "0 25px 50px rgba(79, 70, 229, 0.15)",
                }}
              >
                <CardContent>
                  <Typography
                    variant="body2"
                    sx={{
                      mb: 2,
                      color: "primary.main",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: 1,
                    }}
                  >
                    {isAuthenticated
                      ? `Welcome ${user.full_name || user.email}`
                      : "Your AI Study Assistant"}
                  </Typography>

                  <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>
                    Turn Learning into Action ⚡
                  </Typography>

                  <Typography
                    variant="body1"
                    sx={{ mb: 3, color: "text.secondary" }}
                  >
                    Generate quizzes, test yourself, and improve retention using
                    AI-driven feedback loops.
                  </Typography>

                  <Grid container spacing={2}>

                    <Grid item xs={12}>
                      <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                        <Psychology sx={{ mr: 1, color: "#7c3aed" }} />
                        <Typography fontWeight={600}>
                          AI-powered intelligence
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        Smart question generation using LLMs.
                      </Typography>
                    </Grid>

                    <Grid item xs={12}>
                      <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                        <Security sx={{ mr: 1, color: "#4f46e5" }} />
                        <Typography fontWeight={600}>
                          Secure & scalable
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        JWT-based authentication with robust backend.
                      </Typography>
                    </Grid>

                    <Grid item xs={12}>
                      <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                        <Quiz sx={{ mr: 1, color: "#f59e0b" }} />
                        <Typography fontWeight={600}>
                          Dynamic quiz engine
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        Personalized quizzes with adjustable difficulty.
                      </Typography>
                    </Grid>

                  </Grid>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
