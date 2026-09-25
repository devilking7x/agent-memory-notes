export interface Memory {
  id: string;
  title: string;
  body: string;
  tags: string[];
  pinned: boolean;
  createdAt: number;
  updatedAt: number;
  /** Last time the user actually looked at this memory (dialog open or review). */
  lastViewedAt?: number;
}

const STORAGE_KEY = "agent-memory-notes:v1";
const SEED_KEY = "agent-memory-notes:seeded:v1";

export const uid = (): string =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;

export const slugify = (s: string): string =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "memory";

export const formatDate = (ts: number): string =>
  new Date(ts).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

export const formatDateTime = (ts: number): string =>
  new Date(ts).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const SAMPLES: Array<Omit<Memory, "id" | "createdAt" | "updatedAt">> = [
  {
    title: "My coding preferences",
    body: "When writing code for me:\n\n- **TypeScript first**, strict mode, no `any`\n- Small focused functions over clever one-liners\n- Comments only where the *why* isn't obvious\n- Prefer editing existing code over adding new files",
    tags: ["preferences", "coding"],
    pinned: true,
  },
  {
    title: "How I like code reviews",
    body: "When an AI agent reviews my code:\n\n1. Point out bugs and security issues first\n2. Then suggest simplifications\n3. Don't nitpick formatting — that's the formatter's job\n4. Give the fix, not just the complaint",
    tags: ["agent", "instructions"],
    pinned: true,
  },
  {
    title: "Project context: Agent Memory Notes",
    body: "Open-source, local-first memory app.\n\n- **Stack:** Vite + React 19 + TypeScript + Tailwind 4\n- **Storage:** browser localStorage, no backend\n- **Goal:** capture memories, export them into AI agent prompts\n- Everything must work offline after first load",
    tags: ["project", "context"],
    pinned: false,
  },
  {
    title: "Writing style guide",
    body: "My writing rules:\n\n- Short sentences. No fluff.\n- Active voice, concrete examples\n- Never start with \"In today's fast-paced world\"\n- Headers over walls of text",
    tags: ["writing", "preferences"],
    pinned: false,
  },
  {
    title: "Weekly sync template",
    body: "## Weekly sync\n\n- **Shipped:** \n- **In progress:** \n- **Blocked on:** \n- **Next week:** \n\nKeep it under 5 minutes. Numbers over adjectives.",
    tags: ["work", "template"],
    pinned: false,
  },
  {
    title: "Startup idea: local-first tools",
    body: "Small single-purpose tools that run 100% in the browser.\n\nWhy it works:\n\n- Zero server cost, infinite scale\n- Privacy is the feature\n- Ship fast with a shared template\n\nValidate: 3 tools live, watch which gets stars.",
    tags: ["ideas"],
    pinned: false,
  },
  {
    title: "Book notes: Deep Work",
    body: "Key ideas worth remembering:\n\n- **Deep work** = cognitively demanding work done distraction-free\n- Schedule it like a meeting, don't wait for motivation\n- Shallow work expands to fill the day if you let it\n- My rule: 2 deep blocks before noon",
    tags: ["learning", "books"],
    pinned: false,
  },
  {
    title: "Travel packing checklist",
    body: "- [ ] Passport + visa docs\n- [ ] Laptop charger + universal adapter\n- [ ] Noise-cancelling headphones\n- [ ] Medicines\n- [ ] Offline maps downloaded",
    tags: ["personal", "checklist"],
    pinned: false,
  },
];

function seed(): Memory[] {
  const now = Date.now();
  return SAMPLES.map((s, i) => ({
    ...s,
    id: uid() + i,
    createdAt: now - (SAMPLES.length - i) * 60_000,
    updatedAt: now - (SAMPLES.length - i) * 60_000,
  }));
}

export function loadMemories(): Memory[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed))
        // Backfill lastViewedAt for memories saved before view-tracking existed.
        return (parsed as Memory[]).map((m) => ({
          ...m,
          lastViewedAt: m.lastViewedAt ?? m.createdAt,
        }));
    }
    if (!localStorage.getItem(SEED_KEY)) {
      const seeded = seed();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
      localStorage.setItem(SEED_KEY, "1");
      return seeded;
    }
    return [];
  } catch {
    return [];
  }
}

/** When the user opens a memory, record that it was (re)seen. */
export function markViewed(memories: Memory[], id: string): Memory[] {
  return memories.map((m) =>
    m.id === id ? { ...m, lastViewedAt: Date.now() } : m
  );
}

/** Memories ordered least-recently-viewed first — the spaced-review queue. */
export function reviewQueue(memories: Memory[]): Memory[] {
  return [...memories].sort(
    (a, b) => (a.lastViewedAt ?? a.createdAt) - (b.lastViewedAt ?? b.createdAt)
  );
}

export function formatRelativeTime(ts: number | undefined): string {
  if (!ts) return "never";
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w}w ago`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(d / 365)}y ago`;
}

export function persistMemories(memories: Memory[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(memories));
  } catch {
    /* storage full or unavailable — keep in-memory */
  }
}

export function memoryToMarkdown(m: Memory): string {
  const lines = [`# ${m.title}`, ""];
  if (m.body.trim()) lines.push(m.body.trim(), "");
  if (m.tags.length) lines.push(`Tags: ${m.tags.join(", ")}`, "");
  lines.push(`Created: ${new Date(m.createdAt).toISOString().slice(0, 10)}`);
  return lines.join("\n");
}

/** One paste-ready block for an AI agent system prompt. */
export function memoriesToAgentMarkdown(list: Memory[]): string {
  const header = [
    "# My memories",
    "",
    "The following are things I want you to remember about me.",
    "Use them as context when helping me.",
    "",
    "---",
    "",
  ];
  return (
    header.join("\n") + list.map(memoryToMarkdown).join("\n\n---\n\n") + "\n"
  );
}

export function downloadFile(name: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch {
      ok = false;
    }
    ta.remove();
    return ok;
  }
}

/* ---------------- CSV export / import ---------------- */

const CSV_HEADERS = [
  "id",
  "title",
  "body",
  "tags",
  "pinned",
  "createdAt",
  "updatedAt",
  "lastViewedAt",
] as const;

function csvCell(value: string | number | boolean): string {
  const s = String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Export all memories as RFC-4180 CSV (tags joined with ";"). */
export function memoriesToCSV(list: Memory[]): string {
  const rows = list.map((m) =>
    [
      m.id,
      m.title,
      m.body,
      m.tags.join(";"),
      m.pinned,
      m.createdAt,
      m.updatedAt,
      m.lastViewedAt ?? m.createdAt,
    ]
      .map(csvCell)
      .join(",")
  );
  return [CSV_HEADERS.join(","), ...rows].join("\r\n") + "\r\n";
}

/** Minimal RFC-4180 CSV parser (handles quoted fields, escaped quotes, CRLF). */
function parseCSVRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.length > 1 || row[0] !== "") rows.push(row);
      row = [];
    } else {
      field += c;
    }
  }
  row.push(field);
  if (row.length > 1 || row[0] !== "") rows.push(row);
  return rows;
}

const num = (v: string | undefined): number | undefined => {
  if (v == null || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

/** Parse a CSV previously produced by memoriesToCSV (or hand-made with the same headers). */
export function parseCSVFile(text: string): Omit<Memory, "id" | "createdAt" | "updatedAt">[] {
  const rows = parseCSVRows(text);
  if (!rows.length) return [];
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const idx = (name: string) => header.indexOf(name);
  const ti = idx("title");
  if (ti === -1) return [];
  const bi = idx("body");
  const gi = idx("tags");
  const pi = idx("pinned");
  const out: Omit<Memory, "id" | "createdAt" | "updatedAt">[] = [];
  for (const r of rows.slice(1)) {
    const title = (r[ti] ?? "").trim().slice(0, 200);
    if (!title) continue;
    out.push({
      title,
      body: bi === -1 ? "" : (r[bi] ?? "").slice(0, 20000),
      tags:
        gi === -1
          ? []
          : (r[gi] ?? "")
              .split(/[;,]/)
              .map((t) => t.trim().toLowerCase().replace(/\s+/g, "-"))
              .filter(Boolean)
              .slice(0, 12),
      pinned: pi !== -1 && /^(true|1|yes)$/i.test((r[pi] ?? "").trim()),
      // Preserve original timestamps when present so re-imports keep history.
      ...(num(r[idx("createdAt")]) !== undefined || num(r[idx("updatedAt")]) !== undefined
        ? {
            createdAt: num(r[idx("createdAt")]) ?? Date.now(),
            updatedAt: num(r[idx("updatedAt")]) ?? Date.now(),
          }
        : {}),
    } as Omit<Memory, "id" | "createdAt" | "updatedAt">);
  }
  return out;
}

/* ---------------- duplicate detection ---------------- */

const STOPWORDS = new Set(
  "a,an,the,and,or,but,if,then,else,for,to,of,in,on,at,by,with,from,as,is,are,was,were,be,been,being,it,its,this,that,these,those,i,you,he,she,we,they,my,your,his,her,our,their,me,him,us,them,do,does,did,not,no,yes,so,than,too,very,can,will,just,into,over,after,before,when,what,which,who,how,all,any,each,few,more,most,other,some,such,only,own,same".split(
    ","
  )
);

function tokens(s: string): Set<string> {
  const set = new Set<string>();
  for (const w of s.toLowerCase().split(/[^a-z0-9]+/)) {
    if (w.length > 2 && !STOPWORDS.has(w)) set.add(w);
  }
  return set;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size && !b.size) return 1;
  if (!a.size || !b.size) return 0;
  let inter = 0;
  a.forEach((w) => {
    if (b.has(w)) inter++;
  });
  return inter / (a.size + b.size - inter);
}

/**
 * Fuzzy-match a draft memory against existing ones.
 * Returns up to `limit` matches above the similarity threshold, best first.
 */
export function findSimilarMemories(
  title: string,
  body: string,
  memories: Memory[],
  limit = 3
): Array<{ memory: Memory; score: number }> {
  const newTitle = tokens(title);
  const newAll = tokens(`${title} ${body}`);
  if (!newAll.size) return [];
  const scored = memories
    .map((m) => {
      const titleScore = jaccard(newTitle, tokens(m.title));
      const bodyScore = jaccard(newAll, tokens(`${m.title} ${m.body}`));
      return { memory: m, score: 0.5 * titleScore + 0.5 * bodyScore };
    })
    .filter((s) => s.score >= 0.45)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
  return scored;
}

/* ---------------- stats ---------------- */

export interface WeekBucket {
  /** Timestamp of the week's Monday 00:00 (local). */
  start: number;
  label: string;
  count: number;
}

/** Memories created per week for the last `weeks` weeks (oldest → newest). */
export function weeklyActivity(memories: Memory[], weeks = 12): WeekBucket[] {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  now.setDate(now.getDate() - ((now.getDay() + 6) % 7)); // back to Monday
  const buckets: WeekBucket[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const start = now.getTime() - i * 7 * 24 * 60 * 60 * 1000;
    const end = start + 7 * 24 * 60 * 60 * 1000;
    const count = memories.filter(
      (m) => m.createdAt >= start && m.createdAt < end
    ).length;
    buckets.push({
      start,
      label: new Date(start).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
      count,
    });
  }
  return buckets;
}

export function parseImportFile(text: string): Omit<Memory, "id" | "createdAt" | "updatedAt">[] {
  const parsed: unknown = JSON.parse(text);
  const arr = Array.isArray(parsed) ? parsed : [parsed];
  const out: Omit<Memory, "id" | "createdAt" | "updatedAt">[] = [];
  for (const item of arr) {
    if (typeof item !== "object" || item === null) continue;
    const rec = item as Record<string, unknown>;
    if (typeof rec.title !== "string" || !rec.title.trim()) continue;
    out.push({
      title: rec.title.trim().slice(0, 200),
      body: typeof rec.body === "string" ? rec.body.slice(0, 20000) : "",
      tags: Array.isArray(rec.tags)
        ? rec.tags.filter((t): t is string => typeof t === "string").map((t) => t.trim().toLowerCase().replace(/\s+/g, "-")).filter(Boolean).slice(0, 12)
        : [],
      pinned: rec.pinned === true,
    });
  }
  return out;
}
