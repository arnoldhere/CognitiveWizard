import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <section className="page-shell" style={{ minHeight: "60vh", display: "grid", alignItems: "center" }}>
      <div className="container">
        <div
          className="card-surface notfound-card"
          style={{ textAlign: "center", padding: "64px 40px", maxWidth: "560px", margin: "0 auto" }}
        >
          <p className="eyebrow" style={{ fontSize: "1.2rem", letterSpacing: "none" }}>404</p>
          <h1 className="page-title" style={{ margin: "12px 0 16px" }}>Page not found</h1>
          <p className="section-copy" style={{ margin: "0 auto 28px" }}>
            The page you requested doesn't exist. It may have been moved or deleted.
          </p>
          <div className="hero-actions" style={{ justifyContent: "center" }}>
            <Link to="/" className="btn-primary" id="notfound-home-btn">Return Home</Link>
            <Link to="/wizard" className="btn-secondary" id="notfound-wizard-btn">Try AI Wizard</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
