import React, { useMemo, useRef, useState, useEffect } from "react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import Starter from "./Starter";
import ErDiagramView from "./ErDiagramView";

const NODE_W = 220;
const NODE_H = 96;

// ---------- Geometry / helpers ----------
function pathBetween(a, b) {
  const dx = (b.x - a.x) * 0.5;
  const dy = (b.y - a.y) * 0.0;
  const c1x = a.x + dx;
  const c1y = a.y + dy;
  const c2x = b.x - dx;
  const c2y = b.y - dy;
  return `M ${a.x},${a.y} C ${c1x},${c1y} ${c2x},${c2y} ${b.x},${b.y}`;
}

function anchorFor(from, to) {
  const cx = from.x;
  const cy = from.y;
  const dx = to.x - cx;
  const dy = to.y - cy;

  if (dx === 0 && dy === 0) return { x: cx, y: cy };

  const rx = NODE_W / 2;
  const ry = NODE_H / 2;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist === 0) return { x: cx, y: cy };

  const unitDx = dx / dist;
  const unitDy = dy / dist;

  const t = Math.min(
    Math.abs(rx / (Math.abs(unitDx) + 0.0001)),
    Math.abs(ry / (Math.abs(unitDy) + 0.0001))
  );

  return {
    x: cx + unitDx * t,
    y: cy + unitDy * t,
  };
}

function impactColors(impact) {
  const v = Math.max(0, Math.min(100, impact ?? 0));
  const GREEN = { stroke: "#16a34a", fill: "rgba(22, 163, 74, 0.16)" };
  const YELLOW = { stroke: "#ca8a04", fill: "rgba(202, 138, 4, 0.16)" };
  const RED = { stroke: "#dc2626", fill: "rgba(220, 38, 38, 0.16)" };
  if (v <= 33) return GREEN;
  if (v <= 66) return YELLOW;
  return RED;
}

function getBounds(nodes) {
  if (!nodes.length) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  }
  const xs = nodes.map((n) => n.x);
  const ys = nodes.map((n) => n.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

function getCenter(bounds) {
  return {
    cx: (bounds.minX + bounds.maxX) / 2,
    cy: (bounds.minY + bounds.maxY) / 2,
  };
}

// ---------- Node Card ----------
function NodeCard({ node, onClick }) {
  const { stroke, fill } = impactColors(node.impact);
  return (
    <div
      className="node-card"
      style={{
        left: node.x - NODE_W / 2,
        top: node.y - NODE_H / 2,
      }}
      onClick={onClick}
    >
      <div className="node-card-type">Job</div>
      <div className="node-card-label">{node.label}</div>
      <div className="node-card-subtitle">
        Click to open ER view • Drag canvas to pan
      </div>
      <span
        className="impact-badge"
        style={{
          borderColor: stroke,
          backgroundColor: fill,
          color: stroke,
        }}
      >
        impact: {node.impact ?? 0}
      </span>
    </div>
  );
}

// ---------- Background Grid ----------
function GridBackground({ width, height }) {
  return <div className="grid-background" style={{ width, height }} />;
}

// ---------- MiniMap ----------
function MiniMap({ width, height, nodes }) {
  if (!nodes.length) return null;
  const W = 200;
  const H = 140;
  const xs = nodes.map((n) => n.x);
  const ys = nodes.map((n) => n.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);
  const spanX = Math.max(1, maxX - minX);
  const spanY = Math.max(1, maxY - minY);

  return (
    <div className="minimap">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <rect x={0} y={0} width={W} height={H} rx={8} fill="#f8f8f8" stroke="#ddd" />
        {nodes.map((n) => {
          const nx = ((n.x - minX) / spanX) * (W - 16) + 8;
          const ny = ((n.y - minY) / spanY) * (H - 16) + 8;
          return <circle key={n.id} cx={nx} cy={ny} r={3} fill="#888" />;
        })}
      </svg>
    </div>
  );
}

// ---------- Build graph from workflow JSON ----------
// workflowJson shape:
//
// {
//   workflow_name: string,
//   jobs: [
//     {
//       job_name: string,
//       rank?: number,
//       dependencies?: string[]
//       ...
//     }
//   ]
// }

function topoLevelsFromJobs(jobs) {
  const indeg = new Map();
  const adj = new Map();

  jobs.forEach((job) => {
    indeg.set(job.job_name, 0);
    adj.set(job.job_name, []);
  });

  jobs.forEach((job) => {
    const deps = job.dependencies || [];
    deps.forEach((d) => {
      if (!indeg.has(d)) {
        indeg.set(d, 0);
        adj.set(d, []);
      }
      adj.get(d).push(job.job_name);
      indeg.set(job.job_name, (indeg.get(job.job_name) || 0) + 1);
    });
  });

  const q = [];
  indeg.forEach((v, k) => {
    if (v === 0) q.push(k);
  });

  const level = new Map();
  q.forEach((k) => level.set(k, 0));

  while (q.length) {
    const u = q.shift();
    for (const v of adj.get(u) || []) {
      const lu = level.get(u) || 0;
      level.set(v, Math.max(level.get(v) || 0, lu + 1));
      indeg.set(v, (indeg.get(v) || 0) - 1);
      if ((indeg.get(v) || 0) === 0) q.push(v);
    }
  }

  jobs.forEach((job) => {
    if (!level.has(job.job_name)) level.set(job.job_name, 0);
  });

  return level;
}

function buildGraphFromWorkflow(workflowJson) {
  const jobs = Array.isArray(workflowJson?.jobs) ? workflowJson.jobs : [];
  const levels = topoLevelsFromJobs(jobs);
  const byLevel = new Map();

  levels.forEach((lv, jobName) => {
    const arr = byLevel.get(lv) || [];
    arr.push(jobName);
    byLevel.set(lv, arr);
  });

  const LAYER_GAP_X = 360;
  const LAYER_GAP_Y = 180;
  const nodesOut = [];
  const edgesOut = [];
  const startX = 400;
  const startY = 300;

  const jobByName = {};
  jobs.forEach((j) => {
    jobByName[j.job_name] = j;
  });

  Array.from(byLevel.entries())
    .sort((a, b) => a[0] - b[0])
    .forEach(([lv, jobNames]) => {
      jobNames.forEach((jobName, idx) => {
        const job = jobByName[jobName] || {};
        const x = startX + lv * LAYER_GAP_X;
        const y = startY + idx * LAYER_GAP_Y;
        const impact = typeof job.rank === "number" ? job.rank : 0;
        nodesOut.push({
          id: jobName,
          label: jobName,
          x,
          y,
          impact,
        });
      });
    });

  const nodeIds = new Set(nodesOut.map((n) => n.id));
  jobs.forEach((job) => {
    const deps = job.dependencies || [];
    deps.forEach((d) => {
      if (!nodeIds.has(d)) {
        nodesOut.push({
          id: d,
          label: d,
          x: startX,
          y: startY,
          impact: 0,
        });
        nodeIds.add(d);
      }
      edgesOut.push({
        id: `${d}->${job.job_name}`,
        from: d,
        to: job.job_name,
      });
    });
  });

  return { nodesOut, edgesOut };
}

// ---------- Build ER data from ONE job (using your new JSON) ----------
function buildErDataFromJob(job) {
  // NEW: directly use "columns" as an object
  const columnsMap =
    job.columns && typeof job.columns === "object"
      ? job.columns
      : {};

  const tableNames = Object.keys(columnsMap);

  const allJoinDefs = []
    .concat(Array.isArray(job.inner_join) ? job.inner_join : [])
    .concat(Array.isArray(job.left_join) ? job.left_join : [])
    .concat(Array.isArray(job.right_join) ? job.right_join : []);

  const degree = {};
  allJoinDefs.forEach((j) => {
    (j.tablesUsed || []).forEach((t) => {
      degree[t] = (degree[t] || 0) + 1;
    });
  });

  let hubName = tableNames[0] || null;
  tableNames.forEach((t) => {
    if ((degree[t] || 0) > (degree[hubName] || 0)) {
      hubName = t;
    }
  });

  const centerX = 450;
  const centerY = 260;
  const baseRadius = 180;
  const radius = baseRadius + Math.max(0, tableNames.length - 3) * 20;

  const tables = [];

  if (hubName) {
    const hubCols = Array.isArray(columnsMap[hubName])
      ? columnsMap[hubName]
      : [];

    tables.push({
      id: hubName,
      name: hubName,
      position: { x: centerX, y: centerY },
      columns: hubCols.map((name) => ({
        name,
        isPrimaryKey: false,
        isForeignKey: false,
      })),
    });
  }

  const others = tableNames.filter((t) => t !== hubName);
  const n = others.length;
  const angleStart = -Math.PI * 0.7;
  const angleSpan = Math.PI * 1.4;

  others.forEach((tName, idx) => {
    const cols = Array.isArray(columnsMap[tName]) ? columnsMap[tName] : [];
    const tNorm = n <= 1 ? 0.5 : idx / (n - 1);
    const angle = angleStart + angleSpan * tNorm;
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);

    tables.push({
      id: tName,
      name: tName,
      position: { x, y },
      columns: cols.map((name) => ({
        name,
        isPrimaryKey: false,
        isForeignKey: false,
      })),
    });
  });

  const joins = [];

  function pushJoins(arr, type) {
    if (!Array.isArray(arr)) return;
    arr.forEach((j) => {
      const [from, to] = j.tablesUsed || [];
      const attrs = j.attr_list || [];
      joins.push({
        from,
        to,
        type,
        condition: attrs.join(", "),
        fields: attrs.map((a) => ({
          from: from + "." + a,
          to: to + "." + a,
        })),
      });
    });
  }

  pushJoins(job.inner_join, "INNER");
  pushJoins(job.left_join, "LEFT");
  pushJoins(job.right_join, "RIGHT");

  return { tables, joins };
}


// ---------- Main component ----------
export default function JobGraphCanvas() {
  const CANVAS_W = 4000;
  const CANVAS_H = 3000;

  const [workflow, setWorkflow] = useState(null);
  const [workflowExpanded, setWorkflowExpanded] = useState(false);

  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [mode, setMode] = useState("start"); // "start" | "graph" | "details"

  const [erView, setErView] = useState({
    fileName: "",
    tables: [],
    joins: [],
  });

  const apiRef = useRef(null);
  const containerRef = useRef(null);

  const nodeById = useMemo(
    () => Object.fromEntries(nodes.map((n) => [n.id, n])),
    [nodes]
  );

  const centerOnNodes = (scale = 1) => {
    const wrapper = containerRef.current;
    const api = apiRef.current;
    if (!wrapper || !api || nodes.length === 0) return;
    const rect = wrapper.getBoundingClientRect();
    const b = getBounds(nodes);
    const { cx, cy } = getCenter(b);
    const posX = rect.width / 2 - cx * scale;
    const posY = rect.height / 2 - cy * scale;
    api.setTransform(posX, posY, scale);
  };

  const fitToCanvas = () => {
    const wrapper = containerRef.current;
    const api = apiRef.current;
    if (!wrapper || !api) return;
    const rect = wrapper.getBoundingClientRect();
    const pad = 60;
    const w = Math.max(1, rect.width - pad);
    const h = Math.max(1, rect.height - pad);
    const scale = Math.min(w / CANVAS_W, h / CANVAS_H);
    const x = (rect.width - CANVAS_W * scale) / 2;
    const y = (rect.height - CANVAS_H * scale) / 2;
    api.setTransform(x, y, scale);
  };

  useEffect(() => {
    const onResize = () => {
      if (mode === "graph") fitToCanvas();
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [mode]);

  function handleSpec(workflowJson) {
    setWorkflow(workflowJson);
    setWorkflowExpanded(false);
    setNodes([]);
    setEdges([]);
    setMode("graph"); // same page, but we only see workflow card first
  }

  // STARTER MODE
  if (mode === "start") {
    return <Starter onSpecReady={handleSpec} />;
  }

  // ER DETAILS MODE
  if (mode === "details") {
    return (
      <ErDiagramView
        fileName={erView.fileName}
        tables={erView.tables}
        joins={erView.joins}
        onBack={() => setMode("graph")}
      />
    );
  }

  // GRAPH MODE (includes workflow overlay + job graph)
  return (
    <div ref={containerRef} className="graph-container">
      <TransformWrapper
        ref={apiRef}
        minScale={0.2}
        maxScale={2}
        initialScale={0.8}
        centerOnInit={false}
        wheel={{ step: 0.09 }}
        panning={{ velocityDisabled: true }}
        doubleClick={{ disabled: true }}
        pinch={{ step: 0.07 }}
        limitToBounds={false}
      >
        {/* Toolbar */}
        <div className="toolbar">
          {/* Optional file loader for testing raw JSON instead of ZIP */}
          <input
            id="jobgraph-json-input"
            type="file"
            accept="application/json"
            className="hidden-input"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              const text = await f.text();
              try {
                const obj = JSON.parse(text);
                handleSpec(obj);
              } catch (err) {
                console.error("Invalid JSON", err);
                alert(
                  "Invalid JSON. Expected shape: { workflow_name: string, jobs: [...] }"
                );
              }
            }}
          />
          <button
            className="btn btn-sm"
            onClick={() =>
              document.getElementById("jobgraph-json-input")?.click()
            }
          >
            Load workflow JSON
          </button>
          <button
            className="btn btn-sm"
            onClick={() => apiRef.current?.zoomOut()}
          >
            −
          </button>
          <button
            className="btn btn-sm"
            onClick={() => apiRef.current?.zoomIn()}
          >
            +
          </button>
          <button className="btn btn-sm" onClick={() => centerOnNodes(1)}>
            Reset
          </button>
          <button className="btn btn-sm" onClick={fitToCanvas}>
            Fit
          </button>
        </div>

        <TransformComponent>
          <div
            className="graph-canvas"
            style={{ width: CANVAS_W, height: CANVAS_H }}
          >
            <GridBackground width={CANVAS_W} height={CANVAS_H} />
            <svg className="edges-layer" width={CANVAS_W} height={CANVAS_H}>
              <defs>
                <marker
                  id="job-arrow-head"
                  markerWidth="10"
                  markerHeight="10"
                  refX="8"
                  refY="5"
                  orient="auto"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#1F2937" />
                </marker>
              </defs>
              {edges.map((e) => {
                const a = nodeById[e.from];
                const b = nodeById[e.to];
                if (!a || !b) return null;
                const start = anchorFor(a, b);
                const end = anchorFor(b, a);
                const d = pathBetween(start, end);
                return (
                  <g key={e.id}>
                    <path d={d} stroke="#9CA3AF" strokeWidth={2.5} fill="none" />
                    <path
                      d={d}
                      stroke="#1F2937"
                      strokeWidth={1}
                      fill="none"
                      strokeDasharray="4 4"
                      opacity={0.5}
                      markerEnd="url(#job-arrow-head)"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </g>
                );
              })}
            </svg>
            {nodes.map((n) => (
              <NodeCard
                key={n.id}
                node={n}
                onClick={() => {
                  if (!workflow || !Array.isArray(workflow.jobs)) return;
                  const job = workflow.jobs.find(
                    (j) => j.job_name === n.id
                  );
                  if (!job) return;
                  const { tables, joins } = buildErDataFromJob(job);
                  setErView({
                    fileName: job.job_name,
                    tables,
                    joins,
                  });
                  setMode("details");
                }}
              />
            ))}
          </div>
        </TransformComponent>
      </TransformWrapper>

      {/* 🔹 Workflow overlay shown first on this same page */}
      {workflow && !workflowExpanded && (
        <div className="workflow-overlay">
          <div
            className="workflow-card"
            onClick={() => {
              const { nodesOut, edgesOut } = buildGraphFromWorkflow(workflow);
              setNodes(nodesOut);
              setEdges(edgesOut);
              setWorkflowExpanded(true);
              setTimeout(() => centerOnNodes(1), 0);
            }}
          >
            <div className="workflow-title">
              {workflow.workflow_name || "Workflow"}
            </div>
            <div className="workflow-subtitle">
              {(workflow.jobs || []).length} jobs in this workflow
            </div>
            <div className="workflow-hint">
              Click to expand and see job dependencies
            </div>
          </div>
        </div>
      )}

      <MiniMap width={CANVAS_W} height={CANVAS_H} nodes={nodes} />
      <div className="graph-hint">
        Drag to pan · Scroll to zoom · Use toolbar to reset/fit
      </div>
    </div>
  );
}
