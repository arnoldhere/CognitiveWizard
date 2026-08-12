import { Link } from "react-router-dom";
import { motion } from "framer-motion";

export default function NotFound() {
  return (
    <section className="min-h-[70vh] bg-light flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-10 sm:p-14 rounded-3xl shadow-sm border border-slate-100 text-center max-w-xl w-full"
      >
        <p className="text-primary font-black text-6xl mb-4">404</p>
        <h1 className="text-3xl font-extrabold text-dark mb-4">Page not found</h1>
        <p className="text-slate-600 mb-8 leading-relaxed">
          The page you requested doesn't exist. It may have been moved or deleted.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/" className="bg-primary hover:bg-opacity-90 text-white px-6 py-3 rounded-xl font-semibold transition-colors">
            Return Home
          </Link>
          <Link to="/wizard" className="bg-white border-2 border-slate-200 hover:border-slate-300 text-dark px-6 py-3 rounded-xl font-semibold transition-colors">
            Try AI Wizard
          </Link>
        </div>
      </motion.div>
    </section>
  );
}
