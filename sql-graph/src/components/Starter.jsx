import React, { useRef, useState } from "react";

// Starter expects: onSpecReady(workflowJson)
export default function Starter({ onSpecReady }) {
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileRef = useRef(null);

  // 👉 change this to your FastAPI URL if different
  const API_URL = "http://127.0.0.1:8000/process-zip";

  const handlePick = () => {
    if (fileRef.current) fileRef.current.click();
  };

  // small fake-progress helper to animate bar while fetch runs
  function startFakeProgress() {
    setProgress(0);
    let current = 0;
    const id = setInterval(() => {
      current += 5;
      // stop around 85%, the rest will be set to 100 when response arrives
      if (current >= 85) {
        clearInterval(id);
      } else {
        setProgress(current);
      }
    }, 120);
    return () => clearInterval(id);
  }

  async function uploadZipToBackend(file) {
    try {
      setBusy(true);
      const stopFake = startFakeProgress();

      const formData = new FormData();
      // backend FastAPI will read this as `file: UploadFile`
      formData.append("file", file);

      const res = await fetch(API_URL, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        stopFake();
        setProgress(0);
        throw new Error(`Backend error: ${res.status} ${res.statusText}`);
      }

      const json = await res.json();
      stopFake();
      setProgress(100);

      // ✅ hand the workflow JSON to JobGraphCanvas
      onSpecReady(json);
    } catch (err) {
      console.error("Upload / processing failed", err);
      alert("Processing failed. Check backend logs.");
      setBusy(false);
      setProgress(0);
    }
  }

  function handleFile(file) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".zip")) {
      alert("Please choose a .zip file containing your SQL folders");
      return;
    }
    uploadZipToBackend(file);
  }

  const onDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    handleFile(f);
  };

  const onDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const onDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const onFileChange = (e) => {
    const f = e.target.files?.[0];
    handleFile(f);
  };

  return (
    <div className="app-fullscreen">
      <input
        ref={fileRef}
        type="file"
        accept=".zip"
        className="hidden-input"
        onChange={onFileChange}
      />

      <div
        className={
          "starter-card" +
          (dragOver ? " starter-card--dragover" : "")
        }
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
      >
        <h1 className="starter-title">Upload your SQL ZIP</h1>
        <p className="starter-subtitle">
          Drop a .zip with folders of .sql files. The backend will extract
          dependencies and build the workflow + job graph JSON.
        </p>

        <button className="btn" onClick={handlePick} disabled={busy}>
          {busy ? "Processing…" : "Choose .zip"}
        </button>

        {busy && (
          <div className="starter-progress">
            <div className="starter-progress-label">
              Processing on backend…
            </div>
            <div className="progress-track">
              <div
                className="progress-fill"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="starter-progress-percent">
              {progress}%
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
