// FaceRegistration.jsx
import React, { useRef, useState, useEffect } from 'react';
import { sendFaceData } from '../services/api';
import axios from 'axios';
const FaceRegistration = () => {
    // Refs to access the video and canvas DOM elements directly
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const BASE_URL = import.meta.env.BACKEND_BASE_URL || "http://localhost:8000";

    const [status, setStatus] = useState('');
    const [stream, setStream] = useState(null);


    // Initialize the camera when the component mounts
    useEffect(() => {
        let mediaStream;

        const initCamera = async () => {
            try {
                mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });

                if (videoRef.current) {
                    videoRef.current.srcObject = mediaStream;
                }

                setStream(mediaStream); // safe now
            } catch (err) {
                console.error("Error accessing camera:", err);
                setStatus("Camera permission denied or device not found.");
            }
        };

        initCamera();

        return () => {
            if (mediaStream) {
                mediaStream.getTracks().forEach(track => track.stop());
            }
        };
    }, []);


    const captureAndRegister = async () => {
        if (!videoRef.current || !canvasRef.current) return;

        setStatus("Capturing image...");

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        // Ensure decent resolution
        if (video.videoWidth < 640) {
            setStatus("Camera resolution too low");
            return;
        }

        // Match canvas to video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Draw frame
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        try {
            setStatus("Processing image...");

            //  Convert canvas -> Blob using Promise
            const blob = await new Promise((resolve) => {
                canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.9);
            });

            if (!blob) {
                setStatus("Failed to capture image.");
                return;
            }

            setStatus("Preparing request...");

            const user = JSON.parse(localStorage.getItem("cw_user"));

            if (!user || !user.id) {
                setStatus("User not found. Please login again.");
                return;
            }

            // Prepare FormData
            const formData = new FormData();
            formData.append('image', blob, 'capture.jpg');
            formData.append('userid', user.id);

            setStatus("Sending to backend...");
            const response = await axios.post(
                `${BASE_URL}/auth/face/register`,
                formData,
                {
                    headers: {
                        "Content-Type": "multipart/form-data",
                    },
                }
            );
            const data = response.data;
            if (response.status === 200) {
                setStatus(`✅ Success: ${data.message || "Face registered"}`);
            } else {
                console.error("Server error:", data);
                setStatus(` Error: ${data.detail || data.error || "Registration failed"}`);
            }

        } catch (err) {
            console.error("Error sending to backend:", err);
            setStatus("Failed to connect to the server.");
        }
    };

    return (
        <div style={{ textAlign: 'center', padding: '20px' }}>
            <h2>CognitiveWizard - Face Registration</h2>

            {/* Live Video Feed */}
            <div style={{ margin: '20px auto', width: '640px', height: '480px', backgroundColor: '#000' }}>
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    style={{ width: '100%', height: '100%' }}
                />
            </div>

            {/* Hidden Canvas used for grabbing the image frame */}
            <canvas ref={canvasRef} style={{ display: 'none' }} />

            <button
                onClick={captureAndRegister}
                style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer' }}
            >
                Capture & Register Face
            </button>

            {/* Status Message Display */}
            {status && <p style={{ marginTop: '20px', fontWeight: 'bold' }}>{status}</p>}
        </div>
    );
};

export default FaceRegistration;