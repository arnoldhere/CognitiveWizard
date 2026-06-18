import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

export default function Navbar() {
    const [open, setOpen] = useState(false);
    const [showProfile, setShowProfile] = useState(false);
    const { user, isAuthenticated, logout } = useAuth();

    const closeMenu = () => setOpen(false);
    const userLabel = user?.full_name || user?.email || "Profile";

    return (
        <header className="navbar">
            <div className="navbar-inner container">
                <Link to="/" className="brand" onClick={closeMenu}>
                    <img src="/logo.png" alt="Logo" className="brand-logo" />
                    <span className="brand-text">CognitiveWizard</span>
                </Link>
                <button
                    className="mobile-toggle"
                    type="button"
                    aria-label={open ? "Close navigation" : "Open navigation"}
                    aria-expanded={open}
                    onClick={() => setOpen((value) => !value)}
                >
                    <span className="hamburger" aria-hidden="true">
                        <span />
                        <span />
                        <span />
                    </span>
                </button>

                <nav className={`nav-links ${open ? "nav-open" : ""}`}>
                    <NavLink to="/" end onClick={closeMenu} className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
                        Home
                    </NavLink>
                    <NavLink to="/quiz" onClick={closeMenu} className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
                        Quiz
                    </NavLink>
                    <NavLink to="/quick-study" onClick={closeMenu} className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
                        Quick Study
                    </NavLink>
                    <NavLink to="/chatbot" onClick={closeMenu} className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
                        Quick Chat
                    </NavLink>
                    <NavLink to="/about" onClick={closeMenu} className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
                        About
                    </NavLink>
                    <NavLink to="/contact" onClick={closeMenu} className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
                        Contact
                    </NavLink>
                    <div className="nav-actions">
                        {isAuthenticated ? (
                            <div className="profile-menu">
                                <button className="profile-label" type="button" onClick={() => setShowProfile((value) => !value)}>
                                    <span className="profile-name">{userLabel}</span>
                                </button>
                                {showProfile && (
                                    <div className="profile-dropdown">
                                        <Link to="/profile" onClick={closeMenu}>Profile</Link>
                                        <Link to="/face-register" onClick={closeMenu}>Face Login Setup</Link>
                                        <Link to="/login" onClick={() => { closeMenu(); logout(); }}>
                                            Logout
                                        </Link>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <>
                                <Link className="btn-link" to="/login" onClick={closeMenu}>
                                    Login
                                </Link>
                                <Link className="btn-primary" to="/signup" onClick={closeMenu}>
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
