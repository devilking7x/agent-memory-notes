import { useState } from "react";
import { Streamdown } from "streamdown";
import {
  ArrowRight,
  CheckCheck,
  Eye,
  History,
  Pencil,
  X,
} from "lucide-react";
import {
  formatDate,
  formatRelativeTime,
  type Memory,
} from "@/lib/memory";

interface Props {
  /** Least-recently-viewed first. */
  queue: Memory[];
  onMarkViewed: (id: string) => void;
  onOpenMemory: (id: string) => void;
  onClose: (reviewed: number) => void;
}

export default function ReviewMode({
  queue,
  onMarkViewed,
  onOpenMemory,
  onClose,
}: Props) {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);

  if (queue.length === 0) {
    return (
      <div className="modal-backdrop" onClick={() => onClose(0)}>
        <div className="modal review" onClick={(e) => e.stopPropagation()}>
          <div className="modal-head">
            <span className="eyebrow">
              <History size={14} /> SPACED REVIEW
            </span>
            <button className="icon-btn" onClick={() => onClose(0)} title="Close">
              <X size={16} />
            </button>
          </div>
          <div className="modal-body empty-state">
            <CheckCheck size={30} className="empty-icon" />
            <b className="display">All caught up</b>
            <p className="sub">
              Every memory has been reviewed recently. New memories and
              long-unseen ones will show up here.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const current = queue[Math.min(index, queue.length - 1)];
  const done = index >= queue.length;

  const reveal = () => {
    setRevealed(true);
    onMarkViewed(current.id);
    setReviewedCount((c) => c + 1);
  };

  const next = () => {
    setIndex((i) => i + 1);
    setRevealed(false);
  };

  if (done) {
    return (
      <div className="modal-backdrop" onClick={() => onClose(reviewedCount)}>
        <div className="modal review" onClick={(e) => e.stopPropagation()}>
          <div className="modal-head">
            <span className="eyebrow">
              <History size={14} /> SPACED REVIEW
            </span>
            <button
              className="icon-btn"
              onClick={() => onClose(reviewedCount)}
              title="Close"
            >
              <X size={16} />
            </button>
          </div>
          <div className="modal-body empty-state">
            <CheckCheck size={30} className="empty-icon" />
            <b className="display">Review complete</b>
            <p className="sub">
              You revisited {reviewedCount} {reviewedCount === 1 ? "memory" : "memories"}.
              They'll resurface again after others go stale.
            </p>
            <div className="modal-actions" style={{ justifyContent: "center", border: 0, padding: 0, marginTop: 18 }}>
              <button className="primary" onClick={() => onClose(reviewedCount)} style={{ marginTop: 0 }}>
                Done
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const lastSeen = current.lastViewedAt ?? current.createdAt;
  const neverSeen = !current.lastViewedAt;

  return (
    <div className="modal-backdrop" onClick={() => onClose(reviewedCount)}>
      <div className="modal review" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <span className="eyebrow">
            <History size={14} /> SPACED REVIEW
          </span>
          <button
            className="icon-btn"
            onClick={() => onClose(reviewedCount)}
            title="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="review-progress">
          <div
            className="review-progress-fill"
            style={{ width: `${(index / queue.length) * 100}%` }}
          />
        </div>

        <div className="modal-body">
          <div className="review-meta">
            <span className="sub">
              Memory {index + 1} of {queue.length}
            </span>
            <span className="review-stale">
              {neverSeen ? "never reviewed" : `last seen ${formatRelativeTime(lastSeen)}`}
              {" · "}
              {formatDate(current.updatedAt)}
            </span>
          </div>

          <h2 className="display modal-title">{current.title}</h2>
          {current.tags.length > 0 && (
            <div className="tag-row modal-tags">
              {current.tags.map((t) => (
                <span key={t} className="tag-chip">
                  {t}
                </span>
              ))}
            </div>
          )}

          {revealed ? (
            <div className="md-preview review-body">
              <Streamdown>{current.body || "*No content yet.*"}</Streamdown>
            </div>
          ) : (
            <button className="review-hidden" onClick={reveal}>
              <Eye size={18} />
              <span>Reveal this memory</span>
              <small className="sub">Try to recall what it says first</small>
            </button>
          )}

          <div className="modal-actions">
            {!revealed ? (
              <>
                <button className="primary" onClick={reveal} style={{ marginTop: 0 }}>
                  <Eye size={14} /> Reveal
                </button>
                <button className="ghost" onClick={next}>
                  Skip <ArrowRight size={13} />
                </button>
              </>
            ) : (
              <>
                <button className="primary" onClick={next} style={{ marginTop: 0 }}>
                  Next <ArrowRight size={14} />
                </button>
                <button
                  className="ghost sm"
                  onClick={() => {
                    onOpenMemory(current.id);
                  }}
                >
                  <Pencil size={13} /> Open full
                </button>
                <button className="ghost sm" onClick={() => onClose(reviewedCount)}>
                  Finish
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
