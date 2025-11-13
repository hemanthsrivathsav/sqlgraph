import React, { useMemo, useState } from "react";
import { ArrowLeft, Database, Link2, Key, Type } from "lucide-react";

// Props:
//
// spec: {
//   job_name: string;
//   tables: string[];
//   innerJoin?: { tablesUsed: string[]; attr_list: string[] }[] | null;
//   leftJoin?:  { tablesUsed: string[]; attr_list: string[] }[] | null;
//   rightJoin?: { tablesUsed: string[]; attr_list: string[] }[] | null;
// }
//
// onBack: () => void
//
export default function ErDiagramView({ spec, onBack }) {
  const [selectedTable, setSelectedTable] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const width = 900;
  const height = 540;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = 180;
  const cardWidth = 240;
  const cardHeight = 70;

  const fileName = spec?.job_name || "Unknown job";

  // Build table objects with positions + placeholder columns
  const tables = useMemo(() => {
    const names = spec?.tables || [];
    const n = names.length || 1;

    return names.map((name, idx) => {
      const angle = (2 * Math.PI * idx) / n - Math.PI / 2;
      const cx = centerX + radius * Math.cos(angle);
      const cy = centerY + radius * Math.sin(angle);

      const position = {
        x: cx - cardWidth / 2,
        y: cy - cardHeight / 2,
      };

      // Placeholder columns – you can later replace this with real columns from backend
      const columns = [
        { name: "id", type: "NUMBER", isPrimaryKey: true, isForeignKey: false },
        { name: "created_at", type: "TIMESTAMP", isPrimaryKey: false, isForeignKey: false },
      ];

      return {
        id: name,
        name,
        position,
        columns,
      };
    });
  }, [spec, centerX, centerY, radius, cardWidth, cardHeight]);

  // Build joins array from innerJoin/leftJoin/rightJoin
  const joins = useMemo(() => {
    const result = [];

    const addJoins = (arr, type) => {
      if (!arr) return;
      arr.forEach((j) => {
        const tablesUsed = j.tablesUsed || [];
        const from = tablesUsed[0];
        const to = tablesUsed[1];
        if (!from || !to) return;

        const attrList = j.attr_list || [];
        const condition = attrList[0] || "";
        const fields = attrList.map((cond) => {
          const [lhs, rhs] = cond.split("=").map((s) => s.trim());
          return {
            from: lhs || "",
            to: rhs || "",
          };
        });

        result.push({
          from,
          to,
          type,
          condition,
          fields,
        });
      });
    };

    addJoins(spec?.innerJoin, "INNER");
    addJoins(spec?.leftJoin, "LEFT");
    addJoins(spec?.rightJoin, "RIGHT");

    return result;
  }, [spec]);

  const handleTableClick = (table) => {
    setSelectedTable(table);
    setIsDialogOpen(true);
  };

  const getJoinTypeColorClass = (type) => {
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
  };

  const renderConnections = () => {
    return joins.map((join, index) => {
      const fromTable = tables.find((t) => t.name === join.from);
      const toTable = tables.find((t) => t.name === join.to);
      if (!fromTable || !toTable) return null;

      const startX = fromTable.position.x + cardWidth;
      const startY = fromTable.position.y + cardHeight / 2;
      const endX = toTable.position.x;
      const endY = toTable.position.y + cardHeight / 2;
      const midX = (startX + endX) / 2;

      return (
        <g key={index}>
          <path
            d={`M ${startX} ${startY} Q ${midX} ${startY}, ${midX} ${
              (startY + endY) / 2
            } T ${endX} ${endY}`}
            stroke="#3b82f6"
            strokeWidth="2"
            fill="none"
          />
          <circle cx={endX} cy={endY} r="4" fill="#3b82f6" />
          {join.condition && (
            <text
              x={midX}
              y={(startY + endY) / 2 - 8}
              textAnchor="middle"
              fontSize="10"
              fill="#2563eb"
            >
              {join.condition}
            </text>
          )}
        </g>
      );
    });
  };

  return (
    <div className="er-layout">
      {/* LEFT: main column */}
      <div className="er-main">
        {/* Header */}
        <header className="er-header">
          <div className="er-header-inner">
            <button className="er-btn-ghost" onClick={onBack}>
              <ArrowLeft className="er-icon" />
              <span>Back to job graph</span>
            </button>
            <div className="er-header-title">
              <Database className="er-icon" />
              <span className="er-header-label">ER view for:</span>
              <span className="er-header-job">{fileName}</span>
            </div>
          </div>
        </header>

        {/* Canvas Area */}
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

            {/* Table Nodes */}
            {tables.map((table) => (
              <div
                key={table.id}
                className="er-table-card"
                style={{
                  left: `${table.position.x}px`,
                  top: `${table.position.y}px`,
                  minWidth: `${cardWidth}px`,
                }}
                onClick={() => handleTableClick(table)}
              >
                <div className="er-table-card-header">
                  <div className="er-table-card-title">
                    <Database className="er-icon-sm" />
                    <span>{table.name}</span>
                  </div>
                  <span className="er-badge-muted">
                    {table.columns.length} cols
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
            {/* Tables Section */}
            <section>
              <div className="er-section-title-row">
                <Database className="er-icon-xs" />
                <h3 className="er-section-title">Tables</h3>
              </div>
              <div className="er-table-list">
                {tables.map((table) => (
                  <div
                    key={table.id}
                    className="er-table-list-item"
                    onClick={() => handleTableClick(table)}
                  >
                    <span className="er-table-list-name">{table.name}</span>
                    <span className="er-badge-muted">
                      {table.columns.length}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <div className="er-separator" />

            {/* Joins Section */}
            <section>
              <div className="er-section-title-row">
                <Link2 className="er-icon-xs" />
                <h3 className="er-section-title">Joins</h3>
              </div>
              <div className="er-join-list">
                {joins.length === 0 && (
                  <div className="er-empty-text">No joins detected</div>
                )}
                {joins.map((join, index) => (
                  <div key={index} className="er-join-card">
                    <div className="er-join-card-header">
                      <div className="er-join-main">
                        <span className="er-join-table">{join.from}</span>
                        <span className="er-join-eq">=</span>
                        <span className="er-join-table">{join.to}</span>
                      </div>
                      <span
                        className={`er-badge-outline ${getJoinTypeColorClass(
                          join.type
                        )}`}
                      >
                        {join.type}
                      </span>
                    </div>
                    <div className="er-join-fields">
                      {join.fields.map((field, fieldIndex) => (
                        <div key={fieldIndex} className="er-join-field-row">
                          <span className="er-join-dot" />
                          <span className="er-join-field">{field.from}</span>
                          <span className="er-join-eq">=</span>
                          <span className="er-join-field">{field.to}</span>
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

      {/* Table Details Dialog */}
      {isDialogOpen && selectedTable && (
        <div
          className="er-dialog-backdrop"
          onClick={() => setIsDialogOpen(false)}
        >
          <div
            className="er-dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="er-dialog-header">
              <div className="er-dialog-title-row">
                <Database className="er-icon" />
                <span className="er-dialog-title">{selectedTable.name}</span>
              </div>
              <div className="er-dialog-sub">
                Table columns and their data types
              </div>
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
                      <th>Data Type</th>
                      <th>Constraints</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedTable.columns.map((column, idx) => (
                      <tr key={idx}>
                        <td>
                          <div className="er-col-name-cell">
                            <Type className="er-icon-xs-muted" />
                            <span>{column.name}</span>
                          </div>
                        </td>
                        <td>
                          <span className="er-badge-outline">
                            {column.type}
                          </span>
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
                          </div>
                        </td>
                      </tr>
                    ))}
                    {selectedTable.columns.length === 0 && (
                      <tr>
                        <td colSpan={3} className="er-empty-text">
                          No columns defined for this table
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
