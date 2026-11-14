# TS 全栈 12 周路线图

> 定位：**TypeScript 生态全栈工程师** —— React/Next.js + Node.js + viem/wagmi + LLM。
> 目标：12 周后拥有 2 个可演示项目，能投 Web3 全栈 / Product Engineer / AI 应用岗。

---

## 一、技术栈定稿

| 层 | 技术 |
| --- | --- |
| 前端 | React、Next.js（App Router）、TypeScript、Tailwind |
| 后端 | Node.js、Fastify / Express、REST |
| 数据 | PostgreSQL、Redis |
| 异步 | BullMQ（队列）、WebSocket |
| 链上 | viem、wagmi、RainbowKit |
| AI | LLM API、RAG、Prompt、Agent / MCP |
| 交付 | Docker、CI/CD、Vercel / 云服务器、日志监控 |

**放弃清单**：Solidity 深度、Go/Rust 专精、纯切图前端、纯后端高并发。

---

## 二、每周固定动作（不可省）

- [ ] 写代码 5 小时
- [ ] 英语 20 分钟/天（读 JD、写 3 句、跟读）
- [ ] 投递 5 个岗位
- [ ] 周日复盘 15 分钟：做了什么 / 卡在哪 / 下周调整

---

## 阶段一（第 1–4 周）：后端骨架

**目标**：把 Wallet Safety 的后端做成一个能独立跑的服务。

### 第 1 周：Node + Fastify + REST

- [ ] 新建 `packages/server`（或独立仓库），TypeScript + Fastify
- [ ] 实现 `GET /health`、`GET /api/approvals?owner=&token=`
- [ ] 用 zod 校验参数
- [ ] 统一返回结构 `{ data, error }`

**产出**：本地能跑的 API 服务
**验收**：Postman/curl 能调通，非法参数返回 400

### 第 2 周：PostgreSQL

- [ ] 建表：`scans`、`approvals`（参考 `docs/ROADMAP.md`）
- [ ] 用 Prisma 或 Drizzle 做 ORM/迁移
- [ ] 写入扫描结果 + 按地址查询
- [ ] 给 `(owner_address, created_at)` 建索引

**产出**：扫描结果能落库并查回
**验收**：能解释“为什么加这个索引”

### 第 3 周：Redis + BullMQ

- [ ] Redis 缓存扫描结果（TTL 60s）
- [ ] BullMQ 队列：扫描任务异步化
- [ ] Worker 处理任务，失败重试（指数退避）
- [ ] 任务幂等（同一地址同一时间只跑一次）

**产出**：提交扫描 → 入队 → Worker 执行 → 结果可查
**验收**：能讲清“重试/幂等/超时”

### 第 4 周：部署 + 日志

- [ ] Dockerfile + docker-compose（app + postgres + redis）
- [ ] 部署到云服务器或 Fly.io/Render
- [ ] 结构化日志（pino）+ 健康检查
- [ ] `.env` 管理，密钥不入库

**产出**：公网可访问的 API
**验收**：重启后服务自动恢复，日志能定位请求

---

## 阶段二（第 5–8 周）：实时 + 前端重构

**目标**：前后端分离，实时更新，UI 有体系。

### 第 5 周：WebSocket

- [ ] 服务端加 WebSocket（`ws` 或 Socket.IO）
- [ ] 扫描完成/授权变化时推送
- [ ] 前端断线重连 + 心跳

**产出**：授权列表实时刷新
**验收**：能讲清“为什么不用轮询”

### 第 6 周：前端改 TS + 组件拆分

- [ ] 页面拆成 `Card`、`Badge`、`Button`、`EmptyState`
- [ ] 全量 TypeScript，去掉 `any`
- [ ] 统一 spacing / 字号 / 颜色 token

**产出**：组件化页面
**验收**：新增一个页面能复用 3 个以上组件

### 第 7 周：状态与边界

- [ ] loading / empty / error 三态齐全
- [ ] 用户拒绝签名、网络失败、链切换的处理
- [ ] 表单校验与提示

**产出**：异常路径不白屏
**验收**：断网、拒签、错误地址都不崩

### 第 8 周：联调 + 上线

- [ ] 前后端联调（CORS、环境变量）
- [ ] 部署前端（Vercel）+ 后端（云）
- [ ] Lighthouse ≥ 90

**产出**：线上可用的完整产品
**验收**：手机端可用，无控制台报错

---

## 阶段三（第 9–12 周）：作品化 + 投递

### 第 9 周：文档与演示

- [ ] README：功能、架构图、本地运行、截图
- [ ] 录 30 秒演示视频
- [ ] 写一篇“踩坑复盘”（BigInt、密钥隔离、限流）

**产出**：别人能看懂、能跑起来

### 第 10 周：简历

- [ ] 中文 1 页 + 英文 1 页
- [ ] 三个项目：TxLens、Wallet Safety、企业 AI 系统
- [ ] 每条 bullet：动词 + 做了什么 + 结果（数字）

**产出**：可投递版本

### 第 11 周：集中投递

- [ ] 招聘板 15 个（web3.career / crypto.jobs / remote3）
- [ ] 初创平台 10 个（Wellfound / YC）
- [ ] 中文渠道 10 个（电鸭 / V2EX / BOSS 远程）
- [ ] 冷 DM 20 个（X / Telegram / Discord）

**产出**：50+ 触达

### 第 12 周：面试与复盘

- [ ] 3 分钟英文自述练熟
- [ ] 准备 10 个项目追问
- [ ] 每场面后记录“被问住的问题”
- [ ] 复盘：简历问题 / 面试问题 / 技能缺口

**产出**：至少 2–3 场面试，明确下一步

---

## 三、检查点（必须执行）

| 时间 | 指标 | 不达标怎么办 |
| --- | --- | --- |
| 第 4 周 | API 上线、能落库 | 砍功能，先跑通主流程 |
| 第 8 周 | 前后端联调、线上可用 | 砍实时，先保证可用 |
| 第 10 周 | 简历可投 | 停开发，先写简历 |
| 第 12 周 | 有面试 | 改简历 / 降预期 / 扩渠道 |

---

## 四、投递岗位与关键词

| 岗位 | 关键词 |
| --- | --- |
| Web3 全栈 | `full stack` `web3` `react` `node` `remote` |
| Product Engineer | `product engineer` `typescript` `startup` |
| AI 应用 | `AI engineer` `LLM` `RAG` `agent` |
| 全栈（小团队） | `founding engineer` `full stack` |

---

## 五、常见坑

1. **只学不产出**：每周必须有可演示增量。
2. **贪多**：不要同时学 Go/Rust/Solidity。
3. **不做错误处理**：面试最爱问“出错怎么办”。
4. **不写 README**：别人跑不起来等于没做。
5. **等准备好再投**：第 10 周必须开始投。

---

## 六、验收：12 周后你应该能

- [ ] 独立写一个 Node + Postgres + Redis + 队列的服务
- [ ] 用 Next.js + TS 做完整前端，含三态与错误处理
- [ ] 用 viem/wagmi 完成钱包连接与合约读写
- [ ] 把 LLM 接进产品（含密钥隔离与 prompt 约束）
- [ ] 部署上线，写出别人能跑的 README
- [ ] 用英文讲清 3 分钟项目介绍
