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
    const [stream, setStream] = useState(null);

    const videoRef = useRef(null);
    const canvasRef = useRef(null);

    const from = location.state?.from?.pathname || "/quiz";

    useEffect(() => {
        if (isAuthenticated) {
            navigate(from, { replace: true });
            return;
        }

        let activeStream;

        const initCamera = async () => {
            try {
                const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
                activeStream = mediaStream;
                if (videoRef.current) {
                    videoRef.current.srcObject = mediaStream;
                }
                setStream(mediaStream);
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

    const captureAndLogin = async () => {
        if (!videoRef.current || !canvasRef.current) {
            setError("Unable to access video capture elements.");
            return;
        }

        setLoading(true);
        setError(null);
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
        <Container maxWidth="md" sx={{ py: 6 }}>
            <Button
                component={Link}
                to="/login"
                startIcon={<ArrowBack />}
                sx={{ mb: 3, textTransform: "none" }}
            >
                Back to password login
            </Button>

            <Paper
                elevation={4}
                sx={{
                    p: 4,
                    borderRadius: 3,
                    overflow: "hidden",
                    background: "linear-gradient(180deg, #f7f8ff 0%, #ffffff 100%)",
                }}
            >
                <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
                    <FaceRetouchingNatural color="primary" sx={{ fontSize: 48 }} />
                    <Box>
                        <Typography variant="h4" fontWeight={700} gutterBottom>
                            Face Login
                        </Typography>
                        <Typography variant="body1" color="text.secondary">
                            Use your camera to log in quickly and securely. Make sure your face fills the frame.
                        </Typography>
                    </Box>
                </Box>

                {status && (
                    <Alert severity={error ? "error" : "info"} sx={{ mb: 3 }}>
                        {status}
                    </Alert>
                )}

                {error && (
                    <Alert severity="error" sx={{ mb: 3 }}>
                        {error}
                    </Alert>
                )}

                <Box
                    sx={{
                        position: "relative",
                        borderRadius: 3,
                        background: "#000",
                        overflow: "hidden",
                        minHeight: 360,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        mb: 3,
                    }}
                >
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                    {!cameraReady && !error && (
                        <Box
                            sx={{
                                position: "absolute",
                                inset: 0,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                background: "rgba(0,0,0,0.35)",
                            }}
                        >
                            <CircularProgress color="inherit" />
                        </Box>
                    )}
                </Box>

                <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 2 }}>
                    <Button
                        variant="contained"
                        color="primary"
                        startIcon={<CameraAlt />}
                        onClick={captureAndLogin}
                        disabled={!cameraReady || loading}
                        fullWidth
                        sx={{ py: 1.8, fontWeight: 700, textTransform: "none" }}
                    >
                        {loading ? "Recognizing..." : "Capture & Login"}
                    </Button>
                    <Button
                        component={Link}
                        to="/login"
                        variant="outlined"
                        color="inherit"
                        fullWidth
                        sx={{ py: 1.8, textTransform: "none" }}
                    >
                        Use email and password
                    </Button>
                </Box>

                <canvas ref={canvasRef} style={{ display: "none" }} />
            </Paper>
        </Container>
    );
}
