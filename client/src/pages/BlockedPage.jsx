import { useNavigate } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import Button from "../components/ui/Button";
import { motion } from "framer-motion";

export default function BlockedPage() {
    const navigate = useNavigate();

    return (
        <section className="min-h-screen bg-light flex items-center justify-center p-4">
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white p-10 sm:p-14 rounded-3xl shadow-sm border border-red-100 text-center max-w-lg w-full"
            >
                <div className="w-24 h-24 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                    <AlertCircle size={48} />
                </div>
                <h1 className="text-3xl font-extrabold text-dark mb-4">Access Blocked</h1>
                <p className="text-slate-600 mb-8 leading-relaxed">
                    Your account has been blocked. Please contact the admin team for further assistance.
                </p>
                <Button variant="primary" onClick={() => navigate('/login')} className="w-full">
                    Return to Login
                </Button>
            </motion.div>
        </section>
    );
}
