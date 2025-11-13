import React, { useState } from "react";
import { ArrowLeft, Database, Link2, Key } from "lucide-react";

/**
 * Props expected:
 * - fileName: string
 * - tables: [
 *     {
 *       id: string;
 *       name: string;
 *       position: { x: number; y: number };
 *       columns: [{ name: string, isPrimaryKey?: boolean, isForeignKey?: boolean } | string]
 *     }
 *   ]
 * - joins: [
 *     {
 *       from: string;
 *       to: string;
 *       type: "INNER" | "LEFT" | "RIGHT";
 *       condition: string;
 *       fields: [{ from: string; to: string }]
 *     }
 *   ]
 * - onBack: () => void
 */

// --- Join helpers: used for sidebar badges, path colors, and bubbles ---

export function getJoinTypeClass(type) {
  switch (type) {
    case "INNER":
      return "er-badge-inner";
    case "LEFT":
      return "er-badge-left";
    case "RIGHT":
      return "er-badge-right";
    default:
      return "er-badge-default";
  }
}

export function getJoinStrokeColor(type) {
  switch (type) {
    case "INNER":
      return "#3b82f6"; // blue
    case "LEFT":
      return "#22c55e"; // green
    case "RIGHT":
      return "#f97316"; // orange
    default:
      return "#6b7280"; // gray
  }
}

export function getJoinBubbleStyle(type) {
  switch (type) {
    case "INNER":
      return {
        fill: "#dbeafe",
        stroke: "#93c5fd",
        text: "#1d4ed8",
      };
    case "LEFT":
      return {
        fill: "#dcfce7",
        stroke: "#86efac",
        text: "#15803d",
      };
    case "RIGHT":
      return {
        fill: "#ffedd5",
        stroke: "#fed7aa",
        text: "#c2410c",
      };
    default:
      return {
        fill: "#e5e7eb",
        stroke: "#d1d5db",
        text: "#4b5563",
      };
  }
}


export default function ErDiagramView({ fileName, tables, joins, onBack }) {
  const safeTables = Array.isArray(tables) ? tables : [];
  const safeJoins = Array.isArray(joins) ? joins : [];

  const [selectedTable, setSelectedTable] = useState(
    safeTables.length > 0 ? safeTables[0] : null
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleTableClick = (table) => {
    setSelectedTable(table);
    setIsDialogOpen(true);
  };

  // Sidebar badge style
  const getJoinTypeClass = (type) => {
    switch (type) {
      case "INNER":
        return "er-badge-outline er-badge-inner";
      case "LEFT":
        return "er-badge-outline er-badge-left";
      case "RIGHT":
        return "er-badge-outline er-badge-right";
      default:
        return "er-badge-outline er-badge-default";
    }
  };

  // Line colors per join type
  const getJoinStrokeColor = (type) => {
    switch (type) {
      case "INNER":
        return "#3b82f6"; // blue
      case "LEFT":
        return "#16a34a"; // green
      case "RIGHT":
        return "#f97316"; // orange
      default:
        return "#64748b"; // gray
    }
  };


  const getJoinBubbleStyle = (type) => {
    switch (type) {
      case "INNER":
        return {
          fill: "#dbeafe",
          stroke: "#93c5fd",
          text: "#1d4ed8",
        };
      case "LEFT":
        return {
          fill: "#dcfce7",
          stroke: "#86efac",
          text: "#15803d",
        };
      case "RIGHT":
        return {
          fill: "#ffedd5",
          stroke: "#fed7aa",
          text: "#c2410c",
        };
      default:
        return {
          fill: "#e5e7eb",
          stroke: "#d1d5db",
          text: "#4b5563",
        };
    }
  };


  const renderConnections = () => {
  if (!safeJoins.length || !safeTables.length) return null;

  // Lane index per pair (Job1->Job2 etc.) so multiple joins don't overlap
  const laneMap = {};

  return safeJoins.map((join, index) => {
    const fromTable = safeTables.find((t) => t.name === join.from);
    const toTable = safeTables.find((t) => t.name === join.to);
    if (!fromTable || !toTable) return null;

    // Base geometry: vertical stack, same X, different Y
    const cardCenterX = fromTable.position.x + 100; // roughly card center
    const startX = cardCenterX;
    const startY = fromTable.position.y + 30;
    const endX = cardCenterX;
    const endY = toTable.position.y + 30;

    // Lane index for this pair (so multiple joins fan out)
    const laneKey = `${join.from}::${join.to}`;
    const laneIndex = laneMap[laneKey] || 0;
    laneMap[laneKey] = laneIndex + 1;

    // Alternate left/right: -1, +1, -2, +2, ...
    const dir = laneIndex % 2 === 0 ? -1 : 1;
    const laneStep = Math.ceil((laneIndex + 1) / 2); // 1,1,2,2,3,3...
    const horizontalOffset = dir * laneStep * 150;    // 60px per lane

    // Midpoint of the curve, pushed left/right
    const baseMidY = (startY + endY) / 2;
    const midX = cardCenterX + horizontalOffset;
    const midY = baseMidY;

    const stroke = getJoinStrokeColor(join.type);
    const bubble = getJoinBubbleStyle(join.type);

    return (
      <g key={index}>
        {/* main curved line */}
        <path
          d={`M ${startX} ${startY} Q ${midX} ${startY}, ${midX} ${midY} T ${endX} ${endY}`}
          stroke={stroke}
          strokeWidth="2"
          fill="none"
        />

        {/* small dot at destination */}
        <circle cx={endX} cy={endY} r="4" fill={stroke} />

        {/* join-type bubble above the line */}
        <g>
          <rect
            x={midX - 22}
            y={midY - 22}
            width={44}
            height={16}
            rx={8}
            ry={8}
            fill={bubble.fill}
            stroke={bubble.stroke}
          />
          <text
            x={midX}
            y={midY - 10}
            textAnchor="middle"
            style={{
              fontSize: "10px",
              fill: bubble.text,
              fontWeight: 600,
            }}
          >
            {join.type || "JOIN"}
          </text>
        </g>

        {/* join condition text a little below the bubble */}
        {join.condition && (
          <text
            x={midX}
            y={midY + 6}
            textAnchor="middle"
            style={{ fontSize: "11px", fill: stroke }}
          >
            {join.condition}
          </text>
        )}
      </g>
    );
  });
};

  const selectedColumns = Array.isArray(selectedTable?.columns)
    ? selectedTable.columns
    : [];

  return (
    <>
      {/* === MAIN LAYOUT === */}
      <div className="er-layout">
        {/* LEFT: main column */}
        <div className="er-main">
          {/* Header */}
          <header className="er-header">
            <div className="er-header-inner">
              <button className="er-btn-ghost" onClick={onBack}>
                <ArrowLeft className="er-icon-xs" />
                <span>Back to job graph</span>
              </button>
              <div className="er-header-title">
                <Database className="er-icon-xs-muted" />
                <span className="er-header-label">ER view for:</span>
                <span className="er-header-job">{fileName}</span>
              </div>
            </div>
          </header>

          {/* Canvas */}
          <div className="er-canvas-wrapper">
            <div className="er-canvas-card">
              <svg className="er-canvas-grid">
                <defs>
                  <pattern
                    id="er-grid"
                    width="20"
                    height="20"
                    patternUnits="userSpaceOnUse"
                  >
                    <circle cx="1" cy="1" r="1" fill="#e2e8f0" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#er-grid)" />
                {renderConnections()}
              </svg>

              {/* Table nodes */}
              {safeTables.map((table) => (
                <div
                  key={table.id}
                  className="er-table-card"
                  style={{
                    left: `${table.position.x}px`,
                    top: `${table.position.y}px`,
                    minWidth: "240px",
                  }}
                  onClick={() => handleTableClick(table)}
                >
                  <div className="er-table-card-header">
                    <div className="er-table-card-title">
                      <Database className="er-icon-sm" />
                      <span>{table.name}</span>
                    </div>
                    <span className="er-badge-muted">
                      {(table.columns && table.columns.length) || 0} cols
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT: sidebar */}
        <aside className="er-sidebar">
          <div className="er-sidebar-scroll">
            <div className="er-sidebar-section">
              {/* Tables list */}
              <section>
                <div className="er-section-title-row">
                  <Database className="er-icon-xs" />
                  <h3 className="er-section-title">Tables</h3>
                </div>
                <div className="er-table-list">
                  {safeTables.map((table) => (
                    <button
                      key={table.id}
                      className="er-table-list-item"
                      onClick={() => handleTableClick(table)}
                    >
                      <span className="er-table-list-name">{table.name}</span>
                      <span className="er-badge-muted">
                        {(table.columns && table.columns.length) || 0}
                      </span>
                    </button>
                  ))}
                  {safeTables.length === 0 && (
                    <div className="er-empty-text">
                      No tables were detected for this job.
                    </div>
                  )}
                </div>
              </section>

              <div className="er-separator" />

              {/* Joins list */}
              <section>
                <div className="er-section-title-row">
                  <Link2 className="er-icon-xs" />
                  <h3 className="er-section-title">Joins</h3>
                </div>
                <div className="er-join-list">
                  {safeJoins.length === 0 && (
                    <div className="er-empty-text">
                      No join information found for this job.
                    </div>
                  )}
                  {safeJoins.map((join, idx) => (
                    <div key={idx} className="er-join-card">
                      <div className="er-join-card-header">
                        <div className="er-join-main">
                          <span className="er-join-table">{join.from}</span>
                          <span className="er-join-eq">↔</span>
                          <span className="er-join-table">{join.to}</span>
                        </div>
                        <span className={getJoinTypeClass(join.type)}>
                          {join.type || "JOIN"}
                        </span>
                      </div>
                      <div className="er-join-fields">
                        {(join.fields || []).map((field, fIdx) => (
                          <div key={fIdx} className="er-join-field-row">
                            <span className="er-join-dot" />
                            <span className="er-join-field">
                              {field.from} = {field.to}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </aside>
      </div>

      {/* Columns Dialog (NO datatype column, only name + constraints) */}
      {isDialogOpen && selectedTable && (
        <div
          className="er-dialog-backdrop"
          onClick={() => setIsDialogOpen(false)}
        >
          <div className="er-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="er-dialog-header">
              <div className="er-dialog-title-row">
                <Database className="er-icon-xs" />
                <h2 className="er-dialog-title">{selectedTable.name}</h2>
              </div>
              <p className="er-dialog-sub">
                Table columns and their constraints
              </p>
              <button
                className="er-dialog-close"
                onClick={() => setIsDialogOpen(false)}
              >
                ×
              </button>
            </div>

            <div className="er-dialog-body">
              <div className="er-dialog-table-wrapper">
                <table className="er-dialog-table">
                  <thead>
                    <tr>
                      <th>Column Name</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedColumns.length === 0 && (
                      <tr>
                        <td>
                          <span className="er-empty-text">
                            No column metadata provided for this table.
                          </span>
                        </td>
                      </tr>
                    )}
                    {selectedColumns.map((column, idx) => {
                      const colName =
                        typeof column === "string" ? column : column.name || "";

                      return (
                        <tr key={idx}>
                          <td>
                            <div className="er-col-name-cell">
                              <span>{colName}</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
