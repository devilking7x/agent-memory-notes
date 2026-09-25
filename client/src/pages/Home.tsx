import { useEffect, useMemo, useRef, useState } from "react";
import {
  Brain,
  ClipboardCopy,
  Download,
  Moon,
  Plus,
  Search,
  Sparkles,
  Sun,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import MemoryCard from "@/components/MemoryCard";
import MemoryDialog, { parseTags } from "@/components/MemoryDialog";
import { useTheme } from "../contexts/ThemeContext";
import {
  copyText,
  downloadFile,
  loadMemories,
  memoriesToAgentMarkdown,
  memoryToMarkdown,
  parseImportFile,
  persistMemories,
  slugify,
  uid,
  type Memory,
} from "@/lib/memory";

export default function Home() {
  const [memories, setMemories] = useState<Memory[]>(() => loadMemories());
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [capTitle, setCapTitle] = useState("");
  const [capBody, setCapBody] = useState("");
  const [capTags, setCapTags] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    persistMemories(memories);
  }, [memories]);

  const tags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const m of memories)
      for (const t of m.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [memories]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = memories.filter((m) => {
      if (activeTag && !m.tags.includes(activeTag)) return false;
      if (!q) return true;
      return (
        m.title.toLowerCase().includes(q) ||
        m.body.toLowerCase().includes(q) ||
        m.tags.some((t) => t.includes(q))
      );
    });
    return list.sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return b.updatedAt - a.updatedAt;
    });
  }, [memories, query, activeTag]);

  const pinnedCount = memories.filter((m) => m.pinned).length;
  const openMemory = openId ? memories.find((m) => m.id === openId) ?? null : null;

  const capture = () => {
    if (!capTitle.trim()) {
      toast.error("Give your memory a title first");
      return;
    }
    const now = Date.now();
    const m: Memory = {
      id: uid(),
      title: capTitle.trim(),
      body: capBody,
      tags: parseTags(capTags),
      pinned: false,
      createdAt: now,
      updatedAt: now,
    };
    setMemories((v) => [m, ...v]);
    setCapTitle("");
    setCapBody("");
    setCapTags("");
    toast.success("Memory saved");
  };

  const togglePin = (id: string) =>
    setMemories((v) =>
      v.map((m) => (m.id === id ? { ...m, pinned: !m.pinned, updatedAt: Date.now() } : m))
    );

  const saveEdit = (id: string, patch: { title: string; body: string; tags: string[] }) =>
    setMemories((v) =>
      v.map((m) => (m.id === id ? { ...m, ...patch, updatedAt: Date.now() } : m))
    );

  const remove = (id: string) => {
    if (!window.confirm("Delete this memory? This can't be undone.")) return;
    setMemories((v) => v.filter((m) => m.id !== id));
    toast.success("Memory deleted");
  };

  const copyOne = async (m: Memory) => {
    const ok = await copyText(memoryToMarkdown(m));
    toast[ok ? "success" : "error"](ok ? "Copied as Markdown" : "Copy failed");
  };

  const downloadOne = (m: Memory) => {
    downloadFile(`${slugify(m.title)}.md`, memoryToMarkdown(m), "text/markdown");
    toast.success("Downloaded .md");
  };

  const exportJSON = () => {
    downloadFile("agent-memory-notes.json", JSON.stringify(memories, null, 2), "application/json");
    toast.success("Exported JSON");
  };

  const exportMD = () => {
    downloadFile("agent-memory-notes.md", memoriesToAgentMarkdown(memories), "text/markdown");
    toast.success("Exported Markdown");
  };

  const copyAllForAgent = async () => {
    if (!memories.length) {
      toast.error("No memories to copy yet");
      return;
    }
    const ok = await copyText(memoriesToAgentMarkdown(memories));
    toast[ok ? "success" : "error"](
      ok ? "Copied! Paste it into your agent's prompt" : "Copy failed"
    );
  };

  const onImportFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const items = parseImportFile(String(reader.result ?? ""));
        if (!items.length) {
          toast.error("No valid memories found in that file");
          return;
        }
        const now = Date.now();
        const fresh: Memory[] = items.map((it) => ({ ...it, id: uid(), createdAt: now, updatedAt: now }));
        setMemories((v) => [...fresh, ...v]);
        toast.success(`Imported ${fresh.length} ${fresh.length === 1 ? "memory" : "memories"}`);
      } catch {
        toast.error("Couldn't read that file — is it valid JSON?");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen app-root">
      <header className="app-header">
        <div className="mx-auto flex h-[70px] max-w-6xl items-center justify-between px-5">
          <div className="flex items-center gap-3">
            <div className="logo-box">
              <Brain size={19} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <b className="display">Agent Memory Notes</b>
                <span className="badge">OPEN SOURCE</span>
              </div>
              <p className="sub">Local-first memory for you &amp; your AI agents</p>
            </div>
          </div>
          <button className="icon-btn" onClick={toggleTheme} title="Toggle theme">
            {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-10">
        <div className="mb-9">
          <div className="eyebrow">
            <Sparkles size={14} /> LOCAL-FIRST MEMORY / 02
          </div>
          <h1 className="hero display">Remember everything. Feed it to your agent.</h1>
          <p className="hero-sub sub">
            Capture notes, preferences and context. Everything stays in your browser —
            export it as Markdown or JSON whenever your AI agent needs to know.
          </p>
        </div>

        <div className="stats-row">
          <div className="stat">
            <b>{memories.length}</b>
            <span className="sub">memories</span>
          </div>
          <div className="stat">
            <b>{pinnedCount}</b>
            <span className="sub">pinned</span>
          </div>
          <div className="stat">
            <b>{tags.length}</b>
            <span className="sub">tags</span>
          </div>
          <div className="tag-cloud">
            {tags.slice(0, 12).map(([t, n]) => (
              <button
                key={t}
                className={`tag-chip clickable${activeTag === t ? " selected" : ""}`}
                onClick={() => setActiveTag((v) => (v === t ? null : t))}
              >
                {t} <i>{n}</i>
              </button>
            ))}
            {tags.length === 0 && <span className="sub">Tags you add will show up here</span>}
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[.9fr_1.1fr]">
          <section className="panel capture">
            <div className="eyebrow">
              <Plus size={14} /> QUICK CAPTURE
            </div>
            <label className="field">
              <span>Title</span>
              <input
                value={capTitle}
                onChange={(e) => setCapTitle(e.target.value)}
                placeholder="e.g. My coding preferences"
                maxLength={200}
              />
            </label>
            <label className="field">
              <span>Memory (Markdown supported)</span>
              <textarea
                value={capBody}
                onChange={(e) => setCapBody(e.target.value)}
                placeholder={"What should you — and your agent — remember?\n\n- Use bullet points\n- **Bold** what matters"}
                rows={7}
              />
            </label>
            <label className="field">
              <span>Tags (comma separated)</span>
              <input
                value={capTags}
                onChange={(e) => setCapTags(e.target.value)}
                placeholder="preferences, coding"
              />
            </label>
            <button className="primary wide" onClick={capture}>
              <Plus size={15} /> Save memory
            </button>
            <p className="sub capture-hint">Saved instantly to this browser. Nothing leaves your device.</p>
          </section>

          <section>
            <div className="toolbar">
              <label className="search">
                <Search size={15} />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search memories…"
                />
              </label>
              <div className="toolbar-btns">
                <button className="ghost sm" onClick={copyAllForAgent} title="Copy all memories as one agent-ready prompt">
                  <ClipboardCopy size={13} /> For agent
                </button>
                <button className="ghost sm" onClick={exportMD} title="Download all as Markdown">
                  <Download size={13} /> .md
                </button>
                <button className="ghost sm" onClick={exportJSON} title="Download all as JSON">
                  <Download size={13} /> .json
                </button>
                <button className="ghost sm" onClick={() => fileRef.current?.click()} title="Import from JSON">
                  <Upload size={13} /> Import
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".json,application/json"
                  hidden
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) onImportFile(f);
                    e.target.value = "";
                  }}
                />
              </div>
            </div>

            {(query || activeTag) && (
              <div className="filter-note">
                <span className="sub">
                  {filtered.length} result{filtered.length === 1 ? "" : "s"}
                  {activeTag && (
                    <>
                      {" "}tagged <b>#{activeTag}</b>{" "}
                      <button className="link" onClick={() => setActiveTag(null)}>
                        clear
                      </button>
                    </>
                  )}
                </span>
              </div>
            )}

            <div className="mem-list">
              {filtered.map((m) => (
                <MemoryCard
                  key={m.id}
                  memory={m}
                  onTogglePin={togglePin}
                  onOpen={setOpenId}
                  onCopy={copyOne}
                  onDownload={downloadOne}
                  onDelete={remove}
                />
              ))}
              {filtered.length === 0 && (
                <div className="panel empty-state">
                  <Brain size={28} className="empty-icon" />
                  <b className="display">No memories found</b>
                  <p className="sub">
                    {memories.length === 0
                      ? "Capture your first memory on the left to get started."
                      : "Try a different search or clear the tag filter."}
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>

      <footer className="app-footer">
        <span className="sub">
          100% local — your memories never leave this browser. Export anytime.
        </span>
      </footer>

      <MemoryDialog
        memory={openMemory}
        onClose={() => setOpenId(null)}
        onSave={saveEdit}
        onCopy={copyOne}
        onDownload={downloadOne}
        onDelete={remove}
      />
    </div>
  );
}
