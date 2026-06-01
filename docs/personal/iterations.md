# 取舍 · 迭代日志

测试发现、UX 决策、版本计划的执行记录。按时间倒序。

与其他文档的关系：
- `design.md`：产品架构蓝图（"往哪走"），很少改
- `CHANGELOG.md`：已交付的代码变更（"做了什么"）
- **本文件**：执行过程中的发现和决策（"为什么做、发现了什么、下一步做什么"）

---

## 2026-06-01 · V3 Tool Use + 三专家审查

### 本次交付

V3 Tool Use 架构实现 + UI/UX 全面审查改进。版本 v0.3.0。

核心交付物：
- `src/lib/tools.ts`：4 个工具（get_recent_completions / search_memories / get_schedule / get_task_stats）
- `chatWithTools` 循环：function calling → 执行 → 喂回 → 最终回答，最多 5 轮
- 优雅降级：不支持 function calling 时自动回退全量注入
- 首次使用引导卡片（两步 checklist）
- Toast 通知 + 删除确认对话框 + 评估可放弃
- 键盘快捷键（N / Esc）
- 页面入场动画（.page-enter）
- NavBar 7 项紧凑布局 + 记忆入口
- TaskCard "不做了" + 活跃任务隐藏删除

### 方法论

首次使用**三个并行 subagent 专家审查**：
1. **Agent 架构专家**：分析 ai.ts 架构问题，设计 Tool Use 系统，新建 tools.ts
2. **UI 专家**：审查 7 个页面设计系统一致性，优化 NavBar、添加入场动画
3. **UX 专家**：分析用户旅程摩擦点，添加引导/反馈/确认/错误处理

三个 agent 各自在独立 worktree 工作，产出后手动 cherry-pick 合并。

### UX 决策记录

| 决策 | 选了什么 | 为什么 |
|------|---------|--------|
| 首次引导 | 两步 checklist 卡片 | 不阻塞，渐进式发现 |
| 删除确认 | Modal 对话框 | 防误删，建议用"不做了"代替 |
| 活跃任务删除 | 隐藏删除按钮 | 减少误触，已完成/取消才显示 |
| 工具调用策略 | AI 自主判断何时调用 | 不强制每次都调，减少 token 消耗 |
| 降级策略 | 一次失败后永久降级 | 避免反复失败的开销 |

### 架构改进

| Before (V2) | After (V3) |
|-------------|------------|
| 所有数据硬编码塞进 prompt | AI 可通过工具按需查询 |
| 记忆全量注入 | search_memories 关键词检索 |
| ai.ts 单文件所有逻辑 | tools.ts 独立工具注册表 |
| 无通用 LLM 调用循环 | chatWithTools 可复用 |

### V4 Multi-Agent 准备建议（Agent 专家产出）

1. 创建 `src/lib/agents.ts`，定义 `Agent` interface
2. 提取 AssessmentAgent（当前 assessTask）、ChatAgent（当前 chat）
3. 新增 PlanningAgent（每日建议）
4. AgentOrchestrator 路由请求
5. 考虑 `delegate_to_agent(name, message)` 工具实现 Agent 间协作

### 下一步

- V4 Multi-Agent 实现
- 或修复 Electron 打包双击问题
- 或实际使用 1 周 + 测试日志

---

## 2026-05-31 · V2.5 虚拟日历交付

### 本次交付

V2.5 虚拟日历完成并打包（v0.2.5）。

核心交付物：
- 周视图日历（8:00-22:00，30 分钟格，7 天列）
- AI 一键规划今日（基于任务 + 记忆生成时段安排）
- 拖拽调整时段位置
- 点击放置未排入任务
- `schedule.json` 持久化
- 导航栏新增「日历 ▤」入口

### UX 决策记录

| 决策 | 选了什么 | 为什么 |
|------|---------|--------|
| 排任务方式 | AI 自动排 + 手动调整 | 用户选择，符合产品定位（AI 驱动） |
| 视图粒度 | 周视图 · 30 分钟格 | 用户选择，类似 Google Calendar 的熟悉体验 |
| 拖拽实现 | 原生 mouse events | 保持零依赖，不引入拖拽库 |
| 放置未排入任务 | 点击任务 → 点击格子 | 比拖拽更简单，移动端也能用 |
| AI 规划范围 | 只规划当天 | 降低复杂度，未来可扩展到周规划 |
| 导航栏位置 | 看板和全景之间 | 日历是高频操作，放在核心位置 |

### 流程改进

**新增文档更新纪律**：每次代码变更后必须检查 5 个文档（package.json / CHANGELOG / README / iterations / design）。此规则已写入 README 开发规则。起因：V2.5 打包时忘记 bump 版本号。

### 待验证假设

| # | 假设 | 验证方式 | 状态 |
|---|------|---------|------|
| 1 | AI 规划的时段安排是否合理 | 实际使用后观察 | 待验证 |
| 2 | 拖拽交互在实际使用中是否顺畅 | 手动测试 | 待验证 |
| 3 | 30 分钟格够不够细 | 使用 1 周后评估 | 待验证 |

### 下一步

- macOS 日历集成（读取已有会议作为"已占用"参考）——design.md 中 V2.5 的第二部分
- 或进入 V3 Tool Use（design.md 技术路线图的下一站）

---

## 2026-05-31 · V2 Memory System 交付 + V2.5 Calendar 启动

### 本次交付

V2 Memory System 完成并打包（v0.2.0）。PR: [#1](https://github.com/april4xxxx/Qushe/pull/1)

核心交付物：
- 5 种记忆类型（trait/pattern/decision/event/preference）
- `/memory` 页面：分类筛选、编辑、手动添加、回收站
- `extractMemories()`：从对话 + evals 中提取
- `assessTask` / `chat` 注入记忆上下文
- 评估卡片「基于记忆」展示
- 对话页手动提取按钮 + 全景页入口
- Electron 定时提取（每天 0 点）+ 遗忘扫描（每周日 0 点）

### 已知风险 & 待验证假设

| # | 风险/假设 | 验证方式 | 状态 |
|---|----------|---------|------|
| 1 | DeepSeek 提取的记忆质量可能不高 | 使用 1-2 周后看记忆删除率和编辑率 | 待验证 |
| 2 | 全量注入 prompt 在记忆 >20 条时 token 消耗大 | 观察 API 成本 + 是否触发 context limit | 待验证 |
| 3 | 用户是否真的会主动点「提炼到 Memory」 | 观察使用频率 | 待验证 |
| 4 | 打包后的 app 双击无法正常运行 | 需要调试 Electron 打包产物 | 未解决 |

### UX 决策记录

| 决策 | 选了什么 | 为什么 |
|------|---------|--------|
| Memory 页入口 | 全景页底部「查看记忆 →」，不加导航栏 | 避免导航拥挤，Memory 是低频操作 |
| 提取通知 | 静默保存 | 不打扰心流 |
| 记忆可见性 | 完全可见可编辑 | 透明 = 信任 |
| 模型选择 | 暂不换模型，继续用 DeepSeek | 先验证架构再决定是否换 |

### 下一步：V2.5 虚拟日历

design.md 中的 V2.5 Calendar 规划：
- App 内虚拟日历作为 AI 规划画布（可读写、可拖拽）
- 读取 macOS 日历作为"已占用时段"参考（只读）
- AI 根据 tasks + memories + macOS 日历生成时段建议
- 用户拖拽调整 → AI 提取为 preference Memory

**本轮实现范围待确认**：是否先只做虚拟日历，macOS 日历集成作为后续？

---

## 2026-05-31 · V1.2 修复轮

### 测试发现（来自 User Journey Map 评审）

V0.1.0 上线后通过 Journey Map 暴露的致命 bug：
- 任务无法编辑 → 加了 TaskEditor modal
- 完成任务无法回退 → 加了恢复按钮
- 取消任务无法恢复 → 加了恢复按钮
- 对话不渲染 Markdown → 加了 react-markdown
- 没有全景视图 → 新增 PanoramaPage
- AI 不问 deadline → 加了 deadlineQuestion 字段
- 修改 AI 判断时无法说明原因 → 加了原因收集 + evals.json

### UX 决策记录

| 决策 | 选了什么 | 为什么 |
|------|---------|--------|
| 全景页风格 | 杂志刊头 + 罗马数字 | 与 Editorial Luxury 整体调性一致 |
| AI 追问 deadline | 卡片上显示追问，必须回答才能确认 | 时间敏感任务不能漏 deadline |
| 改篮子原因 | 可跳过的输入框 | 收集数据但不强制，降低摩擦 |

### 教训

**跳过 User Journey Map 是 V0.1.0 所有致命 bug 的根因。** 从 V2 开始，每个版本的 Journey Map 必须在编码前完成评审。

---

## 2026-05-30 · V1.0 MVP 上线

首版三篮子智能排序 MVP。

### 核心交付

- 三篮子模型（狮子/牛马/鸵鸟）
- AI 单次调用评估任务优先级
- 主线目标 Onboarding 对话
- 三篮子看板 + 今日视图
- 设置页（API Key + 主线 + 清除数据）

### 待测试清单（design.md 第六节）

每日 5 题 + Memory 素材收集，计划 2026-05-30 → 2026-06-06 执行。

---

## 模板

```markdown
## YYYY-MM-DD · 标题

### 测试发现
- 发现 1：描述 → 影响 → 优先级（ICE 分数）

### UX 决策记录
| 决策 | 选了什么 | 为什么 |

### 版本计划调整
- 原计划：...
- 调整为：...
- 原因：...

### 下一步
- [ ] 待办 1
- [ ] 待办 2
```
