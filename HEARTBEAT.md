# HEARTBEAT.md - nquiz 会话心跳规则

默认不主动触发周期任务；仅在长会话或用户明确要求时执行。

## 轻量检查

1. 当前改动是否有可执行验证命令
2. 是否记录到 `memory/YYYY-MM-DD.md`
3. 是否存在未明确说明的风险项

无异常时输出：`heartbeat: clean`
