import React, { useRef, useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { faceLogin } from "../services/api";
import {
    Container,
    Paper,
    Typography,
    Box,
    Button,
    Alert,
    CircularProgress,
} from "@mui/material";
import { CameraAlt, FaceRetouchingNatural, ArrowBack } from "@mui/icons-material";

export default function FaceLogin() {
    const navigate = useNavigate();
    const location = useLocation();
    const { loginWithToken, isAuthenticated } = useAuth();
    const [status, setStatus] = useState("Initializing camera...");
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const [cameraReady, setCameraReady] = useState(false);
    const [flashOverlay, setFlashOverlay] = useState(null);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);

    const challengeColors = [
        "rgba(255,0,0,0.25)",
        "rgba(0,255,0,0.25)",
        "rgba(0,0,255,0.25)",
    ];

    const from = location.state?.from?.pathname || "/quiz";

    useEffect(() => {
        if (isAuthenticated) {
            navigate(from, { replace: true });
            return;
        }

        let activeStream;

        const initCamera = async () => {
            try {
                const mediaStream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: "user",
                        width: { min: 640 },
                        height: { min: 480 },
                    },
                });
                activeStream = mediaStream;
                if (videoRef.current) {
                    videoRef.current.srcObject = mediaStream;
                }
                setCameraReady(true);
                setStatus("Camera ready. Align your face and press Capture.");
            } catch (err) {
                console.error("Camera initialization failed", err);
                setError("Unable to access camera. Please allow camera permissions or try a different browser.");
                setStatus("Camera unavailable.");
            }
        };

        initCamera();

        return () => {
            if (activeStream) {
                activeStream.getTracks().forEach((track) => track.stop());
            }
        };
    }, [from, isAuthenticated, navigate]);

    const triggerFlash = async () => {
        const color = challengeColors[Math.floor(Math.random() * challengeColors.length)];
        setFlashOverlay(color);
        await new Promise((resolve) => setTimeout(resolve, 120));
        setFlashOverlay(null);
    };

    const captureAndLogin = async () => {
        if (!videoRef.current || !canvasRef.current) {
            setError("Unable to access video capture elements.");
            return;
        }

        setLoading(true);
        setError(null);
        setStatus("Applying capture challenge...");
        await triggerFlash();
        setStatus("Capturing frame...");

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext("2d");
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        const blob = await new Promise((resolve) => {
            canvas.toBlob((b) => resolve(b), "image/jpeg", 0.9);
        });

        if (!blob) {
            setError("Failed to capture image. Please try again.");
            setStatus("Capture error.");
            setLoading(false);
            return;
        }

        try {
            setStatus("Sending face data to server...");
            const response = await faceLogin(blob);

            if (response?.status !== "success") {
                setError(response?.message || "Face login failed. Please try again.");
                setStatus("Face login failed.");
                setLoading(false);
                return;
            }

            if (!response.access_token || !response.user) {
                throw new Error("Unexpected server response");
            }

            loginWithToken(response);
            setStatus("Face recognized successfully. Redirecting...");
            navigate(from, { replace: true });
        } catch (err) {
            console.error("Face login error:", err);
            setError(err.response?.data?.detail || err.message || "Unable to log in with face.");
            setStatus("Try again or use email login.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container maxWidth="sm" sx={{ py: 8 }}>
            <Button
                component={Link}
                to="/login"
                startIcon={<ArrowBack />}
                sx={{ 
                    mb: 3, 
                    textTransform: "none",
                    color: "#94a3b8",
                    "&:hover": {
                        color: "#f1f5f9",
                        backgroundColor: "rgba(255,255,255,0.03)"
                    }
                }}
            >
                Back to password login
            </Button>

            <Paper
                elevation={0}
                sx={{
                    p: 4,
                    borderRadius: 4,
                    background: "rgba(22, 27, 39, 0.95)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    backdropFilter: "blur(20px)",
                    boxShadow: "0 10px 30px rgba(0, 0, 0, 0.3)",
                }}
            >
                <Box sx={{ display: "flex", alignItems: "center", gap: 2.5, mb: 3.5 }}>
                    <FaceRetouchingNatural sx={{ fontSize: 48, color: "#a78bfa" }} />
                    <Box>
                        <Typography variant="h4" fontWeight={800} sx={{ color: "#f1f5f9" }} gutterBottom>
                            Face Login
                        </Typography>
                        <Typography variant="body2" sx={{ color: "#94a3b8" }}>
                            Use your camera to log in quickly and securely. Make sure your face fills the frame.
                        </Typography>
                    </Box>
                </Box>

                {status && (
                    <Alert 
                        severity={error ? "error" : "info"} 
                        sx={{ 
                            mb: 3,
                            bgcolor: error ? "rgba(239, 68, 68, 0.08)" : "rgba(59, 130, 246, 0.08)",
                            color: error ? "#fca5a5" : "#93c5fd",
                            border: error ? "1px solid rgba(239, 68, 68, 0.2)" : "1px solid rgba(59, 130, 246, 0.2)",
                            "& .MuiAlert-icon": {
                                color: error ? "#f87171" : "#60a5fa"
                            }
                        }}
                    >
                        {status}
                    </Alert>
                )}

                <Box
                    sx={{
                        position: "relative",
                        borderRadius: 3,
                        background: "#000",
                        overflow: "hidden",
                        minHeight: 320,
                        maxHeight: 400,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        mb: 4,
                        border: "1.5px solid rgba(124, 58, 237, 0.25)",
                        boxShadow: "0 0 20px rgba(124, 58, 237, 0.1)",
                    }}
                >
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                    {flashOverlay && (
                        <Box
                            sx={{
                                position: "absolute",
                                inset: 0,
                                backgroundColor: flashOverlay,
                                pointerEvents: "none",
                            }}
                        />
                    )}
                    {!cameraReady && !error && (
                        <Box
                            sx={{
                                position: "absolute",
                                inset: 0,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                background: "rgba(12, 14, 20, 0.8)",
                            }}
                        >
                            <CircularProgress color="secondary" />
                        </Box>
                    )}
                </Box>

                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <Button
                        variant="contained"
                        startIcon={<CameraAlt />}
                        onClick={captureAndLogin}
                        disabled={!cameraReady || loading}
                        fullWidth
                        sx={{ 
                            py: 1.8, 
                            fontWeight: 700, 
                            textTransform: "none",
                            color: "#ffffff",
                            background: "linear-gradient(90deg, #7c3aed, #06b6d4)",
                            boxShadow: "0 6px 20px rgba(124, 58, 237, 0.35)",
                            "&:hover": {
                                background: "linear-gradient(90deg, #6d28d9, #0891b2)",
                            }
                        }}
                    >
                        {loading ? "Recognizing..." : "Capture & Login"}
                    </Button>
                    <Button
                        component={Link}
                        to="/login"
                        variant="outlined"
                        fullWidth
                        sx={{ 
                            py: 1.8, 
                            textTransform: "none",
                            fontWeight: 700,
                            color: "#cbd5e1",
                            borderColor: "rgba(255, 255, 255, 0.12)",
                            background: "rgba(255, 255, 255, 0.02)",
                            "&:hover": {
                                background: "rgba(255, 255, 255, 0.06)",
                                borderColor: "rgba(255, 255, 255, 0.2)",
                            }
                        }}
                    >
                        Use email and password
                    </Button>
                </Box>

                <canvas ref={canvasRef} style={{ display: "none" }} />
            </Paper>
        </Container>
    );
}
