import { useEffect, useState } from "react";
import { Streamdown } from "streamdown";
import { ClipboardCopy, Download, Pencil, Trash2, X } from "lucide-react";
import { formatDateTime, type Memory } from "@/lib/memory";

interface Props {
  memory: Memory | null;
  onClose: () => void;
  onSave: (id: string, patch: { title: string; body: string; tags: string[] }) => void;
  onCopy: (m: Memory) => void;
  onDownload: (m: Memory) => void;
  onDelete: (id: string) => void;
}

export function parseTags(input: string): string[] {
  return input
    .split(",")
    .map((t) => t.trim().toLowerCase().replace(/\s+/g, "-"))
    .filter(Boolean)
    .slice(0, 12);
}

export default function MemoryDialog({ memory, onClose, onSave, onCopy, onDownload, onDelete }: Props) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState("");

  useEffect(() => {
    if (memory) {
      setEditing(false);
      setTitle(memory.title);
      setBody(memory.body);
      setTags(memory.tags.join(", "));
    }
  }, [memory]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!memory) return null;

  const save = () => {
    if (!title.trim()) return;
    onSave(memory.id, { title: title.trim(), body, tags: parseTags(tags) });
    setEditing(false);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <span className="sub">
            Created {formatDateTime(memory.createdAt)}
            {memory.updatedAt !== memory.createdAt && ` · Edited ${formatDateTime(memory.updatedAt)}`}
          </span>
          <button className="icon-btn" onClick={onClose} title="Close">
            <X size={16} />
          </button>
        </div>

        {editing ? (
          <div className="modal-body">
            <label className="field">
              <span>Title</span>
              <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
            </label>
            <label className="field">
              <span>Body (Markdown supported)</span>
              <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={10} />
            </label>
            <label className="field">
              <span>Tags (comma separated)</span>
              <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="work, ideas" />
            </label>
            <div className="modal-actions">
              <button className="primary" onClick={save} disabled={!title.trim()}>
                Save changes
              </button>
              <button className="ghost" onClick={() => setEditing(false)}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="modal-body">
            <h2 className="display modal-title">{memory.title}</h2>
            {memory.tags.length > 0 && (
              <div className="tag-row modal-tags">
                {memory.tags.map((t) => (
                  <span key={t} className="tag-chip">
                    {t}
                  </span>
                ))}
              </div>
            )}
            <div className="md-preview">
              <Streamdown>{memory.body || "*No content yet.*"}</Streamdown>
            </div>
            <div className="modal-actions">
              <button className="ghost sm" onClick={() => setEditing(true)}>
                <Pencil size={13} /> Edit
              </button>
              <button className="ghost sm" onClick={() => onCopy(memory)}>
                <ClipboardCopy size={13} /> Copy Markdown
              </button>
              <button className="ghost sm" onClick={() => onDownload(memory)}>
                <Download size={13} /> .md
              </button>
              <button
                className="ghost sm danger-text"
                onClick={() => {
                  onDelete(memory.id);
                  onClose();
                }}
              >
                <Trash2 size={13} /> Delete
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
