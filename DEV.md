# 开发者手册

> 博客的技术架构、构建流程与扩展指南。

## 设计原则

- **零运行时依赖** — 不引用外部 CDN，离线也能完整运行
- **纯静态** — 无后端、无数据库
- **Markdown 写作** — 文章源码为 `.md`，构建生成 `.html`
- **渐进增强** — Live Server 获得 SPA 体验，双击打开也能正常浏览

## 项目架构

```
My-Blog/
│
├── index.html          ← 单页应用入口（含全部视图）
├── README.md           ← 读者向博客简介
├── DEV.md              ← 本文件：开发者手册
│
├── assets/
│   ├── css/style.css   ← 全局样式
│   └── js/script.js    ← 核心引擎（视图切换、MD 解析、数据加载）
│
├── scripts/
│   ├── build.js        ← 构建脚本（Node.js — 推荐）
│   └── build.ps1       ← 构建脚本（PowerShell — 仅生成索引）
│
├── posts/
│   ├── YYYY-MM-DD-标题.md     ← 你写的源文件
│   ├── YYYY-MM-DD-标题.html   ← 构建生成
│   └── index.json             ← 构建生成
│
└── .vscode/
    └── tasks.json      ← Ctrl+Shift+B 一键构建
```

## 文件职责

| 文件 | 职责 |
|------|------|
| `index.html` | 单页应用外壳。包含 4 个视图容器（首页/详情/归档/关于我）、隐藏扩展组件（评论/登录/关注），以及构建注入的文章数据 `<script>`。 |
| `assets/css/style.css` | 全局样式。文章列表（标题···日期）、详情页（680px 正文、Georgia 标题、1.8 行高）、归档页（年/月分组）、关于页，以及评论/登录模态框/关注按钮等预留样式。 |
| `assets/js/script.js` | 核心引擎。<br>• **数据层** — `http://` 优先 fetch `index.json`，`file://` 读嵌入数据，零硬编码<br>• **视图层** — 4 视图切换（首页/详情/归档/关于我）、导航高亮<br>• **渲染层** — 客户端 Markdown → HTML 解析器<br>• **预留接口** — 评论、登录/注册、关注/订阅的 API 桩代码 |
| `scripts/build.js` | 完整构建。扫描 `posts/*.md` → 转完整 `.html` → 清理孤儿 → 生成 `index.json` → 注入数据到 `index.html`。 |
| `scripts/build.ps1` | 轻量构建。扫描 `posts/*.html` 生成 `index.json`。不含 MD 转换。 |
| `posts/*.md` | 文章源文件。命名格式 `YYYY-MM-DD-标题.md`。 |
| `posts/*.html` | 构建生成的完整文章页面。含导航、正文、页脚，可独立打开。 |
| `posts/index.json` | 文章索引。`[{file, title, date}, ...]`，按日期倒序。勿手动编辑。 |

## 数据流

```
posts/*.md                 ← 你写文章（Markdown）
    │
    ▼  node scripts/build.js
    │
    ├─→ posts/*.html       ← 完整文章页面
    ├─→ posts/index.json   ← 文章索引（HTTP 环境 fetch）
    └─→ index.html         ← 嵌入数据（file:// 回退 + 嵌入快照）
    │
    ▼  浏览器打开 index.html
    │
script.js ──→ http://  先 fetch index.json（永远最新）
          ──→ file://  读嵌入数据
          ──→ 渲染文章列表 / 归档页
          ──→ 点击文章 → fetch .html → 提取正文 → 展示
```

## 快速开始

### 前置条件

- [Node.js](https://nodejs.org)（用于构建脚本）
- VSCode 插件 **Live Server**（推荐，SPA 体验）

### 写文章

在 `posts/` 下新建 `YYYY-MM-DD-标题.md`：

```markdown
这是正文第一段。

## 二级标题

- 列表项
- 列表项

> 引用

**加粗** *斜体* `代码`
```

### 构建

```bash
node scripts/build.js
```

或 `Ctrl+Shift+B`。

### 预览

VSCode 右键 `index.html` → "Open with Live Server"。

## 删除文章

删掉 `posts/` 下对应的 `.md` 文件，运行构建，对应的 `.html` 会被自动清理。

## Markdown 语法支持

| 语法 | 效果 |
|------|------|
| `# 标题` `## 二级` `### 三级` | h1 / h2 / h3 |
| `**加粗**` `*斜体*` | 加粗 / 斜体 |
| `` `代码` `` | 行内代码 |
| `[文字](url)` | 链接 |
| `![alt](url)` | 图片 |
| `- 项目` `* 项目` | 无序列表 |
| `1. 项目` | 有序列表 |
| `> 引用` | 引用块 |
| ` ``` ` 代码块 ` ``` ` | 代码块 |
| `---` `***` | 水平分割线 |

## 运行方式对比

| 方式 | 体验 | 文章列表 | 文章加载 |
|------|------|---------|---------|
| Live Server | SPA 无刷新 | fetch index.json | fetch 异步 |
| 静态部署 | SPA 无刷新 | fetch index.json | fetch 异步 |
| 双击打开 | 页面跳转 | 嵌入数据 | 跳转文章页 |

## 扩展预留

以下接口已编写完成，当前隐藏。去掉 `display:none` 并取消 JS 注释即可启用：

| 功能 | HTML 位置 | JS 位置 | 后端 API |
|------|----------|---------|---------|
| 评论 | `#comment-section` | `script.js` L310-360 | `GET/POST /api/comments` |
| 登录/注册 | `#login-modal` | `script.js` L362-415 | `POST /api/login`, `/api/register` |
| 关注/订阅 | `#follow-section` | `script.js` L417-450 | `POST /api/follow`, `GET /api/followers` |
