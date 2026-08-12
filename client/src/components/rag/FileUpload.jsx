import { useId, useState } from "react";
import ErrorMessage from "../utils/ErrorMessage";
import { uploadDocument } from "../../services/rag";
import { Upload, FileText } from "lucide-react";

const MAX_FILE_SIZE = 50 * 1024 * 1024;
const ACCEPTED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export default function FileUpload({ onUploadSuccess }) {
  const fileInputId = useId();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleFileChange = (event) => {
    const selectedFile = event.target.files?.[0];
    setSuccess("");
    setError("");

    if (!selectedFile) {
      setFile(null);
      return;
    }

    const hasAcceptedType =
      ACCEPTED_TYPES.includes(selectedFile.type) ||
      [".pdf", ".docx"].some((ext) => selectedFile.name.toLowerCase().endsWith(ext));
    if (!hasAcceptedType) {
      setFile(null);
      setError("Only PDF and DOCX files are supported.");
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      setFile(null);
      setError("File is too large. Maximum allowed size is 50MB.");
      return;
    }

    setFile(selectedFile);
  };

  const handleUpload = async (event) => {
    event.preventDefault();
    if (!file || loading) return;

    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const result = await uploadDocument(file);
      setSuccess(
        `Uploaded ${result.filename}. ${result.chunks} chunks are now available.`,
      );
      setFile(null);
      if (onUploadSuccess) onUploadSuccess(result);
    } catch (uploadError) {
      setError(uploadError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-bold text-dark mb-1">Knowledge Upload</h2>
        <p className="text-sm text-slate-500">Add PDF or DOCX files to your private context.</p>
      </div>

      <form onSubmit={handleUpload} className="flex flex-col gap-3">
        <label 
          htmlFor={fileInputId} 
          className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-300 rounded-xl hover:border-primary hover:bg-primary/5 transition-colors cursor-pointer group"
        >
          <div className="w-10 h-10 bg-slate-100 group-hover:bg-primary/10 rounded-full flex items-center justify-center mb-3 transition-colors">
            {file ? <FileText className="text-primary" size={20} /> : <Upload className="text-slate-400 group-hover:text-primary transition-colors" size={20} />}
          </div>
          <span className="text-sm font-semibold text-slate-700 mb-1">
            {file ? file.name : "Click to select document"}
          </span>
          <span className="text-xs text-slate-500 text-center px-4">
            Max size: 50MB. Only .pdf and .docx
          </span>
        </label>
        
        <input
          id={fileInputId}
          type="file"
          className="hidden"
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={handleFileChange}
          disabled={loading}
        />

        <button 
          type="submit" 
          disabled={loading || !file}
          className="w-full bg-slate-900 hover:bg-slate-800 text-white py-2.5 rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Uploading..." : "Upload & Ingest"}
        </button>
      </form>
      
      {error ? <div className="mt-1"><ErrorMessage message={error} /></div> : null}
      {success ? <p className="text-sm font-medium text-emerald-600 bg-emerald-50 p-3 rounded-xl border border-emerald-100">{success}</p> : null}
    </section>
  );
}
