import { useId, useState } from "react";
import ErrorMessage from "../utils/ErrorMessage";
import { uploadDocument } from "../../services/rag";
import "../../styles/FileUpload.css";

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
        `Uploaded ${result.filename}. ${result.chunks} chunks are now available for retrieval.`,
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
    <section className="rag-panel file-upload-panel">
      <div className="rag-panel-header">
        <h2>Knowledge Base Upload</h2>
        <p>Add your PDF or DOCX files to improve answer quality.</p>
      </div>
      <form className="file-upload-form" onSubmit={handleUpload}>
        <label htmlFor={fileInputId} className="file-upload-input-label">
          Select document
        </label>
        <input
          id={fileInputId}
          type="file"
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={handleFileChange}
          disabled={loading}
        />
        <div className="file-upload-meta">
          {file ? <span>Selected: {file.name}</span> : <span>No file selected</span>}
          <span>Max size: 50MB</span>
        </div>
        <button type="submit" disabled={loading || !file}>
          {loading ? "Uploading..." : "Upload & Ingest"}
        </button>
      </form>
      {error ? <ErrorMessage message={error} /> : null}
      {success ? <p className="success-msg">{success}</p> : null}
    </section>
  );
}
