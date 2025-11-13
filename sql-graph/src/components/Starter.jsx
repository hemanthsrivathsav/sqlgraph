import React, { useRef, useState } from "react";

// Expected shape of spec (for reference only):
// {
//   "JobA/orders.sql": { depends_on: [...], impact: 12 },
//   "JobB/products.sql": { depends_on: [...], impact: 67 },
//   ...
// }

export default function Starter({ onSpecReady }) {
  const [dragOver, setDragOver] = useState(false);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);

  const handlePick = () => fileRef.current?.click();

  const simulatePythonProcess = async (file) => {
    setBusy(true);
    setProgress(0);
    for (let i = 0; i <= 20; i++) {
      await new Promise((r) => setTimeout(r, 80));
      setProgress(Math.round((i / 20) * 100));
    }

    // Demo JobSpec for now
    const spec = {
      "JobA/orders.sql": { depends_on: [], impact: 12 },
      "JobA/customers.sql": { depends_on: [], impact: 48 },
      "JobB/products.sql": { depends_on: [], impact: 67 },
      "JobA/orders_agg.sql": {
        depends_on: [
          "JobA/orders.sql",
          "JobA/customers.sql",
          "JobB/products.sql",
        ],
        impact: 83,
      },
    };

    onSpecReady(spec);
    setBusy(false);
  };

  const onDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f && f.name.toLowerCase().endsWith(".zip")) simulatePythonProcess(f);
    else alert("Please drop a .zip file containing your SQL folders");
  };

  const onFile = (e) => {
    const f = e.target.files?.[0];
    if (f && f.name.toLowerCase().endsWith(".zip")) simulatePythonProcess(f);
    else alert("Please choose a .zip file containing your SQL folders");
  };

  return (
    <div className="app-fullscreen">
      <input
        ref={fileRef}
        type="file"
        accept=".zip"
        className="hidden-input"
        onChange={onFile}
      />
      <div
        className={
          "starter-card" +
          (dragOver ? " starter-card--dragover" : "")
        }
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
      >
        <h1 className="starter-title">Upload your SQL ZIP</h1>
        <p className="starter-subtitle">
          Drop a .zip with folders of .sql files. We’ll extract dependencies and
          build the job graph.
        </p>
        <button className="btn" onClick={handlePick}>
          Choose .zip
        </button>

        {busy && (
          <div className="starter-progress">
            <div className="starter-progress-label">Processing…</div>
            <div className="progress-track">
              <div
                className="progress-fill"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="starter-progress-percent">{progress}%</div>
          </div>
        )}
      </div>
    </div>
  );
}
