import React, { useState, useEffect } from "react";
import EditNoteIcon from "@mui/icons-material/EditNote";
import SaveIcon from "@mui/icons-material/Save";
import CheckIcon from "@mui/icons-material/Check";

export default function NotesSection({ topic }) {
  const storageKey = `roadmap_notes_${topic ? topic.replace(/\s+/g, "_") : "default"}`;

  const [notes, setNotes] = useState(() => {
    return localStorage.getItem(storageKey) || "";
  });

  const [savedStatus, setSavedStatus] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved !== null) {
      setNotes(saved);
    }
  }, [storageKey]);

  const handleNotesChange = (e) => {
    const text = e.target.value;
    setNotes(text);
    localStorage.setItem(storageKey, text);
    setSavedStatus(true);
    setTimeout(() => setSavedStatus(false), 1500);
  };

  return (
    <div className="notes-section-root">
      <div className="notes-header">
        <div className="notes-title">
          <EditNoteIcon sx={{ fontSize: 24, color: "#8b5cf6" }} />
          <div>
            <h2>Study Notes & Reminders</h2>
            <p>Jot down insights, concepts to revisit, and ideas as you work through {topic}.</p>
          </div>
        </div>

        <div className="save-status-badge">
          {savedStatus ? (
            <span className="saved">
              <CheckIcon sx={{ fontSize: 14 }} /> Saved
            </span>
          ) : (
            <span className="idle">
              <SaveIcon sx={{ fontSize: 14 }} /> Auto-saves locally
            </span>
          )}
        </div>
      </div>

      <textarea
        className="notes-textarea"
        placeholder="Type your study notes here..."
        value={notes}
        onChange={handleNotesChange}
        rows={8}
      />
    </div>
  );
}
