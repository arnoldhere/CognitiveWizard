import { Mail, MapPin } from "lucide-react";
import { motion } from "framer-motion";

const contactItems = [
  { icon: <Mail size={24} />, label: "Email", value: "support@cognitivewizard.ai", sub: "We reply within 24 hours." },
  { icon: <MapPin size={24} />, label: "Office", value: "123 AI Lane, Learning City", sub: "Remote-first team." },
];

export default function Contact() {
  return (
    <section className="min-h-screen bg-light py-24 px-4 sm:px-6 lg:px-8 flex flex-col">
      <div className="max-w-4xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-16 max-w-2xl"
        >
          <p className="text-primary font-bold uppercase tracking-wider text-sm mb-4">Get in touch</p>
          <h1 className="text-4xl md:text-5xl font-extrabold text-dark mb-6">Contact the team</h1>
          <p className="text-lg text-slate-600 leading-relaxed">
            Reach out for feedback, support, or partnership inquiries.
            We're building a practical AI learning platform for students,
            educators, and creators.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
          {contactItems.map((item, idx) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="text-primary bg-accent/30 p-3 rounded-xl">
                  {item.icon}
                </div>
                <strong className="text-lg text-dark">{item.label}</strong>
              </div>
              <p className="text-dark font-semibold text-lg mb-2">{item.value}</p>
              <p className="text-slate-500 text-sm">{item.sub}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
