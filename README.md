# 取舍

取舍是一个本地优先的 AI 任务整理桌面应用。它通过对话先梳理用户的人生主线，再把新任务评估进三个篮子：狮子、牛马、鸵鸟，帮助用户判断今天该做什么、这周处理什么、哪些事可以主动延后。

## 当前状态

- 产品版本：`0.1.2`
- 应用类型：Electron 桌面应用，也可以用 Vite 浏览器模式预览
- AI 服务：DeepSeek Chat API，使用 OpenAI SDK 兼容接口
- 数据策略：任务、主线、聊天记录、API Key、AI 评估日志都存储在本机
- 打包目标：macOS arm64 目录包，当前未做签名和公证

## 功能概览

- 今日页：录入新任务，调用 AI 评估任务优先级，并展示当天的狮子、牛马、鸵鸟任务。任务卡支持完成 / 回退完成 / 编辑 / 取消 / 删除。
- 看板页：按三个篮子查看进行中或全部任务，支持编辑和回退。
- 对话页：和 AI 梳理人生主线，也可以继续讨论任务安排和主线调整。支持完整 Markdown 渲染（标题/加粗/斜体/列表/引用/代码）。
- 全景页：基于主线和任务生成当前人生全景、任务分布和时间投入概览。杂志风格刊头 + AI 引言 + 罗马数字主线卡片 + 时间流向柱状图。
- 设置页：配置 DeepSeek API Key、查看主线目标、清除本地数据。

### 关键 AI 交互

- AI 评估卡片包含篮子分类、主线关联度、预估时间、建议时段、AI 理由。
- AI 检测到时间敏感任务但未提及截止时间时，会专门追问"什么时候要完成？"用户必须回答才能确认。
- 用户改 AI 建议的篮子时，弹出"为什么改？"输入框收集原因（可跳过），写入 `evals.json` 供后续分析。
- 对话中第一次保存主线后，AI 自动推送"人生全景已生成"提示。

## 技术栈

- React 19
- TypeScript 6
- Vite 8
- Electron 42
- Tailwind CSS 4
- React Router 7
- OpenAI SDK，连接 DeepSeek 兼容 API
- Electron IPC + `app.getPath('userData')` 做本地持久化

## 目录结构

```text
docs/              产品设计文档（design.md / user-journey-map.md）
electron/
  main.ts          Electron 主进程、窗口创建、本地 JSON 存储 IPC
  preload.ts       暴露受控 storage API 给渲染进程
src/
  App.tsx          路由和启动初始化
  main.tsx         React 入口
  index.css        Tailwind 主题、基础样式
  components/      通用 UI 组件
  lib/
    ai.ts          DeepSeek/OpenAI SDK 初始化与 AI 调用
    storage.ts     统一本地存储封装
  pages/           今日、看板、对话、全景、设置页面
  types/           领域类型定义
public/            静态资源
dist/              Web 构建产物，不应手改
dist-electron/     Electron 构建产物，不应手改
release/           Electron 打包产物，不应手改
```

## 设计文档

所有产品设计、用户旅程、版本路线图在 [`docs/`](./docs/) 目录：

- [`docs/design.md`](./docs/design.md) — 总设计文件（GoogleUX 全流程 + Agent 升级路线 + 测试协议）
- [`docs/user-journey-map.md`](./docs/user-journey-map.md) — 每个核心流程的 User Journey Map
- [`docs/README.md`](./docs/README.md) — 文档目录说明

## 本地开发

安装依赖：

```bash
npm install
```

启动开发环境：

```bash
npm run dev
```

构建 Web 和 Electron 产物：

```bash
npm run build
```

运行 lint：

```bash
npm run lint
```

打包 macOS arm64 应用目录：

```bash
npm run app:build:mac
```

## AI 配置

应用启动后，在设置页填写 DeepSeek API Key。当前 AI 客户端配置在 `src/lib/ai.ts`：

- `baseURL`: `https://api.deepseek.com`
- `model`: `deepseek-chat`
- SDK: `openai`

注意：当前实现使用 `dangerouslyAllowBrowser: true`，API Key 会在渲染进程侧使用并保存在本机。这个设计适合本地个人工具，不适合直接改造成多人 Web 服务。若未来要发布为云端产品，应把 AI 调用移到后端或主进程受控通道，并重新设计密钥存储。

## 数据存储

Electron 环境下，数据写入系统的应用数据目录：

```text
app.getPath('userData')
```

使用的 JSON 文件：

- `profile.json`：人生主线和 onboarding 状态
- `tasks.json`：任务列表
- `chat.json`：聊天记录
- `apikey.json`：DeepSeek API Key
- `evals.json`：AI 决策与用户修正的对比记录，包含 AI 原始建议、用户是否接受、修改原因。是 V5 评估系统的数据基础。

浏览器预览环境下，数据写入 `localStorage`，key 与上述文件名一致。

## 开发规则

- 业务类型统一维护在 `src/types/index.ts`。
- 页面级状态和交互放在 `src/pages/`，可复用 UI 放在 `src/components/`。
- AI 调用只放在 `src/lib/ai.ts`，不要在页面组件里直接实例化 SDK。
- 本地持久化只通过 `src/lib/storage.ts` 访问，不要在页面里直接调用 Electron IPC 或 `localStorage`。
- Electron 主进程只暴露必要 IPC，保持 `contextIsolation: true` 和 `nodeIntegration: false`。
- `dist/`、`dist-electron/`、`release/` 是生成产物，不手工编辑。
- 提交代码前必须运行 `npm run lint` 和 `npm run build`，并在提交说明或 PR 里记录结果。
- 每次更新功能、用户可见行为、配置、脚本、架构、数据结构或开发流程时，必须同步更新 `README.md`。
- 每次更新项目时，必须同步更新 `CHANGELOG.md`，按日期记录变更、验证结果和已知问题。
- 如果某次改动不需要更新 README，必须在变更说明里明确写出原因；但 CHANGELOG 仍然要记录。

## 验证状态

最近一次检查：

- `npm run build`：通过，但有 Vite 相关警告和 chunk 体积警告。
- `npm run lint`：未通过，当前错误在 `src/pages/ChatPage.tsx`，`useEffect` 内同步调用 `setMessages(initial)` 触发 `react-hooks/set-state-in-effect`；同时有 `react-hooks/exhaustive-deps` warning。

在修复 lint 前，不应把项目视为完全符合开发验收标准。

## 已知问题

- `src/pages/ChatPage.tsx` 存在 React Hooks lint 错误，需要重构初始欢迎消息逻辑。
- `vite build` 输出 Vite 9 deprecation warning：`resolve.alias` 的 `customResolver` 选项将废弃。
- 构建时有 `freeze` output option warning，需要确认是否来自插件或配置兼容问题。
- 主 bundle 超过 500 kB（加入 react-markdown 后增加约 100 kB），后续可以考虑按页面拆分或动态加载 AI/Markdown 相关依赖。
- macOS 打包当前配置为 `identity: null`，产物未签名、未公证，不是正式分发包。
- 项目尚未初始化 git 仓库，没有版本快照。建议下一次发布前 `git init` 并提交首版。

## 发布前检查清单

发布或交付前至少确认：

- `npm run lint` 通过。
- `npm run build` 通过，且新增 warning 已解释或修复。
- 关键流程可手动走通：设置 API Key、对话生成主线、新增任务、确认任务、完成/取消/删除任务、查看全景、清除数据。
- `README.md` 已反映最新开发方式和配置。
- `CHANGELOG.md` 已记录本次变更。
