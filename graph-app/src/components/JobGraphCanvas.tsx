import React, { useMemo, useRef, useState, useEffect } from "react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";

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

function pathBetween(a: { x: number; y: number }, b: { x: number; y: number }) {
  const dx = (b.x - a.x) * 0.5;
  const dy = (b.y - a.y) * 0.0;
  const c1x = a.x + dx;
  const c1y = a.y + dy;
  const c2x = b.x - dx;
  const c2y = b.y - dy;
  return `M ${a.x},${a.y} C ${c1x},${c1y} ${c2x},${c2y} ${b.x},${b.y}`;
}

type Side = "left" | "right" | "top" | "bottom";

function anchorFromSide(node: JobNode, side: Side) {
  const rx = NODE_W / 2;
  const ry = NODE_H / 2;
  const eps = 0.5;
  switch (side) {
    case "left":
      return { x: node.x - rx - eps, y: node.y };
    case "right":
      return { x: node.x + rx + eps, y: node.y };
    case "top":
      return { x: node.x, y: node.y - ry - eps };
    case "bottom":
      return { x: node.x, y: node.y + ry + eps };
  }
}

function choosePortSides(a: JobNode, b: JobNode): { startSide: Side; endSide: Side } {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (Math.abs(dx) >= Math.abs(dy)) {
    return { startSide: dx >= 0 ? "right" : "left", endSide: dx >= 0 ? "left" : "right" };
  }
  return { startSide: dy >= 0 ? "bottom" : "top", endSide: dy >= 0 ? "top" : "bottom" };
}

function orthogonalRoute(start: { x: number; y: number }, end: { x: number; y: number }): { x: number; y: number }[] {
  const gap = 24;
  const p: { x: number; y: number }[] = [];
  p.push(start);
  if (Math.abs(start.x - end.x) > Math.abs(start.y - end.y)) {
    const midX = (start.x + end.x) / 2;
    p.push({ x: midX, y: start.y });
    p.push({ x: midX, y: end.y });
  } else {
    const midY = (start.y + end.y) / 2;
    p.push({ x: start.x, y: midY });
    p.push({ x: end.x, y: midY });
  }
  p.push(end);
  return p;
}

function polyPath(points: { x: number; y: number }[]) {
  if (points.length === 0) return "";
  const [h, ...rest] = points;
  return `M ${h.x},${h.y} ` + rest.map(pt => `L ${pt.x},${pt.y}`).join(" ");
}

function anchorFor(from: JobNode, to: JobNode) {
  const cx = from.x, cy = from.y;
  const dx = to.x - cx;
  const dy = to.y - cy;
  if (dx === 0 && dy === 0) return { x: cx, y: cy };
  const rx = NODE_W / 2;
  const ry = NODE_H / 2;
  const tX = dx === 0 ? Number.POSITIVE_INFINITY : Math.abs(rx / dx);
  const tY = dy === 0 ? Number.POSITIVE_INFINITY : Math.abs(ry / dy);
  const eps = 0.5;
  if (tX <= tY) {
    const x = cx + Math.sign(dx) * rx + Math.sign(dx) * eps;
    const y = cy + dy * (rx / Math.abs(dx));
    return { x, y };
  } else {
    const x = cx + dx * (ry / Math.abs(dy));
    const y = cy + Math.sign(dy) * ry + Math.sign(dy) * eps;
    return { x, y };
  }
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

function NodeCard({ node, onPointerDown }: { node: JobNode; onPointerDown?: (e: React.PointerEvent) => void }) {
  const { stroke, fill } = impactColors(node.impact);
  return (
    <div
      onPointerDown={onPointerDown}
      className="absolute select-none rounded-2xl shadow-md border border-zinc-300 bg-white/90 backdrop-blur p-3 w-[220px] h-[96px] box-border relative"
      style={{ left: node.x - NODE_W / 2, top: node.y - NODE_H / 2 }}
    >
      <div className="text-xs text-zinc-500">SQL File</div>
      <div className="font-semibold text-zinc-800 truncate">{node.label}</div>
      <div className="mt-1 text-[11px] text-zinc-600">Click to focus • Drag canvas anywhere to pan</div>
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

function Toolbar({ apiRef, onFit, onReset }: { apiRef: React.MutableRefObject<any>; onFit?: () => void; onReset?: () => void }) {
  return (
    <div className="absolute z-20 top-3 left-3 flex items-center gap-2 bg-white/90 backdrop-blur rounded-xl shadow p-2 border border-zinc-200">
      <button
        className="px-3 py-1 rounded-lg border border-zinc-300 hover:bg-zinc-100 text-sm"
        onClick={() => apiRef.current?.zoomOut()}
      >
        −
      </button>
      <button
        className="px-3 py-1 rounded-lg border border-zinc-300 hover:bg-zinc-100 text-sm"
        onClick={() => apiRef.current?.zoomIn()}
      >
        +
      </button>
      <button
        className="px-3 py-1 rounded-lg border border-zinc-300 hover:bg-zinc-100 text-sm"
        onClick={() => onReset?.()}
      >
        Reset
      </button>
      <button
        className="px-3 py-1 rounded-lg border border-zinc-300 hover:bg-zinc-100 text-sm"
        onClick={() => onFit?.()}
      >
        Fit
      </button>
    </div>
  );
}

function MiniMap({ width, height, nodes }: { width: number; height: number; nodes: JobNode[] }) {
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

export default function JobGraphCanvas() {
  const CANVAS_W = 4000;
  const CANVAS_H = 3000;

  const [nodes] = useState<JobNode[]>([
    { id: "n1", label: "JobA/orders.sql", x: 800, y: 600, impact: 12 },
    { id: "n2", label: "JobA/customers.sql", x: 1200, y: 600, impact: 48 },
    { id: "n3", label: "JobA/orders_agg.sql", x: 1000, y: 900, impact: 83 },
    { id: "n4", label: "JobB/products.sql", x: 1600, y: 720, impact: 67 },
  ]);

  const [edges] = useState<JobEdge[]>([
    { id: "e1", from: "n1", to: "n3" },
    { id: "e2", from: "n2", to: "n3" },
    { id: "e3", from: "n4", to: "n3" },
  ]);

  const nodeById = useMemo(() => Object.fromEntries(nodes.map(n => [n.id, n])), [nodes]);

  const apiRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerH, setContainerH] = useState(720);

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
      const rect = containerRef.current?.getBoundingClientRect();
      setContainerH(rect ? rect.height : window.innerHeight - 120);
      fitToCanvas();
    };
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <div ref={containerRef} className="w-full h-[calc(100vh-0px)] relative overflow-hidden">
      <TransformWrapper
        ref={apiRef as any}
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
        <Toolbar apiRef={apiRef} onFit={fitToCanvas} onReset={() => centerOnNodes(1)} />
        <TransformComponent>
          <div className="relative" style={{ width: CANVAS_W, height: CANVAS_H }}>
            <GridBackground width={CANVAS_W} height={CANVAS_H} />
            <svg className="absolute inset-0" width={CANVAS_W} height={CANVAS_H}>
              <defs>
                <marker id="arrowHead" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#1F2937" />
                </marker>
              </defs>
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
              <NodeCard key={n.id} node={n} />
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
