import React, { useState, useRef } from "react";

import type { JobSpec } from "../types";


function Starter({ onSpecReady }: { onSpecReady: (spec: JobSpec) => void }) {
  const [dragOver, setDragOver] = useState(false);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const handlePick = () => fileRef.current?.click();

  const simulatePythonProcess = async (file: File) => {
  setBusy(true);
  setProgress(0);

  const form = new FormData();
  form.append("file", file);

  // simple progress feel while the network call happens
  const tick = setInterval(() => setProgress(p => Math.min(95, p + 2)), 100);

  try {
    const res = await fetch("http://localhost:8000/process-zip", {
      method: "POST",
      body: form,
    });
    const spec: JobSpec = await res.json();
    setProgress(100);
    onSpecReady(spec);
  } catch (e) {
    alert("Processing failed. Check backend logs.");
    console.error(e);
  } finally {
    clearInterval(tick);
    setBusy(false);
  }
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