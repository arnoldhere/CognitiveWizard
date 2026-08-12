import React, { useState } from 'react';
import { forgotPassword, resetPassword } from '../services/auth';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [step, setStep] = useState(1);

    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const clearMessages = () => {
        setMessage('');
        setError('');
    };

    const handleSendOTP = async (e) => {
        e.preventDefault();

        clearMessages();

        // Validate email
        if (!email.trim()) {
            setError('Please enter your email address.');
            return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setError('Please enter a valid email address.');
            return;
        }

        setLoading(true);

        try {
            await forgotPassword(email);

            setMessage('OTP has been sent to your email. Please check your inbox and spam folder.');
            setStep(2);
        } catch (err) {
            console.error(err);
            const errorDetail = err.response?.data?.detail || 'Failed to send OTP. Please try again.';
            setError(errorDetail);
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();

        clearMessages();

        // Validate OTP
        if (!otp.trim()) {
            setError('Please enter the OTP sent to your email.');
            return;
        }

        if (otp.length !== 6 || isNaN(otp)) {
            setError('OTP must be a 6-digit number.');
            return;
        }

        // Validate new password
        if (!newPassword.trim()) {
            setError('Please enter a new password.');
            return;
        }

        if (newPassword.length < 8) {
            setError('Password must be at least 8 characters long.');
            return;
        }

        setLoading(true);

        try {
            await resetPassword(email, otp, newPassword);

            setMessage('Password reset successfully. Redirecting to login...');

            // Clear form
            setTimeout(() => {
                setStep(1);
                setEmail('');
                setOtp('');
                setNewPassword('');
                setShowPassword(false);
                setMessage('');
            }, 2000);
        } catch (err) {
            console.error(err);
            const errorDetail = err.response?.data?.detail || 'Unable to reset password. Please try again.';
            setError(errorDetail);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="forgot-wrapper">
            <div className="forgot-card">

                <div className="forgot-header">
                    <h2>Forgot Password</h2>
                    <p>
                        {step === 1
                            ? 'Enter your registered email to receive OTP'
                            : 'Verify OTP and create a new password'}
                    </p>
                </div>

                <div className="step-indicator">
                    <div className={`step ${step >= 1 ? 'active' : ''}`}>
                        1
                    </div>

                    <div className="line"></div>

                    <div className={`step ${step >= 2 ? 'active' : ''}`}>
                        2
                    </div>
                </div>

                {message && (
                    <div className="alert success">
                        {message}
                    </div>
                )}

                {error && (
                    <div className="alert error">
                        {error}
                    </div>
                )}

                {step === 1 ? (
                    <form onSubmit={handleSendOTP} className="forgot-form">

                        <div className="input-group">
                            <label>Email Address</label>

                            <input
                                type="email"
                                placeholder="Enter your registered email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                disabled={loading}
                                autoFocus
                            />
                            <small>We'll send you a one-time password to reset your password</small>
                        </div>

                        <button
                            type="submit"
                            className="primary-btn"
                            disabled={loading || !email.trim()}
                        >
                            {loading ? 'Sending OTP...' : 'Send OTP'}
                        </button>

                    </form>
                ) : (
                    <form
                        onSubmit={handleResetPassword}
                        className="forgot-form"
                    >

                        <div className="input-group">
                            <label>OTP Code</label>

                            <input
                                type="text"
                                placeholder="Enter 6-digit OTP"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                maxLength="6"
                                required
                                disabled={loading}
                            />
                            <small>Enter the 6-digit code sent to your email</small>
                        </div>

                        <div className="input-group">
                            <label>New Password</label>

                            <div className="password-field">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="Enter new password (min 8 characters)"
                                    value={newPassword}
                                    onChange={(e) =>
                                        setNewPassword(e.target.value)
                                    }
                                    required
                                    disabled={loading}
                                />

                                <span
                                    className="toggle-password"
                                    onClick={() =>
                                        setShowPassword(!showPassword)
                                    }
                                >
                                    {showPassword ? 'Hide' : 'Show'}
                                </span>
                            </div>
                            <small>Password must be at least 8 characters long</small>
                        </div>

                        <div className="button-group">
                            <button
                                type="button"
                                className="secondary-btn"
                                onClick={() => {
                                    setStep(1);
                                    setOtp('');
                                    setNewPassword('');
                                    setShowPassword(false);
                                    clearMessages();
                                }}
                                disabled={loading}
                            >
                                Back
                            </button>

                            <button
                                type="submit"
                                className="primary-btn"
                                disabled={loading || !otp.trim() || !newPassword.trim()}
                            >
                                {loading
                                    ? 'Resetting...'
                                    : 'Reset Password'}
                            </button>
                        </div>

                    </form>
                )}
            </div>
        </div>
    );
};

export default ForgotPassword;