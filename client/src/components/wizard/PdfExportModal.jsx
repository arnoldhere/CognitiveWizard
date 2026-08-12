import React from "react";
import { FileText, Sparkles, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const LOADING_STEPS = [
  "Connecting to AI PDF Generation Engine...",
  "Formatting Roadmap Milestones & Phase Deliverables...",
  "Curating Reference Resources & Links...",
  "Applying Professional Typography & Page Layout...",
  "Finalizing High-Resolution PDF Download...",
];

export default function PdfExportModal({ isOpen, currentStepIndex, isSuccess, error, onRetry, onClose }) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 no-print">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          onClick={error || isSuccess ? onClose : undefined}
        />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200"
        >
          {!error && !isSuccess && (
            <div className="p-8 text-center flex flex-col items-center">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-rose-500/20 rounded-full animate-ping" />
                <div className="relative w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center border border-rose-100 shadow-sm">
                  <FileText size={40} className="text-rose-500" />
                  <div className="absolute -top-1 -right-1 w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center border border-indigo-200 shadow-sm">
                    <Sparkles size={16} className="text-indigo-600" />
                  </div>
                </div>
              </div>

              <h3 className="text-2xl font-bold text-slate-900 mb-2">Preparing Your PDF</h3>
              
              <div className="flex items-center justify-center gap-2 mb-6">
                <Loader2 size={16} className="text-cyan-500 animate-spin" />
                <span className="text-sm font-medium text-slate-500">
                  {LOADING_STEPS[Math.min(currentStepIndex, LOADING_STEPS.length - 1)]}
                </span>
              </div>

              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-4">
                <motion.div
                  className="h-full bg-gradient-to-r from-cyan-400 to-indigo-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(((currentStepIndex + 1) / LOADING_STEPS.length) * 100, 95)}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>

              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                Please wait a moment...
              </p>
            </div>
          )}

          {isSuccess && (
            <div className="p-8 text-center flex flex-col items-center">
              <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-6 border border-emerald-100 shadow-sm">
                <CheckCircle2 size={48} />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">PDF Ready!</h3>
              <p className="text-slate-500 font-medium mb-6">Your roadmap PDF has been generated and downloaded successfully.</p>
              <button 
                onClick={onClose}
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors"
              >
                Close
              </button>
            </div>
          )}

          {error && (
            <div className="p-8 text-center flex flex-col items-center">
              <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mb-6 border border-rose-100 shadow-sm">
                <AlertCircle size={48} />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Generation Failed</h3>
              <p className="text-slate-500 font-medium mb-8">{error}</p>
              
              <div className="w-full flex gap-3">
                <button 
                  onClick={onClose}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={onRetry}
                  className="flex-1 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-bold shadow-md transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
