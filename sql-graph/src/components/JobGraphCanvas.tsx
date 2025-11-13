import React, { useMemo, useRef, useState, useEffect } from "react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import Starter from "./Starter";
import ErDiagramView from "./ErDiagramView";
import type { JobSpec, JobErSpec } from "../types";

const NODE_W = 220;
const NODE_H = 96;

export type JobNode = {
  id: string;
  label: string;
  x: number;
  y: number;
  impact?: number;
};

export type JobEdge = {
  id: string;
  from: string;
  to: string;
};

// ---------- Geometry / helpers ----------
function pathBetween(a: { x: number; y: number }, b: { x: number; y: number }) {
  const dx = (b.x - a.x) * 0.5;
  const dy = (b.y - a.y) * 0.0;
  const c1x = a.x + dx;
  const c1y = a.y + dy;
  const c2x = b.x - dx;
  const c2y = b.y - dy;
  return `M ${a.x},${a.y} C ${c1x},${c1y} ${c2x},${c2y} ${b.x},${b.y}`;
}

function anchorFor(from: JobNode, to: JobNode) {
  const cx = from.x, cy = from.y;
  const dx = to.x - cx;
  const dy = to.y - cy;
  if (dx === 0 && dy === 0) return { x: cx, y: cy };
  
  const rx = NODE_W / 2;
  const ry = NODE_H / 2;
  
  // Calculate which edge of the rectangle the line intersects
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist === 0) return { x: cx, y: cy };
  
  const unitDx = dx / dist;
  const unitDy = dy / dist;
  
  // Find intersection with rectangle edge
  let t = Math.min(
    Math.abs(rx / (Math.abs(unitDx) + 0.0001)),
    Math.abs(ry / (Math.abs(unitDy) + 0.0001))
  );
  
  const anchorX = cx + unitDx * t;
  const anchorY = cy + unitDy * t;
  
  return { x: anchorX, y: anchorY };
}



function impactColors(impact: number | undefined) {
  const v = Math.max(0, Math.min(100, impact ?? 0));
  const GREEN = { stroke: "#16a34a", fill: "rgba(22, 163, 74, 0.16)" };
  const YELLOW = { stroke: "#ca8a04", fill: "rgba(202, 138, 4, 0.16)" };
  const RED = { stroke: "#dc2626", fill: "rgba(220, 38, 38, 0.16)" };
  if (v <= 33) return GREEN;
  if (v <= 66) return YELLOW;
  return RED;
}

export function getBounds(nodes: JobNode[]) {
  const xs = nodes.map(n => n.x);
  const ys = nodes.map(n => n.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

function getCenter(bounds: { minX: number; minY: number; maxX: number; maxY: number }) {
  return { cx: (bounds.minX + bounds.maxX) / 2, cy: (bounds.minY + bounds.maxY) / 2 };
}

// ---------- Node Card ----------
function NodeCard({
  node,
  onClick,
}: {
  node: JobNode;
  onClick?: () => void;
}) {
  const { stroke, fill } = impactColors(node.impact);
  return (
    <div
      onClick={onClick}
      className="absolute select-none rounded-2xl shadow-md border border-zinc-300 bg-white/90 backdrop-blur p-3 w-[220px] h-[96px] box-border relative cursor-pointer hover:shadow-lg transition-shadow"
      style={{ left: node.x - NODE_W / 2, top: node.y - NODE_H / 2 }}
    >
      <div className="text-xs text-zinc-500">SQL File</div>
      <div className="font-semibold text-zinc-800 truncate">{node.label}</div>
      <div className="mt-1 text-[11px] text-zinc-600">
        Click to open ER view • Drag canvas to pan
      </div>
      <span
        aria-label={`impact: ${node.impact ?? 0}`}
        className="absolute top-1 right-1 rounded-full px-2 py-0.5 text-[10px] font-medium border shadow-sm backdrop-blur-sm"
        style={{ borderColor: stroke, backgroundColor: fill, color: stroke }}
      >
        impact: {node.impact ?? 0}
      </span>
    </div>
  );
}

// ---------- Background Grid ----------
function GridBackground({ width, height }: { width: number; height: number }) {
  return (
    <div
      className="absolute inset-0"
      style={{
        width,
        height,
        backgroundColor: "#fafafa",
        backgroundImage:
          `linear-gradient(to right, rgba(0,0,0,0.06) 1px, transparent 1px),` +
          `linear-gradient(to bottom, rgba(0,0,0,0.06) 1px, transparent 1px),` +
          `linear-gradient(to right, rgba(0,0,0,0.025) 1px, transparent 1px),` +
          `linear-gradient(to bottom, rgba(0,0,0,0.025) 1px, transparent 1px)`,
        backgroundSize: "40px 40px, 40px 40px, 8px 8px, 8px 8px",
        maskImage: "radial-gradient(circle at 50% 50%, black 80%, transparent 100%)",
      }}
    />
  );
}

// ---------- Toolbar ----------
function Toolbar({
  apiRef,
  onFit,
  onReset,
  onLoadJson,
  selectedJobId,
  setSelectedJobId,
  setMode,
  jobErMap,
}: {
  apiRef: React.MutableRefObject<any>;
  onFit?: () => void;
  onReset?: () => void;
  onLoadJson?: (obj: JobSpec) => void;
  selectedJobId: string | null;
  setSelectedJobId: (id: string | null) => void;
  setMode: (mode: "start" | "graph" | "details") => void;
  jobErMap: Record<string, JobErSpec>;
}) {
  const fileRef = React.useRef<HTMLInputElement | null>(null);
  const onPick = () => fileRef.current?.click();
  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const text = await f.text();
    try {
      const obj = JSON.parse(text) as JobSpec;
      onLoadJson?.(obj);
    } catch (err) {
      console.error("Invalid JSON", err);
      alert("Invalid JSON format. Expected { jobName: { depends_on: string[], impact?: number }, ... }");
    }
  };

  return (
    <div className="absolute z-20 top-3 left-3 flex items-center gap-2 bg-white/90 backdrop-blur rounded-xl shadow p-2 border border-zinc-200">
      <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={onFile} />
      <button className="px-3 py-1 rounded-lg border border-zinc-300 hover:bg-zinc-100 text-sm" onClick={onPick}>Load JSON</button>
      <button className="px-3 py-1 rounded-lg border border-zinc-300 hover:bg-zinc-100 text-sm" onClick={() => apiRef.current?.zoomOut()}>−</button>
      <button className="px-3 py-1 rounded-lg border border-zinc-300 hover:bg-zinc-100 text-sm" onClick={() => apiRef.current?.zoomIn()}>+</button>
      <button className="px-3 py-1 rounded-lg border border-zinc-300 hover:bg-zinc-100 text-sm" onClick={() => onReset?.()}>Reset</button>
      <button className="px-3 py-1 rounded-lg border border-zinc-300 hover:bg-zinc-100 text-sm" onClick={() => onFit?.()}>Fit</button>
    </div>
  );
}

// ---------- MiniMap ----------
function MiniMap({ width, height, nodes }: { width: number; height: number; nodes: JobNode[] }) {
  if (nodes.length === 0) return null;
  const W = 200, H = 140;
  const minX = Math.min(...nodes.map(n => n.x));
  const minY = Math.min(...nodes.map(n => n.y));
  const maxX = Math.max(...nodes.map(n => n.x));
  const maxY = Math.max(...nodes.map(n => n.y));
  const spanX = Math.max(1, maxX - minX);
  const spanY = Math.max(1, maxY - minY);

  return (
    <div className="absolute bottom-3 right-3 z-20 bg-white/90 backdrop-blur rounded-lg border border-zinc-200 shadow p-2">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="block">
        <rect x={0} y={0} width={W} height={H} rx={8} fill="#f8f8f8" stroke="#ddd" />
        {nodes.map(n => {
          const nx = ((n.x - minX) / spanX) * (W - 16) + 8;
          const ny = ((n.y - minY) / spanY) * (H - 16) + 8;
          return <circle key={n.id} cx={nx} cy={ny} r={3} fill="#888" />;
        })}
      </svg>
    </div>
  );
}

// ---------- Build graph from spec ----------
function topoLevels(spec: JobSpec): Map<string, number> {
  const indeg = new Map<string, number>();
  const adj = new Map<string, string[]>();
  Object.keys(spec).forEach(k => { indeg.set(k, 0); adj.set(k, []); });
  for (const [job, cfg] of Object.entries(spec)) {
    const deps = cfg?.depends_on || [];
    for (const d of deps) {
      if (!indeg.has(d)) { indeg.set(d, 0); adj.set(d, []); }
      adj.get(d)!.push(job);
      indeg.set(job, (indeg.get(job) || 0) + 1);
    }
  }
  const q: string[] = [];
  indeg.forEach((v, k) => { if (v === 0) q.push(k); });
  const level = new Map<string, number>();
  q.forEach(k => level.set(k, 0));
  while (q.length) {
    const u = q.shift()!;
    for (const v of adj.get(u) || []) {
      const lu = level.get(u) || 0;
      level.set(v, Math.max(level.get(v) || 0, lu + 1));
      indeg.set(v, (indeg.get(v) || 0) - 1);
      if ((indeg.get(v) || 0) === 0) q.push(v);
    }
  }
  Object.keys(spec).forEach(k => { if (!level.has(k)) level.set(k, 0); });
  return level;
}

function buildGraphFromSpec(spec: JobSpec) {
  const levels = topoLevels(spec);
  const byLevel = new Map<number, string[]>();
  levels.forEach((lv, job) => {
    const arr = byLevel.get(lv) || [];
    arr.push(job);
    byLevel.set(lv, arr);
  });
  const LAYER_GAP_X = 360;
  const LAYER_GAP_Y = 180;
  const nodesOut: JobNode[] = [];
  const edgesOut: JobEdge[] = [];
  const startX = 400;
  const startY = 300;
  for (const [lv, jobs] of Array.from(byLevel.entries()).sort((a, b) => a[0] - b[0])) {
    jobs.forEach((job, idx) => {
      const x = startX + lv * LAYER_GAP_X;
      const y = startY + idx * LAYER_GAP_Y;
      nodesOut.push({ id: job, label: job, x, y, impact: spec[job]?.impact ?? 0 });
    });
  }
  const nodeIds = new Set(nodesOut.map(n => n.id));
  for (const [job, cfg] of Object.entries(spec)) {
    const deps = cfg?.depends_on || [];
    for (const d of deps) {
      if (!nodeIds.has(d)) {
        nodesOut.push({ id: d, label: d, x: startX, y: startY, impact: 0 });
        nodeIds.add(d);
      }
      edgesOut.push({ id: `${d}->${job}`, from: d, to: job });
    }
  }
  return { nodesOut, edgesOut };
}

// ---------- Main ----------
export default function JobGraphCanvas() {
  const CANVAS_W = 4000;
  const CANVAS_H = 3000;

  const [nodes, setNodes] = useState<JobNode[]>([]);
  const [edges, setEdges] = useState<JobEdge[]>([]);
  const [mode, setMode] = useState<"start" | "graph" | "details">("start");
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  const [jobErMap, setJobErMap] = useState<Record<string, JobErSpec>>({
    "JobA/orders_agg.sql": {
      job_name: "JobA/orders_agg.sql",
      tables: ["Table1", "Table2", "Table4"],
      innerJoin: [
        {
          tablesUsed: ["Table1", "Table2"],
          attr_list: ["t1.customer_id = t2.customer_id"],
        },
        {
          tablesUsed: ["Table2", "Table4"],
          attr_list: ["t2.product_id = t4.product_id"],
        },
      ],
      leftJoin: null,
      rightJoin: null,
    },
  });

  const nodeById = useMemo(() => Object.fromEntries(nodes.map(n => [n.id, n])), [nodes]);

  const apiRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

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

  const centerOnNodes = (scale: number = 1) => {
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

  useEffect(() => {
    const onResize = () => {
      if (mode === "graph") fitToCanvas();
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [mode]);

  function handleSpec(spec: JobSpec) {
    const { nodesOut, edgesOut } = buildGraphFromSpec(spec);
    setNodes(nodesOut);
    setEdges(edgesOut);
    setMode("graph");
    setTimeout(() => centerOnNodes(1), 0);
  }

  if (mode === "start") {
    return <Starter onSpecReady={handleSpec} />;
  }

  if (mode === "details" && selectedJobId) {
    const erSpec = jobErMap[selectedJobId];
    if (!erSpec) {
      return (
        <div className="w-full h-screen flex flex-col items-center justify-center bg-zinc-50">
          <div className="mb-4 text-sm text-zinc-600">
            No ER data available for <span className="font-mono">{selectedJobId}</span>
          </div>
          <button
            onClick={() => setMode("graph")}
            className="px-3 py-1.5 rounded-lg border border-zinc-300 text-sm hover:bg-zinc-100"
          >
            ← Back to job graph
          </button>
        </div>
      );
    }
    return <ErDiagramView spec={erSpec} onBack={() => setMode("graph")} />;
  }

  return (
    <div ref={containerRef} className="w-full h-[calc(100vh-0px)] relative overflow-hidden">
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
        <Toolbar
          apiRef={apiRef}
          onFit={fitToCanvas}
          onReset={() => centerOnNodes(1)}
          onLoadJson={(obj) => {
            const { nodesOut, edgesOut } = buildGraphFromSpec(obj);
            setNodes(nodesOut);
            setEdges(edgesOut);
            setTimeout(() => centerOnNodes(1), 0);
          }}
          selectedJobId={selectedJobId}
          setSelectedJobId={setSelectedJobId}
          setMode={setMode}
          jobErMap={jobErMap}
        />

        <TransformComponent>
          <div className="relative" style={{ width: CANVAS_W, height: CANVAS_H }}>
            <GridBackground width={CANVAS_W} height={CANVAS_H} />
            <svg className="absolute inset-0" width={CANVAS_W} height={CANVAS_H}>
              <defs>
                <marker id="arrowHead" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#1F2937" />
                </marker>
              </defs>
              {/* EDGES - Move the mapping here */}
              {edges.map(e => {
                const a = nodeById[e.from];
                const b = nodeById[e.to];
                if (!a || !b) return null;
                const start = anchorFor(a, b);
                const end = anchorFor(b, a);
                const d = pathBetween(start, end);
                return (
                  <g key={e.id}>
                    <path d={d} stroke="#9CA3AF" strokeWidth={2.5} fill="none" />
                    <path d={d} stroke="#1F2937" strokeWidth={1} fill="none" strokeDasharray="4 4" opacity={0.5} markerEnd="url(#arrowHead)" strokeLinecap="round" strokeLinejoin="round" />
                  </g>
                );
              })}
            </svg>
            {nodes.map(n => (
              <NodeCard
                key={n.id}
                node={n}
                onClick={() => {
                  setSelectedJobId(n.id);
                  setMode("details");
                }}
              />
            ))}
          </div>
        </TransformComponent>
      </TransformWrapper>
      <MiniMap width={CANVAS_W} height={CANVAS_H} nodes={nodes} />
      <div className="absolute bottom-3 left-3 z-20 text-xs text-zinc-600 bg-white/80 rounded-md border border-zinc-200 px-2 py-1">
        Drag to pan · Scroll to zoom · Use toolbar to reset/fit
      </div>
    </div>
  );
}