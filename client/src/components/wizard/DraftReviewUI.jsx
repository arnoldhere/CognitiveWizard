import { useState } from "react";
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { CheckCircle, Send, Edit3, Video, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

const MenuBar = ({ editor }) => {
  if (!editor) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2 p-2 bg-slate-50 border-b border-slate-200">
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        disabled={!editor.can().chain().focus().toggleBold().run()}
        className={`px-3 py-1.5 rounded-lg border text-sm font-bold transition-colors ${editor.isActive('bold') ? 'bg-primary border-primary text-white' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'}`}
      >
        Bold
      </button>
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        disabled={!editor.can().chain().focus().toggleItalic().run()}
        className={`px-3 py-1.5 rounded-lg border text-sm italic transition-colors ${editor.isActive('italic') ? 'bg-primary border-primary text-white' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'}`}
      >
        Italic
      </button>
      <button
        onClick={() => editor.chain().focus().toggleStrike().run()}
        disabled={!editor.can().chain().focus().toggleStrike().run()}
        className={`px-3 py-1.5 rounded-lg border text-sm line-through transition-colors ${editor.isActive('strike') ? 'bg-primary border-primary text-white' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'}`}
      >
        Strike
      </button>
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        className={`px-3 py-1.5 rounded-lg border text-sm font-bold transition-colors ${editor.isActive('heading', { level: 3 }) ? 'bg-primary border-primary text-white' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'}`}
      >
        H3
      </button>
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}
        className={`px-3 py-1.5 rounded-lg border text-sm font-bold transition-colors ${editor.isActive('heading', { level: 4 }) ? 'bg-primary border-primary text-white' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'}`}
      >
        H4
      </button>
      <button
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`px-3 py-1.5 rounded-lg border text-sm font-bold transition-colors ${editor.isActive('bulletList') ? 'bg-primary border-primary text-white' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'}`}
      >
        Bullet List
      </button>
      <button
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={`px-3 py-1.5 rounded-lg border text-sm font-bold transition-colors ${editor.isActive('orderedList') ? 'bg-primary border-primary text-white' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'}`}
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
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
      <MenuBar editor={editor} />
      <div className="p-4 min-h-[150px] text-slate-700 prose prose-slate max-w-none">
        <EditorContent editor={editor} />
      </div>
      <style dangerouslySetInnerHTML={{
        __html: `
        .ProseMirror { outline: none; }
        .ProseMirror p { margin-top: 0; margin-bottom: 1em; line-height: 1.6; }
        .ProseMirror ul, .ProseMirror ol { padding-left: 20px; margin-top: 0; margin-bottom: 1em; }
        .ProseMirror h3, .ProseMirror h4 { margin-top: 0; margin-bottom: 0.5em; font-weight: bold; color: #0f172a; }
      `}} />
    </div>
  );
};

export default function DraftReviewUI({ data, onApprove, onFeedback, isSubmitting }) {
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

  const handleTopicChange = (modIdx, topicIdx, field, value) => {
    const updated = [...modules];
    updated[modIdx].topics[topicIdx][field] = value;
    setModules(updated);
  };

  const handleReferenceChange = (modIdx, refIdx, field, value) => {
    const updated = [...modules];
    updated[modIdx].references[refIdx][field] = value;
    setModules(updated);
  };

  const handleSubmitFeedback = () => {
    if (!feedbackText.trim()) return;
    onFeedback(feedbackText);
    setFeedbackText("");
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-4xl mx-auto">
      <div className="text-center mb-10">
        <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4 tracking-tight">
          Review Generated Draft
        </h1>
        <p className="text-slate-600 text-lg max-w-2xl mx-auto">
          Please review the generated content below. You can edit the text directly, request changes from AI, or approve to publish it.
        </p>
      </div>

      <div className="flex flex-col gap-6 mb-12">
        {modules.map((mod, idx) => (
          <div key={idx} className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">

            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6">
              {mod.isEditing ? (
                <input
                  value={mod.title}
                  onChange={(e) => handleTitleChange(idx, e.target.value)}
                  className="text-xl font-bold p-3 w-full sm:w-2/3 bg-slate-50 text-slate-900 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              ) : (
                <h3 className="text-2xl font-bold text-slate-900">{mod.title}</h3>
              )}

              <button
                onClick={() => handleEditToggle(idx)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-sm transition-all shrink-0 ${mod.isEditing ? 'bg-primary text-white shadow-md shadow-primary/20' : 'bg-cyan-50 text-cyan-600 hover:bg-cyan-100'}`}
              >
                <Edit3 size={16} />
                {mod.isEditing ? "Done" : "Edit"}
              </button>
            </div>

            {mod.isEditing ? (
              <div className="mt-4">
                <TiptapEditor
                  content={mod.description}
                  onChange={(val) => handleDescChange(idx, val)}
                />

                {mod.topics && mod.topics.length > 0 && (
                  <div className="mt-6 border-t border-slate-100 pt-6">
                    <h4 className="font-bold text-slate-900 mb-4">Edit Topics</h4>
                    <div className="flex flex-col gap-4">
                      {mod.topics.map((t, tIdx) => (
                        <div key={tIdx} className="flex flex-col gap-2 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                          <input
                            value={t.name}
                            onChange={(e) => handleTopicChange(idx, tIdx, 'name', e.target.value)}
                            className="font-bold p-3 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all w-full"
                            placeholder="Topic Name"
                          />
                          <textarea
                            value={t.details}
                            onChange={(e) => handleTopicChange(idx, tIdx, 'details', e.target.value)}
                            className="p-3 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-y w-full"
                            placeholder="Topic Details"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {mod.references && mod.references.length > 0 && (
                  <div className="mt-6 border-t border-slate-100 pt-6">
                    <h4 className="font-bold text-slate-900 mb-4">Edit References</h4>
                    <div className="flex flex-col gap-4">
                      {mod.references.map((r, rIdx) => (
                        <div key={rIdx} className="flex flex-col gap-2 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                          <input
                            value={r.title}
                            onChange={(e) => handleReferenceChange(idx, rIdx, 'title', e.target.value)}
                            className="font-bold p-3 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all w-full"
                            placeholder="Reference Title"
                          />
                          <input
                            value={r.url}
                            onChange={(e) => handleReferenceChange(idx, rIdx, 'url', e.target.value)}
                            className="text-blue-500 p-3 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all w-full"
                            placeholder="Reference URL"
                          />
                          <textarea
                            value={r.description || ""}
                            onChange={(e) => handleReferenceChange(idx, rIdx, 'description', e.target.value)}
                            className="p-3 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-y w-full"
                            placeholder="Reference Description"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <div
                  className="prose prose-slate max-w-none text-slate-600 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: mod.description }}
                />

                {mod.topics && mod.topics.length > 0 && (
                  <div className="mt-8 border-t border-slate-100 pt-6">
                    <h4 className="font-bold text-slate-900 mb-4">Topics</h4>
                    <ul className="list-disc pl-5 text-slate-600 space-y-2">
                      {mod.topics.map((t, tIdx) => (
                        <li key={tIdx}>
                          <strong className="text-slate-800">{t.name}</strong>: {t.details}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {mod.references && mod.references.length > 0 && (
                  <div className="mt-8 border-t border-slate-100 pt-6">
                    <h4 className="font-bold text-slate-900 mb-4">Curated References</h4>
                    <div className="grid gap-3">
                      {mod.references.map((ref, rIdx) => (
                        <a
                          key={rIdx}
                          href={ref.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-start gap-4 bg-slate-50 p-4 rounded-2xl hover:bg-slate-100 hover:-translate-y-0.5 transition-all group"
                        >
                          <div className="text-rose-500 mt-1 shrink-0 bg-rose-100 p-2 rounded-xl">
                            <Video size={20} />
                          </div>
                          <div>
                            <h5 className="font-bold text-slate-900 mb-1 group-hover:text-primary transition-colors">{ref.title}</h5>
                            <p className="text-slate-500 text-sm leading-relaxed">{ref.description}</p>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-50 p-6 md:p-8 rounded-3xl border border-slate-200">
          <h3 className="font-bold text-slate-900 text-xl mb-4">Request AI Changes</h3>
          <textarea
            placeholder="Tell AI what to change..."
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            className="w-full min-h-[120px] p-4 bg-white border border-slate-200 text-slate-700 rounded-2xl mb-4 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-y"
          />
          <button
            onClick={handleSubmitFeedback}
            disabled={isSubmitting || !feedbackText.trim()}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-slate-900 text-white rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-800 transition-colors"
          >
            {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            Send to AI
          </button>
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-6 md:p-8 rounded-3xl border border-emerald-100 flex flex-col justify-center items-center text-center">
          <div className="text-emerald-500 mb-4 bg-white p-4 rounded-full shadow-sm border border-emerald-100">
            <CheckCircle size={48} />
          </div>
          <h3 className="font-bold text-emerald-900 text-2xl mb-3">Looks Good?</h3>
          <p className="text-emerald-700 mb-8 font-medium">
            Once approved, the syllabus will be published for learners to browse and enroll.
          </p>
          <button
            onClick={() => onApprove(modules)}
            disabled={isSubmitting}
            className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white border-none rounded-xl font-extrabold text-lg disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/30 transition-all hover:-translate-y-1"
          >
            Approve & Publish
          </button>
        </div>
      </div>

    </motion.div>
  );
}
