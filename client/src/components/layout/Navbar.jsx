import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

export default function Navbar() {
    const [open, setOpen] = useState(false);
    const [showProfile, setShowProfile] = useState(false);
    const { user, isAuthenticated, logout } = useAuth();

    return (
        <header className="navbar">
            <div className="navbar-inner container">
                <Link to="/" className="brand">
                    <img src="/logo.png" alt="Logo" className="brand-logo" />
                    <span className="brand-text">CognitiveWizardAI</span>
                </Link>
                <button className="mobile-toggle" onClick={() => setOpen((value) => !value)}>
                    {open ? "Close" : "Menu"}
                </button>

                <nav className={`nav-links ${open ? "nav-open" : ""}`}>
                    <NavLink to="/" end className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
                        Home
                    </NavLink>
                    <NavLink to="/about" className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
                        About Us
                    </NavLink>
                    <NavLink to="/contact" className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
                        Contact Us
                    </NavLink>
                    <NavLink to="/quiz" className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
                        Quiz
                    </NavLink>
                    <NavLink to="/quick-study" className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
                        Quick Study
                    </NavLink>
                    <NavLink to="/chatbot" className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
                        Quick Chat
                    </NavLink>
                    <div className="nav-actions">
                        {isAuthenticated ? (
                            <div className="profile-menu">
                                <button className="profile-label" onClick={() => setShowProfile((value) => !value)}>
                                    {user.full_name || user.email}
                                </button>
                                {showProfile && (
                                    <div className="profile-dropdown">
                                        <Link to="/profile">Profile</Link>
                                        {user.role === 'admin' && <Link to="/admin">Admin Dashboard</Link>}
                                        <Link to="/login" onClick={logout}>
                                            Logout
                                        </Link>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <>
                                <Link className="btn-link" to="/login">
                                    Login
                                </Link>
                                <Link className="btn-primary" to="/signup">
                                    Sign Up
                                </Link>
                            </>
                        )}
                    </div>
                </nav>
            </div>
        </header>
    );
}
