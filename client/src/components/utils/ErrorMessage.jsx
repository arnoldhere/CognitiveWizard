import { AlertTriangle } from "lucide-react";

export default function ErrorMessage({ message }) {
  return (
    <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-2xl flex items-center gap-3">
      <AlertTriangle size={20} className="text-rose-500 shrink-0" />
      <span className="text-sm font-medium">{message}</span>
    </div>
  );
}
