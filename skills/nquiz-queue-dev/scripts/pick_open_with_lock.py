#!/usr/bin/env python3
"""Concurrency-safe OPEN picker for nquiz-queue-dev.

This script serializes `start --pick-first` with an advisory lock so that
parallel queue runners don't claim the same OPEN requirement at the same time.
"""

from __future__ import annotations

import argparse
import fcntl
import json
import subprocess
import sys
import time
from pathlib import Path


DEFAULT_DEVELOP_SCRIPT = "/root/.agents/skills/cm-nquiz-requirement-develop/scripts/develop_requirement.py"
DEFAULT_LOCK_FILE = "/tmp/cm-nquiz-queue-dev/pick.lock"


def run_start(develop_script: str, project_name: str, status: str, state_file: str) -> int:
    completed = subprocess.run(
        [
            "python3",
            develop_script,
            "--action",
            "start",
            "--pick-first",
            "--status",
            status,
            "--project-name",
            project_name,
            "--state-file",
            state_file,
        ],
        check=False,
        capture_output=True,
        text=True,
    )

    if completed.stdout:
        sys.stdout.write(completed.stdout)
        if not completed.stdout.endswith("\n"):
            sys.stdout.write("\n")

    if completed.stderr:
        sys.stderr.write(completed.stderr)
        if not completed.stderr.endswith("\n"):
            sys.stderr.write("\n")

    return completed.returncode


def main() -> int:
    parser = argparse.ArgumentParser(description="Serialize OPEN requirement picking for concurrent queue runs")
    parser.add_argument("--state-file", required=True, help="Per-run state file path")
    parser.add_argument("--project-name", default="nquiz", help="Project name to query")
    parser.add_argument("--status", default="OPEN", help="Queue status to pick from")
    parser.add_argument("--develop-script", default=DEFAULT_DEVELOP_SCRIPT, help="Path to develop_requirement.py")
    parser.add_argument("--lock-file", default=DEFAULT_LOCK_FILE, help="Advisory lock file path")
    parser.add_argument("--timeout-seconds", type=float, default=30.0, help="Lock acquisition timeout")
    parser.add_argument("--poll-interval-seconds", type=float, default=0.1, help="Retry interval while waiting for lock")
    args = parser.parse_args()

    lock_path = Path(args.lock_file)
    lock_path.parent.mkdir(parents=True, exist_ok=True)

    state_path = Path(args.state_file)
    state_path.parent.mkdir(parents=True, exist_ok=True)

    timeout_seconds = max(args.timeout_seconds, 0.0)
    poll_interval = max(args.poll_interval_seconds, 0.05)
    deadline = time.monotonic() + timeout_seconds

    with lock_path.open("a+", encoding="utf-8") as lock_fp:
        while True:
            try:
                fcntl.flock(lock_fp.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
                break
            except BlockingIOError:
                if time.monotonic() >= deadline:
                    print(
                        json.dumps(
                            {
                                "ok": False,
                                "step": "acquire-lock",
                                "error": "lock_timeout",
                                "lockFile": str(lock_path),
                                "timeoutSeconds": timeout_seconds,
                            },
                            ensure_ascii=False,
                        )
                    )
                    return 2
                time.sleep(poll_interval)

        return run_start(
            develop_script=args.develop_script,
            project_name=args.project_name,
            status=args.status,
            state_file=str(state_path),
        )


if __name__ == "__main__":
    sys.exit(main())
