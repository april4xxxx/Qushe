# AI 任务优先级管理产品 — 完整设计与实现计划

## Context

用户（即将入职的产品经理）需要一个 AI 驱动的个人任务优先级管理工具。核心问题：在工作、副业、自我提升三条主线间无法有效取舍，被琐碎紧急任务吞噬时间，真正重要的事被反复推迟。策略：先自用 MVP，验证后考虑产品化。

---

## 一、共情阶段产出

### 用户画像
**Siyue** — 即将入职 PM，经营副业软件，追求自我提升  
**Quote**："我的生活完全被琐碎事情打扰，没有大块时间供自己使用。"  
**三条主线**：工作（PM，向AI靠拢）| 副业（拉姆软件）| 生活（减脂、读书、自我提升）

**核心痛点**：
1. 只按紧急性排序，缺少重要性维度
2. 别人的小任务立即完成 → 大块时间碎片化
3. 自我提升方向太多，无法判断心血来潮 vs 真正需要
4. 学习动力靠外部目标驱动，目标消失后中断

---

## 二、定义阶段产出

### Problem Statement
> Siyue 是一位即将入职的产品经理，需要一种能基于长期目标和当前状况智能评估新任务优先级的方式，因为现有方法只考虑紧急性而忽略重要性，导致自我提升和长期目标被持续推迟。

### 关键假设
1. AI 结合主线目标自动排序 → 减少决策疲劳
2. AI 识别"完成强迫症"并保护大块时间 → 减少碎片化
3. AI 评估新想法与主线一致性 → 减少无效学习

### 北极星指标体系
| 指标 | 定义 | 目标 |
|------|------|------|
| 主线推进率 | 每周在主线相关任务上的时间占比 | 提升20%+ |
| 狮子任务完成率 | 每天狮子任务实际完成比例 | >80% |
| 鸵鸟过滤有效率 | 鸵鸟任务最终被证明确实不重要的比例 | >60% |
| 决策速度 | 新任务从录入到确定篮子的时间 | <30秒 |

---

## 三、构思阶段产出

### 竞品空白
现有工具（Todoist/Things/Motion/Sunsama）都无法结合用户的"人生主线目标"做智能优先级判断。

### 核心设计框架

**Layer 1 — 三篮子模型**（MVP 核心）
- 🦁 狮子：今天必须办的重要+紧急任务
- 🐂 牛马：这周需要做的事务性任务
- 🐦 鸵鸟：延迟处理/主动拖延的任务

**Layer 2 — 精力管理**（V2）
- 高/低能量时段匹配：把困难任务安排在高能量时段
- 任务类型匹配：创造性 vs 事务性任务配对不同精力状态
- 休息提醒：避免过度消耗
- 情绪状态考虑：当天状态差时自动降低任务量

**Layer 3 — 扩展框架**（V3+）
- 艾森豪威尔矩阵：作为三篮子的补充视角（重要/紧急四象限）
- GTD（Getting Things Done）：收集-处理-组织-回顾-执行流程
- 更多框架可插拔接入

### AI 设计方案

**主线理解 — 混合式**：
1. 初始引导对话（5-10min）梳理初步主线
2. 双向校准：AI 挑战决策（"这和你的主线有什么关系？"）
3. 定期主线回顾：每周/月自动审视

**AI 四重角色**：智能顾问 + 自动分类 + 对话伙伴 + 数据分析

**任务时间估算**：AI 根据任务描述自动估算，用户可修正，AI 从修正中学习

**心血来潮检测**：与主线关联度低的新想法触发冷静期（3天后再问一次是否还想做）

**输出形式**：可视化卡片（篮子分类 + 理由 + 主线关联度 + 预估时间 + 建议执行时段）

---

## 四、实现计划

### 技术栈
- **前端**：React + TypeScript + Vite（Web 优先，后续 Electron 桌面 + React Native 移动）
- **UI**：Tailwind CSS + 自定义组件
- **AI**：Claude API（Sonnet 做任务分析，Haiku 做轻量分类）
- **数据库**：SQLite（自用） → PostgreSQL（产品化）
- **后端**：先前端直连 Claude API（自用阶段），后续加 Node.js/FastAPI 中间层

### 数据模型
```
Mainline: { id, name, description, priority, goals[], currentPhase }
Task: { id, title, description, basket, mainlineAlignment, estimatedMinutes, 
        suggestedTimeSlot, status, isImpulse, cooldownUntil, createdAt }
DailyPlan: { id, date, lionTasks[], oxTasks[], completedCount, review }
Conversation: { id, messages[], context, type(onboarding|taskInput|review) }
UserProfile: { mainlines[], energyPattern, preferences, historicalPatterns }
```

### MVP 实现步骤（6步）

**Step 1：项目初始化**
- 创建 React + TypeScript + Vite 项目
- 搭建基础路由（/, /kanban, /chat, /settings, /review）
- 集成 Tailwind CSS
- 设置 Claude API 调用工具函数

**Step 2：数据层**
- 本地存储方案（localStorage 或 IndexedDB）
- 定义 TypeScript 类型
- CRUD 工具函数

**Step 3：Onboarding 引导对话**
- 对话 UI 组件
- 主线梳理 prompt 编写
- 保存主线配置

**Step 4：新任务智能排序（核心）**
- 混合输入 UI（文字框 + 快捷入口）
- AI 评估 prompt：输入任务描述 + 主线上下文 + 当前任务列表 → 输出结构化结果
- 可视化卡片展示（篮子 + 理由 + 关联度 + 预估时间）
- 确认/修改交互
- 心血来潮检测与冷静期

**Step 5：三篮子看板**
- 三列看板 UI
- 任务卡片（状态、预估时间、主线标签）
- 拖拽调整篮子

**Step 6：Today View + 每日规划**
- 今日狮子任务高亮
- AI 生成每日计划建议（考虑任务量和预估时间）
- 基础北极星指标展示

### 验证方式
- 自己使用 1-2 周
- 追踪北极星指标：主线推进率、狮子完成率、鸵鸟过滤率、决策速度
- 记录 AI 建议准确率（你同意 AI 排序的比例）
- 观察主观感受：决策疲劳是否减少、是否真的在做重要的事

### 后续路线图（产品功能维度）
- V2：精力管理层（能量时段 + 任务匹配 + 休息提醒）
- V3：艾森豪威尔矩阵 + GTD 流程融合
- V4：周报/月报数据分析、趋势可视化
- V5：移动端 App（React Native）+ 桌面端（已完成 Electron）
- V6：产品化（多用户、账号系统、数据同步）

---

## 五、Agent 架构升级路线（技术维度）

参考 Andrew Ng《Agentic AI》课程的四大设计模式 + Evals。当前 MVP 是**纯 prompt + context injection**（不是 Agent），未来按以下顺序升级。

### 当前架构（V1）
- 单次 LLM 调用：用户输入 → 拼装 prompt → DeepSeek 返回 JSON → 显示卡片
- 无工具、无反思、无多 Agent、无评估系统
- 文件位置：[src/lib/ai.ts](src/lib/ai.ts) 的 `assessTask` 和 `chat` 函数

### V2 — Memory System 结构化记忆（设计阶段已锁定 · 2026-05-31）

**背景**：用户反思后认为，当前架构（每次塞 profile + tasks + chat 全文进 prompt）**撑不住"记忆复用"和"日程规划"的期待**。需要参考 Claude Code 的记忆系统，做真正的结构化、可检索、可复用的 Memory。

**问题**：
- 当前没有结构化记忆，AI 不能记住"用户讨厌打断"这类洞察
- 记忆无法跨场景复用（对话学到的东西分类任务时用不上）
- 没有遗忘机制，越用越臃肿

#### 用户确认的 5 个 V2 设计决策

| # | 决策 | 选择 | 影响 |
|---|------|------|------|
| 1 | V2 范围 | **只做 Memory，Calendar 拆到 V2.5** | 1-2 周可发布 |
| 2 | Memory 可见性 | **可见可编辑**（独立页面） | 透明 + 可控 = 高信任 |
| 3 | 提取触发 | **混合：定时 + 手动** | 后台默认 + 关键时刻人工 |
| 4 | Memory 页位置 | **独立 `/memory` 页 + 全景里加 "查看记忆 →" 入口** | 主入口在全景，导航不拥挤 |
| 5 | 提取后通知 | **静默保存，不打扰** | 不干扰心流，进 Memory 页才看 |

#### 数据架构（简化设计）

简化原 directory 设计为**单 JSON 文件**（Electron + JSON 不适合每条记忆一个文件）：

```
~/Library/Application Support/取舍/
└── memories.json
```

文件结构：
```json
{
  "version": 1,
  "extractedAt": "2026-06-07T00:00:00Z",  // 最后一次提取时间
  "memories": [
    {
      "id": "uuid",
      "type": "trait" | "pattern" | "decision" | "event" | "preference",
      "title": "短标题",
      "content": "完整内容",
      "confidence": 1-5,  // 1=猜测 2=有点把握 3=确定 4=强烈 5=确凿
      "source": {
        "kind": "chat" | "task" | "manual",
        "conversationId": "...",   // 来源对话或任务 id
        "extractedAt": "ISO"
      },
      "lastReferencedAt": "ISO",
      "referencedCount": 0,
      "expiresAt": "ISO" | null,
      "userEdited": false  // 用户编辑过的记忆 confidence 视为 5
    }
  ],
  "trash": []  // 30 天内删除的记忆，可恢复
}
```

#### Memory 5 种类型（来自前期讨论 + 用户反馈）

| 类型 | 示例 | 触发场景 |
|------|------|---------|
| **trait** 特质 | "早晨精力最好" | 用户多次提到时间偏好 |
| **pattern** 模式 | "学新课通常 2 周后停" | 用户取消任务的统计模式 |
| **decision** 决策 | "上次学 React 判为狮子但未完成" | 用户修改 AI 判断时 |
| **event** 事件 | "6月15日入职 PM" | 用户对话中提到具体日期事件 |
| **preference** 偏好 | "会议尽量下午" | 用户多次表达的执行习惯 |

#### Memory 生命周期（5 个 LLM 调用点）

1. **Extract**（提取）
   - 触发：每天 0 点自动 + 用户在对话页点「提炼到 Memory ✦」按钮
   - 输入：最近 24h 对话 + 任务变更 + evals.json 用户修正记录
   - 输出：`{ new: Memory[], update: { id, patch }[], conflict: { existingId, newContent }[] }`
   - LLM 模型：DeepSeek（同当前主模型）

2. **Retrieve**（检索）
   - 触发：assessTask / chat 每次调用前
   - 策略：
     - 第一步：加载 memories.json 全部 title + type（轻量索引）注入 prompt
     - 第二步：AI 标记需要哪几条详细内容
     - 第三步：把这几条完整 content 注入第二次 LLM 调用
   - 优化：如果 memories < 20 条，跳过两步，直接全部注入

3. **Reference**（引用追踪）
   - AI 评估卡片输出时，告知用了哪些 memory id
   - 这些 memory 的 `lastReferencedAt` 和 `referencedCount++` 更新
   - 评估卡片在 UI 上显示「基于：你昨天提到的 X」

4. **Edit**（用户编辑）
   - 用户在 Memory 页修改 → 写回 memories.json，confidence 提到 5
   - 用户删除 → 移入 trash，30 天后真删
   - 记录这次编辑到 evals.json：`{ kind: "memory_edit", memoryId, before, after }`

5. **Forget**（定期清理）
   - 每周日 0 点扫描：
     - confidence ≤ 2 + 超过 30 天未被引用 → 提示用户删除（不自动）
     - trash 超过 30 天 → 真删
   - 用户编辑过的记忆 (`userEdited: true`) 永不自动删除

#### V2 实现步骤（按依赖顺序）

| 序 | 任务 | 估时 | 文件 |
|----|------|------|------|
| 1 | 定义 `Memory` 类型 + storage CRUD | 半天 | `src/types/index.ts`, `src/lib/storage.ts` |
| 2 | 编写 Extract prompt + `extractMemories()` 函数 | 1 天 | `src/lib/ai.ts` |
| 3 | 编写 Retrieve 逻辑（两步检索）+ 集成到 `assessTask` | 1 天 | `src/lib/ai.ts` |
| 4 | 评估卡片增加「基于 Memory」展示区 | 半天 | `src/components/AssessmentCard.tsx` |
| 5 | 新建 `/memory` 页面（分类筛选 + 卡片列表 + 编辑 inline） | 2 天 | `src/pages/MemoryPage.tsx` |
| 6 | 全景页加「查看记忆 →」快捷入口 | 半天 | `src/pages/PanoramaPage.tsx` |
| 7 | 对话页加「提炼到 Memory ✦」按钮 + mini 预览卡 | 1 天 | `src/pages/ChatPage.tsx` |
| 8 | 后台定时提取（Electron main 进程定时器，每天 0 点） | 半天 | `electron/main.ts` |
| 9 | Forget 扫描（每周日 0 点） | 半天 | `electron/main.ts` |
| 10 | 文档：CHANGELOG / README / docs/personal/design.md 同步 | 半天 | — |

**总估时**：7-8 工作日（约 1.5 周）

#### V2 用户旅程（设计稿）

详见 [user-journey-map.md](./user-journey-map.md)：

- **Journey 05**：查看 AI 记住了什么（用户主动审计 + 编辑）
- **Journey 06**：AI 提取记忆（被动定时 + 主动按钮 两条 path）

**两条 Journey 必须在 Step 1 之前完成评审**，避免重蹈 v0.1.0 跳 Journey 的覆辙。

#### V2 关键设计原则（写在最前面）

1. **透明 > 隐藏**：用户随时能看到 AI 对自己的所有认知
2. **可逆 > 自动**：所有操作可撤销，30 天回收站
3. **可追溯**：每条记忆指向来源（哪次对话 / 哪个任务）
4. **静默 ≠ 隐藏**：默认不打扰，但主动找时一定能找到
5. **基于 Memory 必须可解释**：AI 评估时引用 Memory 要显式标注

#### V2 验证方式（基于 v0.1.2 已建立的 evals.json）

V2 上线后追踪：

| 指标 | 计算方式 | 目标 |
|------|---------|------|
| Memory 引用率 | AI 评估时实际引用 Memory 的比例 | > 60% |
| 用户编辑率 | Memory 被用户编辑的比例 | 5-15%（太低=AI 写得太对/没看，太高=AI 写得太烂）|
| Memory 删除率 | 被用户删除的比例 | < 10% |
| 评估准确率提升 | V2 vs V1 的采纳率对比 | 提升 10%+ |

---

### V2.5 — Calendar 视图（Memory 的第一个应用）· ✅ 虚拟日历已实现 · 2026-05-31

**新页面**：`/calendar` — 周视图，AI 自动将任务排进时段

**用户确认的实现选择**：
- ✅ **虚拟日历**（已实现 v0.2.5）：App 内 AI 规划画布，周视图 8:00-22:00，30 分钟格，支持拖拽调整和点击放置
- ⏳ **macOS 日历集成**（待实现）：读取 macOS 日历作为"已占用时段"参考（只读，避免与会议冲突）

**已实现的核心交互**：
- AI 根据 tasks + memories（篮子优先级 + 精力规律）生成时段建议
- 用户拖拽调整时段位置 / 点击放置未排入任务
- `schedule.json` 本地持久化

**待实现**：
- macOS 日历访问：Electron 主进程调用 `osascript` 或 EventKit（需要权限弹窗）
- 用户拖拽调整 → AI 提取为 preference Memory 写入

### V3 — Tool Use 工具调用（对应课程 M3）· ✅ 已实现 · 2026-06-01

**问题**：AI 只能看到 prompt 里塞进去的信息，不知道你的真实状态。

**已实现**：
- `src/lib/tools.ts`：工具注册表 + handler + dispatcher
- `chatWithTools` 循环：function calling → 执行 → 喂回 → 最终回答
- 4 个工具：`get_recent_completions` / `search_memories` / `get_schedule` / `get_task_stats`
- 优雅降级：不支持时自动回退全量注入

**待实现**：
- `get_calendar_events(date)` — 读 macOS 日历（依赖 V2.5 macOS 日历集成）
- Planning Agent — 每天早晨综合工具数据生成今日建议（V4 实现）

### V4 — Multi-Agent 多 Agent 协作（对应课程 M5）

**问题**：一个 AI 既当分类器、又当批评者、又当规划师，角色冲突，prompt 越来越臃肿。

**实现思路**：拆分成 5 个专精 Agent，各自独立的 prompt 和职责

| Agent | 职责 | 触发时机 | 模型选择 |
|-------|------|---------|----------|
| **Classifier** | 快速分篮子 | 新任务进来 | 便宜的小模型 |
| **Critic** | 挑战决策、心血来潮检测 | Classifier 后 | 强推理模型 |
| **Planner** | 规划今日时间安排 | 每天早晨 | 强推理模型 |
| **Reviewer** | 周报复盘、模式分析 | 每周日 | 强推理模型 |
| **Coach** | 长期主线对齐审视 | 每月一次 | 强推理模型 |

可以并行调用（节省时间），编排代码统一汇总结果给用户。

**工作量**：2-3 周

### V5 — Evals 评估系统（对应课程 M4，PM 视角最重要）

**问题**：不知道 AI 判断到底准不准，无法做数据驱动的迭代。

**实现思路**：
- 每次 AI 建议都记录到 `evals.json`
- 用户每次修改 AI 建议（如 AI 说狮子，用户改成鸵鸟）= 一条错误样本
- 自动统计指标：
  - **采纳率**：用户接受 AI 原始建议的比例
  - **修正模式**：被修正最多的任务类型 → 暴露 prompt 弱点
  - **心血来潮检测准确率**：标为"心血来潮"的任务，过 7 天后真的没做的比例
  - **主线对齐 F1 分数**：与用户最终判断的一致性
- 新增 `EvalsPage`：可视化 AI 表现仪表盘

**工作量**：1 周

### 学习与实战的结合

课程 5 个模块刚好对应上面 4 次升级（M1+M5 合并为 V4）。建议学习节奏：

| 学完模块 | 立即对应的代码改造 |
|---------|-----------------|
| M2 Reflection | 给 `assessTask` 加 Critic 层 → V2 |
| M3 Tool Use | 接日历 + 历史检索 → V3 |
| M4 Evals | 加采纳率统计 → V5 部分 |
| M1+M5 Planning + Multi-Agent | 重构成多 Agent 架构 → V4 |

避免"学完就忘"，每学一个模块都直接动手改造软件。

---

## 六、测试-迭代协议（Google UX Test 阶段固化流程）

### 当前阶段判断
MVP 已上线，正处于 Google UX 的 **Test → Iterate** 循环。不需要再学新课程，而是在使用中暴露问题、系统化记录、按优先级修复。

### 每日测试日志（建议每晚 3 分钟）
在 `~/.qushe-journal.md` 或 Notion 写：
- **今天发现**：什么不顺手 / 哪个 AI 判断错了 / 想要什么新功能
- **AI 准确性**：今天采纳了 AI 几次建议？修改了几次？修改的原因？
- **真实使用次数**：实际打开 App 几次？录入几个任务？（看产品粘性）

### ICE 排序框架（每周末整理一次）
把日志里的发现转成清单，每条评估：

| 评分项 | 1（低） | 3（中） | 5（高） |
|--------|--------|--------|---------|
| **Impact 影响** | 偶尔遇到 | 经常遇到 | 每次都遇到 |
| **Confidence 把握** | 不确定能解决 | 大致有思路 | 明确知道怎么改 |
| **Effort 工作量（反向）** | 大于1周 | 1-3天 | 几小时 |

**总分 = Impact × Confidence × Effort_倒数**。优先做高分。

### 已完成的测试发现（V1.1）
- ✅ 对话不渲染 Markdown → 加 react-markdown
- ✅ 缺少全景视图 → 新增 `/panorama` 页面（编辑刊头 + 罗马数字主线卡片 + 时间流向柱状图）
- ✅ AI 输出 JSON 时显示原始代码块 → strip 掉

### 待观察的测试假设
- AI 篮子判断准确率（要观察 1-2 周才能下结论）
- 心血来潮检测是否真的过滤掉了无效冲动
- 主线推进率是否真的提升

### 第一周测试清单（2026-05-30 → 2026-06-06）

每晚 3 分钟，回答这些问题（写在 `~/qushe-week1.md` 或随手笔记里）：

**每日 5 题**：
1. 今天打开 App 几次？录入了几个任务？
2. AI 建议的篮子，我接受了几次？修改了几次？修改的原因是什么？
3. 今天哪个 AI 判断让我**意外地准**？哪个让我**意外地错**？
4. **本可以记下来给以后复用**的洞察（比如"AI 不知道我下午开会多" → 这就是该进 Memory 的素材）
5. 今天最想要但没有的功能是什么？

**Memory 素材收集（关键）**：
这一周特别留意——哪些信息你**反复要告诉 AI**？哪些 AI **总是猜不到**？这些都是 V2 Memory 系统该自动捕获的目标。比如：
- "我下午通常没精力学习" → trait 类记忆
- "上周说要学的 X 我已经放弃了" → decision 跟踪类记忆
- "周二晚上有固定会议" → event 类记忆

下周末整理时，**用 ICE 框架排序**，告诉我哪些 Memory 类型应该最先实现。

### 何时进入下一阶段
满足以下条件之一，才进入 V2（Reflection）开发：
- ✅ 累积测试日志 ≥ 14 天
- ✅ 至少修过 5 个 V1.x 小问题
- ✅ AI 判断采纳率稳定 > 70%（如果一直 < 50%，说明 prompt 本身有问题，应先改 prompt 而不是上 Reflection）

### V1.x 已交付的小迭代
- V1.0：基础三篮子 + 智能排序
- V1.1：人生全景页 + Markdown 渲染 + 持久化对话 + 桌面 App
- V1.2（待定）：等测试日志告诉我们
