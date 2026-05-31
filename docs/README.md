# docs/ · 设计文档

项目的所有产品设计、流程、决策文档。

## 公开 vs 私有

| 类型 | 位置 | git 跟踪 | 用途 |
|------|------|---------|------|
| **公开模板** | `docs/*.template.md` | ✅ 跟踪 | 方法论模板，给所有开源用户参考 |
| **公开说明** | `docs/README.md`（本文件）| ✅ 跟踪 | 文档导览 |
| **个人填写** | `docs/personal/` | ❌ **已 gitignore** | 你自己的 Persona、Journey、设计决策（含个人信息）|

## 文件说明

### 公开（模板，所有人可见）

| 文件 | 内容 |
|------|------|
| [design.template.md](./design.template.md) | 总设计文件模板（GoogleUX 全流程 + Agent 升级路线 + 测试协议）|
| [user-journey-map.template.md](./user-journey-map.template.md) | User Journey Map 模板（按 GoogleUX Step 6）|

### 私有（你自己的内容）

`docs/personal/` 已加入 `.gitignore`，不会上传到 GitHub。里面是：

- `design.md` — 你自己的产品设计（包含你的人生主线、Persona）
- `user-journey-map.md` — 你自己测试得出的 Journey

## 如何使用

第一次 clone 项目后：

```bash
cp docs/design.template.md docs/personal/design.md
cp docs/user-journey-map.template.md docs/personal/user-journey-map.md
```

然后在 `docs/personal/` 里填入你自己的内容。

## 与 Claude Code 助手协同

如果你用 Claude Code 辅助开发，助手会把工作区放在 `~/.claude/plans/` 和 `~/.claude/projects/.../memory/`（这些目录在用户主目录下，**完全独立于项目仓库**，不会被 git 跟踪也不会上传）。

助手侧（`~/.claude/`）和项目侧（`docs/personal/`）的内容应该保持同步。每次重大决策更新后：

1. 助手先写入 `~/.claude/plans/[plan-name].md`
2. 同步复制到 `docs/personal/design.md`
3. git commit（只会提交公开模板的变更）

## 文档纪律

参考 `../CHANGELOG.md` 的发布纪律。每次 `npm run app:build:mac` 前：

1. 检查 `docs/personal/design.md` 是否与 Claude Code 侧同步
2. 检查相关 Journey Map 状态是否更新
3. 如果加了新功能 → 新建对应 Journey Map
4. **不要**手动把 `docs/personal/` 内容复制到公开模板里——模板要保持空白
