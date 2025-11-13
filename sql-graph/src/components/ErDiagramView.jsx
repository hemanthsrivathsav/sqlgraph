// src/components/ErDiagramView.jsx
import React, { useState, useMemo } from "react";
import { ArrowLeft, Database, Link2, Key, Type } from "lucide-react";

/**
 * Props expected:
 *  fileName: string
 *  tables: [
 *    {
 *      id: string;
 *      name: string;
 *      position: { x: number; y: number };
 *      columns: [
 *        { name: string; isPrimaryKey?: boolean; isForeignKey?: boolean }
 *      ];
 *    }
 *  ]
 *  joins: [
 *    {
 *      from: string;
 *      to: string;
 *      type: "INNER" | "LEFT" | "RIGHT";
 *      condition: string; // comma-joined attr_list
 *      fields: { from: string; to: string }[];
 *    }
 *  ]
 *  onBack: () => void
 */

function getJoinTypeClass(type) {
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
}

function getJoinStrokeColor(type) {
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

function getJoinBubbleStyle(type) {
  switch (type) {
    case "INNER":
      return {
        background: "#dbeafe",
        color: "#1d4ed8",
        borderColor: "#93c5fd",
      };
    case "LEFT":
      return {
        background: "#dcfce7",
        color: "#15803d",
        borderColor: "#86efac",
      };
    case "RIGHT":
      return {
        background: "#ffedd5",
        color: "#c2410c",
        borderColor: "#fed7aa",
      };
    default:
      return {
        background: "#e5e7eb",
        color: "#374151",
        borderColor: "#d1d5db",
      };
  }
}

export default function ErDiagramView({ fileName, tables, joins, onBack }) {
  const [selectedTable, setSelectedTable] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const tableByName = useMemo(() => {
    const map = {};
    (tables || []).forEach((t) => {
      map[t.name] = t;
    });
    return map;
  }, [tables]);

  const handleTableClick = (table) => {
    setSelectedTable(table);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    // keep selectedTable so opening again is instant
  };

  /**
   * Render SVG paths for joins.
   * We route all curves on the LEFT side of the tables so they form a tree-ish shape,
   * not cluttered under / over the cards.
   */
  const renderConnections = () => {
    if (!Array.isArray(joins) || joins.length === 0) return null;

    return joins.map((join, index) => {
      const fromTable = tableByName[join.from];
      const toTable = tableByName[join.to];

      if (!fromTable || !toTable) {
        return null;
      }

      const strokeColor = getJoinStrokeColor(join.type);

      // Anchor each line roughly at the vertical center of the table card.
      const fromX = fromTable.position.x - 10;
      const fromY = fromTable.position.y + 32;
      const toX = toTable.position.x - 10;
      const toY = toTable.position.y + 32;

      // Route curves on the left, fanning them out slightly by index.
      const offset = 40 + index * 20;
      const midX = Math.min(fromX, toX) - offset;
      const control1X = midX;
      const control1Y = fromY;
      const control2X = midX;
      const control2Y = toY;

      const pathD = `M ${fromX} ${fromY} C ${control1X} ${control1Y}, ${control2X} ${control2Y}, ${toX} ${toY}`;

      const bubbleY = (fromY + toY) / 2;
      const bubbleX = midX - 4;
      const bubbleStyle = getJoinBubbleStyle(join.type);

      const firstAttr = Array.isArray(join.fields) && join.fields.length > 0
        ? join.fields[0].from.split(".").slice(-1)[0]
        : (join.condition || "");

      return (
        <g key={index}>
          <path
            d={pathD}
            stroke={strokeColor}
            strokeWidth={2.5}
            fill="none"
          />
          {/* Type + attr bubble on the curve */}
          <g transform={`translate(${bubbleX}, ${bubbleY - 8})`}>
            <rect
              x={-24}
              y={-10}
              rx={999}
              ry={999}
              width={48}
              height={20}
              fill={bubbleStyle.background}
              stroke={bubbleStyle.borderColor}
            />
            <text
              x={0}
              y={0}
              textAnchor="middle"
              alignmentBaseline="middle"
              fontSize="9"
              fill={bubbleStyle.color}
              style={{ fontWeight: 600 }}
            >
              {join.type}
            </text>
          </g>
          {/* Attribute label slightly below */}
          {firstAttr && (
            <text
              x={bubbleX}
              y={bubbleY + 14}
              textAnchor="middle"
              alignmentBaseline="middle"
              fontSize="9"
              fill="#4b5563"
            >
              {firstAttr}
            </text>
          )}
        </g>
      );
    });
  };

  const renderDialog = () => {
    if (!isDialogOpen || !selectedTable) return null;

    const cols = Array.isArray(selectedTable.columns)
      ? selectedTable.columns
      : [];

    return (
      <div className="er-dialog-backdrop" onMouseDown={handleCloseDialog}>
        <div
          className="er-dialog"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="er-dialog-header">
            <div className="er-dialog-title-row">
              <Database className="er-icon-sm" />
              <span className="er-dialog-title">{selectedTable.name}</span>
            </div>
            <div className="er-dialog-sub">
              Table columns and their constraints
            </div>
            <button
              className="er-dialog-close"
              type="button"
              onClick={handleCloseDialog}
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
                    <th>Constraints</th>
                  </tr>
                </thead>
                <tbody>
                  {cols.map((column, idx) => (
                    <tr key={idx}>
                      <td>
                        <div className="er-col-name-cell">
                          <Type className="er-icon-xs-muted" />
                          <span>{column.name}</span>
                        </div>
                      </td>
                      <td>
                        <div className="er-constraints">
                          {column.isPrimaryKey && (
                            <span className="er-badge-pk">
                              <Key className="er-icon-xxs" />
                              PK
                            </span>
                          )}
                          {column.isForeignKey && (
                            <span className="er-badge-fk">
                              <Link2 className="er-icon-xxs" />
                              FK
                            </span>
                          )}
                          {!column.isPrimaryKey && !column.isForeignKey && (
                            <span className="er-badge-muted">—</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {cols.length === 0 && (
                    <tr>
                      <td colSpan={2}>
                        <span className="er-empty-text">
                          No column information available for this table.
                        </span>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const totalColumnsForTable = (table) => {
    if (!Array.isArray(table.columns)) return 0;
    return table.columns.length;
  };

  return (
    <div className="er-layout">
      {/* LEFT: main column */}
      <div className="er-main">
        {/* Header */}
        <header className="er-header">
          <div className="er-header-inner">
            <button
              type="button"
              className="er-btn-ghost"
              onClick={onBack}
            >
              <ArrowLeft className="er-icon-xs" />
              <span>Back to job graph</span>
            </button>
            <div className="er-header-title">
              <Database className="er-icon-xs" />
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

            {/* Table cards */}
            {(tables || []).map((table) => (
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
                    {totalColumnsForTable(table)} cols
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
            {/* Tables section */}
            <section>
              <div className="er-section-title-row">
                <Database className="er-icon-xs" />
                <h3 className="er-section-title">Tables</h3>
              </div>
              <div className="er-table-list">
                {(tables || []).map((table) => (
                  <div
                    key={table.id}
                    className="er-table-list-item"
                    onClick={() => handleTableClick(table)}
                  >
                    <span className="er-table-list-name">{table.name}</span>
                    <span className="er-badge-muted">
                      {totalColumnsForTable(table)}
                    </span>
                  </div>
                ))}
                {(!tables || tables.length === 0) && (
                  <span className="er-empty-text">
                    No tables detected for this job.
                  </span>
                )}
              </div>
            </section>

            <div className="er-separator" />

            {/* Joins section */}
            <section>
              <div className="er-section-title-row">
                <Link2 className="er-icon-xs" />
                <h3 className="er-section-title">Joins</h3>
              </div>
              <div className="er-join-list">
                {Array.isArray(joins) && joins.length > 0 ? (
                  joins.map((join, idx) => (
                    <div key={idx} className="er-join-card">
                      <div className="er-join-card-header">
                        <div className="er-join-main">
                          <span className="er-join-table">{join.from}</span>
                          <span className="er-join-eq">=</span>
                          <span className="er-join-table">{join.to}</span>
                        </div>
                        <span className={getJoinTypeClass(join.type)}>
                          {join.type}
                        </span>
                      </div>
                      <div className="er-join-fields">
                        {Array.isArray(join.fields) && join.fields.length > 0 ? (
                          join.fields.map((field, fIdx) => (
                            <div
                              key={fIdx}
                              className="er-join-field-row"
                            >
                              <span className="er-join-dot" />
                              <span className="er-join-field">
                                {field.from} = {field.to}
                              </span>
                            </div>
                          ))
                        ) : (
                          <span className="er-empty-text">
                            {join.condition || "No field-level condition"}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <span className="er-empty-text">
                    No join information detected for this job.
                  </span>
                )}
              </div>
            </section>
          </div>
        </div>
      </aside>

      {renderDialog()}
    </div>
  );
}
