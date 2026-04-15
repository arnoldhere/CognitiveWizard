import { Link } from "react-router-dom";

export default function NotFound() {
    return (
        <section className="page-section container notfound-page">
            <div className="card card-surface notfound-card">
                <p className="eyebrow">404</p>
                <h1>Page not found</h1>
                <p className="section-copy">The page you requested does not exist.</p>
                <Link to="/" className="btn-primary">
                    Return home
                </Link>
            </div>
        </section>
    );
}
