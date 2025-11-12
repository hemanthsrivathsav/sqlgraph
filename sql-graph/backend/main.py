from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, Any, Optional, List
import tempfile, zipfile, os, shutil

app = FastAPI()

# CORS: allow localhost vite/cra
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

JobSpec = Dict[str, Optional[Dict[str, Any]]]

def build_spec_from_sql_files(root: str) -> JobSpec:
    """
    TODO: Replace with real parsing (sqlglot etc.)
    For now, create one job per .sql file, no dependencies, random-ish impact by size.
    """
    spec: JobSpec = {}
    for dirpath, _, filenames in os.walk(root):
        for fn in filenames:
            if fn.lower().endswith(".sql"):
                full = os.path.join(dirpath, fn)
                rel = os.path.relpath(full, root).replace("\\", "/")
                size = os.path.getsize(full)
                impact = min(100, int(size % 100))
                spec[rel] = {"depends_on": [], "impact": impact}
    return spec

@app.post("/process-zip")
async def process_zip(file: UploadFile = File(...)) -> JobSpec:
    if not file.filename.lower().endswith(".zip"):
        return {}

    tmpdir = tempfile.mkdtemp(prefix="sqlzip_")
    try:
        zip_path = os.path.join(tmpdir, "upload.zip")
        with open(zip_path, "wb") as f:
            f.write(await file.read())

        with zipfile.ZipFile(zip_path, "r") as z:
            z.extractall(os.path.join(tmpdir, "unzipped"))

        spec = build_spec_from_sql_files(os.path.join(tmpdir, "unzipped"))
        return spec
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)
