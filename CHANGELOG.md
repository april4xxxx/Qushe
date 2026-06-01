# Changelog

本项目遵循按日期记录变更的方式。每次更新项目时都必须同步更新本文件；涉及功能、行为、配置、脚本、架构、数据结构或开发流程的变更，还必须同步更新 `README.md`。

版本号管理：[Semantic Versioning](https://semver.org/lang/zh-CN/)。每次 `npm run app:build:mac` 前必须 bump `package.json` 的 `version` 字段并在本文件加新条目。

---

## 2026-06-01 · v0.3.0

V3 — Tool Use + 三专家审查改进。AI 具备主动查询数据能力，UI/UX 全面优化。

### Added

- **V3 Tool Use 架构** (`src/lib/tools.ts`)：4 个工具定义 + handler + dispatcher
  - `get_recent_completions(days)`：查最近完成的任务
  - `search_memories(query)`：搜索结构化记忆 + evals + 完成模式 + 心血来潮记录
  - `get_schedule(date)`：获取某天日程 + 日历时段块
  - `get_task_stats()`：任务统计（各篮子数量、完成率、今日/本周数据）
- **Function calling 循环** (`chatWithTools`)：LLM 调用 → 检测 tool_calls → 执行工具 → 喂回结果 → 最终回答。最多 5 轮。
- **优雅降级**：如果 DeepSeek 不支持 function calling，自动降级为 V2 全量注入模式，后续调用不再尝试。
- **首次使用引导卡片**：TodayPage 新增两步 checklist（配置 API Key → 梳理主线），替代原有"撞墙"体验。
- **Toast 通知系统**：任务确认/删除后显示操作结果反馈。
- **删除确认对话框**：删除任务前弹出确认，避免误删。
- **评估结果可放弃**：AssessmentCard 新增 `onDismiss` prop，用户可取消不想添加的任务。
- **键盘快捷键**：TodayPage 按 `N` 打开输入框，`Esc` 关闭。
- **页面入场动画**：所有页面添加 `.page-enter` fadeUp 过渡效果。
- **NavBar 记忆入口**：7 项导航新增「记忆 ◈」（位于对话和设置之间）。

### Changed

- **NavBar 紧凑布局**：7 项导航 `px-2.5 py-1.5`，icon `15px`，label `10px`，容器 `max-w-xl`。
- **TaskCard**："取消"改为"不做了"（语义更清晰）；活跃任务隐藏删除按钮（仅已完成/已取消可删）。
- **AI 等待状态**：显示具体任务名 + 说明文字，替代模糊的"AI 正在思考..."。
- **错误消息可关闭**：TodayPage 错误提示新增 ✕ 关闭按钮。
- **空状态优化**：区分未设置 vs 已设置但无任务，空状态提示包含键盘快捷键。
- **新任务按钮位置**：从 `bottom-24` 调整为 `bottom-[5.5rem]` 避免被更宽的 NavBar 遮挡。
- `assessTask` 和 `chat` 现在通过 `chatWithTools` 执行，支持工具调用。
- 版本号升级至 `0.3.0`。

### Architecture

- **Tool 类型系统**：新增 `ToolDefinition`、`ToolResult`、`ToolCall`、`TaskStats`、`CompletionRecord`、`MemorySearchEntry`、`ScheduleEntry` 等 7 个 interface。
- **Tool registry 模式**：`TOOL_DEFINITIONS` + `TOOL_HANDLERS` map，为 V4 Multi-Agent 铺路。
- **`chatWithTools` 通用循环**：任何未来 Agent 可复用（只需传入不同的 system prompt + messages）。

### Validation

- `npm run build`：通过（与之前版本相同的已知 warning）。
- `npm run lint`：未通过（ChatPage.tsx 已知错误，V3 未引入新 lint 错误）。

---

## 2026-05-31 · v0.2.5

V2.5 — 虚拟日历。AI 自动规划今日时间表，用户可拖拽调整。

### Added

- **日历页面** (`/calendar`)：周视图，7 列 × 28 行（8:00-22:00，30 分钟格），当天列高亮。
- **AI 规划今日**：点击按钮后 AI 根据任务列表 + 记忆 + 已占用时段自动生成时间安排。狮子任务优先排上午，牛马排下午，鸵鸟排最后或不排。
- **拖拽调整**：已排入的时段块可拖拽到其他时间或日期。
- **点击放置**：未排入日历的任务点击后进入放置模式，点击日历格子即可放入。
- **时段删除**：每个时段块右上角 × 按钮可移除。
- **未排入任务区**：日历下方显示尚未排入日历的待办任务列表。
- **周导航**：← 上周 / 回到本周 / 下周 → 切换。
- **`TimeBlock` / `WeekSchedule` 数据模型**：时段块含 taskId、日期、起止时间、时长、是否 AI 生成。
- **`schedule.json` 持久化**：`addBlock` / `addBlocks` / `updateBlock` / `deleteBlock` / `clearBlocksForDate` / `getBlocksForDate`。
- **`planDay()` AI 函数**：根据任务 + 记忆 + 已占用时段生成最优日程安排。
- 导航栏新增「日历 ▤」入口（位于看板和全景之间）。

### Changed

- 版本号升级至 `0.2.5`。
- `clearAllData` 现在同时清除 `schedule.json`。

### Validation

- `npm run build`：通过（与之前版本相同的已知 warning）。
- `npm run lint`：未通过（ChatPage.tsx 已知错误，V2.5 未引入新 lint 错误）。

---

## 2026-05-31 · v0.2.0

V2 — Memory System。AI 具备结构化记忆能力，能从对话和任务行为中提取、检索、引用长期洞察。

### Added

- **Memory 数据模型**：5 种记忆类型（trait 特质 / pattern 模式 / decision 决策 / event 事件 / preference 偏好），含置信度、来源追踪、引用计数。
- **Memory 页面** (`/memory`)：分类筛选 + 卡片列表 + inline 编辑 + 手动添加 + 回收站（30 天保留）。
- **AI 记忆提取** (`extractMemories`)：分析对话和任务评估记录，自动提取值得长期记住的洞察，支持 new / update / conflict 三种结果。
- **AI 记忆检索**：`assessTask` 和 `chat` 每次调用前注入相关记忆上下文，AI 评估时引用具体记忆。
- **评估卡片「基于记忆」展示**：AI 引用了哪些记忆、基于记忆的额外洞察，在 `AssessmentCard` 中显式标注。
- **对话页「提炼到 Memory ✦」按钮**：用户手动触发记忆提取，显示提取结果计数。
- **全景页「查看记忆 →」入口**：从全景页快速跳转 Memory 页面。
- **Electron 后台定时提取**：每天 0 点自动触发记忆提取（通过 IPC 发送到渲染进程）。
- **Electron 后台遗忘扫描**：每周日 0 点清理回收站中超过 30 天的记忆。
- **Memory 引用追踪**：AI 评估引用记忆时自动更新 `lastReferencedAt` 和 `referencedCount`。
- **用户编辑记忆**：编辑后 confidence 自动提升至 5，标记 `userEdited: true`，永不自动删除。
- **Storage 层 Memory CRUD**：`addMemory` / `addMemories` / `updateMemory` / `deleteMemory` / `restoreMemory` / `permanentlyDeleteMemory` / `bumpMemoryReference`。

### Changed

- `assessTask` 新增 `memories` 参数，返回类型扩展为 `AIAssessmentWithMemory`（含 `referencedMemoryIds` 和 `memoryInsight`）。
- `chat` 新增 `memories` 参数，对话时注入记忆上下文。
- `clearAllData` 现在同时清除 `memories.json`。
- 设置页危险操作说明更新为包含"AI 记忆"。
- 版本号升级至 `0.2.0`。

### Data

- 新增 `memories.json`：结构化记忆存储，含 version / extractedAt / memories[] / trash[]。
- Electron IPC 新增 `memory:extract-request` 和 `memory:forget-scan` 事件。
- `preload.ts` 新增 `onMemoryExtractRequest` 和 `onMemoryForgetScan` 回调注册。

### Validation

- `npm run build`：通过（与 v0.1.2 相同的已知 warning）。
- `npm run lint`：未通过（与 v0.1.2 相同的 ChatPage.tsx 已知错误，V2 未引入新 lint 错误）。

---

## 2026-05-31 · v0.1.2

User Journey Map 后的关键修复轮。修复 V0.1.0 暴露的所有致命 bug，建立反馈数据基础。

### Added

- **任务编辑**：每张任务卡片新增「编辑」入口，弹出 `TaskEditor` modal（标题/备注/篮子/预估时间/截止日期）。
- **回退完成**：已完成任务显示「↩ 回到进行中」按钮，已取消任务显示「↩ 恢复任务」。
- **改篮子原因收集**：`AssessmentCard` 和 `TaskEditor` 中改篮子时弹出"为什么改？AI 会从中学习"输入框（可跳过）。
- **AI 主动追问 deadline**：检测到时间敏感任务但未提及截止时间 → 卡片上专门「AI 想问你」字段，必须回答才能确认。
- **任务卡片显示 deadline tag**：今天/明天/N天后/逾期 N 天。
- **Evals 数据基础设施**：所有 AI 决策与用户修正自动写入 `evals.json`，为 V5 评估系统铺路。
- **Markdown 渲染**：对话页支持完整 Markdown（标题/加粗/斜体/列表/引用/代码/分割线）使用 Editorial Luxury 样式。
- **人生全景页** (`/panorama`)：杂志刊头 + AI 引言 + 罗马数字主线卡片 + 时间流向柱状图。
- **AI 自动触发全景**：对话中第一次保存主线时自动推送"全景图已生成"提示。
- 导航栏增加「全景 ✦」入口。

### Changed

- AI prompt 升级：要求理由"具体、有洞察"而非泛泛；新增 `deadline` / `deadlineQuestion` 字段。
- 对话回复自动剥离 ` ```json ` 代码块（不再向用户暴露内部数据格式）。
- 持久化对话记录到 `chat.json`（之前只在内存里，刷新就丢）。

### Fixed

- **致命**：完成任务无法回退 → 现可恢复。
- **致命**：任务无法编辑 → 现可改标题/备注/篮子/时间/截止。
- **致命**：取消任务无法恢复 → 现可恢复。

### Process

- 引入 User Journey Map 流程（GoogleUX Step 6）。之前跳过此步是 V0.1.0 致命 bug 的根因。
- 引入版本号纪律：每次 build 前 bump `package.json` + 写 CHANGELOG。

---

## 2026-05-31 · v0.1.1（已并入 v0.1.2 发布）

### Changed

- 切换 AI 提供商：Anthropic Claude → DeepSeek（通过 OpenAI 兼容 SDK，baseURL `https://api.deepseek.com`，模型 `deepseek-chat`）。
- UI 全面重做：Editorial Luxury 杂志风格（Playfair Display + Noto Serif SC + Plus Jakarta Sans 三字体，奶油 `#FDFBF7` + 深咖啡 `#1a1614`）。
- 从 Web App 转为 Mac 桌面应用（Electron + electron-builder）。
- 数据存储从 localStorage 迁移到 `~/Library/Application Support/取舍/*.json`。

---

## 2026-05-30 · v0.1.0

V1 MVP — 基础三篮子智能排序。

### Added

- 三篮子模型（🦁 狮子 / 🐂 牛马 / 🐦 鸵鸟）。
- AI 新任务智能排序（DeepSeek 单次调用）。
- 主线目标 Onboarding 引导对话。
- 三篮子看板视图。
- 今日视图（按篮子分组）。
- 设置页（API Key + 主线查看 + 数据清除）。
- 心血来潮检测（与主线弱关联触发提醒）。
- 新增项目专属 `README.md`，替换默认 Vite 模板文档。
- 新增开发规则：之后每次项目更新都必须维护 `CHANGELOG.md`，涉及开发或用户可见变化时必须同步维护 `README.md`。

### Validation

- `npm run build`：通过，但仍有 Vite deprecation、`freeze` output option 和 bundle 体积警告。
- `npm run lint`：未通过，当前错误位于 `src/pages/ChatPage.tsx` 的欢迎消息初始化 effect。

### Known Issues（已在 v0.1.2 修复）

- ❌ 任务无法编辑
- ❌ 完成任务无法回退
- ❌ 取消任务无法恢复
- ❌ 对话不渲染 Markdown
- ❌ 没有全景视图
- ❌ AI 不问 deadline
- ❌ 修改 AI 判断时无法说明原因
- `src/pages/ChatPage.tsx` 需要修复 `react-hooks/set-state-in-effect` lint 错误。
- 打包配置目前只生成 macOS arm64 目录包，未签名、未公证。

---

## 发布纪律

每次 `npm run app:build:mac` 前必须：

1. **bump 版本号** in `package.json`
   - PATCH（0.1.x）：bug 修复 / 小改进
   - MINOR（0.x.0）：新功能 / 架构升级
   - MAJOR（x.0.0）：不兼容的大改
2. **更新 CHANGELOG.md** 加新条目
3. **同步更新 README.md**（涉及功能/行为/数据/脚本/架构变化时）
4. git commit + tag `v0.x.y`
