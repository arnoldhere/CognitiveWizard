import React, { useState } from 'react';
import { forgotPassword, resetPassword } from '../services/auth';
import '../styles/ForgotPassword.css';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [step, setStep] = useState(1); // 1: email, 2: otp
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const handleSendOTP = async (e) => {
        e.preventDefault();
        try {
            await forgotPassword(email);
            setMessage('OTP sent to your email');
            setStep(2);
            setError('');
        } catch (err) {
            setError('Failed to send OTP');
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        try {
            await resetPassword(email, otp, newPassword);
            setMessage('Password reset successfully');
            setStep(1);
            setEmail('');
            setOtp('');
            setNewPassword('');
        } catch (err) {
            setError('Invalid OTP or failed to reset password');
        }
    };

    return (
        <div className="forgot-password">
            <h2>Forgot Password</h2>
            {message && <p className="success">{message}</p>}
            {error && <p className="error">{error}</p>}

            {step === 1 ? (
                <form onSubmit={handleSendOTP}>
                    <input
                        type="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                    <button type="submit">Send OTP</button>
                </form>
            ) : (
                <form onSubmit={handleResetPassword}>
                    <input
                        type="text"
                        placeholder="Enter OTP"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        required
                    />
                    <input
                        type="password"
                        placeholder="New Password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                    />
                    <button type="submit">Reset Password</button>
                    <button type="button" onClick={() => setStep(1)}>Back</button>
                </form>
            )}
        </div>
    );
};

export default ForgotPassword;