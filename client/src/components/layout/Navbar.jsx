import { useState, useEffect } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

const navItems = [
  { to: "/", label: "Home", end: true },
  { to: "/wizard", label: "AI Wizard" },
  { to: "/quiz", label: "Quiz" },
  { to: "/quick-study", label: "Quick Study" },
  { to: "/chatbot", label: "AI Chat" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation();

  const closeMenu = () => { setOpen(false); setShowProfile(false); };
  const userLabel = user?.full_name || user?.email || "Profile";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => { closeMenu(); }, [location.pathname]);

  return (
    <header className={`navbar${scrolled ? " navbar--scrolled" : ""}`}>
      <div className="navbar-inner container">
        <Link to="/" className="brand" onClick={closeMenu} aria-label="CognitiveWizard home">
          <img src="/logo.png" alt="CognitiveWizard logo" className="brand-logo" />
          <span className="brand-text">CognitiveWizard</span>
        </Link>

        <button
          className="mobile-toggle"
          type="button"
          aria-label={open ? "Close navigation" : "Open navigation"}
          aria-expanded={open}
          onClick={() => setOpen(v => !v)}
        >
          <span className="hamburger" aria-hidden="true">
            <span style={open ? { transform: "rotate(45deg) translate(4px,4px)" } : {}} />
            <span style={open ? { opacity: 0 } : {}} />
            <span style={open ? { transform: "rotate(-45deg) translate(4px,-4px)" } : {}} />
          </span>
        </button>

        <nav className={`nav-links${open ? " nav-open" : ""}`} aria-label="Main navigation">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={closeMenu}
              className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
            >
              {item.label}
            </NavLink>
          ))}

          <div className="nav-actions">
            {isAuthenticated ? (
              <div className="profile-menu">
                <button
                  id="profile-menu-btn"
                  className="profile-label"
                  type="button"
                  aria-haspopup="true"
                  aria-expanded={showProfile}
                  onClick={() => setShowProfile(v => !v)}
                >
                  <span className="profile-avatar" aria-hidden="true">
                    {(userLabel[0] || "U").toUpperCase()}
                  </span>
                  <span className="profile-name">{userLabel}</span>
                </button>
                {showProfile && (
                  <div className="profile-dropdown" role="menu">
                    <Link to="/profile" role="menuitem" onClick={closeMenu}>My Profile</Link>
                    <button
                      role="menuitem"
                      onClick={() => { closeMenu(); logout(); }}
                      style={{ color: "var(--danger)" }}
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link className="btn-link" to="/login" onClick={closeMenu}>Log in</Link>
                <Link className="btn-primary" to="/signup" onClick={closeMenu}>Get Started</Link>
              </>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
