import { ClipboardCopy, Download, Pencil, Pin, PinOff, Trash2 } from "lucide-react";
import { formatDate, type Memory } from "@/lib/memory";

interface Props {
  memory: Memory;
  onTogglePin: (id: string) => void;
  onOpen: (id: string) => void;
  onCopy: (m: Memory) => void;
  onDownload: (m: Memory) => void;
  onDelete: (id: string) => void;
}

export default function MemoryCard({ memory, onTogglePin, onOpen, onCopy, onDownload, onDelete }: Props) {
  const snippet =
    memory.body.length > 160 ? memory.body.slice(0, 160).trimEnd() + "…" : memory.body;

  return (
    <article className={`mem-card${memory.pinned ? " is-pinned" : ""}`}>
      <div className="mem-card-top">
        <h3 onClick={() => onOpen(memory.id)}>{memory.title}</h3>
        <button
          className={`icon-btn${memory.pinned ? " active" : ""}`}
          title={memory.pinned ? "Unpin" : "Pin to top"}
          onClick={() => onTogglePin(memory.id)}
        >
          {memory.pinned ? <PinOff size={15} /> : <Pin size={15} />}
        </button>
      </div>
      {snippet && (
        <p className="mem-snippet" onClick={() => onOpen(memory.id)}>
          {snippet}
        </p>
      )}
      <div className="mem-meta">
        <span className="sub">{formatDate(memory.updatedAt)}</span>
        <div className="tag-row">
          {memory.tags.slice(0, 4).map((t) => (
            <span key={t} className="tag-chip">
              {t}
            </span>
          ))}
          {memory.tags.length > 4 && (
            <span className="tag-chip more">+{memory.tags.length - 4}</span>
          )}
        </div>
      </div>
      <div className="mem-actions">
        <button className="ghost sm" onClick={() => onOpen(memory.id)}>
          <Pencil size={13} /> View / Edit
        </button>
        <button className="icon-btn" title="Copy as Markdown" onClick={() => onCopy(memory)}>
          <ClipboardCopy size={15} />
        </button>
        <button className="icon-btn" title="Download .md" onClick={() => onDownload(memory)}>
          <Download size={15} />
        </button>
        <button
          className="icon-btn danger"
          title="Delete"
          onClick={() => onDelete(memory.id)}
        >
          <Trash2 size={15} />
        </button>
      </div>
    </article>
  );
}
