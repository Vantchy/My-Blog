/**
 * 极简博客 - 完整构建脚本 (Node.js)
 * ==========================================
 * 需要 Node.js。如果没有安装，用 build.ps1（PowerShell）。
 *
 * 用法：node build.js
 * 功能：
 *   1. 扫描 posts/ 下所有 .md 文件
 *   2. 将 .md 转换为完整 .html 文章页面
 *   3. 自动生成 posts/index.json
 *
 * 以后只需：写 .md → node build.js → 刷新浏览器
 */

"use strict";

var fs   = require("fs");
var path = require("path");

var ROOT_DIR  = path.join(__dirname, "..");
var POSTS_DIR = path.join(ROOT_DIR, "posts");
var CSS_PATH   = "../assets/css/style.css";
var BLOG_NAME  = "极简博客";
var COPYRIGHT  = "© 2026 极简博客 · 用最简单的方式记录思考";

// ============================================================
// Markdown → HTML（与 script.js 中的客户端解析器逻辑一致）
// ============================================================
function md2html(md) {
  var lines = md.split(/\r?\n/);
  var html  = [];
  var i = 0;

  while (i < lines.length) {
    var line = lines[i];
    var trim = line.trim();

    if (trim === "") { i++; continue; }

    // 代码块 ```
    if (trim.startsWith("```")) {
      var code = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        code.push(esc(lines[i]));
        i++;
      }
      i++;
      html.push("<pre><code>" + code.join("\n") + "</code></pre>");
      continue;
    }

    // 水平线
    if (/^-{3,}$/.test(trim) || /^\*{3,}$/.test(trim)) {
      html.push("<hr>"); i++; continue;
    }

    // 标题
    var hm = line.match(/^(#{1,3})\s+(.+)$/);
    if (hm) {
      html.push("<h" + hm[1].length + ">" + inline(hm[2]) + "</h" + hm[1].length + ">");
      i++; continue;
    }

    // 无序列表
    if (/^[\-\*]\s+/.test(line)) {
      html.push("<ul>");
      while (i < lines.length && /^[\-\*]\s+/.test(lines[i])) {
        html.push("<li>" + inline(lines[i].replace(/^[\-\*]\s+/, "")) + "</li>");
        i++;
      }
      html.push("</ul>");
      continue;
    }

    // 有序列表
    if (/^\d+\.\s+/.test(line)) {
      html.push("<ol>");
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        html.push("<li>" + inline(lines[i].replace(/^\d+\.\s+/, "")) + "</li>");
        i++;
      }
      html.push("</ol>");
      continue;
    }

    // 引用块
    if (line.startsWith(">")) {
      var qs = [];
      while (i < lines.length && lines[i].startsWith(">")) {
        qs.push(inline(lines[i].replace(/^>\s?/, "")));
        i++;
      }
      html.push("<blockquote><p>" + qs.join("<br>") + "</p></blockquote>");
      continue;
    }

    // 段落
    var ps = [];
    while (i < lines.length && lines[i].trim() !== "" &&
           !lines[i].trim().startsWith("```") &&
           !/^#{1,3}\s+/.test(lines[i]) &&
           !/^[\-\*]\s+/.test(lines[i]) &&
           !/^\d+\.\s+/.test(lines[i]) &&
           !lines[i].startsWith(">") &&
           !/^-{3,}$/.test(lines[i].trim())) {
      ps.push(lines[i]);
      i++;
    }
    if (ps.length > 0) {
      html.push("<p>" + inline(ps.join("\n")) + "</p>");
    }
  }

  return html.join("\n");
}

function inline(text) {
  text = esc(text);
  text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">');
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  text = text.replace(/`([^`]+)`/g, "<code>$1</code>");
  text = text.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  text = text.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  return text;
}

function esc(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ============================================================
// 文件名解析
// ============================================================
function parseName(filename) {
  var n = filename.replace(/\.(md|html)$/i, "");
  var m = n.match(/^(\d{4}-\d{2}-\d{2})-(.+)$/);
  if (m) return { date: m[1], title: m[2] };
  return { date: "", title: n };
}

function fmtCN(d) {
  if (!d) return "";
  var p = d.split("-");
  return p[0] + " 年 " + parseInt(p[1], 10) + " 月 " + parseInt(p[2], 10) + " 日";
}

// ============================================================
// HTML 页面模板
// ============================================================
function page(title, date, body) {
  return [
    "<!DOCTYPE html>",
    '<html lang="zh-CN">',
    "<head>",
    '  <meta charset="UTF-8">',
    '  <meta name="viewport" content="width=device-width, initial-scale=1.0">',
    "  <title>" + esc(title) + " - " + BLOG_NAME + "</title>",
    '  <link rel="stylesheet" href="' + CSS_PATH + '">',
    "</head>",
    "<body>",
    '  <header class="site-header">',
    '    <div class="container">',
    '      <a href="../index.html" class="site-title">' + BLOG_NAME + "</a>",
    '      <nav class="site-nav">',
    '        <a href="../index.html">首页</a>',
    '        <a href="#">归档</a>',
    '        <a href="#">关于我</a>',
    "      </nav>",
    "    </div>",
    "  </header>",
    '  <main class="container">',
    '    <article class="article">',
    "      <h1>" + esc(title) + "</h1>",
    '      <div class="article-meta">' + fmtCN(date) + "</div>",
    "      " + body,
    "    </article>",
    "  </main>",
    '  <footer class="site-footer">',
    '    <div class="container">',
    "      <p>" + COPYRIGHT + "</p>",
    "    </div>",
    "  </footer>",
    "</body>",
    "</html>",
  ].join("\n");
}

// ============================================================
// 主流程
// ============================================================
console.log("========================================");
console.log("  Blog Build (Node.js)");
console.log("========================================");
console.log("");

// 确保 posts/ 存在
if (!fs.existsSync(POSTS_DIR)) {
  fs.mkdirSync(POSTS_DIR, { recursive: true });
}

// --- 步骤 1：扫描 .md，转为 .html ---
var allFiles = fs.readdirSync(POSTS_DIR);
var mdFiles = allFiles.filter(function (f) {
  return /^\d{4}-\d{2}-\d{2}-.+\.md$/i.test(f);
});

if (mdFiles.length === 0) {
  console.log("(no .md files found)");
} else {
  var converted = 0;
  mdFiles.forEach(function (f) {
    var info     = parseName(f);
    var htmlName = f.replace(/\.md$/i, ".html");
    var htmlPath = path.join(POSTS_DIR, htmlName);

    console.log("CONVERT: " + f + " -> " + htmlName);

    var mdContent = fs.readFileSync(path.join(POSTS_DIR, f), "utf-8");
    var bodyHTML  = md2html(mdContent);
    var fullPage  = page(info.title, info.date, bodyHTML);

    fs.writeFileSync(htmlPath, fullPage, "utf-8");
    console.log("  OK: " + info.title + " (" + info.date + ")");
    converted++;
  });
  console.log("");
  console.log("Converted " + converted + " article(s)");
  console.log("");
}

// --- 步骤 1.5：清理孤儿 .html（对应 .md 已被删除的）---
allFiles = fs.readdirSync(POSTS_DIR);
var currentMdFiles = allFiles.filter(function (f) {
  return /^\d{4}-\d{2}-\d{2}-.+\.md$/i.test(f);
});
var currentHtmlFiles = allFiles.filter(function (f) {
  return /^\d{4}-\d{2}-\d{2}-.+\.html$/i.test(f);
});

var cleaned = 0;
currentHtmlFiles.forEach(function (htmlFile) {
  var mdFile = htmlFile.replace(/\.html$/i, ".md");
  if (currentMdFiles.indexOf(mdFile) === -1) {
    // .md 不存在 → 删除孤儿 .html
    fs.unlinkSync(path.join(POSTS_DIR, htmlFile));
    console.log("CLEAN: removed orphan -> " + htmlFile);
    cleaned++;
  }
});
if (cleaned > 0) {
  console.log("Cleaned " + cleaned + " orphan(s)");
  console.log("");
}

// --- 步骤 2：扫描 .html，生成 index.json ---
allFiles = fs.readdirSync(POSTS_DIR);
var htmlFiles = allFiles.filter(function (f) {
  return /^\d{4}-\d{2}-\d{2}-.+\.html$/i.test(f);
});

var articles = htmlFiles.map(function (f) {
  var info = parseName(f);
  return { file: f, title: info.title, date: info.date };
});

// 按日期倒序
articles.sort(function (a, b) {
  if (a.date > b.date) return -1;
  if (a.date < b.date) return 1;
  return 0;
});

var indexPath = path.join(POSTS_DIR, "index.json");
fs.writeFileSync(indexPath, JSON.stringify(articles, null, 2), "utf-8");

console.log("INDEX: posts/index.json (" + articles.length + " articles)");
articles.forEach(function (a) {
  console.log("  " + a.date + "  " + a.title);
});

// --- 步骤 3：将文章列表 + 版本号注入 index.html ---
var htmlPath = path.join(ROOT_DIR, "index.html");
var htmlContent = fs.readFileSync(htmlPath, "utf-8");
var postData = JSON.stringify(articles);
var version  = Date.now().toString(36);
// 用正则替换 <script id="post-data"> 标签内的旧数据，保证每次构建都更新
htmlContent = htmlContent.replace(
  /(<script\s+id="post-data"\s+type="application\/json">)[\s\S]*?(<\/script>)/,
  "$1" + postData + "$2"
);
// 更新 CSS/JS 版本号 + 构建时间
htmlContent = htmlContent.replace(/__VERSION__/g, version);
htmlContent = htmlContent.replace(/(\.css|\.js)\?v=[a-z0-9]+/g, "$1?v=" + version);
fs.writeFileSync(htmlPath, htmlContent, "utf-8");
console.log("");
console.log("HTML: data=" + articles.length + " posts, v=" + version);

console.log("");
console.log("========================================");
console.log("  DONE! Refresh browser.");
console.log("========================================");
