import React from "react";
import type { JobErSpec, JoinEntry } from "../types";

type Props = {
  spec: JobErSpec;
  onBack: () => void;
};

type TablePos = { x: number; y: number };

export default function ErDiagramView({ spec, onBack }: Props) {
  const width = 900;
  const height = 540;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = 180;

  // Place tables in a circle
  const tablePositions: Record<string, TablePos> = {};
  const n = spec.tables.length || 1;

  spec.tables.forEach((t, idx) => {
    const angle = (2 * Math.PI * idx) / n - Math.PI / 2;
    tablePositions[t] = {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
    };
  });

  const allJoins: { type: "inner" | "left" | "right"; join: JoinEntry }[] = [];

  (spec.innerJoin || []).forEach(j => allJoins.push({ type: "inner", join: j }));
  (spec.leftJoin || []).forEach(j => allJoins.push({ type: "left", join: j }));
  (spec.rightJoin || []).forEach(j => allJoins.push({ type: "right", join: j }));

  const joinColor: Record<"inner" | "left" | "right", string> = {
    inner: "#2563eb",
    left: "#16a34a",
    right: "#dc2626",
  };

  return (
    <div className="w-full h-screen bg-zinc-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-zinc-200 bg-white">
        <button
          onClick={onBack}
          className="px-3 py-1.5 rounded-lg border border-zinc-300 text-sm hover:bg-zinc-100"
        >
          ← Back to job graph
        </button>
        <div className="text-sm text-zinc-500">
          ER view for: <span className="font-semibold text-zinc-800">{spec.job_name}</span>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1">
        {/* Diagram */}
        <div className="flex-1 flex items-center justify-center">
          <svg width={width} height={height} className="bg-white rounded-xl shadow border border-zinc-200">
            {/* Joins as edges */}
            {allJoins.map((j, idx) => {
              const t0 = j.join.tablesUsed[0];
              const t1 = j.join.tablesUsed[1];
              if (!t0 || !t1) return null;

              const p0 = tablePositions[t0];
              const p1 = tablePositions[t1];
              if (!p0 || !p1) return null;

              const stroke = joinColor[j.type];

              const midX = (p0.x + p1.x) / 2;
              const midY = (p0.y + p1.y) / 2;
              const label = j.join.attr_list?.[0] || "";

              return (
                <g key={idx}>
                  <line
                    x1={p0.x}
                    y1={p0.y}
                    x2={p1.x}
                    y2={p1.y}
                    stroke={stroke}
                    strokeWidth={2}
                  />
                  {label && (
                    <rect
                      x={midX - 60}
                      y={midY - 12}
                      width={120}
                      height={24}
                      rx={6}
                      fill="white"
                      stroke={stroke}
                      strokeWidth={0.8}
                    />
                  )}
                  {label && (
                    <text
                      x={midX}
                      y={midY + 3}
                      textAnchor="middle"
                      fontSize={10}
                      fill={stroke}
                    >
                      {label}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Tables as nodes */}
            {spec.tables.map((t) => {
              const pos = tablePositions[t];
              if (!pos) return null;
              const w = 120;
              const h = 40;
              return (
                <g key={t}>
                  <rect
                    x={pos.x - w / 2}
                    y={pos.y - h / 2}
                    width={w}
                    height={h}
                    rx={10}
                    fill="#f9fafb"
                    stroke="#9ca3af"
                  />
                  <text
                    x={pos.x}
                    y={pos.y + 4}
                    textAnchor="middle"
                    fontSize={11}
                    fill="#111827"
                  >
                    {t}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Sidebar: join list */}
        <div className="w-80 border-l border-zinc-200 bg-white p-4 overflow-auto">
          <div className="text-xs font-semibold text-zinc-500 uppercase mb-2">
            Tables
          </div>
          <ul className="mb-4 text-sm text-zinc-700">
            {spec.tables.map(t => (
              <li key={t} className="py-0.5">{t}</li>
            ))}
          </ul>

          <div className="text-xs font-semibold text-zinc-500 uppercase mb-2">
            Joins
          </div>
          <div className="space-y-2 text-xs text-zinc-700">
            {allJoins.length === 0 && <div className="text-zinc-400">No joins detected</div>}
            {allJoins.map((j, idx) => (
              <div key={idx} className="border border-zinc-200 rounded-lg p-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium">
                    {j.join.tablesUsed.join(" ⇄ ")}
                  </span>
                  <span
                    className={
                      "px-1.5 py-0.5 rounded-full text-[10px] font-medium " +
                      (j.type === "inner"
                        ? "bg-blue-50 text-blue-700"
                        : j.type === "left"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-rose-50 text-rose-700")
                    }
                  >
                    {j.type.toUpperCase()}
                  </span>
                </div>
                {j.join.attr_list?.length ? (
                  <ul className="list-disc list-inside">
                    {j.join.attr_list.map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-zinc-400">No attributes listed</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
