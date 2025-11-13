from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, Any
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

JobSpec = Dict[str, Any]


def build_dummy_workflow_spec() -> JobSpec:
    return {
        "workflow_name": "CARI_CBB_BB_INFO1_CHARGEOFF_TXN_MONTHLY",
        "jobs": [
            {
                "job_name": "Job1",
                "job_type": "Ingest",
                "dag_name": "CBB_TR_D_BB_CROFF_M",
                "schedule_bd_day": "BD4",
                "schedule_hour": "20:00",
                "rank": 1,
                "dependencies": [],
                "tables": ["accounts", "branches", "customers", "transactions"],
                "columns": {
                    "accounts": [
                        "account_id",
                        "account_type",
                        "open_date",
                    ],
                    "branches": [
                        "branch_id",
                        "branch_name",
                        "branch_city",
                    ],
                    "customers": [
                        "customer_id",
                        "customer_name",
                        "customer_address",
                    ],
                    "transactions": [
                        "transaction_id",
                        "account_id",
                        "transaction_amount",
                        "transaction_date",
                    ],
                },
                "inner_join": [
                    {
                        "tablesUsed": ["accounts", "customers"],
                        "attr_list": ["customer_id"],
                    }
                ],
                "left_join": [
                    {
                        "tablesUsed": ["accounts", "transactions"],
                        "attr_list": ["account_id"],
                    },
                    {
                        "tablesUsed": ["branches", "transactions"],
                        "attr_list": ["branch_id"],
                    },
                ],
                "right_join": [
                    {
                        "tablesUsed": ["customers", "branches"],
                        "attr_list": ["branch_id"],
                    }
                ],
            },
            {
                "job_name": "Job2",
                "job_type": "Ingest",
                "dag_name": "CBB_TR_D_BB_CROFF_M",
                "schedule_bd_day": "BD4",
                "schedule_hour": "20:00",
                "rank": 2,
                "dependencies": ["Job1"],
                "tables": ["accounts", "branches"],
                "columns": {
                    "accounts": [
                        "account_id",
                        "account_type",
                        "open_date",
                    ],
                    "branches": [
                        "branch_id",
                        "branch_name",
                        "branch_city",
                    ],
                    "Job1": [
                        "transaction_id",
                        "account_id",
                        "transaction_amount",
                        "transaction_date",
                    ],
                },
                "inner_join": [],
                "left_join": [
                    {
                        "tablesUsed": ["Job1", "accounts"],
                        "attr_list": ["account_id"],
                    },
                    {
                        "tablesUsed": ["Job1", "branches"],
                        "attr_list": ["branch_id"],
                    },
                ],
                "right_join": None,
            },
        ],
    }


@app.post("/process-zip")
async def process_zip(file: UploadFile = File(...)) -> JobSpec:
    if not file.filename.lower().endswith(".zip"):
        return {"error": "Please upload a .zip file"}

    # Consume body (even though we ignore content for now)
    await file.read()

    # Return hard-coded workflow JSON for UI testing
    return build_dummy_workflow_spec()
