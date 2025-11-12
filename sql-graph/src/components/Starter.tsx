import React, { useState, useRef } from "react";

export type JobSpec = {
  [jobName: string]: {
    depends_on?: string[];
    impact?: number;
  } | null;
};

function Starter({ onSpecReady }: { onSpecReady: (spec: JobSpec) => void }) {
  const [dragOver, setDragOver] = useState(false);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const handlePick = () => fileRef.current?.click();

  const simulatePythonProcess = async (file: File) => {
    setBusy(true);
    setProgress(0);
    // Simulate work + progress. Replace with real backend call later.
    for (let i = 0; i <= 20; i++) {
      await new Promise(r => setTimeout(r, 80));
      setProgress(Math.round((i / 20) * 100));
    }
    // Demo output spec; in reality, parse/lineage the SQL inside the ZIP
    const spec: JobSpec = {
      "JobA/orders.sql": { depends_on: [], impact: 12 },
      "JobA/customers.sql": { depends_on: [], impact: 48 },
      "JobB/products.sql": { depends_on: [], impact: 67 },
      "JobA/orders_agg.sql": { depends_on: ["JobA/orders.sql", "JobA/customers.sql", "JobB/products.sql"], impact: 83 }
    };
    setBusy(false);
    onSpecReady(spec);
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f && f.name.toLowerCase().endsWith(".zip")) simulatePythonProcess(f);
    else alert("Please drop a .zip file containing your SQL folders");
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f && f.name.toLowerCase().endsWith(".zip")) simulatePythonProcess(f);
    else alert("Please choose a .zip file containing your SQL folders");
  };

  return (
    <div className="w-full h-screen bg-gradient-to-br from-zinc-50 to-zinc-100 flex items-center justify-center p-6">
      <input ref={fileRef} type="file" accept=".zip" className="hidden" onChange={onFile} />
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`w-[720px] max-w-full rounded-2xl border-2 ${dragOver ? "border-indigo-500 bg-indigo-50" : "border-dashed border-zinc-300 bg-white"} shadow p-10 text-center`}
      >
        <div className="text-2xl font-semibold text-zinc-800">Upload your SQL ZIP</div>
        <p className="text-sm text-zinc-600 mt-2">Drop a .zip with folders of .sql files. We'll extract dependencies and build the job graph.</p>
        <button onClick={handlePick} className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-zinc-300 hover:bg-zinc-50">Choose .zip</button>

        {busy && (
          <div className="mt-8">
            <div className="text-sm text-zinc-600 mb-2">Processing…</div>
            <div className="w-full h-2 bg-zinc-200 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 transition-all" style={{ width: `${progress}%` }} />
            </div>
            <div className="text-xs text-zinc-500 mt-1">{progress}%</div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Starter;