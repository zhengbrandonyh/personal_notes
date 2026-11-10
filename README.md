# 江明川冲冲冲

个人事项、日历与笔记管理网站。此仓库保存当前线上 **V29** 的源码快照。

线上网站：https://jiangmingchuan-blog.zhengbrandonyh.chatgpt.site/

## 当前功能

- 今日行动、四象限与事项列表，支持五种彩色工作阶段标签。
- 计划周期、实际日程、子事项时间节点、日历拖动与排期冲突提示。
- 富文本笔记、表格和图表、本地草稿恢复、保存版本、版本对比与保留恢复点的回滚。
- AI 助手、操作预览确认、对话历史、重复事项与页面内提醒。
- 明暗模式、响应式布局、本地数据导入导出与基准版本恢复。

## 本地开发

建议使用 Node.js 24 和 pnpm 11.25.0。

```bash
pnpm install --frozen-lockfile
pnpm dev
```

验证与构建：

```bash
pnpm test
pnpm exec tsc --noEmit
node --test worker/tests/assistant.test.mjs
pnpm build
```

构建会生成前端页面、离线 HTML 和 `dist/server/index.js` Worker。数据安全写入依赖 Web Locks，请使用支持该能力的浏览器和 HTTPS 或 localhost。

## 项目结构

- `src/`：React 界面、数据模型、任务排期及笔记版本逻辑。
- `src/utils/*.test.ts`、`*.spec.ts`：前端逻辑回归测试。
- `worker/`：AI 服务端接口与权限校验，以及接口测试。
- `scripts/`：前端、离线页面和 Worker 构建脚本。
- `public/`：图标、历史原型及设计资源。
- `docs/`：历史设计与发布说明；导出前的 README 保存在 `docs/README-source-v29.md`。
- `.openai/`：现有 Sites 项目与发布基准配置。

## 配置与数据

AI 运行时配置为 `GEMINI_API_KEY`、`GEMINI_MODEL`、`AI_OWNER_EMAIL`，由部署平台安全环境提供。不要把真实值提交到 GitHub。Worker 还依赖部署平台提供可信用户身份，不能仅靠前端配置密钥替代。

事项、笔记及聊天记录保存在访问者自己的浏览器中；本仓库是代码备份，不包含用户的浏览器数据，也不提供手机和电脑之间的自动云同步。

本次保存不会更改线上部署，也没有自动建立 GitHub 与 Sites 的持续同步。

## 导出记录

- 导出日期：2026-11-10。
- 对应 Sites 版本：V29。
- 原源码提交：`fec90650ec4ab9eb54e1a8820ffd1492fab85acd`。
- 保留 128 个原项目文件，并补充本说明、保留原 README。
- 两个旧原型文件中的历史硬编码密钥已清空；未上传 `.env`、依赖目录、构建产物、Git 认证信息或浏览器个人数据。
