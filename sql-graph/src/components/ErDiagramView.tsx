import React from "react";
import type { JobErSpec, JoinEntry } from "../types";

type Props = {
  spec: JobErSpec;
  onBack: () => void;
};

type TablePos = { x: number; y: number };

const ErDiagramView: React.FC<Props> = ({ spec, onBack }) => {
  const width = 900;
  const height = 540;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = 180;

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
    <div className="er-layout">
      <header className="er-header">
        <button className="btn btn-ghost" onClick={onBack}>
          ← Back to job graph
        </button>
        <div className="er-header-title">
          ER view for: <span className="er-header-job">{spec.job_name}</span>
        </div>
      </header>

      <div className="er-main">
        <div className="er-diagram-wrapper">
          <svg
            width={width}
            height={height}
            className="er-diagram"
          >
            {/* Joins as lines */}
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
                    <>
                      <rect
                        x={midX - 60}
                        y={midY - 12}
                        width={120}
                        height={24}
                        rx={6}
                        fill="#ffffff"
                        stroke={stroke}
                        strokeWidth={0.8}
                      />
                      <text
                        x={midX}
                        y={midY + 3}
                        textAnchor="middle"
                        fontSize={10}
                        fill={stroke}
                      >
                        {label}
                      </text>
                    </>
                  )}
                </g>
              );
            })}

            {/* Tables as nodes */}
            {spec.tables.map(t => {
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

        <aside className="er-sidebar">
          <div className="er-section-title">Tables</div>
          <ul className="er-table-list">
            {spec.tables.map(t => (
              <li key={t}>{t}</li>
            ))}
          </ul>

          <div className="er-section-title">Joins</div>
          <div className="er-join-list">
            {allJoins.length === 0 && (
              <div className="er-join-empty">No joins detected</div>
            )}
            {allJoins.map((j, idx) => (
              <div key={idx} className="er-join-card">
                <div className="er-join-card-header">
                  <span className="er-join-tables">
                    {j.join.tablesUsed.join(" ⇄ ")}
                  </span>
                  <span className={`er-join-badge er-join-badge--${j.type}`}>
                    {j.type.toUpperCase()}
                  </span>
                </div>
                {j.join.attr_list?.length ? (
                  <ul className="er-join-attrs">
                    {j.join.attr_list.map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                ) : (
                  <div className="er-join-empty">No attributes listed</div>
                )}
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
};

export default ErDiagramView;
