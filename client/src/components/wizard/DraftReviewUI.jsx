import { useState } from "react";
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { CircularProgress } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import SendIcon from "@mui/icons-material/Send";
import EditIcon from "@mui/icons-material/Edit";
import OndemandVideoIcon from "@mui/icons-material/OndemandVideo";

const MenuBar = ({ editor }) => {
  if (!editor) {
    return null;
  }

  return (
    <div style={{ borderBottom: "1px solid var(--border)", padding: "8px", display: "flex", gap: "8px", flexWrap: "wrap", background: "var(--surface-soft)" }}>
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        disabled={!editor.can().chain().focus().toggleBold().run()}
        style={{ fontWeight: editor.isActive('bold') ? 'bold' : 'normal', background: editor.isActive('bold') ? '#1ED9F2' : 'transparent', color: editor.isActive('bold') ? '#fff' : 'var(--text)', border: '1px solid var(--border)', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer' }}
      >
        Bold
      </button>
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        disabled={!editor.can().chain().focus().toggleItalic().run()}
        style={{ fontStyle: 'italic', background: editor.isActive('italic') ? '#1ED9F2' : 'transparent', color: editor.isActive('italic') ? '#fff' : 'var(--text)', border: '1px solid var(--border)', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer' }}
      >
        Italic
      </button>
      <button
        onClick={() => editor.chain().focus().toggleStrike().run()}
        disabled={!editor.can().chain().focus().toggleStrike().run()}
        style={{ textDecoration: 'line-through', background: editor.isActive('strike') ? '#1ED9F2' : 'transparent', color: editor.isActive('strike') ? '#fff' : 'var(--text)', border: '1px solid var(--border)', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer' }}
      >
        Strike
      </button>
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        style={{ background: editor.isActive('heading', { level: 3 }) ? '#1ED9F2' : 'transparent', color: editor.isActive('heading', { level: 3 }) ? '#fff' : 'var(--text)', border: '1px solid var(--border)', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer' }}
      >
        H3
      </button>
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}
        style={{ background: editor.isActive('heading', { level: 4 }) ? '#1ED9F2' : 'transparent', color: editor.isActive('heading', { level: 4 }) ? '#fff' : 'var(--text)', border: '1px solid var(--border)', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer' }}
      >
        H4
      </button>
      <button
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        style={{ background: editor.isActive('bulletList') ? '#1ED9F2' : 'transparent', color: editor.isActive('bulletList') ? '#fff' : 'var(--text)', border: '1px solid var(--border)', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer' }}
      >
        Bullet List
      </button>
      <button
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        style={{ background: editor.isActive('orderedList') ? '#1ED9F2' : 'transparent', color: editor.isActive('orderedList') ? '#fff' : 'var(--text)', border: '1px solid var(--border)', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer' }}
      >
        Ordered List
      </button>
    </div>
  )
}

const TiptapEditor = ({ content, onChange }) => {
  const editor = useEditor({
    extensions: [StarterKit],
    content: content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: "8px", overflow: "hidden", background: "var(--surface)" }}>
      <MenuBar editor={editor} />
      <div style={{ padding: "16px", minHeight: "150px", color: "var(--text)" }}>
        <EditorContent editor={editor} />
      </div>
      <style dangerouslySetInnerHTML={{__html:`
        .ProseMirror { outline: none; }
        .ProseMirror p { margin-top: 0; margin-bottom: 1em; line-height: 1.6; }
        .ProseMirror ul, .ProseMirror ol { padding-left: 20px; margin-top: 0; margin-bottom: 1em; }
        .ProseMirror h3, .ProseMirror h4 { margin-top: 0; margin-bottom: 0.5em; }
      `}} />
    </div>
  );
};

export default function DraftReviewUI({ data, onApprove, onFeedback, isSubmitting }) {
  // We'll manage a local copy of the modules to allow editing
  const [modules, setModules] = useState(() => {
    return data?.content?.modules?.map(m => ({
      ...m,
      title: m.title || "Untitled Module",
      description: m.description || "",
      isEditing: false
    })) || [];
  });
  
  const [feedbackText, setFeedbackText] = useState("");

  const handleEditToggle = (idx) => {
    const updated = [...modules];
    updated[idx].isEditing = !updated[idx].isEditing;
    setModules(updated);
  };

  const handleDescChange = (idx, value) => {
    const updated = [...modules];
    updated[idx].description = value;
    setModules(updated);
  };
  
  const handleTitleChange = (idx, value) => {
    const updated = [...modules];
    updated[idx].title = value;
    setModules(updated);
  };

  const handleSubmitFeedback = () => {
    if (!feedbackText.trim()) return;
    onFeedback(feedbackText);
    setFeedbackText("");
  };

  return (
    <div style={{ animation: "fadeInUp 0.4s ease", width: "100%", maxWidth: "900px", margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: "40px" }}>
         <h1 style={{ fontSize: "2.5rem", fontWeight: 900, color: "var(--text)", marginBottom: "16px" }}>
            Review Generated Draft
         </h1>
         <p style={{ color: "var(--text-light)", fontSize: "1.1rem" }}>
            Please review the generated content below. You can edit the text directly, request changes from AI, or approve to publish it.
         </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "24px", marginBottom: "40px" }}>
        {modules.map((mod, idx) => (
          <div key={idx} style={{ background: "var(--surface)", borderRadius: "16px", padding: "24px", border: "1px solid var(--border-strong)", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}>
            
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
               {mod.isEditing ? (
                 <input 
                   value={mod.title} 
                   onChange={(e) => handleTitleChange(idx, e.target.value)} 
                   style={{ fontSize: "1.3rem", fontWeight: 800, padding: "8px", width: "70%", background: "var(--surface-soft)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: "8px" }} 
                 />
               ) : (
                 <h3 style={{ margin: 0, fontSize: "1.4rem", fontWeight: 800, color: "var(--text)" }}>{mod.title}</h3>
               )}
               
               <button onClick={() => handleEditToggle(idx)} style={{ background: mod.isEditing ? "#1ED9F2" : "rgba(30, 217, 242, 0.1)", color: mod.isEditing ? "#fff" : "#1ED9F2", border: "none", padding: "8px 16px", borderRadius: "20px", cursor: "pointer", fontWeight: 600, display: "flex", alignItems: "center", gap: "8px" }}>
                 <EditIcon fontSize="small" />
                 {mod.isEditing ? "Done" : "Edit"}
               </button>
            </div>

            {mod.isEditing ? (
              <div style={{ marginTop: "16px" }}>
                 <TiptapEditor 
                   content={mod.description} 
                   onChange={(val) => handleDescChange(idx, val)} 
                 />
              </div>
            ) : (
              <div 
                style={{ color: "var(--text-light)", fontSize: "1.05rem", lineHeight: 1.6 }}
                dangerouslySetInnerHTML={{ __html: mod.description }}
              />
            )}
            
            {/* Display References */}
            {mod.references && mod.references.length > 0 && (
              <div style={{ marginTop: "20px", borderTop: "1px solid var(--border)", paddingTop: "16px" }}>
                 <h4 style={{ margin: "0 0 12px 0", color: "var(--text)", fontSize: "1rem" }}>Curated References</h4>
                 <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                   {mod.references.map((ref, rIdx) => (
                     <a key={rIdx} href={ref.url} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "flex-start", gap: "12px", background: "var(--surface-soft)", padding: "12px", borderRadius: "12px", textDecoration: "none", transition: "transform 0.2s" }} className="hover-lift">
                       <div style={{ color: "#ff0000", marginTop: "2px" }}>
                         <OndemandVideoIcon />
                       </div>
                       <div>
                         <h5 style={{ margin: "0 0 4px", color: "var(--text)", fontSize: "1rem" }}>{ref.title}</h5>
                         <p style={{ margin: 0, color: "var(--text-light)", fontSize: "0.85rem" }}>{ref.description}</p>
                       </div>
                     </a>
                   ))}
                 </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Action Area */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
        
        {/* Feedback block */}
        <div style={{ background: "var(--surface-soft)", padding: "24px", borderRadius: "16px", border: "1px solid var(--border)" }}>
           <h3 style={{ margin: "0 0 16px", color: "var(--text)", fontSize: "1.2rem" }}>Request AI Changes</h3>
           <textarea 
             placeholder="Tell AI what to change..."
             value={feedbackText}
             onChange={(e) => setFeedbackText(e.target.value)}
             style={{ width: "100%", minHeight: "100px", padding: "16px", background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)", borderRadius: "12px", marginBottom: "16px", outline: "none", resize: "vertical" }}
           />
           <button 
             onClick={handleSubmitFeedback} 
             disabled={isSubmitting || !feedbackText.trim()}
             style={{ width: "100%", padding: "12px", background: "var(--primary)", color: "#fff", border: "none", borderRadius: "8px", fontWeight: 600, cursor: (isSubmitting || !feedbackText.trim()) ? "not-allowed" : "pointer", opacity: (isSubmitting || !feedbackText.trim()) ? 0.6 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
           >
             {isSubmitting ? <CircularProgress size={20} color="inherit" /> : <SendIcon fontSize="small" />}
             Send to AI
           </button>
        </div>

        {/* Approve block */}
        <div style={{ background: "var(--surface-soft)", padding: "24px", borderRadius: "16px", border: "1px solid var(--border)", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center" }}>
           <div style={{ color: "#10b981", marginBottom: "16px" }}>
              <CheckCircleIcon sx={{ fontSize: 64 }} />
           </div>
           <h3 style={{ margin: "0 0 12px", color: "var(--text)", fontSize: "1.2rem" }}>Looks Good?</h3>
           <p style={{ color: "var(--text-light)", fontSize: "0.95rem", marginBottom: "24px" }}>
             Once approved, the syllabus will be published for learners to browse and enroll.
           </p>
           <button 
             onClick={() => onApprove(modules)}
             disabled={isSubmitting}
             style={{ width: "100%", padding: "14px", background: "linear-gradient(135deg, #10b981, #059669)", color: "#fff", border: "none", borderRadius: "8px", fontWeight: 700, fontSize: "1.1rem", cursor: isSubmitting ? "not-allowed" : "pointer", opacity: isSubmitting ? 0.6 : 1 }}
           >
             Approve & Publish
           </button>
        </div>
      </div>
      
    </div>
  );
}
