#!/usr/bin/env python3
"""Mechanical stop gate for nquiz-queue-dev.

Exit 0 only when a fresh OPEN queue query reports 0 pending items.
Historical activeRequirementId is reported for visibility but is not a stop blocker.
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path


DEFAULT_STATE_FILE = "/tmp/cm-nquiz-queue-dev/state-default.json"
DEFAULT_QUERY_SCRIPT = "/root/.agents/skills/cm-nquiz-requirement-develop/scripts/develop_requirement.py"


def read_state(state_file: Path) -> dict:
    if not state_file.exists():
        return {"activeRequirementId": None}
    return json.loads(state_file.read_text(encoding="utf-8"))


def run_query(query_script: str, project_name: str) -> dict:
    completed = subprocess.run(
        [
            "python3",
            query_script,
            "--action",
            "query",
            "--status",
            "OPEN",
            "--project-name",
            project_name,
        ],
        check=False,
        capture_output=True,
        text=True,
    )

    if completed.returncode != 0:
        return {
            "ok": False,
            "step": "query",
            "returncode": completed.returncode,
            "stdout": completed.stdout,
            "stderr": completed.stderr,
        }

    try:
        payload = json.loads(completed.stdout)
    except json.JSONDecodeError as exc:
        return {
            "ok": False,
            "step": "parse-query",
            "error": str(exc),
            "stdout": completed.stdout,
            "stderr": completed.stderr,
        }

    return {
        "ok": True,
        "payload": payload,
        "stdout": completed.stdout,
        "stderr": completed.stderr,
    }


def extract_open_total(payload: dict) -> int:
    query_trace = payload.get("queryTrace") or []
    if query_trace:
        total_elements = query_trace[0].get("totalElements")
        if isinstance(total_elements, int):
            return total_elements
    count = payload.get("count")
    return count if isinstance(count, int) else 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Pre-final stop gate for nquiz queue development")
    parser.add_argument(
        "--state-file",
        default=DEFAULT_STATE_FILE,
        help="Path to cm-nquiz active state file (observability only; not used for stop decision)",
    )
    parser.add_argument("--query-script", default=DEFAULT_QUERY_SCRIPT, help="Path to develop_requirement.py")
    parser.add_argument("--project-name", default="nquiz", help="Project name for OPEN queue query")
    args = parser.parse_args()

    state = read_state(Path(args.state_file))
    active_requirement_id = state.get("activeRequirementId")
    query_result = run_query(args.query_script, args.project_name)

    if not query_result["ok"]:
        print(
            json.dumps(
                {
                    "ok": False,
                    "canStop": False,
                    "reason": "query_failed",
                    "activeRequirementId": active_requirement_id,
                    "query": query_result,
                },
                ensure_ascii=False,
            )
        )
        return 2

    payload = query_result["payload"]
    open_total = extract_open_total(payload)
    can_stop = open_total == 0
    reason = "queue_empty" if can_stop else "pending_work_exists"

    print(
        json.dumps(
            {
                "ok": True,
                "canStop": can_stop,
                "reason": reason,
                "activeRequirementId": active_requirement_id,
                "activeIgnored": True,
                "openTotal": open_total,
                "queryProjectName": payload.get("projectName"),
                "nextRecommendedId": payload.get("nextRecommendedId"),
            },
            ensure_ascii=False,
        )
    )
    return 0 if can_stop else 2


if __name__ == "__main__":
    sys.exit(main())
