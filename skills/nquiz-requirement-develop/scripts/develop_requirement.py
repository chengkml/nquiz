#!/usr/bin/env python3
"""
nquiz 需求开发执行脚本（串行 + 检查点 + 可恢复）

流程：
1) login -> jwt
2) 查询待处理需求（默认 OPEN, IN_PROGRESS）或处理单条需求
3) 逐条读取需求详情（/get/{id}）并基于描述生成开发执行计划
4) 状态流转：开始前置为 IN_PROGRESS -> 关键阶段更新 progressPercent -> 完成置为 COMPLETED
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import time
from datetime import datetime
from typing import Any, Dict, List, Optional, Sequence, Tuple
from urllib import error, parse, request

DEFAULT_BASE_URL = "https://www.quizck.cn"
DEFAULT_USER_ID = "openclaw"
DEFAULT_USER_PWD = "12345678"
DEFAULT_PROJECT_NAME = "nquiz"
DEFAULT_STATUSES = ["OPEN", "IN_PROGRESS"]
DEFAULT_PAGE_SIZE = 50
DEFAULT_MAX_ITEMS = 20
DEFAULT_PROGRESS_MILESTONES = [30, 60, 90]

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_CHECKPOINT_FILE = os.path.abspath(
    os.path.join(SCRIPT_DIR, "..", "runtime", "auto-query-checkpoint.json")
)

ALLOWED_STATUSES = {
    "OPEN",
    "IN_PROGRESS",
}

PRIORITY_ORDER = {
    "HIGH": 0,
    "MEDIUM": 1,
    "LOW": 2,
    "UNKNOWN": 3,
}


def print_json(data: Dict[str, Any], exit_code: int = 0) -> None:
    sys.stdout.write(json.dumps(data, ensure_ascii=False) + "\n")
    raise SystemExit(exit_code)


def fail(step: str, error_msg: str, details: Any = None, exit_code: int = 1) -> None:
    payload: Dict[str, Any] = {"ok": False, "step": step, "error": error_msg}
    if details is not None:
        payload["details"] = details
    print_json(payload, exit_code=exit_code)


def now_iso() -> str:
    return datetime.now().astimezone().isoformat(timespec="seconds")


def normalize_text(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip()


def normalize_priority(value: Any) -> str:
    text = normalize_text(value).upper()
    if not text:
        return "UNKNOWN"
    if text in {"HIGH", "MEDIUM", "LOW"}:
        return text
    return "UNKNOWN"


def sort_requirements_for_processing(requirements: Sequence[Dict[str, Any]]) -> List[Dict[str, Any]]:
    indexed = list(enumerate(requirements))

    def sort_key(item: Tuple[int, Dict[str, Any]]) -> Tuple[int, str, str, int]:
        idx, req = item
        priority = normalize_priority(req.get("priority"))
        create_date = normalize_text(req.get("createDate")) or "9999-99-99T99:99:99"
        req_id = normalize_text(req.get("id")) or "~"
        return (PRIORITY_ORDER.get(priority, PRIORITY_ORDER["UNKNOWN"]), create_date, req_id, idx)

    indexed.sort(key=sort_key)
    return [req for _, req in indexed]


def normalize_base_url(raw: str) -> str:
    value = normalize_text(raw)
    if not value:
        raise ValueError("base-url 不能为空")
    return value.rstrip("/")


def parse_statuses(status_args: Optional[Sequence[str]]) -> List[str]:
    if not status_args:
        return list(DEFAULT_STATUSES)

    result: List[str] = []
    seen = set()
    for item in status_args:
        for part in (item or "").split(","):
            status = normalize_text(part).upper()
            if not status:
                continue
            if status not in ALLOWED_STATUSES:
                raise ValueError(f"status 非法: {status}")
            if status not in seen:
                seen.add(status)
                result.append(status)

    if not result:
        raise ValueError("status 不能为空")
    return result


def parse_progress_milestones(raw: Optional[str]) -> List[int]:
    if raw is None or normalize_text(raw) == "":
        return list(DEFAULT_PROGRESS_MILESTONES)

    vals: List[int] = []
    seen = set()
    for part in raw.split(","):
        part = normalize_text(part)
        if not part:
            continue
        try:
            num = int(part)
        except ValueError:
            raise ValueError(f"progress-milestones 非整数: {part}")

        if num < 1 or num > 99:
            raise ValueError("progress-milestones 取值范围必须是 1-99")

        if num not in seen:
            seen.add(num)
            vals.append(num)

    if not vals:
        raise ValueError("progress-milestones 不能为空")

    vals.sort()
    return vals


def ensure_parent_dir(file_path: str) -> None:
    parent = os.path.dirname(os.path.abspath(file_path))
    if parent and not os.path.exists(parent):
        os.makedirs(parent, exist_ok=True)


def atomic_write_json(file_path: str, payload: Dict[str, Any]) -> None:
    ensure_parent_dir(file_path)
    tmp_file = f"{file_path}.tmp.{os.getpid()}"
    with open(tmp_file, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
        f.write("\n")
    os.replace(tmp_file, file_path)


def load_json_file(file_path: str) -> Dict[str, Any]:
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except FileNotFoundError:
        fail("resume", "检查点文件不存在，无法续跑", {"checkpointFile": file_path})
    except json.JSONDecodeError as e:
        fail("resume", "检查点文件损坏（JSON 解析失败）", {"checkpointFile": file_path, "error": str(e)})
    except OSError as e:
        fail("resume", "读取检查点文件失败", {"checkpointFile": file_path, "error": str(e)})

    if not isinstance(data, dict):
        fail("resume", "检查点文件格式非法", {"checkpointFile": file_path})
    return data


def append_jsonl_line(file_path: str, payload: Dict[str, Any]) -> None:
    ensure_parent_dir(file_path)
    with open(file_path, "a", encoding="utf-8") as f:
        f.write(json.dumps(payload, ensure_ascii=False) + "\n")


def emit_checkpoint_event(payload: Dict[str, Any], stream: str, checkpoint_log_file: Optional[str]) -> None:
    line = json.dumps(payload, ensure_ascii=False)
    if stream == "stdout":
        sys.stdout.write(line + "\n")
        sys.stdout.flush()
    else:
        sys.stderr.write(line + "\n")
        sys.stderr.flush()

    if checkpoint_log_file:
        try:
            append_jsonl_line(checkpoint_log_file, payload)
        except OSError as e:
            sys.stderr.write(
                json.dumps(
                    {
                        "type": "checkpoint-log-warning",
                        "timestamp": now_iso(),
                        "message": "写入 checkpoint-log-file 失败，已忽略",
                        "checkpointLogFile": checkpoint_log_file,
                        "error": str(e),
                    },
                    ensure_ascii=False,
                )
                + "\n"
            )
            sys.stderr.flush()


def ensure_2xx(step: str, resp: Dict[str, Any], error_msg: str) -> Any:
    status = int(resp.get("status", 0) or 0)
    if 200 <= status < 300:
        return extract_data_body(resp.get("body"))
    fail(step, error_msg, {"status": status, "body": resp.get("body")})


def extract_data_body(body: Any) -> Any:
    if isinstance(body, dict) and body.get("data") is not None:
        return body.get("data")
    return body


def http_json(
    opener: request.OpenerDirector,
    method: str,
    url: str,
    *,
    headers: Optional[Dict[str, str]] = None,
    json_body: Optional[Dict[str, Any]] = None,
    timeout: int = 15,
) -> Dict[str, Any]:
    req_headers = {"Accept": "application/json"}
    if headers:
        req_headers.update(headers)

    body_bytes = None
    if json_body is not None:
        req_headers["Content-Type"] = "application/json"
        body_bytes = json.dumps(json_body, ensure_ascii=False).encode("utf-8")

    req = request.Request(url=url, data=body_bytes, headers=req_headers, method=method)
    try:
        with opener.open(req, timeout=timeout) as resp:
            raw = resp.read().decode("utf-8", errors="replace")
            content_type = resp.headers.get("Content-Type", "")
            if "application/json" in content_type:
                try:
                    body: Any = json.loads(raw)
                except json.JSONDecodeError:
                    body = raw
            else:
                body = raw
            return {"status": resp.status, "body": body}
    except error.HTTPError as e:
        raw = e.read().decode("utf-8", errors="replace")
        err_body: Any = raw
        try:
            err_body = json.loads(raw)
        except Exception:
            pass
        return {"status": e.code, "body": err_body, "http_error": True}


def auth_headers(token: str) -> Dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def login_and_get_token(
    opener: request.OpenerDirector,
    *,
    base_url: str,
    user_id: str,
    user_pwd: str,
    timeout: int,
) -> str:
    login_resp = http_json(
        opener,
        "POST",
        f"{base_url}/api/user/login",
        json_body={"userId": user_id, "userPwd": user_pwd},
        timeout=timeout,
    )
    ensure_2xx("login", login_resp, "登录失败（账号/密码或服务异常）")

    jwt_url = f"{base_url}/api/jwt/generate?userId={parse.quote(user_id)}"
    jwt_resp = http_json(opener, "POST", jwt_url, timeout=timeout)
    jwt_body = ensure_2xx("jwt", jwt_resp, "JWT 生成失败（会话或接口异常）")
    token = normalize_text(jwt_body)
    if not token:
        fail("jwt", "JWT 生成失败：返回 token 为空")
    return token


def query_requirements_by_status(
    opener: request.OpenerDirector,
    *,
    base_url: str,
    token: str,
    project_name: str,
    statuses: Sequence[str],
    page_size: int,
    max_items: int,
    timeout: int,
) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    url = f"{base_url}/api/project/requirement/search"
    merged: List[Dict[str, Any]] = []
    seen_ids = set()
    trace: List[Dict[str, Any]] = []

    for status in statuses:
        page_num = 1
        while True:
            payload = {
                "projectName": project_name,
                "status": status,
                "pageNum": page_num,
                "pageSize": page_size,
            }
            resp = http_json(
                opener,
                "POST",
                url,
                headers=auth_headers(token),
                json_body=payload,
                timeout=timeout,
            )
            body = ensure_2xx("search", resp, "查询需求列表失败")
            if not isinstance(body, dict):
                fail("search", "需求查询返回格式异常", body)

            content = body.get("content")
            if not isinstance(content, list):
                content = []

            trace.append(
                {
                    "status": status,
                    "pageNum": page_num,
                    "returned": len(content),
                    "totalElements": body.get("totalElements"),
                    "totalPages": body.get("totalPages"),
                }
            )

            for item in content:
                if not isinstance(item, dict):
                    continue
                rid = normalize_text(item.get("id"))
                if not rid or rid in seen_ids:
                    continue
                seen_ids.add(rid)
                merged.append(item)
                if len(merged) >= max_items:
                    return merged, trace

            total_pages = body.get("totalPages")
            if not content:
                break
            if isinstance(total_pages, int) and total_pages > 0 and page_num >= total_pages:
                break
            if len(content) < page_size:
                break
            page_num += 1

    return merged, trace


def fetch_requirement_detail(
    opener: request.OpenerDirector,
    *,
    base_url: str,
    token: str,
    requirement_id: str,
    timeout: int,
) -> Dict[str, Any]:
    url = f"{base_url}/api/project/requirement/get/{parse.quote(requirement_id)}"
    resp = http_json(opener, "GET", url, headers=auth_headers(token), timeout=timeout)
    body = ensure_2xx("get_requirement", resp, "查询需求详情失败")
    if not isinstance(body, dict):
        fail("get_requirement", "需求详情返回格式异常", body)
    return body


def update_status(
    opener: request.OpenerDirector,
    *,
    base_url: str,
    token: str,
    requirement_id: str,
    status: str,
    progress_percent: Optional[int],
    result_msg: Optional[str],
    timeout: int,
) -> Dict[str, Any]:
    query = {"status": status}
    if progress_percent is not None:
        query["progressPercent"] = str(progress_percent)
    if normalize_text(result_msg):
        query["resultMsg"] = normalize_text(result_msg)

    url = f"{base_url}/api/project/requirement/{parse.quote(requirement_id)}/status?{parse.urlencode(query)}"
    resp = http_json(opener, "POST", url, headers=auth_headers(token), timeout=timeout)
    ensure_2xx("update_status", resp, f"更新需求状态失败: {requirement_id} -> {status}")

    return {
        "httpStatus": resp.get("status"),
        "response": resp.get("body"),
        "request": {
            "status": status,
            "progressPercent": progress_percent,
            "resultMsg": normalize_text(result_msg) or None,
        },
    }


def build_development_plan(requirement: Dict[str, Any]) -> Dict[str, Any]:
    title = normalize_text(requirement.get("title")) or "（未命名需求）"
    descr = normalize_text(requirement.get("descr"))
    descr_preview = descr[:200] + ("..." if len(descr) > 200 else "") if descr else "（描述为空）"

    return {
        "objective": title,
        "descriptionPreview": descr_preview,
        "basedOnDescr": bool(descr),
        "suggestedPhases": [
            "需求澄清与边界确认",
            "Next.js 页面/组件实现",
            "服务端逻辑与数据层实现",
            "构建验证与收口",
        ],
    }


def detect_repo_root() -> str:
    p = os.path.abspath(SCRIPT_DIR)
    for _ in range(8):
        candidate = p
        if os.path.isdir(os.path.join(candidate, ".git")) and os.path.isfile(os.path.join(candidate, "package.json")):
            return candidate
        p = os.path.dirname(p)
    fail("validate", "无法定位 nquiz 仓库根目录（需要包含 .git 与 package.json）")
    raise RuntimeError("unreachable")


def run_shell(command: str, cwd: str, timeout: int) -> Dict[str, Any]:
    start = time.time()
    completed = subprocess.run(
        ["bash", "-lc", command],
        cwd=cwd,
        capture_output=True,
        text=True,
        timeout=timeout,
        check=False,
    )
    duration_ms = int((time.time() - start) * 1000)
    return {
        "command": command,
        "cwd": cwd,
        "exitCode": completed.returncode,
        "durationMs": duration_ms,
        "stdout": (completed.stdout or "")[-8000:],
        "stderr": (completed.stderr or "")[-8000:],
    }


def list_changed_files(repo_root: str) -> List[str]:
    result = run_shell("git status --short", cwd=repo_root, timeout=60)
    if result["exitCode"] != 0:
        fail("develop", "获取 git 变更失败", result)
    files: List[str] = []
    for line in (result.get("stdout") or "").splitlines():
        if not line.strip():
            continue
        file_part = line[3:] if len(line) > 3 else line
        file_part = file_part.strip()
        if file_part and not file_part.startswith("skills/nquiz-requirement-develop/"):
            files.append(file_part)
    return sorted(set(files))


def relevant_source_changes(changed_files: Sequence[str]) -> List[str]:
    hits = []
    for f in changed_files:
        if f.startswith("src/") or f.startswith("app/") or f.startswith("components/") or f.startswith("src/app/"):
            hits.append(f)
    return sorted(set(hits))


def execute_development(
    *,
    repo_root: str,
    requirement: Dict[str, Any],
    build_timeout: int,
    progress_hook: Optional[callable] = None,
) -> Dict[str, Any]:
    req_id = normalize_text(requirement.get("id"))

    changed_files = list_changed_files(repo_root)
    effective_changes = relevant_source_changes(changed_files)

    if not effective_changes:
        fail(
            "develop",
            "检测不到本需求的源码改动，无法通过完成门禁",
            {
                "requirementId": req_id,
                "hint": "请先完成 nquiz 源码修改（如 src/app、src/components、app、components 等），再执行技能。",
                "gitChanged": changed_files,
            },
        )

    if progress_hook:
        progress_hook("代码改动已确认，进入构建验证")

    build_results: List[Dict[str, Any]] = []
    build_results.append(run_shell("npm run build", cwd=repo_root, timeout=build_timeout))

    failed_builds = [b for b in build_results if b.get("exitCode") != 0]
    if failed_builds:
        fail(
            "develop",
            "构建/编译验证失败，无法通过完成门禁",
            {
                "requirementId": req_id,
                "changedFiles": effective_changes,
                "buildResults": failed_builds,
            },
        )

    if progress_hook:
        progress_hook("开发门禁已通过，准备置为完成")

    return {
        "requirementId": req_id,
        "changedFiles": effective_changes,
        "buildResults": build_results,
    }


def build_transition_plan(milestones: Sequence[int], start_progress: int) -> List[Dict[str, Any]]:
    plan: List[Dict[str, Any]] = [
        {
            "phase": "start",
            "targetStatus": "IN_PROGRESS",
            "progressPercent": start_progress,
            "resultMsg": "开始开发：状态置为 IN_PROGRESS",
        }
    ]

    for p in milestones:
        plan.append(
            {
                "phase": "progress",
                "targetStatus": "IN_PROGRESS",
                "progressPercent": p,
                "resultMsg": f"开发进度更新：{p}%",
            }
        )

    plan.append(
        {
            "phase": "complete",
            "targetStatus": "COMPLETED",
            "progressPercent": 100,
            "resultMsg": "开发完成：状态置为 COMPLETED",
        }
    )

    return plan


def execute_for_requirement(
    opener: request.OpenerDirector,
    *,
    repo_root: str,
    base_url: str,
    token: str,
    requirement_id: str,
    milestones: Sequence[int],
    start_progress: int,
    timeout: int,
    build_timeout: int,
    process_order: Optional[int] = None,
    force_complete_if_already_completed: bool = False,
) -> Dict[str, Any]:
    requirement = fetch_requirement_detail(
        opener,
        base_url=base_url,
        token=token,
        requirement_id=requirement_id,
        timeout=timeout,
    )

    current_status = normalize_text(requirement.get("status")).upper()
    title = normalize_text(requirement.get("title"))
    plan = build_development_plan(requirement)
    transitions = build_transition_plan(milestones, start_progress)
    trajectory: List[Dict[str, Any]] = []

    def apply_status(step: Dict[str, Any]) -> None:
        nonlocal current_status
        exec_result = update_status(
            opener,
            base_url=base_url,
            token=token,
            requirement_id=requirement_id,
            status=step["targetStatus"],
            progress_percent=step["progressPercent"],
            result_msg=step["resultMsg"],
            timeout=timeout,
        )
        current_status = step["targetStatus"]
        trajectory.append(
            {
                "phase": step["phase"],
                **exec_result,
            }
        )

    if force_complete_if_already_completed and current_status == "COMPLETED":
        complete_only = {
            "phase": "complete",
            "targetStatus": "COMPLETED",
            "progressPercent": 100,
            "resultMsg": "开发完成：状态置为 COMPLETED",
        }
        apply_status(complete_only)
        development_result = {
            "requirementId": requirement_id,
            "changedFiles": [],
            "buildResults": [],
            "gateMode": "forced-complete-already-completed",
        }
        executed_transitions = [complete_only]
    else:
        start_step = transitions[0]
        apply_status(start_step)

        progress_steps = [step for step in transitions[1:] if step["phase"] == "progress"]
        progress_index = 0

        def progress_hook(_message: str) -> None:
            nonlocal progress_index
            if progress_index >= len(progress_steps):
                return
            apply_status(progress_steps[progress_index])
            progress_index += 1

        development_result = execute_development(
            repo_root=repo_root,
            requirement=requirement,
            build_timeout=build_timeout,
            progress_hook=progress_hook,
        )

        while progress_index < len(progress_steps):
            apply_status(progress_steps[progress_index])
            progress_index += 1

        complete_step = next(step for step in transitions if step["phase"] == "complete")
        apply_status(complete_step)
        executed_transitions = [start_step, *progress_steps, complete_step]

    return {
        "processOrder": process_order,
        "requirementId": requirement_id,
        "title": title,
        "initialStatus": normalize_text(requirement.get("status")),
        "priority": normalize_priority(requirement.get("priority")),
        "createDate": normalize_text(requirement.get("createDate")),
        "finalStatusPlanned": current_status,
        "developmentPlan": plan,
        "developmentExecution": development_result,
        "transitionPlan": executed_transitions,
        "trajectory": trajectory,
    }


def build_status_writeback_result(item: Dict[str, Any]) -> Dict[str, Any]:
    trajectory = item.get("trajectory")
    if not isinstance(trajectory, list):
        trajectory = []

    updates: List[Dict[str, Any]] = []
    for tr in trajectory:
        if not isinstance(tr, dict):
            continue
        req = tr.get("request")
        if not isinstance(req, dict):
            req = {}
        updates.append(
            {
                "phase": tr.get("phase"),
                "status": req.get("status"),
                "progressPercent": req.get("progressPercent"),
                "httpStatus": tr.get("httpStatus"),
            }
        )

    if not updates:
        return {
            "updated": False,
            "updates": [],
            "final": None,
            "note": "当前 action 未发生状态写回",
        }

    return {
        "updated": True,
        "updates": updates,
        "final": updates[-1],
    }


def build_checkpoint_event(
    *,
    state: Dict[str, Any],
    current_id: str,
    completed_item: Dict[str, Any],
    checkpoint_file: str,
) -> Dict[str, Any]:
    plan = state.get("plan")
    if not isinstance(plan, dict):
        plan = {}

    all_ids = plan.get("allIds")
    if not isinstance(all_ids, list):
        all_ids = []

    cursor = state.get("cursor")
    if not isinstance(cursor, dict):
        cursor = {}

    next_index = cursor.get("nextIndex")
    if not isinstance(next_index, int) or next_index < 0:
        next_index = 0
    if next_index > len(all_ids):
        next_index = len(all_ids)

    remaining_ids = all_ids[next_index:]

    return {
        "type": "checkpoint",
        "timestamp": now_iso(),
        "checkpointFile": checkpoint_file,
        "completedId": normalize_text(completed_item.get("requirementId")),
        "currentId": current_id,
        "nextId": remaining_ids[0] if remaining_ids else None,
        "remainingIds": remaining_ids,
        "remainingCount": len(remaining_ids),
        "statusWritebackResult": build_status_writeback_result(completed_item),
    }


def init_auto_query_state(
    *,
    cfg: Dict[str, Any],
    query_trace: Sequence[Dict[str, Any]],
    requirement_ids: Sequence[str],
) -> Dict[str, Any]:
    ts = now_iso()
    return {
        "version": 1,
        "mode": "auto-query",
        "runStatus": "running",
        "createdAt": ts,
        "updatedAt": ts,
        "config": {
            "action": cfg["action"],
            "projectName": cfg["project_name"],
            "statuses": list(cfg["statuses"]),
            "pageSize": cfg["page_size"],
            "maxItems": cfg["max_items"],
            "milestones": list(cfg["milestones"]),
            "startProgress": cfg["start_progress"],
            "baseUrl": cfg["base_url"],
            "userId": cfg["user_id"],
            "buildTimeout": cfg["build_timeout"],
        },
        "queryTrace": list(query_trace),
        "plan": {
            "allIds": list(requirement_ids),
            "total": len(requirement_ids),
            "processingOrderRule": "priority(HIGH>MEDIUM>LOW) then createDate then id",
        },
        "cursor": {
            "nextIndex": 0,
            "completedIds": [],
        },
        "results": [],
        "lastCheckpoint": None,
        "lastError": None,
    }


def extract_auto_query_state(state: Dict[str, Any]) -> Tuple[List[str], int, List[Dict[str, Any]], List[Dict[str, Any]]]:
    plan = state.get("plan")
    if not isinstance(plan, dict):
        fail("resume", "检查点缺少 plan 信息", state)

    all_ids = plan.get("allIds")
    if not isinstance(all_ids, list):
        fail("resume", "检查点缺少 allIds 信息", state)

    normalized_ids = [normalize_text(x) for x in all_ids if normalize_text(x)]

    cursor = state.get("cursor")
    if not isinstance(cursor, dict):
        fail("resume", "检查点缺少 cursor 信息", state)

    next_index = cursor.get("nextIndex")
    if not isinstance(next_index, int):
        fail("resume", "检查点 nextIndex 非法", state)

    if next_index < 0:
        next_index = 0
    if next_index > len(normalized_ids):
        next_index = len(normalized_ids)

    results_raw = state.get("results")
    results: List[Dict[str, Any]] = []
    if isinstance(results_raw, list):
        results = [x for x in results_raw if isinstance(x, dict)]

    trace_raw = state.get("queryTrace")
    query_trace: List[Dict[str, Any]] = []
    if isinstance(trace_raw, list):
        query_trace = [x for x in trace_raw if isinstance(x, dict)]

    return normalized_ids, next_index, results, query_trace


def validate_resume_compatibility(cfg: Dict[str, Any], state: Dict[str, Any]) -> None:
    if normalize_text(state.get("mode")) != "auto-query":
        fail("resume", "检查点不是 auto-query 模式，不能续跑", {"mode": state.get("mode")})

    sc = state.get("config")
    if not isinstance(sc, dict):
        fail("resume", "检查点缺少 config，不能校验续跑参数")

    checks = [
        ("action", cfg.get("action"), sc.get("action")),
        ("projectName", cfg.get("project_name"), sc.get("projectName")),
        ("statuses", list(cfg.get("statuses", [])), sc.get("statuses")),
        ("pageSize", cfg.get("page_size"), sc.get("pageSize")),
        ("maxItems", cfg.get("max_items"), sc.get("maxItems")),
        ("milestones", list(cfg.get("milestones", [])), sc.get("milestones")),
        ("startProgress", cfg.get("start_progress"), sc.get("startProgress")),
        ("baseUrl", cfg.get("base_url"), sc.get("baseUrl")),
        ("userId", cfg.get("user_id"), sc.get("userId")),
        ("buildTimeout", cfg.get("build_timeout"), sc.get("buildTimeout")),
    ]

    mismatches = []
    for key, expected, actual in checks:
        if expected != actual:
            mismatches.append({"field": key, "expected": expected, "actual": actual})

    if mismatches:
        fail(
            "resume",
            "续跑参数与检查点不一致；请使用相同参数续跑，或用 --reset-checkpoint 重建计划",
            {"mismatches": mismatches},
        )


def refresh_completed_ids_from_results(state: Dict[str, Any]) -> None:
    results = state.get("results")
    if not isinstance(results, list):
        state["cursor"]["completedIds"] = []
        return

    completed_ids = []
    for item in results:
        if not isinstance(item, dict):
            continue
        rid = normalize_text(item.get("requirementId"))
        if rid:
            completed_ids.append(rid)
    cursor = state.get("cursor")
    if not isinstance(cursor, dict):
        cursor = {}
        state["cursor"] = cursor
    cursor["completedIds"] = completed_ids


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="nquiz 需求开发执行（仅支持完整闭环 full）：login -> jwt -> query/get -> status progress update",
    )

    parser.add_argument(
        "--action",
        choices=["full"],
        default="full",
        help="仅支持 full（完整流程：start -> progress -> complete）",
    )

    parser.add_argument("--auto-query", action="store_true", help="批量模式：先查询再逐条处理")
    parser.add_argument("--requirement-id", help="单条模式需求 ID（不启用 --auto-query 时必填）")

    parser.add_argument(
        "--status",
        action="append",
        help="查询状态（可重复或逗号分隔），默认 OPEN,IN_PROGRESS",
    )
    parser.add_argument("--project-name", default=DEFAULT_PROJECT_NAME, help="项目名过滤，默认 nquiz")
    parser.add_argument("--page-size", type=int, default=DEFAULT_PAGE_SIZE, help=f"查询分页大小，默认 {DEFAULT_PAGE_SIZE}")
    parser.add_argument("--max-items", type=int, default=DEFAULT_MAX_ITEMS, help=f"批量最大处理数，默认 {DEFAULT_MAX_ITEMS}")

    parser.add_argument(
        "--progress-milestones",
        default=",".join(str(x) for x in DEFAULT_PROGRESS_MILESTONES),
        help="关键进度里程碑（逗号分隔，1-99），默认 30,60,90",
    )
    parser.add_argument(
        "--start-progress",
        type=int,
        default=0,
        help="start 阶段写入的进度值（0-99），默认 0",
    )

    parser.add_argument("--base-url", default=DEFAULT_BASE_URL, help="服务地址，默认 https://www.quizck.cn")
    parser.add_argument("--user-id", default=DEFAULT_USER_ID, help="登录账号，默认 openclaw")
    parser.add_argument("--user-pwd", default=DEFAULT_USER_PWD, help="登录密码，默认 12345678")
    parser.add_argument("--timeout", type=int, default=15, help="HTTP 超时秒数，默认 15")
    parser.add_argument("--build-timeout", type=int, default=600, help="构建/编译命令超时秒数，默认 600")

    parser.add_argument(
        "--force-complete-if-already-completed",
        action="store_true",
        help="当需求已是 COMPLETED 时，full 仍执行一次 COMPLETED(100) 写回",
    )

    parser.add_argument(
        "--checkpoint-file",
        default=DEFAULT_CHECKPOINT_FILE,
        help=f"检查点状态文件路径（默认 {DEFAULT_CHECKPOINT_FILE}）",
    )
    parser.add_argument("--resume", action="store_true", help="从 checkpoint-file 续跑（仅 auto-query）")
    parser.add_argument(
        "--reset-checkpoint",
        action="store_true",
        help="忽略旧检查点，重新查询并覆盖 checkpoint-file（仅 auto-query）",
    )
    parser.add_argument(
        "--checkpoint-log-file",
        default="",
        help="检查点事件日志文件（JSONL，默认 <checkpoint-file>.events.jsonl）",
    )
    parser.add_argument(
        "--checkpoint-stream",
        choices=["stderr", "stdout"],
        default="stderr",
        help="检查点即时输出流，默认 stderr",
    )

    return parser


def validate_args(args: argparse.Namespace) -> Dict[str, Any]:
    try:
        checkpoint_file = os.path.abspath(normalize_text(args.checkpoint_file) or DEFAULT_CHECKPOINT_FILE)
        checkpoint_log_file = normalize_text(args.checkpoint_log_file)
        if checkpoint_log_file:
            checkpoint_log_file = os.path.abspath(checkpoint_log_file)
        else:
            checkpoint_log_file = f"{checkpoint_file}.events.jsonl"

        cfg = {
            "action": "full",
            "auto_query": bool(args.auto_query),
            "requirement_id": normalize_text(args.requirement_id),
            "statuses": parse_statuses(args.status),
            "project_name": normalize_text(args.project_name) or DEFAULT_PROJECT_NAME,
            "page_size": args.page_size,
            "max_items": args.max_items,
            "milestones": parse_progress_milestones(args.progress_milestones),
            "start_progress": args.start_progress,
            "base_url": normalize_base_url(args.base_url),
            "user_id": normalize_text(args.user_id),
            "user_pwd": args.user_pwd or "",
            "timeout": args.timeout,
            "force_complete_if_already_completed": bool(args.force_complete_if_already_completed),
            "build_timeout": args.build_timeout,
            "checkpoint_file": checkpoint_file,
            "resume": bool(args.resume),
            "reset_checkpoint": bool(args.reset_checkpoint),
            "checkpoint_log_file": checkpoint_log_file,
            "checkpoint_stream": args.checkpoint_stream,
        }

        if not cfg["auto_query"] and not cfg["requirement_id"]:
            raise ValueError("非 auto-query 模式下 requirement-id 不能为空")

        if cfg["resume"] and cfg["reset_checkpoint"]:
            raise ValueError("--resume 与 --reset-checkpoint 不能同时使用")
        if cfg["resume"] and not cfg["auto_query"]:
            raise ValueError("--resume 仅支持 --auto-query 模式")
        if cfg["reset_checkpoint"] and not cfg["auto_query"]:
            raise ValueError("--reset-checkpoint 仅支持 --auto-query 模式")

        if not cfg["user_id"]:
            raise ValueError("user-id 不能为空")
        if not cfg["user_pwd"]:
            raise ValueError("user-pwd 不能为空")

        if cfg["timeout"] <= 0:
            raise ValueError("timeout 必须大于 0")
        if cfg["page_size"] <= 0:
            raise ValueError("page-size 必须大于 0")
        if cfg["max_items"] <= 0:
            raise ValueError("max-items 必须大于 0")

        if cfg["start_progress"] < 0 or cfg["start_progress"] > 99:
            raise ValueError("start-progress 必须在 0-99 之间")
        if cfg["build_timeout"] <= 0:
            raise ValueError("build-timeout 必须大于 0")

        return cfg
    except ValueError as e:
        fail("validate", str(e), exit_code=2)


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()
    cfg = validate_args(args)

    repo_root = detect_repo_root()

    opener = request.build_opener(request.HTTPCookieProcessor())

    token = login_and_get_token(
        opener,
        base_url=cfg["base_url"],
        user_id=cfg["user_id"],
        user_pwd=cfg["user_pwd"],
        timeout=cfg["timeout"],
    )

    items: List[Dict[str, Any]] = []
    query_trace: List[Dict[str, Any]] = []
    resumed = False
    checkpoint_file = cfg["checkpoint_file"]

    if cfg["auto_query"]:
        if cfg["resume"]:
            state = load_json_file(checkpoint_file)
            validate_resume_compatibility(cfg, state)
            all_ids, next_index, items, query_trace = extract_auto_query_state(state)
            resumed = True
        else:
            if os.path.exists(checkpoint_file) and not cfg["reset_checkpoint"]:
                fail(
                    "checkpoint",
                    "检测到已存在检查点文件。请使用 --resume 续跑，或使用 --reset-checkpoint 重建执行计划。",
                    {"checkpointFile": checkpoint_file},
                )

            queried, query_trace = query_requirements_by_status(
                opener,
                base_url=cfg["base_url"],
                token=token,
                project_name=cfg["project_name"],
                statuses=cfg["statuses"],
                page_size=cfg["page_size"],
                max_items=cfg["max_items"],
                timeout=cfg["timeout"],
            )
            ordered = sort_requirements_for_processing(queried)
            all_ids = []
            for req in ordered:
                rid = normalize_text(req.get("id"))
                if rid:
                    all_ids.append(rid)

            state = init_auto_query_state(cfg=cfg, query_trace=query_trace, requirement_ids=all_ids)
            atomic_write_json(checkpoint_file, state)
            next_index = 0

        if next_index >= len(all_ids):
            state["runStatus"] = "completed"
            state["updatedAt"] = now_iso()
            state["lastError"] = None
            atomic_write_json(checkpoint_file, state)
            print_json(
                {
                    "ok": True,
                    "mode": "auto-query",
                    "action": cfg["action"],
                    "projectName": cfg["project_name"],
                    "statuses": cfg["statuses"],
                    "processingOrderRule": "priority(HIGH>MEDIUM>LOW) then createDate then id",
                    "priorityProcessingRule": {
                        "order": ["HIGH", "MEDIUM", "LOW", "UNKNOWN"],
                        "stableWithinPriority": "createDate asc, id asc, fallback query order",
                    },
                    "queryTrace": query_trace,
                    "count": len(items),
                    "items": items,
                    "resumed": resumed,
                    "executionMode": "serial",
                    "checkpointFile": checkpoint_file,
                    "checkpointLogFile": cfg["checkpoint_log_file"],
                    "nextIndex": next_index,
                    "remainingCount": 0,
                    "lastCheckpoint": state.get("lastCheckpoint"),
                }
            )

        for idx in range(next_index, len(all_ids)):
            rid = all_ids[idx]
            try:
                item = execute_for_requirement(
                    opener,
                    repo_root=repo_root,
                    base_url=cfg["base_url"],
                    token=token,
                    requirement_id=rid,
                    milestones=cfg["milestones"],
                    start_progress=cfg["start_progress"],
                    timeout=cfg["timeout"],
                    build_timeout=cfg["build_timeout"],
                    process_order=idx + 1,
                    force_complete_if_already_completed=cfg["force_complete_if_already_completed"],
                )
            except SystemExit as ex:
                state["runStatus"] = "aborted"
                state["updatedAt"] = now_iso()
                state["lastError"] = {
                    "timestamp": now_iso(),
                    "currentId": rid,
                    "message": "执行中断（SystemExit）",
                    "exitCode": ex.code,
                }
                atomic_write_json(checkpoint_file, state)
                raise
            except Exception as ex:
                state["runStatus"] = "aborted"
                state["updatedAt"] = now_iso()
                state["lastError"] = {
                    "timestamp": now_iso(),
                    "currentId": rid,
                    "message": "执行异常",
                    "error": str(ex),
                }
                atomic_write_json(checkpoint_file, state)
                fail("execute_requirement", "执行需求时发生异常", {"requirementId": rid, "error": str(ex)})

            items.append(item)
            state["results"] = items
            state["cursor"]["nextIndex"] = idx + 1
            refresh_completed_ids_from_results(state)
            state["runStatus"] = "running"
            state["updatedAt"] = now_iso()
            state["lastError"] = None

            checkpoint_event = build_checkpoint_event(
                state=state,
                current_id=rid,
                completed_item=item,
                checkpoint_file=checkpoint_file,
            )
            state["lastCheckpoint"] = checkpoint_event
            atomic_write_json(checkpoint_file, state)

            emit_checkpoint_event(
                checkpoint_event,
                stream=cfg["checkpoint_stream"],
                checkpoint_log_file=cfg["checkpoint_log_file"],
            )

        state["runStatus"] = "completed"
        state["updatedAt"] = now_iso()
        state["lastError"] = None
        atomic_write_json(checkpoint_file, state)

        print_json(
            {
                "ok": True,
                "mode": "auto-query",
                "action": cfg["action"],
                "projectName": cfg["project_name"],
                "statuses": cfg["statuses"],
                "processingOrderRule": "priority(HIGH>MEDIUM>LOW) then createDate then id",
                "priorityProcessingRule": {
                    "order": ["HIGH", "MEDIUM", "LOW", "UNKNOWN"],
                    "stableWithinPriority": "createDate asc, id asc, fallback query order",
                },
                "queryTrace": query_trace,
                "count": len(items),
                "items": items,
                "resumed": resumed,
                "executionMode": "serial",
                "checkpointFile": checkpoint_file,
                "checkpointLogFile": cfg["checkpoint_log_file"],
                "nextIndex": state["cursor"].get("nextIndex"),
                "remainingCount": 0,
                "lastCheckpoint": state.get("lastCheckpoint"),
            }
        )

    else:
        items.append(
            execute_for_requirement(
                opener,
                repo_root=repo_root,
                base_url=cfg["base_url"],
                token=token,
                requirement_id=cfg["requirement_id"],
                milestones=cfg["milestones"],
                start_progress=cfg["start_progress"],
                timeout=cfg["timeout"],
                build_timeout=cfg["build_timeout"],
                force_complete_if_already_completed=cfg["force_complete_if_already_completed"],
            )
        )

        print_json(
            {
                "ok": True,
                "mode": "single",
                "action": cfg["action"],
                "projectName": cfg["project_name"],
                "statuses": cfg["statuses"],
                "processingOrderRule": None,
                "priorityProcessingRule": None,
                "queryTrace": query_trace,
                "count": len(items),
                "items": items,
                "resumed": False,
                "executionMode": "serial",
            }
        )


if __name__ == "__main__":
    main()
