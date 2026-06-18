import EmailIcon from "@mui/icons-material/Email";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import TwitterIcon from "@mui/icons-material/Twitter";

const contactItems = [
  { icon: <EmailIcon />, label: "Email", value: "support@cognitivewizard.ai", sub: "We reply within 24 hours." },
  { icon: <LocationOnIcon />, label: "Office", value: "123 AI Lane, Learning City", sub: "Remote-first team." },
  { icon: <TwitterIcon />, label: "Follow", value: "@CognitiveWizardAI", sub: "Updates & community." },
];

export default function Contact() {
  return (
    <section className="page-shell">
      <div className="container">
        <div className="page-header" style={{ maxWidth: "680px" }}>
          <p className="eyebrow">Get in touch</p>
          <h1 className="page-title">Contact the team</h1>
          <p className="section-copy">
            Reach out for feedback, support, or partnership inquiries.
            We're building a practical AI learning platform for students,
            educators, and creators.
          </p>
        </div>

        <div className="contact-grid">
          {contactItems.map(item => (
            <div key={item.label} id={`contact-${item.label.toLowerCase()}`}>
              <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "10px" }}>
                <span style={{ color: "var(--primary-light)" }}>{item.icon}</span>
                <strong style={{ color: "var(--text)", fontSize: ".9rem" }}>{item.label}</strong>
              </div>
              <p style={{ margin: "0 0 4px", color: "var(--text)", fontWeight: 600 }}>{item.value}</p>
              <p style={{ margin: 0, color: "var(--text-light)", fontSize: ".82rem" }}>{item.sub}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
