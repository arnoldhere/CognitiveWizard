import { useQuiz } from "../hooks/useQuiz";
import { useAuth } from "../hooks/useAuth";
import QuizForm from "../components/quiz/QuizForm";
import QuizCard from "../components/quiz/QuizCard";
import QuizResults from "../components/quiz/QuizResults";
import ErrorMessage from "../components/utils/ErrorMessage";
import Loader from "../components/utils/Loader";
import {
    Container,
    Typography,
    Box,
    Paper,
    Grid,
    Chip,
    Avatar,
    Fade,
    Grow
} from "@mui/material";
import {
    AutoAwesome,
    Psychology,
    Speed,
    EmojiEvents
} from "@mui/icons-material";

export default function QuizPage() {
    const { user } = useAuth();
    const {
        generating,
        submitting,
        quizSession,
        result,
        error,
        createQuiz,
        submitQuiz,
        resetQuiz,
    } = useQuiz();

    const features = [
        { icon: <Psychology />, text: "AI-Powered Questions", color: "#4f46e5" },
        { icon: <Speed />, text: "Instant Generation", color: "#f59e0b" },
        { icon: <EmojiEvents />, text: "Track Progress", color: "#10b981" },
    ];

    if (quizSession) {
        return (
            <QuizCard
                quiz={quizSession}
                onSubmit={submitQuiz}
                submitting={submitting}
            />
        );
    }

    return (
        <Box
            sx={{
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                py: 6,
            }}
        >
            <Container maxWidth="lg">
                <Grid container spacing={4} alignItems="stretch">
                    {/* Left Column - Hero Section */}
                    <Grid item xs={12} md={5}>
                        <Fade in timeout={800}>
                            <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                <Box
                                    sx={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 1,
                                        mb: 2,
                                        px: 2,
                                        py: 0.5,
                                        borderRadius: 20,
                                        background: 'rgba(255, 255, 255, 0.2)',
                                        backdropFilter: 'blur(10px)',
                                        width: 'fit-content',
                                    }}
                                >
                                    <AutoAwesome sx={{ fontSize: 18, color: '#fbbf24' }} />
                                    <Typography
                                        variant="caption"
                                        sx={{
                                            color: 'white',
                                            fontWeight: 600,
                                            letterSpacing: 1,
                                            textTransform: 'uppercase',
                                        }}
                                    >
                                        AI Quiz Builder
                                    </Typography>
                                </Box>

                                <Typography
                                    variant="h2"
                                    sx={{
                                        mb: 3,
                                        fontWeight: 800,
                                        color: 'white',
                                        fontSize: { xs: '2.5rem', md: '3.5rem' },
                                        lineHeight: 1.2,
                                        textShadow: '0 2px 20px rgba(0,0,0,0.2)',
                                    }}
                                >
                                    Generate Smart Practice Tests in{' '}
                                    <Box
                                        component="span"
                                        sx={{
                                            background: 'linear-gradient(45deg, #fbbf24 30%, #f59e0b 90%)',
                                            WebkitBackgroundClip: 'text',
                                            WebkitTextFillColor: 'transparent',
                                            display: 'inline-block',
                                        }}
                                    >
                                        Seconds
                                    </Box>
                                </Typography>

                                <Typography
                                    variant="body1"
                                    sx={{
                                        color: 'rgba(255, 255, 255, 0.9)',
                                        lineHeight: 1.8,
                                        mb: 4,
                                        fontSize: '1.1rem',
                                    }}
                                >
                                    Use AI to create subject-specific quizzes and prepare with confidence.
                                    Control difficulty, question count, and see results instantly.
                                </Typography>

                                {/* Feature Chips */}
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
                                    {features.map((feature, index) => (
                                        <Grow in timeout={1000 + index * 200} key={index}>
                                            <Chip
                                                icon={feature.icon}
                                                label={feature.text}
                                                sx={{
                                                    background: 'rgba(255, 255, 255, 0.95)',
                                                    backdropFilter: 'blur(10px)',
                                                    fontWeight: 600,
                                                    px: 1,
                                                    py: 2.5,
                                                    '& .MuiChip-icon': {
                                                        color: feature.color,
                                                        fontSize: 20,
                                                    },
                                                    boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                                                    transition: 'transform 0.2s',
                                                    '&:hover': {
                                                        transform: 'translateY(-2px)',
                                                        boxShadow: '0 6px 20px rgba(0,0,0,0.15)',
                                                    },
                                                }}
                                            />
                                        </Grow>
                                    ))}
                                </Box>
                            </Box>
                        </Fade>
                    </Grid>

                    {/* Right Column - Form Section */}
                    <Grid item xs={12} md={7}>
                        <Fade in timeout={1000}>
                            <Paper
                                elevation={0}
                                sx={{
                                    p: 4,
                                    borderRadius: 4,
                                    background: 'white',
                                    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                                    position: 'relative',
                                    overflow: 'hidden',
                                    '&::before': {
                                        content: '""',
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        height: 4,
                                        background: 'linear-gradient(90deg, #4f46e5 0%, #f59e0b 100%)',
                                    },
                                }}
                            >
                                {/* User Info */}
                                <Box
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 2,
                                        mb: 3,
                                        pb: 3,
                                        borderBottom: '1px solid',
                                        borderColor: 'divider',
                                    }}
                                >
                                    <Avatar
                                        sx={{
                                            width: 48,
                                            height: 48,
                                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                            fontWeight: 700,
                                        }}
                                    >
                                        {(user.full_name || user.email).charAt(0).toUpperCase()}
                                    </Avatar>
                                    <Box>
                                        <Typography variant="subtitle2" sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
                                            Signed in as
                                        </Typography>
                                        <Typography variant="body1" sx={{ fontWeight: 600, color: 'text.primary' }}>
                                            {user.full_name || user.email}
                                        </Typography>
                                    </Box>
                                </Box>

                                {/* Form Content */}
                                {generating && (
                                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                                        <Loader
                                            title="Generating your quiz"
                                            subtitle="We are assembling a secure question set and preparing your exam session."
                                        />
                                    </Box>
                                )}

                                {!generating && !result && (
                                    <Fade in timeout={600}>
                                        <Box>
                                            <Typography
                                                variant="h6"
                                                sx={{
                                                    mb: 3,
                                                    fontWeight: 700,
                                                    color: 'text.primary',
                                                }}
                                            >
                                                Create Your Quiz
                                            </Typography>
                                            <QuizForm onSubmit={createQuiz} disabled={generating} />
                                        </Box>
                                    </Fade>
                                )}

                                {error && (
                                    <Fade in>
                                        <Box sx={{ mt: 2 }}>
                                            <ErrorMessage message={error} />
                                        </Box>
                                    </Fade>
                                )}
                            </Paper>
                        </Fade>
                    </Grid>
                </Grid>

                {result && (
                    <Fade in timeout={800}>
                        <Box sx={{ mt: 6 }}>
                            <QuizResults result={result} onStartAgain={resetQuiz} />
                        </Box>
                    </Fade>
                )}
            </Container>
        </Box>
    );
}
