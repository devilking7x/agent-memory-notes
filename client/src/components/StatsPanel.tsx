import { useMemo } from "react";
import { BarChart3, Tags } from "lucide-react";
import { weeklyActivity, type Memory } from "@/lib/memory";

const W = 640;
const H = 210;
const PAD_L = 10;
const PAD_R = 10;
const PAD_T = 22;
const PAD_B = 30;

export default function StatsPanel({ memories }: { memories: Memory[] }) {
  const weeks = useMemo(() => weeklyActivity(memories, 12), [memories]);

  const topTags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const m of memories)
      for (const t of m.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  }, [memories]);

  const max = Math.max(1, ...weeks.map((w) => w.count));
  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - PAD_B;
  const slot = plotW / weeks.length;
  const barW = Math.min(34, slot * 0.58);
  const gridSteps = [0.25, 0.5, 0.75, 1].map((f) => Math.ceil(max * f));

  return (
    <section className="panel stats-panel" aria-label="Memory insights">
      <div className="stats-grid">
        <div>
          <div className="eyebrow stats-eyebrow">
            <BarChart3 size={14} /> CAPTURE ACTIVITY — LAST 12 WEEKS
          </div>
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="chart"
            role="img"
            aria-label="Bar chart of memories created per week"
          >
            {gridSteps.map((g) => {
              const y = PAD_T + plotH - (g / max) * plotH;
              return (
                <g key={g}>
                  <line
                    x1={PAD_L}
                    x2={W - PAD_R}
                    y1={y}
                    y2={y}
                    className="chart-grid"
                  />
                  <text x={W - PAD_R} y={y - 4} className="chart-tick" textAnchor="end">
                    {g}
                  </text>
                </g>
              );
            })}
            {weeks.map((w, i) => {
              const h = (w.count / max) * plotH;
              const x = PAD_L + i * slot + (slot - barW) / 2;
              const y = PAD_T + plotH - h;
              return (
                <g key={w.start}>
                  <title>
                    {w.count} {w.count === 1 ? "memory" : "memories"} · week of {w.label}
                  </title>
                  <rect
                    x={x}
                    y={y}
                    width={barW}
                    height={Math.max(h, w.count > 0 ? 3 : 0)}
                    rx={5}
                    className={w.count > 0 ? "chart-bar" : "chart-bar empty"}
                  />
                  {w.count > 0 && (
                    <text x={x + barW / 2} y={y - 6} className="chart-val" textAnchor="middle">
                      {w.count}
                    </text>
                  )}
                  {i % 2 === 0 && (
                    <text
                      x={x + barW / 2}
                      y={H - 10}
                      className="chart-tick"
                      textAnchor="middle"
                    >
                      {w.label}
                    </text>
                  )}
                </g>
              );
            })}
            <line
              x1={PAD_L}
              x2={W - PAD_R}
              y1={PAD_T + plotH}
              y2={PAD_T + plotH}
              className="chart-axis"
            />
          </svg>
        </div>

        <div>
          <div className="eyebrow stats-eyebrow">
            <Tags size={14} /> TOP TAGS
          </div>
          {topTags.length === 0 ? (
            <p className="sub" style={{ marginTop: 12 }}>
              Tags you add will show up here.
            </p>
          ) : (
            <div className="tagbars">
              {topTags.map(([t, n]) => (
                <div className="tagbar" key={t}>
                  <span className="tagbar-label">{t}</span>
                  <div className="tagbar-track">
                    <div
                      className="tagbar-fill"
                      style={{ width: `${(n / topTags[0][1]) * 100}%` }}
                    />
                  </div>
                  <span className="tagbar-count">{n}</span>
                </div>
              ))}
            </div>
          )}
          <div className="stats-facts">
            <div className="stats-fact">
              <b>
                {memories.filter((m) => {
                  const d = new Date(m.createdAt);
                  const now = new Date();
                  return (
                    d.getFullYear() === now.getFullYear() &&
                    d.getMonth() === now.getMonth()
                  );
                }).length}
              </b>
              <span className="sub">added this month</span>
            </div>
            <div className="stats-fact">
              <b>
                {
                  memories.filter((m) => {
                    const seen = m.lastViewedAt ?? m.createdAt;
                    return Date.now() - seen > 30 * 24 * 60 * 60 * 1000;
                  }).length
                }
              </b>
              <span className="sub">unseen for 30+ days</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
