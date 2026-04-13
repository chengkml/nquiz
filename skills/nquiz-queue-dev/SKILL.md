---
name: nquiz-queue-dev
description: Queue-driven nquiz requirement development runner. Use when Codex should continuously query project `nquiz` for `OPEN` requirements and then repeatedly perform the full real development loop in the repository until no pending queued requirement remains.
---

# Nquiz Queue Dev

## Overview

Use this skill to consume the `nquiz` queue from front to back in one continuous run.
The skill must keep looping over pending `OPEN` requirements until the queue is empty, while still respecting the real build gate.
Ignore unfinished historical active state from previous executions; each run should pick from current `OPEN` queue.
This skill must be safe under concurrent runners in the same workspace.

## Hard Stop Policy

This skill has only two legal stop conditions:

1. the latest mandatory queue query proves `OPEN = 0`
2. there is an explicit blocker that prevents continuing, such as:
   - build failure
   - verification failure
   - repo conflict that cannot be safely resolved
   - missing required context
   - user interruption / user redirect

Completing one requirement is **not** a legal stop condition.
Writing a polished summary after one completed item is **not** a legal stop condition.
If a requirement was just completed and the queue still has `OPEN > 0`, the skill must immediately continue the loop instead of ending the turn.

## Required Skills

- Queue query skill: `/root/.agents/skills/requirement-query/SKILL.md`

## Underlying Script

Use the installed script directly:

```bash
python3 /root/.agents/skills/cm-nquiz-requirement-develop/scripts/develop_requirement.py
```

Do not tell another skill to take over. The queue skill itself owns the full loop below.

## Mechanical Gate

Before any terminal summary, run this local gate:

```bash
python3 skills/nquiz-queue-dev/scripts/pre_final_gate.py
```

This script returns success only when:

- a fresh `OPEN` queue query for project `nquiz` returns `0`

If the script exits non-zero, terminal summary is forbidden and the queue must continue or explicitly report a blocker.

## Workflow

### 1. Query Pending Work First

- Read and follow `requirement-query` first.
- Query `projectName=nquiz` with `status=OPEN`.
- Treat “待处理” as `OPEN`; do not mix in `IN_PROGRESS` at this gate.
- Report the pending count before starting development.
- If the count is `0`, stop and answer `nquiz 当前没有待处理需求`。

This queue check is mandatory at the start and after every completed requirement.

### 2. Carry the Development Logic Inside This Skill

Embed the same development logic previously described by `cm-nquiz-requirement-develop`:

- one active requirement at a time within the current queue run
- real development must happen in `/root/.openclaw/workspace/nquiz`
- `start` must happen before `progress/complete`
- `descr` is the implementation source of truth
- `complete` must pass changed-files gate and `npm run build`

Do not skip these constraints just because this is now the queue-level skill.

### 3. Ignore Historical Active State Before Picking Queue Item

- Do not resume unfinished historical items from previous runs by default.
- Each execution should start from current `OPEN` queue.
- Use a unique per-run state file; never use a shared fixed state file:

```bash
RUN_ID="${NQUIZ_QUEUE_RUN_ID:-$(date +%Y%m%d-%H%M%S)-$$-$RANDOM}"
STATE_DIR="/tmp/cm-nquiz-queue-dev"
STATE_FILE="${STATE_DIR}/state-${RUN_ID}.json"
mkdir -p "${STATE_DIR}"
```

### 4. Loop Until the Queue Is Empty

Run this loop:

1. Query `OPEN` requirements for `nquiz`.
2. Start the highest-priority queued requirement.
3. Perform real repository development.
4. Update progress at milestones.
5. Run verification and `complete`.
6. Query the queue again.
7. Stop only when `OPEN` count is `0`.

Never intentionally stop after only one completed item if the queue still has pending work.
After every successful `complete`, the **very next action** must be another queue query, not a final prose summary.

### 5. Start the Next Requirement

Use the concurrency-safe picker script to serialize `pick-first` claims:

```bash
python3 skills/nquiz-queue-dev/scripts/pick_open_with_lock.py \
  --status OPEN \
  --project-name nquiz \
  --state-file "${STATE_FILE}"
```

- `start` returns the active requirement context and full `descr`.
- Use the returned `descr` immediately; do not re-scope the requirement to something smaller without saying so.

### 6. Perform Real Development

- Make actual source changes inside `/root/.openclaw/workspace/nquiz`.
- Follow `AGENTS.md` and the repository migration rules already in force.
- Do not fake progress by only updating requirement status.
- If the requirement is blocked by unexpected repo conflicts or missing context, report the blocker and stop the queue loop.

### 7. Update Progress During Development

- Use the script `progress` action at meaningful milestones.
- Keep progress in the range `1-99` until verification passes.
- Recommended checkpoints:
  - `30`: requirements and page/module boundaries are clear
  - `60`: core interaction, data flow, and forms are working
  - `90`: validation and final cleanup are in progress

Example:

```bash
python3 /root/.agents/skills/cm-nquiz-requirement-develop/scripts/develop_requirement.py \
  --action progress \
  --requirement-id <REQ_ID> \
  --progress-percent 60 \
  --result-msg "已完成核心页面与主要数据流" \
  --state-file "${STATE_FILE}"
```

### 8. Complete Only After Verification

- Run the validation needed by the actual change.
- Finish with the script `complete` action so the built-in gate checks changed files and runs the build command.
- Never write `COMPLETED` manually.

```bash
python3 /root/.agents/skills/cm-nquiz-requirement-develop/scripts/develop_requirement.py \
  --action complete \
  --requirement-id <REQ_ID> \
  --state-file "${STATE_FILE}"
```

### 9. Repeat

- After a successful `complete`, immediately go back to Step 1.
- Keep a running summary of completed IDs/titles in the current turn output.
- Exit only when the latest queue query reports no `OPEN` item.

## Mandatory Pre-Final Gate

Before sending any final answer to the user, the skill must perform this checklist in order:

1. Execute a fresh queue query for `projectName=nquiz` and `status=OPEN`.
2. Inspect the fresh result only, not an older remembered count.
3. If the fresh result has `OPEN > 0`, final answer is forbidden.
4. If the fresh result has `OPEN = 0`, final answer is allowed.
5. Prefer using `python3 skills/nquiz-queue-dev/scripts/pre_final_gate.py --state-file "${STATE_FILE}"` as the executable check rather than relying on prose memory.

This means:

- a completion summary after requirement A is only an **intermediate progress update**
- the skill may only produce a real terminal summary after the post-complete query proves queue empty
- if the user asks to run `nquiz-queue-dev`, the default expectation is a multi-item continuous run rather than “do one item and stop”

## Intermediate vs Final Output

Use this distinction strictly:

- Intermediate progress update:
  - allowed while queue still has `OPEN > 0`
  - may mention completed items so far
  - must explicitly say the queue is continuing
- Final answer:
  - only allowed after the mandatory pre-final gate passes
  - must include final queue count `0`

Do not confuse an intermediate progress report with a final answer.

## Output Rules

- If no `OPEN` requirement exists at the first query, return the queue result and stop.
- During the loop, report:
  - current queue count
  - active or selected requirement `id` and `title`
  - current implementation progress
  - verification status
  - whether `complete` succeeded
- After the loop finishes, report:
  - total completed in this run
  - completed requirement IDs/titles in order
  - final queue count `0`
  - confirmation that the last queue query was performed after the last `complete`
- If blocked, state the blocker explicitly, such as:
  - missing repo context
  - build failure
  - verification failure

## Guardrails

- Do not skip the initial `requirement-query` gate.
- Do not pick a second requirement while current-run item is active.
- Do not use a shared fixed state file across concurrent queue runs.
- Do not bypass `pick_open_with_lock.py` when selecting the next `OPEN` requirement.
- Do not claim completion without real repository changes and verification.
- Do not change project scope from `nquiz`.
- Do not silently abandon the loop while `OPEN` requirements still exist.
- Do not send a terminal summary immediately after a single `complete`; always run the mandatory post-complete queue query first.
- If the post-complete queue query returns `OPEN > 0`, you must start or resume the next item in the same turn unless a blocker is explicitly reported.
