/**
 * 极简个人博客 - 核心逻辑
 * ==========================================
 * 视图：首页 / 文章详情 / 归档 / 关于我
 * 特性：客户端 MD 渲染、多视图切换、预留扩展接口
 */

// ============================================================
// 一、环境检测
// ============================================================
var isFileProtocol = window.location.protocol === "file:";

// ============================================================
// 二、文章数据（零硬编码：全部来自 posts/ 目录下的真实文件）
// ============================================================
var allPosts = [];
var currentView = "home";

// 读取 build.js 注入的数据（file:// 专用，或 fetch 失败时的 fallback）
function readEmbeddedData() {
  var el = document.getElementById("post-data");
  if (!el) return null;
  var raw = el.textContent.trim();
  if (raw === "" || raw === "__POSTS__") return null;
  try { return JSON.parse(raw); } catch (e) { return null; }
}

function loadPostData() {
  // http:// 协议：始终 fetch 最新 index.json（带缓存破坏）
  if (!isFileProtocol) {
    return fetch("posts/index.json?v=" + Date.now())
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (data) {
        console.log("[blog] Live: " + data.length + " articles from index.json");
        return data;
      })
      .catch(function () {
        // fetch 失败（index.json 不存在等），fallback 到嵌入数据
        var emb = readEmbeddedData();
        if (emb) {
          console.log("[blog] Fallback: " + emb.length + " articles (embedded)");
          return emb;
        }
        console.warn("[blog] No data source available");
        return [];
      });
  }

  // file:// 协议：只能用构建时注入的嵌入数据
  var emb = readEmbeddedData();
  if (emb) {
    console.log("[blog] File: " + emb.length + " articles (embedded, build: " +
      (document.querySelector(".site-footer p") || {}).textContent || "" + ")");
    return Promise.resolve(emb);
  }
  console.warn("[blog] No data. Run: node scripts/build.js");
  return Promise.resolve([]);
}

// ============================================================
// 四、DOM 引用
// ============================================================
var $postList      = document.getElementById("post-list");
var $articleTitle  = document.getElementById("article-title");
var $articleDate   = document.getElementById("article-date");
var $articleBody   = document.getElementById("article-body");
var $archiveContent = document.getElementById("archive-content");

// 视图容器
var views = {
  home:   document.getElementById("view-home"),
  detail: document.getElementById("view-detail"),
  archive: document.getElementById("view-archive"),
  about:  document.getElementById("view-about"),
};

// 导航链接
var navLinks = document.querySelectorAll(".site-nav a[data-view]");

// ============================================================
// 五、工具函数
// ============================================================
function parseFilename(filename) {
  var nameWithoutExt = filename.replace(/\.(html|md)$/i, "");
  var match = nameWithoutExt.match(/^(\d{4}-\d{2}-\d{2})-(.+)$/);
  if (match) return { date: match[1], title: match[2] };
  return { date: "", title: nameWithoutExt };
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  var parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  return parts[0] + " 年 " + parseInt(parts[1], 10) + " 月 " + parseInt(parts[2], 10) + " 日";
}

function sortByDateDesc(posts) {
  return posts.sort(function (a, b) {
    if (a.date > b.date) return -1;
    if (a.date < b.date) return 1;
    return 0;
  });
}

function isMarkdownFile(filename) {
  return /\.md$/i.test(filename);
}

// ============================================================
// 六、视图切换
// ============================================================
function switchView(viewName) {
  // 隐藏所有视图
  Object.keys(views).forEach(function (key) {
    if (views[key]) views[key].style.display = "none";
  });

  // 显示目标视图
  if (views[viewName]) views[viewName].style.display = "block";

  // 更新导航高亮
  navLinks.forEach(function (link) {
    var target = link.getAttribute("data-view");
    if (target === viewName) {
      link.classList.add("active");
    } else {
      link.classList.remove("active");
    }
  });

  currentView = viewName;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ============================================================
// 七、渲染首页文章列表
// ============================================================
function renderPostList(posts) {
  $postList.innerHTML = "";

  if (!posts || posts.length === 0) {
    $postList.innerHTML = '<li class="post-list-empty">暂无文章，快去写一篇吧 ✍️</li>';
    return;
  }

  sortByDateDesc(posts).forEach(function (post) {
    var li = document.createElement("li");
    li.className = "post-item";

    var titleSpan = document.createElement("span");
    titleSpan.className = "post-title";
    titleSpan.textContent = post.title;

    var dotsSpan = document.createElement("span");
    dotsSpan.className = "post-dots";

    var dateSpan = document.createElement("span");
    dateSpan.className = "post-date";
    dateSpan.textContent = formatDate(post.date);

    li.appendChild(titleSpan);
    li.appendChild(dotsSpan);
    li.appendChild(dateSpan);

    li.addEventListener("click", function () {
      loadArticle(post.file, post.title, post.date);
    });

    $postList.appendChild(li);
  });
}

// ============================================================
// 八、渲染归档页
// ============================================================
function renderArchive(posts) {
  $archiveContent.innerHTML = "";

  if (!posts || posts.length === 0) {
    $archiveContent.innerHTML = '<p class="archive-empty">暂无归档</p>';
    return;
  }

  var sorted = sortByDateDesc(posts.slice());

  // 按年份分组
  var byYear = {};
  sorted.forEach(function (post) {
    var year = post.date ? post.date.substring(0, 4) : "未知";
    if (!byYear[year]) byYear[year] = [];
    byYear[year].push(post);
  });

  // 渲染
  Object.keys(byYear).sort(function (a, b) { return b - a; }).forEach(function (year) {
    var yearDiv = document.createElement("div");
    yearDiv.className = "archive-year";
    yearDiv.textContent = year + " 年";
    $archiveContent.appendChild(yearDiv);

    byYear[year].forEach(function (post) {
      var item = document.createElement("div");
      item.className = "archive-item";

      var dateSpan = document.createElement("span");
      dateSpan.className = "archive-item-date";
      dateSpan.textContent = post.date ? post.date.substring(5) : ""; // MM-DD

      var titleSpan = document.createElement("span");
      titleSpan.className = "archive-item-title";
      titleSpan.textContent = post.title;

      item.appendChild(dateSpan);
      item.appendChild(titleSpan);

      item.addEventListener("click", function () {
        loadArticle(post.file, post.title, post.date);
      });

      $archiveContent.appendChild(item);
    });
  });
}

// ============================================================
// 九、加载文章（支持 .md 和 .html）
// ============================================================
function loadArticle(filename, title, date) {
  var url = "posts/" + filename;

  // file:// 协议：直接跳转到 HTML 页面
  if (isFileProtocol) {
    var redirectUrl = url;
    if (isMarkdownFile(filename)) {
      redirectUrl = url.replace(/\.md$/i, ".html");
    }
    window.location.href = redirectUrl;
    return;
  }

  // http:// 协议：fetch 加载
  switchView("detail");

  fetch(url)
    .then(function (res) {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.text();
    })
    .then(function (content) {
      var bodyHTML;
      if (isMarkdownFile(filename)) {
        bodyHTML = parseMarkdown(content);
      } else {
        bodyHTML = extractArticleBody(content);
      }
      showArticle(title, date, bodyHTML);
    })
    .catch(function (err) {
      console.warn("加载失败：" + err.message);
      window.location.href = url;
    });
}

function extractArticleBody(html) {
  var m;
  m = html.match(/<article[^>]*class="article"[^>]*>([\s\S]*?)<\/article>/i);
  if (m) return m[1].trim();
  m = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  if (m) return m[1].trim();
  m = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  if (m) return m[1].trim();
  return html.trim();
}

function showArticle(title, date, bodyHTML) {
  $articleTitle.textContent = title;
  $articleDate.textContent = formatDate(date);
  $articleBody.innerHTML = bodyHTML;

  // 更新返回链接目标
  var backLink = document.querySelector('[data-back]');
  if (backLink) {
    backLink.setAttribute("data-back", currentView === "archive" ? "archive" : "home");
  }
}

// ============================================================
// 十、Markdown 解析器（客户端、零依赖）
// ============================================================
function parseMarkdown(md) {
  var lines = md.split(/\r?\n/);
  var html = [];
  var i = 0;

  while (i < lines.length) {
    var line = lines[i];

    if (line.trim() === "") { i++; continue; }

    // 代码块 ```
    if (line.trim().startsWith("```")) {
      var codeLines = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(escapeHTML(lines[i]));
        i++;
      }
      i++;
      html.push("<pre><code>" + codeLines.join("\n") + "</code></pre>");
      continue;
    }

    // 水平线
    if (/^-{3,}$/.test(line.trim()) || /^\*{3,}$/.test(line.trim())) {
      html.push("<hr>");
      i++; continue;
    }

    // 标题
    var hm = line.match(/^(#{1,3})\s+(.+)$/);
    if (hm) {
      html.push("<h" + hm[1].length + ">" + parseInline(hm[2]) + "</h" + hm[1].length + ">");
      i++; continue;
    }

    // 无序列表
    if (/^[\-\*]\s+/.test(line)) {
      html.push("<ul>");
      while (i < lines.length && /^[\-\*]\s+/.test(lines[i])) {
        html.push("<li>" + parseInline(lines[i].replace(/^[\-\*]\s+/, "")) + "</li>");
        i++;
      }
      html.push("</ul>");
      continue;
    }

    // 有序列表
    if (/^\d+\.\s+/.test(line)) {
      html.push("<ol>");
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        html.push("<li>" + parseInline(lines[i].replace(/^\d+\.\s+/, "")) + "</li>");
        i++;
      }
      html.push("</ol>");
      continue;
    }

    // 引用块
    if (line.startsWith(">")) {
      var qLines = [];
      while (i < lines.length && lines[i].startsWith(">")) {
        qLines.push(parseInline(lines[i].replace(/^>\s?/, "")));
        i++;
      }
      html.push("<blockquote><p>" + qLines.join("<br>") + "</p></blockquote>");
      continue;
    }

    // 段落
    var paraLines = [];
    while (i < lines.length && lines[i].trim() !== "" &&
           !lines[i].trim().startsWith("```") &&
           !/^#{1,3}\s+/.test(lines[i]) &&
           !/^[\-\*]\s+/.test(lines[i]) &&
           !/^\d+\.\s+/.test(lines[i]) &&
           !lines[i].startsWith(">") &&
           !/^-{3,}$/.test(lines[i].trim())) {
      paraLines.push(lines[i]);
      i++;
    }
    if (paraLines.length > 0) {
      html.push("<p>" + parseInline(paraLines.join("\n")) + "</p>");
    }
  }

  return html.join("\n");
}

function parseInline(text) {
  text = escapeHTML(text);
  text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">');
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  text = text.replace(/`([^`]+)`/g, "<code>$1</code>");
  text = text.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  text = text.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  return text;
}

function escapeHTML(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ============================================================
// 十一、导航事件绑定
// ============================================================
navLinks.forEach(function (link) {
  link.addEventListener("click", function (e) {
    e.preventDefault();
    var viewName = link.getAttribute("data-view");

    if (viewName === "home") {
      switchView("home");
      renderPostList(allPosts);
    } else if (viewName === "archive") {
      switchView("archive");
      renderArchive(allPosts);
    } else if (viewName === "about") {
      switchView("about");
    }
  });
});

// 站点标题点击回首页
var siteTitle = document.getElementById("site-title");
if (siteTitle) {
  siteTitle.addEventListener("click", function (e) {
    e.preventDefault();
    switchView("home");
    renderPostList(allPosts);
  });
}

// 返回链接（动态处理）
document.addEventListener("click", function (e) {
  if (e.target.hasAttribute("data-back")) {
    e.preventDefault();
    var backTo = e.target.getAttribute("data-back");
    if (backTo === "archive") {
      switchView("archive");
      renderArchive(allPosts);
    } else {
      switchView("home");
      renderPostList(allPosts);
    }
  }
});

// ============================================================
// 十二、数据加载
// ============================================================
function detectPosts() {
  loadPostData().then(function (data) {
    allPosts = data.map(function (item) {
      return { file: item.file, title: item.title, date: item.date };
    });
    initApp(allPosts);
  });
}

function initApp(posts) {
  renderPostList(posts);
}

// ============================================================
// 十三、启动
// ============================================================
document.addEventListener("DOMContentLoaded", function () {
  if (isFileProtocol) {
    var hintEl = document.getElementById("protocol-hint");
    if (hintEl) hintEl.style.display = "block";
  }
  detectPosts();
});

// ============================================================
// 十四、【预留接口】评论系统
// ============================================================
// 后端 API（规划）：
//   GET  /api/comments?post={slug}     → 获取评论列表
//   POST /api/comments                 → 发表评论 {post, name, body}
//
// 启用步骤：
//   1. 去掉 index.html 中 #comment-section 的 style="display:none"
//   2. 取消下方函数注释
//   3. 实现后端 API

/*
function loadComments(postSlug) {
  fetch("/api/comments?post=" + encodeURIComponent(postSlug))
    .then(function (res) { return res.json(); })
    .then(function (comments) { renderComments(comments); })
    .catch(function () { console.log("[comments] API not available"); });
}

function renderComments(comments) {
  var container = document.getElementById("comment-list");
  if (!container) return;
  container.innerHTML = "";
  comments.forEach(function (c) {
    var div = document.createElement("div");
    div.className = "comment-item";
    div.innerHTML = "<strong>" + escapeHTML(c.name) + "</strong><p>" + escapeHTML(c.body) + "</p>";
    container.appendChild(div);
  });
}

function submitComment(postSlug, name, body) {
  fetch("/api/comments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ post: postSlug, name: name, body: body }),
  })
    .then(function (res) { return res.json(); })
    .then(function () { loadComments(postSlug); });
}

// 绑定评论表单
var commentForm = document.getElementById("comment-form");
if (commentForm) {
  commentForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var name = document.getElementById("comment-name").value.trim();
    var body = document.getElementById("comment-body").value.trim();
    if (name && body) {
      submitComment(currentArticleSlug, name, body);
    }
  });
}
*/

// ============================================================
// 十五、【预留接口】登录 / 注册
// ============================================================
// 后端 API（规划）：
//   POST /api/login      → { username, password } → { token, user }
//   POST /api/register   → { username, password } → { token, user }
//   GET  /api/user       → { user }  (需 token)
//
// 启用步骤：
//   1. 去掉 index.html 中 #login-modal 的 style="display:none"
//   2. 取消下方函数注释
//   3. 在导航栏添加"登录"按钮，点击调用 showLogin()

/*
function showLogin() {
  document.getElementById("login-modal").style.display = "block";
}

function hideLogin() {
  document.getElementById("login-modal").style.display = "none";
}

var currentUser = null;

function login(username, password) {
  fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: username, password: password }),
  })
    .then(function (res) { return res.json(); })
    .then(function (data) {
      if (data.token) {
        localStorage.setItem("blog_token", data.token);
        currentUser = data.user;
        hideLogin();
        updateUIForUser();
      }
    });
}

function logout() {
  localStorage.removeItem("blog_token");
  currentUser = null;
  updateUIForUser();
}

function updateUIForUser() {
  // 登录后显示用户头像、昵称等
  // var userArea = document.getElementById("user-area");
  // if (userArea) userArea.textContent = currentUser ? currentUser.name : "登录";
}

// 页面加载时检查已保存的登录状态
var savedToken = localStorage.getItem("blog_token");
if (savedToken) {
  fetch("/api/user", {
    headers: { "Authorization": "Bearer " + savedToken },
  })
    .then(function (res) { return res.json(); })
    .then(function (data) {
      currentUser = data.user;
      updateUIForUser();
    })
    .catch(function () {
      localStorage.removeItem("blog_token");
    });
}
*/

// ============================================================
// 十六、【预留接口】关注 / 订阅
// ============================================================
// 后端 API（规划）：
//   POST /api/follow     → { userId }  (需登录)
//   GET  /api/followers  → { count, followers[] }
//
// 启用步骤：
//   1. 去掉 index.html 中 #follow-section 的 style="display:none"
//   2. 取消下方函数注释

/*
function toggleFollow() {
  var btn = document.getElementById("follow-btn");
  if (!currentUser) {
    showLogin();
    return;
  }
  fetch("/api/follow", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + localStorage.getItem("blog_token"),
    },
  })
    .then(function (res) { return res.json(); })
    .then(function (data) {
      btn.textContent = data.following ? "✓ 已关注" : "+ 关注";
      btn.classList.toggle("following", data.following);
      if (data.followerCount !== undefined) {
        var countEl = document.getElementById("follower-count");
        if (countEl) countEl.textContent = data.followerCount + " 人关注";
      }
    });
}

var followBtn = document.getElementById("follow-btn");
if (followBtn) {
  followBtn.addEventListener("click", toggleFollow);
}
*/
