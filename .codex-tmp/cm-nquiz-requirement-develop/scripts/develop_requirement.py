#!/usr/bin/env python3
"""
nquiz 需求开发辅助脚本

职责：
1) query: 查询待开发需求列表（默认 OPEN, IN_PROGRESS）
2) start: 领取一条需求并置为 IN_PROGRESS，同时记录本地开发基线
3) progress: 开发过程中按里程碑更新 progressPercent
4) complete: 完成真实开发后执行门禁（源码改动 + build），再置为 COMPLETED

注意：
- 脚本只负责需求状态流转与本地开发门禁，不会替代主智能体执行代码开发。
- 默认一次只允许有 1 条 active requirement，避免并行开发与状态串写。
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import shlex
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
DEFAULT_SOURCE_DIRS = ["src", "app", "components"]
DEFAULT_BUILD_COMMAND = "npm run build"
DEFAULT_STATE_FILE = "/tmp/cm-nquiz-requirement-develop-state.json"

ALLOWED_QUERY_STATUSES = {
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
    if text in {"HIGH", "MEDIUM", "LOW"}:
        return text
    return "UNKNOWN"


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
            if status not in ALLOWED_QUERY_STATUSES:
                raise ValueError(f"status 非法: {status}")
            if status not in seen:
                seen.add(status)
                result.append(status)

    if not result:
        raise ValueError("status 不能为空")
    return result


def parse_source_dirs(raw: Optional[str]) -> List[str]:
    if raw is None or normalize_text(raw) == "":
        return list(DEFAULT_SOURCE_DIRS)

    dirs: List[str] = []
    seen = set()
    for part in raw.split(","):
        value = normalize_text(part).strip("/").replace("\\", "/")
        if not value:
            continue
        if value not in seen:
            seen.add(value)
            dirs.append(value)

    if not dirs:
        raise ValueError("source-dirs 不能为空")
    return dirs


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


def load_json_file_or_default(file_path: str, default: Dict[str, Any]) -> Dict[str, Any]:
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except FileNotFoundError:
        return default
    except json.JSONDecodeError as e:
        fail("state", "状态文件损坏（JSON 解析失败）", {"stateFile": file_path, "error": str(e)})
    except OSError as e:
        fail("state", "读取状态文件失败", {"stateFile": file_path, "error": str(e)})

    if not isinstance(data, dict):
        fail("state", "状态文件格式非法", {"stateFile": file_path})
    return data


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
        "timestamp": now_iso(),
        "httpStatus": resp.get("status"),
        "response": resp.get("body"),
        "request": {
            "status": status,
            "progressPercent": progress_percent,
            "resultMsg": normalize_text(result_msg) or None,
        },
    }


def parse_progress_percent(raw: Any) -> Optional[int]:
    text = normalize_text(raw)
    if not text:
        return None
    try:
        return int(text)
    except ValueError:
        return None


def build_requirement_summary(requirement: Dict[str, Any], *, process_order: Optional[int] = None) -> Dict[str, Any]:
    return {
        "processOrder": process_order,
        "id": normalize_text(requirement.get("id")),
        "title": normalize_text(requirement.get("title")),
        "status": normalize_text(requirement.get("status")),
        "progressPercent": parse_progress_percent(requirement.get("progressPercent")),
        "priority": normalize_priority(requirement.get("priority")),
        "createDate": normalize_text(requirement.get("createDate")),
    }


def extract_descr_items(descr: str, limit: int = 8) -> List[str]:
    lines = [normalize_text(line) for line in descr.splitlines()]
    items = [line.lstrip("-*0123456789. ").strip() for line in lines if line]
    items = [item for item in items if item]
    if items:
        return items[:limit]

    parts = []
    for sep in ["；", "。", "\n"]:
        if sep in descr:
            parts = [normalize_text(x) for x in descr.split(sep)]
            break
    if not parts:
        parts = [descr]
    return [p for p in parts if p][:limit]


def build_development_plan(requirement: Dict[str, Any]) -> Dict[str, Any]:
    title = normalize_text(requirement.get("title")) or "（未命名需求）"
    descr = normalize_text(requirement.get("descr"))
    items = extract_descr_items(descr) if descr else []

    return {
        "objective": title,
        "basedOnDescr": bool(descr),
        "descriptionPreview": descr[:500] + ("..." if len(descr) > 500 else "") if descr else "（描述为空）",
        "extractedChecklist": items,
        "requiredWorkflow": [
            "先阅读需求 descr 并确认边界",
            "在 nquiz Next.js 仓库中完成真实开发",
            "开发过程中定期调用 progress 更新进度",
            "确认源码改动与构建通过后再调用 complete",
        ],
    }


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


def detect_repo_root(start_path: Optional[str] = None) -> str:
    p = os.path.abspath(start_path or os.getcwd())
    while True:
        if os.path.isdir(os.path.join(p, ".git")) and os.path.isfile(os.path.join(p, "package.json")):
            return p
        parent = os.path.dirname(p)
        if parent == p:
            break
        p = parent
    fail("validate", "无法定位 nquiz 仓库根目录（需要包含 .git 与 package.json）", {"startPath": start_path or os.getcwd()})
    raise RuntimeError("unreachable")


def sha1_of_file(file_path: str) -> str:
    h = hashlib.sha1()
    with open(file_path, "rb") as f:
        while True:
            chunk = f.read(65536)
            if not chunk:
                break
            h.update(chunk)
    return h.hexdigest()


def list_git_paths(command: str, repo_root: str) -> List[str]:
    result = run_shell(command, cwd=repo_root, timeout=60)
    if result["exitCode"] != 0:
        fail("git", "执行 git 命令失败", result)
    items = []
    for line in (result.get("stdout") or "").splitlines():
        value = normalize_text(line)
        if value:
            items.append(value)
    return items


def collect_dirty_source_snapshot(repo_root: str, source_dirs: Sequence[str]) -> Dict[str, str]:
    path_args = " ".join(shlex.quote(path) for path in source_dirs)
    tracked = list_git_paths(f"git diff --name-only HEAD -- {path_args}", repo_root)
    untracked = list_git_paths(f"git ls-files --others --exclude-standard -- {path_args}", repo_root)

    snapshot: Dict[str, str] = {}
    for path in sorted(set(tracked + untracked)):
        abs_path = os.path.join(repo_root, path)
        if os.path.isfile(abs_path):
            snapshot[path] = sha1_of_file(abs_path)
        elif os.path.exists(abs_path):
            snapshot[path] = "<non-file>"
        else:
            snapshot[path] = "<deleted>"
    return snapshot


def diff_snapshots(baseline: Dict[str, str], current: Dict[str, str]) -> List[str]:
    changed = []
    for path, digest in current.items():
        if baseline.get(path) != digest:
            changed.append(path)
    return sorted(set(changed))


def default_state() -> Dict[str, Any]:
    return {
        "version": 2,
        "updatedAt": now_iso(),
        "activeRequirementId": None,
        "requirements": {},
    }


def load_state(state_file: str) -> Dict[str, Any]:
    state = load_json_file_or_default(state_file, default_state())
    if "requirements" not in state or not isinstance(state.get("requirements"), dict):
        state["requirements"] = {}
    if "activeRequirementId" not in state:
        state["activeRequirementId"] = None
    if "updatedAt" not in state:
        state["updatedAt"] = now_iso()
    return state


def save_state(state_file: str, state: Dict[str, Any]) -> None:
    state["updatedAt"] = now_iso()
    atomic_write_json(state_file, state)


def get_active_session(state: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    rid = normalize_text(state.get("activeRequirementId"))
    if not rid:
        return None
    requirements = state.get("requirements")
    if not isinstance(requirements, dict):
        return None
    session = requirements.get(rid)
    if isinstance(session, dict):
        return session
    return None


def ensure_no_other_active_requirement(state: Dict[str, Any], requirement_id: str) -> None:
    active_id = normalize_text(state.get("activeRequirementId"))
    if active_id == requirement_id:
        fail(
            "start",
            "该需求已经处于 active development，会话已建立；请继续 progress 或 complete",
            {"activeRequirementId": active_id},
        )
    if active_id and active_id != requirement_id:
        fail(
            "start",
            "当前已有其他需求处于开发中，请先完成或清理 active requirement",
            {"activeRequirementId": active_id, "requestedRequirementId": requirement_id},
        )


def require_active_session(state: Dict[str, Any], requirement_id: str) -> Dict[str, Any]:
    active_id = normalize_text(state.get("activeRequirementId"))
    if active_id != requirement_id:
        fail(
            "state",
            "当前需求不是 active requirement，请先 start 再进行 progress/complete",
            {"activeRequirementId": active_id or None, "requirementId": requirement_id},
        )
    session = get_active_session(state)
    if not session:
        fail("state", "找不到 active requirement 的本地状态", {"requirementId": requirement_id})
    return session


def build_query_output(
    *,
    project_name: str,
    statuses: Sequence[str],
    ordered: Sequence[Dict[str, Any]],
    query_trace: Sequence[Dict[str, Any]],
) -> Dict[str, Any]:
    items = [build_requirement_summary(item, process_order=idx + 1) for idx, item in enumerate(ordered)]
    return {
        "ok": True,
        "action": "query",
        "projectName": project_name,
        "statuses": list(statuses),
        "processingOrderRule": "priority(HIGH>MEDIUM>LOW) then createDate then id",
        "queryTrace": list(query_trace),
        "count": len(items),
        "nextRecommendedId": items[0]["id"] if items else None,
        "items": items,
    }


def resolve_requirement_for_start(
    opener: request.OpenerDirector,
    *,
    cfg: Dict[str, Any],
    token: str,
) -> Tuple[Dict[str, Any], List[Dict[str, Any]], Optional[str]]:
    if cfg["requirement_id"]:
        requirement = fetch_requirement_detail(
            opener,
            base_url=cfg["base_url"],
            token=token,
            requirement_id=cfg["requirement_id"],
            timeout=cfg["timeout"],
        )
        return requirement, [], "explicit-id"

    if not cfg["pick_first"]:
        fail("validate", "start 动作需要 requirement-id，或显式传入 --pick-first", exit_code=2)

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
    if not ordered:
        fail("start", "当前没有可领取的待开发需求", {"projectName": cfg["project_name"], "statuses": cfg["statuses"]})
    requirement = fetch_requirement_detail(
        opener,
        base_url=cfg["base_url"],
        token=token,
        requirement_id=normalize_text(ordered[0].get("id")),
        timeout=cfg["timeout"],
    )
    requirement["_queryTrace"] = query_trace
    requirement["_pickedOrder"] = build_requirement_summary(ordered[0], process_order=1)
    return requirement, query_trace, "picked-first"


def validate_startable_status(requirement: Dict[str, Any]) -> None:
    status = normalize_text(requirement.get("status")).upper()
    if status not in {"OPEN", "IN_PROGRESS"}:
        fail("start", "需求当前不允许进入开发流程", {"requirementId": requirement.get("id"), "status": status})


def action_query(opener: request.OpenerDirector, cfg: Dict[str, Any], token: str) -> Dict[str, Any]:
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
    return build_query_output(
        project_name=cfg["project_name"],
        statuses=cfg["statuses"],
        ordered=ordered,
        query_trace=query_trace,
    )


def action_start(opener: request.OpenerDirector, cfg: Dict[str, Any], token: str) -> Dict[str, Any]:
    state = load_state(cfg["state_file"])
    repo_root = detect_repo_root(cfg["repo_root"] or os.getcwd())
    source_dirs = list(cfg["source_dirs"])

    requirement, query_trace, source = resolve_requirement_for_start(opener, cfg=cfg, token=token)
    validate_startable_status(requirement)

    requirement_id = normalize_text(requirement.get("id"))
    if not requirement_id:
        fail("start", "需求详情缺少 id", requirement)

    ensure_no_other_active_requirement(state, requirement_id)

    existing_progress = parse_progress_percent(requirement.get("progressPercent")) or 0
    start_progress = max(existing_progress, cfg["start_progress"])
    result_msg = cfg["result_msg"] or "开始开发：状态置为 IN_PROGRESS"

    status_writeback = update_status(
        opener,
        base_url=cfg["base_url"],
        token=token,
        requirement_id=requirement_id,
        status="IN_PROGRESS",
        progress_percent=start_progress,
        result_msg=result_msg,
        timeout=cfg["timeout"],
    )

    baseline_snapshot = collect_dirty_source_snapshot(repo_root, source_dirs)
    session = {
        "requirementId": requirement_id,
        "title": normalize_text(requirement.get("title")),
        "projectName": cfg["project_name"],
        "initialStatus": normalize_text(requirement.get("status")),
        "currentStatus": "IN_PROGRESS",
        "startedAt": now_iso(),
        "lastUpdatedAt": now_iso(),
        "repoRoot": repo_root,
        "sourceDirs": source_dirs,
        "baselineSnapshot": baseline_snapshot,
        "progressHistory": [status_writeback],
        "buildHistory": [],
        "completedAt": None,
        "completionResult": None,
        "developmentPlan": build_development_plan(requirement),
    }

    requirements = state.get("requirements")
    if not isinstance(requirements, dict):
        requirements = {}
        state["requirements"] = requirements
    requirements[requirement_id] = session
    state["activeRequirementId"] = requirement_id
    save_state(cfg["state_file"], state)

    return {
        "ok": True,
        "action": "start",
        "selectionMode": source,
        "stateFile": cfg["state_file"],
        "queryTrace": query_trace,
        "requirement": {
            **build_requirement_summary(requirement),
            "descr": normalize_text(requirement.get("descr")),
        },
        "statusWriteback": status_writeback,
        "developmentPlan": session["developmentPlan"],
        "developmentBaseline": {
            "repoRoot": repo_root,
            "sourceDirs": source_dirs,
            "baselineDirtyFiles": sorted(baseline_snapshot.keys()),
        },
    }


def action_progress(opener: request.OpenerDirector, cfg: Dict[str, Any], token: str) -> Dict[str, Any]:
    requirement_id = cfg["requirement_id"]
    state = load_state(cfg["state_file"])
    session = require_active_session(state, requirement_id)

    progress_percent = cfg["progress_percent"]
    if progress_percent is None:
        fail("validate", "progress 动作需要 --progress-percent", exit_code=2)
    if progress_percent < 1 or progress_percent > 99:
        fail("validate", "progress-percent 必须在 1-99 之间", exit_code=2)

    result_msg = cfg["result_msg"] or f"开发进度更新：{progress_percent}%"
    status_writeback = update_status(
        opener,
        base_url=cfg["base_url"],
        token=token,
        requirement_id=requirement_id,
        status="IN_PROGRESS",
        progress_percent=progress_percent,
        result_msg=result_msg,
        timeout=cfg["timeout"],
    )

    history = session.get("progressHistory")
    if not isinstance(history, list):
        history = []
        session["progressHistory"] = history
    history.append(status_writeback)
    session["currentStatus"] = "IN_PROGRESS"
    session["lastUpdatedAt"] = now_iso()
    save_state(cfg["state_file"], state)

    return {
        "ok": True,
        "action": "progress",
        "stateFile": cfg["state_file"],
        "requirementId": requirement_id,
        "statusWriteback": status_writeback,
        "historyCount": len(history),
    }


def action_complete(opener: request.OpenerDirector, cfg: Dict[str, Any], token: str) -> Dict[str, Any]:
    requirement_id = cfg["requirement_id"]
    state = load_state(cfg["state_file"])
    session = require_active_session(state, requirement_id)

    repo_root = detect_repo_root(cfg["repo_root"] or session.get("repoRoot") or os.getcwd())
    source_dirs = session.get("sourceDirs")
    if not isinstance(source_dirs, list) or not source_dirs:
        source_dirs = list(cfg["source_dirs"])

    baseline_snapshot = session.get("baselineSnapshot")
    if not isinstance(baseline_snapshot, dict):
        baseline_snapshot = {}

    current_snapshot = collect_dirty_source_snapshot(repo_root, source_dirs)
    changed_since_start = diff_snapshots(baseline_snapshot, current_snapshot)
    if not changed_since_start:
        fail(
            "complete",
            "检测不到 start 之后新增的源码改动，禁止置为 COMPLETED",
            {
                "requirementId": requirement_id,
                "repoRoot": repo_root,
                "sourceDirs": source_dirs,
                "baselineDirtyFiles": sorted(baseline_snapshot.keys()),
                "currentDirtyFiles": sorted(current_snapshot.keys()),
            },
        )

    build_result = run_shell(cfg["build_command"], cwd=repo_root, timeout=cfg["build_timeout"])
    if build_result.get("exitCode") != 0:
        fail(
            "complete",
            "构建/编译验证失败，禁止置为 COMPLETED",
            {
                "requirementId": requirement_id,
                "changedFilesSinceStart": changed_since_start,
                "buildResult": build_result,
            },
        )

    result_msg = cfg["result_msg"] or "开发完成：状态置为 COMPLETED"
    status_writeback = update_status(
        opener,
        base_url=cfg["base_url"],
        token=token,
        requirement_id=requirement_id,
        status="COMPLETED",
        progress_percent=100,
        result_msg=result_msg,
        timeout=cfg["timeout"],
    )

    history = session.get("progressHistory")
    if not isinstance(history, list):
        history = []
        session["progressHistory"] = history
    history.append(status_writeback)

    build_history = session.get("buildHistory")
    if not isinstance(build_history, list):
        build_history = []
        session["buildHistory"] = build_history
    build_history.append(build_result)

    session["currentStatus"] = "COMPLETED"
    session["lastUpdatedAt"] = now_iso()
    session["completedAt"] = now_iso()
    session["completionResult"] = {
        "changedFilesSinceStart": changed_since_start,
        "buildResult": build_result,
    }
    state["activeRequirementId"] = None
    save_state(cfg["state_file"], state)

    return {
        "ok": True,
        "action": "complete",
        "stateFile": cfg["state_file"],
        "requirementId": requirement_id,
        "verification": {
            "repoRoot": repo_root,
            "sourceDirs": source_dirs,
            "changedFilesSinceStart": changed_since_start,
            "buildResult": build_result,
        },
        "statusWriteback": status_writeback,
    }


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="nquiz 需求开发辅助：query/start/progress/complete",
    )

    parser.add_argument(
        "--action",
        choices=["query", "start", "progress", "complete"],
        required=True,
        help="query/start/progress/complete",
    )

    parser.add_argument("--requirement-id", help="需求 ID。start 可配合 --pick-first 省略，progress/complete 必填")
    parser.add_argument("--pick-first", action="store_true", help="start 时从查询结果中按优先级规则领取第一条需求")

    parser.add_argument(
        "--status",
        action="append",
        help="query/start(--pick-first) 的查询状态，默认 OPEN,IN_PROGRESS",
    )
    parser.add_argument("--project-name", default=DEFAULT_PROJECT_NAME, help="项目名过滤，默认 nquiz")
    parser.add_argument("--page-size", type=int, default=DEFAULT_PAGE_SIZE, help=f"查询分页大小，默认 {DEFAULT_PAGE_SIZE}")
    parser.add_argument("--max-items", type=int, default=DEFAULT_MAX_ITEMS, help=f"查询最大数量，默认 {DEFAULT_MAX_ITEMS}")

    parser.add_argument("--start-progress", type=int, default=0, help="start 阶段进度值（0-99），默认 0")
    parser.add_argument("--progress-percent", type=int, help="progress 阶段进度值（1-99）")
    parser.add_argument("--result-msg", default="", help="状态回写说明，未传则使用默认文案")

    parser.add_argument("--base-url", default=DEFAULT_BASE_URL, help="服务地址，默认 https://www.quizck.cn")
    parser.add_argument("--user-id", default=DEFAULT_USER_ID, help="登录账号，默认 openclaw")
    parser.add_argument("--user-pwd", default=DEFAULT_USER_PWD, help="登录密码，默认 openclaw 默认口令")
    parser.add_argument("--timeout", type=int, default=15, help="HTTP 超时秒数，默认 15")

    parser.add_argument("--repo-root", default="", help="nquiz 仓库根目录；未传则从当前工作目录向上探测")
    parser.add_argument(
        "--source-dirs",
        default=",".join(DEFAULT_SOURCE_DIRS),
        help="参与源码变更门禁的目录，逗号分隔，默认 src,app,components",
    )
    parser.add_argument("--build-command", default=DEFAULT_BUILD_COMMAND, help=f"complete 时的构建命令，默认 `{DEFAULT_BUILD_COMMAND}`")
    parser.add_argument("--build-timeout", type=int, default=600, help="构建超时秒数，默认 600")
    parser.add_argument("--state-file", default=DEFAULT_STATE_FILE, help=f"本地状态文件，默认 {DEFAULT_STATE_FILE}")

    return parser


def validate_args(args: argparse.Namespace) -> Dict[str, Any]:
    try:
        cfg = {
            "action": args.action,
            "requirement_id": normalize_text(args.requirement_id),
            "pick_first": bool(args.pick_first),
            "statuses": parse_statuses(args.status),
            "project_name": normalize_text(args.project_name) or DEFAULT_PROJECT_NAME,
            "page_size": args.page_size,
            "max_items": args.max_items,
            "start_progress": args.start_progress,
            "progress_percent": args.progress_percent,
            "result_msg": normalize_text(args.result_msg),
            "base_url": normalize_base_url(args.base_url),
            "user_id": normalize_text(args.user_id),
            "user_pwd": args.user_pwd or "",
            "timeout": args.timeout,
            "repo_root": normalize_text(args.repo_root),
            "source_dirs": parse_source_dirs(args.source_dirs),
            "build_command": normalize_text(args.build_command) or DEFAULT_BUILD_COMMAND,
            "build_timeout": args.build_timeout,
            "state_file": os.path.abspath(normalize_text(args.state_file) or DEFAULT_STATE_FILE),
        }

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

        if cfg["action"] in {"progress", "complete"} and not cfg["requirement_id"]:
            raise ValueError(f"{cfg['action']} 动作必须提供 requirement-id")
        if cfg["action"] == "start" and cfg["requirement_id"] and cfg["pick_first"]:
            raise ValueError("start 动作不能同时传 requirement-id 和 --pick-first")

        return cfg
    except ValueError as e:
        fail("validate", str(e), exit_code=2)


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()
    cfg = validate_args(args)

    opener = request.build_opener(request.HTTPCookieProcessor())
    token = login_and_get_token(
        opener,
        base_url=cfg["base_url"],
        user_id=cfg["user_id"],
        user_pwd=cfg["user_pwd"],
        timeout=cfg["timeout"],
    )

    if cfg["action"] == "query":
        print_json(action_query(opener, cfg, token))
    if cfg["action"] == "start":
        print_json(action_start(opener, cfg, token))
    if cfg["action"] == "progress":
        print_json(action_progress(opener, cfg, token))
    if cfg["action"] == "complete":
        print_json(action_complete(opener, cfg, token))

    fail("validate", f"未知 action: {cfg['action']}", exit_code=2)


if __name__ == "__main__":
    main()
