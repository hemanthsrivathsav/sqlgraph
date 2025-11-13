import React, { useState } from "react";
import { Upload, FileArchive } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "sonner";
import "./Starter.css";

export default function RuleMine() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.name.endsWith(".zip")) {
        setSelectedFile(file);
        toast.success(`File "${file.name}" selected successfully`);
      } else {
        toast.error("Please select a ZIP file");
      }
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);

    const file = event.dataTransfer.files[0];
    if (file && file.name.endsWith(".zip")) {
      setSelectedFile(file);
      toast.success(`File "${file.name}" selected successfully`);
    } else {
      toast.error("Please drop a ZIP file");
    }
  };

  const handleUpload = () => {
    if (selectedFile) {
      toast.success(`Uploading ${selectedFile.name}...`);
      // Upload logic would go here
    }
  };

  const handleRemove = () => {
    setSelectedFile(null);
  };

  return (
    <div className="rulemine-page">
      {/* animated background */}
      <div className="rulemine-bg">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />

        <div className="shape shape-1" />
        <div className="shape shape-2" />
        <div className="shape shape-3" />

        <div className="rulemine-grid" />
      </div>

      <div className="rulemine-content">
        <header className="rulemine-header">
          <h1>Rule Mine</h1>
          <p>Upload zip file containing yml jobs</p>
        </header>

        <section className="upload-card">
          <div
            className={`drop-zone ${isDragging ? "drag-active" : ""}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="drop-inner">
              <div className={`icon-circle ${isDragging ? "icon-active" : ""}`}>
                <FileArchive
                  className={`icon-main ${
                    isDragging ? "icon-main-active" : ""
                  }`}
                />
              </div>

              <h3 className="drop-title">
                {selectedFile ? selectedFile.name : "Upload ZIP File"}
              </h3>
              <p className="drop-subtitle">
                Drag and drop your ZIP file here, or click the button below to
                browse
              </p>

              <div className="btn-row">
                <label htmlFor="file-upload" className="btn btn-primary">
                  <Upload className="btn-icon" />
                  <span>Choose File</span>
                  <input
                    id="file-upload"
                    type="file"
                    accept=".zip"
                    onChange={handleFileChange}
                    className="file-input-hidden"
                  />
                </label>

                {selectedFile && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleUpload}
                  >
                    Upload File
                  </button>
                )}
              </div>

              {selectedFile && (
                <div className="file-info">
                  <div className="file-info-left">
                    <FileArchive className="file-info-icon" />
                    <div className="file-info-text">
                      <p className="file-name">{selectedFile.name}</p>
                      <p className="file-size">
                        {(selectedFile.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={handleRemove}
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="requirements-card">
          <h4>Requirements</h4>
          <ul>
            <li>• File must be in ZIP format</li>
            <li>• ZIP should contain YML job files</li>
            <li>• Maximum file size: 50MB</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
