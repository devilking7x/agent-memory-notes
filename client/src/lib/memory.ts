export interface Memory {
  id: string;
  title: string;
  body: string;
  tags: string[];
  pinned: boolean;
  createdAt: number;
  updatedAt: number;
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
      if (Array.isArray(parsed)) return parsed as Memory[];
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
