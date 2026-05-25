/* PawPaw uses one shared vanilla JavaScript file for every page.
   Data lives in LocalStorage so the site can run directly from the browser. */
const DB_KEY = "pawpaw-db-v1";
const SESSION_KEY = "pawpaw-current-user";
const THEME_KEY = "pawpaw-theme";
const TAGS = ["全部", "狗狗", "貓咪", "兔子", "鳥類", "其他"];
const CAPTCHA_LABELS = {
  cat: "貓咪",
  dog: "狗狗",
  rabbit: "兔子",
  bird: "鳥類",
  bone: "骨頭",
  fish: "魚魚"
};
const CAPTCHA_POOL = [
  { id: "cat-1", type: "cat", icon: "🐱", bg: "#ffd6e2" },
  { id: "cat-2", type: "cat", icon: "😺", bg: "#ffc1d6" },
  { id: "dog-1", type: "dog", icon: "🐶", bg: "#ffe0b8" },
  { id: "dog-2", type: "dog", icon: "🐕", bg: "#ffd3a3" },
  { id: "rabbit-1", type: "rabbit", icon: "🐰", bg: "#f4dfc8" },
  { id: "rabbit-2", type: "rabbit", icon: "🐇", bg: "#ead4bd" },
  { id: "bird-1", type: "bird", icon: "🐦", bg: "#cce7ff" },
  { id: "bird-2", type: "bird", icon: "🕊️", bg: "#d8f1ff" },
  { id: "bone-1", type: "bone", icon: "🦴", bg: "#fff1c7" },
  { id: "fish-1", type: "fish", icon: "🐟", bg: "#c8f2ef" }
];

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const page = document.body.dataset.page;

let activeTag = "全部";
let compressedPostImage = "";
let loginCaptcha = null;

document.addEventListener("DOMContentLoaded", () => {
  seedDatabase();
  applyTheme();
  renderNavbar();
  bindGlobalClicks();
  routePage();
  setTimeout(() => $("#loading")?.classList.add("hide"), 420);
});

function readDB() {
  return JSON.parse(localStorage.getItem(DB_KEY) || '{"users":[],"posts":[],"notifications":[],"follows":[]}');
}

function writeDB(db) {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

function currentUserId() {
  return localStorage.getItem(SESSION_KEY);
}

function currentUser() {
  const db = readDB();
  return db.users.find(user => user.id === currentUserId()) || null;
}

function uid(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function nowText(timestamp = Date.now()) {
  const diff = Math.max(0, Date.now() - timestamp);
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < minute) return "剛剛";
  if (diff < hour) return `${Math.floor(diff / minute)} 分鐘前`;
  if (diff < day) return `${Math.floor(diff / hour)} 小時前`;
  return new Date(timestamp).toLocaleDateString("zh-TW", { month: "short", day: "numeric" });
}

function fullDate(timestamp) {
  return new Date(timestamp).toLocaleDateString("zh-TW", { year: "numeric", month: "long", day: "numeric" });
}

function escapeHTML(text = "") {
  return text.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
}

function avatarFallback(id) {
  const color = encodeURIComponent(id.length % 2 ? "#ff8fb1" : "#ff9f45");
  const label = encodeURIComponent(id.slice(0, 2).toUpperCase());
  return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Crect width='180' height='180' rx='60' fill='${color}'/%3E%3Ctext x='90' y='106' text-anchor='middle' font-size='52' font-family='Arial' fill='white' font-weight='800'%3E${label}%3C/text%3E%3C/svg%3E`;
}

function seedDatabase() {
  if (localStorage.getItem(DB_KEY)) return;
  const joined = Date.now() - 1000 * 60 * 60 * 24 * 26;
  const users = [
    { id: "momo_cat", name: "Momo 媽", password: "1234", bio: "橘貓 Momo 的日常紀錄，專長是把人類的枕頭變成貓床。", avatar: "", joinedAt: joined },
    { id: "bobo_dog", name: "波波爸", password: "1234", bio: "柴犬波波每天都在練習用眼神得到零食。", avatar: "", joinedAt: joined + 86400000 * 3 },
    { id: "lala_bunny", name: "拉拉姊姊", password: "1234", bio: "兔兔拉拉的療癒星球，喜歡分享牧草與居家布置。", avatar: "", joinedAt: joined + 86400000 * 6 }
  ];
  const posts = [
    makeSeedPost("momo_cat", "貓咪", "Momo 的午後曬太陽儀式", "今天把窗邊小毯子洗好，Momo 立刻用最滿意的呼嚕聲驗收。", 21, 4),
    makeSeedPost("bobo_dog", "狗狗", "散步回家一定要檢查腳腳", "下雨後的公園香味太多，波波每一步都像偵探。回家擦腳也變成我們的小遊戲。", 35, 8),
    makeSeedPost("lala_bunny", "兔子", "新草架大成功", "換了比較低的草架，拉拉終於不用歪頭吃草，進食速度直接升級。", 15, 3)
  ];
  writeDB({ users, posts, notifications: [], follows: [] });
}

function makeSeedPost(authorId, tag, title, content, likes, comments) {
  const likedBy = Array.from({ length: likes }, (_, index) => `guest_like_${index}`);
  return {
    id: uid("post"),
    authorId,
    tag,
    title,
    content,
    image: "",
    createdAt: Date.now() - Math.floor(Math.random() * 1000 * 60 * 60 * 80),
    likedBy,
    savedBy: [],
    comments: Array.from({ length: comments }, (_, index) => ({
      id: uid("comment"),
      authorId: index % 2 ? "momo_cat" : "bobo_dog",
      content: ["太可愛了！", "這個表情我懂", "想看更多照片", "被療癒到滿血復活"][index % 4],
      createdAt: Date.now() - Math.floor(Math.random() * 1000 * 60 * 60 * 30)
    }))
  };
}

function renderNavbar() {
  const user = currentUser();
  const db = readDB();
  const unread = user ? db.notifications.filter(n => n.to === user.id && !n.read).length : 0;
  $("#navbar").innerHTML = `
    <a class="brand" href="index.html"><span class="brand-mark">🐾</span><span>PawPaw</span></a>
    <nav class="nav-links">
      <a href="index.html">分享區</a>
      <a href="index.html?view=hot">熱門貼文</a>
      ${user ? `<a href="home.html">個人首頁</a><button class="icon-btn" id="notifyBtn" title="通知">🔔${unread ? `<span class="badge">${unread}</span>` : ""}</button><button class="icon-btn" id="themeBtn" title="深色模式">🌙</button><button class="soft-btn" id="logoutBtn">登出</button>` : `<a href="login.html">登入</a><a href="register.html">註冊</a><button class="icon-btn" id="themeBtn" title="深色模式">🌙</button>`}
    </nav>`;
  $("#logoutBtn")?.addEventListener("click", logout);
  $("#themeBtn")?.addEventListener("click", toggleTheme);
  $("#notifyBtn")?.addEventListener("click", openNotifications);
  $$(".auth-only").forEach(el => { if (!user) el.style.display = "none"; });
}

function bindGlobalClicks() {
  document.addEventListener("click", event => {
    const link = event.target.closest("[data-link]");
    if (link) location.href = link.dataset.link;
  });
}

function routePage() {
  if (page === "feed") initFeed();
  if (page === "login") initLogin();
  if (page === "register") initRegister();
  if (page === "home") initHome();
  if (page === "profile") initProfile();
  if (page === "create") initCreatePost();
}

function initFeed() {
  renderTags();
  const params = new URLSearchParams(location.search);
  renderPosts(params.get("view") === "hot" ? "hot" : "feed");
  $("#searchInput")?.addEventListener("input", () => renderPosts(params.get("view") === "hot" ? "hot" : "feed"));
}

function renderTags() {
  const host = $("#tagFilters");
  if (!host) return;
  host.innerHTML = TAGS.map(tag => `<button class="tag-pill ${tag === activeTag ? "active" : ""}" data-tag="${tag}">${tag}</button>`).join("");
  host.addEventListener("click", event => {
    const btn = event.target.closest("[data-tag]");
    if (!btn) return;
    activeTag = btn.dataset.tag;
    renderTags();
    renderPosts(new URLSearchParams(location.search).get("view") === "hot" ? "hot" : "feed");
  }, { once: true });
}

function renderPosts(mode = "feed", listId = "postList", postsOverride = null) {
  const host = $(`#${listId}`);
  if (!host) return;
  host.innerHTML = `<div class="skeleton"></div><div class="skeleton"></div>`;
  setTimeout(() => {
    const db = readDB();
    const query = ($("#searchInput")?.value || "").trim().toLowerCase();
    let posts = postsOverride || [...db.posts];
    if (activeTag !== "全部") posts = posts.filter(post => post.tag === activeTag);
    if (query) {
      posts = posts.filter(post => {
        const author = db.users.find(user => user.id === post.authorId);
        return [post.authorId, author?.name, post.title, post.content, post.tag].some(value => (value || "").toLowerCase().includes(query));
      });
    }
    posts.sort((a, b) => mode === "hot"
      ? ((b.likedBy.length * 2 + b.comments.length) - (a.likedBy.length * 2 + a.comments.length)) || b.createdAt - a.createdAt
      : b.createdAt - a.createdAt);
    host.innerHTML = posts.length ? posts.map((post, index) => postCard(post, mode === "hot" ? index + 1 : 0)).join("") : `<div class="empty glass">目前沒有符合的貼文，換個關鍵字試試。</div>`;
    bindPostEvents(host);
  }, 260);
}

function postCard(post, rank = 0) {
  const db = readDB();
  const author = db.users.find(user => user.id === post.authorId) || { id: "unknown", name: "神秘毛友", avatar: "" };
  const me = currentUserId();
  const isOwner = me === post.authorId;
  const liked = post.likedBy.includes(me);
  const saved = post.savedBy?.includes(me);
  return `
    <article class="post-card ${rank ? "hot" : ""}" data-post-id="${post.id}">
      <div class="post-head">
        ${rank ? `<span class="rank">🔥${rank}</span>` : ""}
        <img class="avatar clickable" data-profile="${author.id}" src="${author.avatar || avatarFallback(author.id)}" alt="${author.name}">
        <div><div class="user-id clickable" data-profile="${author.id}">@${author.id}</div><div class="meta">${escapeHTML(author.name)} · ${nowText(post.createdAt)}</div></div>
      </div>
      <div class="post-title-row"><h3>${escapeHTML(post.title)}</h3><span class="tag-pill">${escapeHTML(post.tag)}</span></div>
      <p class="post-content">${escapeHTML(post.content)}</p>
      ${post.image ? `<img class="post-image" src="${post.image}" alt="${escapeHTML(post.title)}">` : ""}
      <div class="post-actions">
        <button class="action-btn like-btn ${liked ? "liked" : ""}">♥ <span>${post.likedBy.length}</span></button>
        <button class="action-btn toggle-comments">💬 <span>${post.comments.length}</span></button>
        <button class="action-btn save-btn ${saved ? "liked" : ""}">🔖 <span>${saved ? "已收藏" : "收藏"}</span></button>
        <button class="action-btn share-btn">↗ 分享</button>
        ${isOwner ? `<span class="owner-tools"><button class="action-btn edit-post">編輯</button><button class="action-btn delete-post">刪除</button></span>` : ""}
      </div>
      <section class="comments">
        <div class="comment-list collapsed">${post.comments.map(comment => commentHTML(comment)).join("") || `<p class="meta">還沒有留言，登入後可以搶頭香。</p>`}</div>
        ${post.comments.length > 2 ? `<button class="action-btn expand-comments">展開 / 收合留言</button>` : ""}
        <form class="comment-form"><input placeholder="${me ? "留下暖暖一句話..." : "登入後即可留言"}"><button class="primary-btn" type="submit">送出</button></form>
      </section>
    </article>`;
}

function commentHTML(comment) {
  const db = readDB();
  const author = db.users.find(user => user.id === comment.authorId) || { id: "unknown", name: "毛友", avatar: "" };
  return `<div class="comment"><img class="avatar clickable" data-profile="${author.id}" src="${author.avatar || avatarFallback(author.id)}" alt="${author.name}"><div class="comment-bubble"><strong class="clickable" data-profile="${author.id}">@${author.id}</strong><p>${escapeHTML(comment.content)}</p><span class="meta">${nowText(comment.createdAt)}</span></div></div>`;
}

function bindPostEvents(root) {
  root.addEventListener("click", event => {
    const card = event.target.closest(".post-card");
    const profile = event.target.closest("[data-profile]");
    if (profile) location.href = `profile.html?id=${encodeURIComponent(profile.dataset.profile)}`;
    if (!card) return;
    const postId = card.dataset.postId;
    if (event.target.closest(".like-btn")) toggleLike(postId, event.target.closest(".like-btn"));
    if (event.target.closest(".save-btn")) toggleSave(postId);
    if (event.target.closest(".share-btn")) sharePost(postId);
    if (event.target.closest(".expand-comments")) $(".comment-list", card).classList.toggle("collapsed");
    if (event.target.closest(".delete-post")) deletePost(postId);
    if (event.target.closest(".edit-post")) editPost(postId);
  });
  root.addEventListener("submit", event => {
    if (!event.target.classList.contains("comment-form")) return;
    event.preventDefault();
    const postId = event.target.closest(".post-card").dataset.postId;
    addComment(postId, $("input", event.target).value);
  });
  root.addEventListener("focusin", event => {
    if (event.target.closest(".comment-form") && !currentUser()) requireLoginModal("是否已有平台帳號？請先登入或註冊！");
  });
}

function toggleLike(postId, button) {
  const me = currentUser();
  if (!me) return requireLoginModal("登入後就能和大家一起分享毛孩日常囉！");
  const db = readDB();
  const post = db.posts.find(item => item.id === postId);
  if (!post) return;
  const index = post.likedBy.indexOf(me.id);
  if (index >= 0) post.likedBy.splice(index, 1);
  else {
    post.likedBy.push(me.id);
    if (post.authorId !== me.id) addNotification(db, post.authorId, `${me.name} 按讚了你的貼文「${post.title}」`);
  }
  writeDB(db);
  button.classList.add("pop");
  toast(index >= 0 ? "已取消按讚" : "已送出一顆愛心");
  refreshCurrentView();
}

function addComment(postId, content) {
  const me = currentUser();
  if (!me) return requireLoginModal("是否已有平台帳號？請先登入或註冊！");
  if (!content.trim()) return toast("留言不能空白喔");
  const db = readDB();
  const post = db.posts.find(item => item.id === postId);
  post.comments.push({ id: uid("comment"), authorId: me.id, content: content.trim(), createdAt: Date.now() });
  if (post.authorId !== me.id) addNotification(db, post.authorId, `${me.name} 留言了你的貼文「${post.title}」`);
  writeDB(db);
  toast("留言已送出");
  refreshCurrentView();
}

function toggleSave(postId) {
  const me = currentUser();
  if (!me) return requireLoginModal("登入後就能收藏喜歡的毛孩日常囉！");
  const db = readDB();
  const post = db.posts.find(item => item.id === postId);
  post.savedBy ||= [];
  const index = post.savedBy.indexOf(me.id);
  if (index >= 0) post.savedBy.splice(index, 1);
  else post.savedBy.push(me.id);
  writeDB(db);
  toast(index >= 0 ? "已取消收藏" : "已加入收藏");
  refreshCurrentView();
}

function sharePost(postId) {
  const url = `${location.origin}${location.pathname.replace(/[^/]+$/, "")}index.html#${postId}`;
  navigator.clipboard?.writeText(url).then(() => toast("分享連結已複製")).catch(() => toast("可複製目前網址分享給朋友"));
}

function deletePost(postId) {
  confirmModal("確定要刪除這篇貼文嗎？", () => {
    const db = readDB();
    db.posts = db.posts.filter(post => post.id !== postId);
    writeDB(db);
    toast("貼文已刪除");
    refreshCurrentView();
  });
}

function editPost(postId) {
  const db = readDB();
  const post = db.posts.find(item => item.id === postId);
  openModal(`
    <h2>編輯貼文</h2>
    <form id="editPostForm" class="stack-form">
      <label>主題<input name="title" value="${escapeHTML(post.title)}" required></label>
      <label>內容<textarea name="content" rows="5" required>${escapeHTML(post.content)}</textarea></label>
      <label>Tag<select name="tag">${TAGS.filter(t => t !== "全部").map(t => `<option ${t === post.tag ? "selected" : ""}>${t}</option>`).join("")}</select></label>
      <div class="modal-actions"><button class="soft-btn" type="button" data-close-modal>取消</button><button class="primary-btn" type="submit">儲存</button></div>
    </form>`);
  $("#editPostForm").addEventListener("submit", event => {
    event.preventDefault();
    const form = new FormData(event.target);
    post.title = form.get("title").trim();
    post.content = form.get("content").trim();
    post.tag = form.get("tag");
    writeDB(db);
    closeModal();
    toast("貼文已更新");
    refreshCurrentView();
  });
}

function refreshCurrentView() {
  renderNavbar();
  if (page === "feed") renderPosts(new URLSearchParams(location.search).get("view") === "hot" ? "hot" : "feed");
  if (page === "home") initHome();
  if (page === "profile") initProfile();
}

function initLogin() {
  $("#loginForm").addEventListener("submit", event => {
    event.preventDefault();
    const form = new FormData(event.target);
    const db = readDB();
    const user = db.users.find(item => item.id === form.get("id").trim() && item.password === form.get("password"));
    if (!user) return openModal(`<h2>登入失敗</h2><p>使用者 ID 或密碼不正確，再確認一次吧。</p><div class="modal-actions"><button class="primary-btn" data-close-modal>知道了</button></div>`);
    openLoginCaptchaModal(user);
  });
}

function openLoginCaptchaModal(user) {
  openModal(`
    <h2>雙重驗證</h2>
    <p class="meta">完成圖片驗證後，就能進入 PawPaw。</p>
    <section id="captchaBox" class="captcha-panel" aria-live="polite"></section>
    <div class="modal-actions">
      <button class="soft-btn" type="button" data-close-modal>取消</button>
      <button class="primary-btn" type="button" id="verifyCaptchaBtn">完成驗證</button>
    </div>`);
  renderLoginCaptcha();
  $("#verifyCaptchaBtn").addEventListener("click", () => {
    if (!validateLoginCaptcha()) {
      toast("圖片驗證沒有選對，請再試一次");
      renderLoginCaptcha();
      return;
    }
    localStorage.setItem(SESSION_KEY, user.id);
    closeModal();
    toast("登入成功，歡迎回來！");
    setTimeout(() => location.href = "home.html", 650);
  });
}

function renderLoginCaptcha() {
  const box = $("#captchaBox");
  if (!box) return;
  const targets = ["cat", "dog", "rabbit", "bird"];
  const target = targets[Math.floor(Math.random() * targets.length)];
  const targetItems = shuffle(CAPTCHA_POOL.filter(item => item.type === target)).slice(0, 2);
  const otherItems = shuffle(CAPTCHA_POOL.filter(item => item.type !== target)).slice(0, 4);
  const items = shuffle([...targetItems, ...otherItems]).map(item => ({ ...item, selected: false }));
  loginCaptcha = { target, items };
  box.innerHTML = `
    <div class="captcha-title">
      <span>雙重驗證：請選取所有包含「${CAPTCHA_LABELS[target]}」的圖片</span>
      <small>${targetItems.length} 張</small>
    </div>
    <div class="captcha-grid">
      ${items.map(item => `
        <button class="captcha-tile" type="button" data-captcha-id="${item.id}" aria-label="${CAPTCHA_LABELS[item.type]} 圖片">
          <img src="${captchaImage(item)}" alt="${CAPTCHA_LABELS[item.type]}">
        </button>
      `).join("")}
    </div>
    <div class="captcha-footer">
      <span>按圖片可選取或取消，送出前需全部選對。</span>
      <button class="captcha-refresh" type="button" id="refreshCaptcha">換一題</button>
    </div>`;
  $$(".captcha-tile", box).forEach(tile => {
    tile.addEventListener("click", () => {
      tile.classList.toggle("selected");
      const item = loginCaptcha.items.find(candidate => candidate.id === tile.dataset.captchaId);
      item.selected = tile.classList.contains("selected");
    });
  });
  $("#refreshCaptcha")?.addEventListener("click", renderLoginCaptcha);
}

function validateLoginCaptcha() {
  if (!loginCaptcha) return false;
  return loginCaptcha.items.every(item => item.selected === (item.type === loginCaptcha.target));
}

function captchaImage(item) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="320" height="220" viewBox="0 0 320 220">
      <rect width="320" height="220" rx="34" fill="${item.bg}"/>
      <circle cx="76" cy="56" r="30" fill="rgba(255,255,255,.45)"/>
      <circle cx="258" cy="164" r="42" fill="rgba(255,255,255,.35)"/>
      <text x="160" y="140" text-anchor="middle" font-size="96" font-family="Segoe UI Emoji, Apple Color Emoji, Noto Color Emoji">${item.icon}</text>
    </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function shuffle(items) {
  return [...items].sort(() => Math.random() - .5);
}

function initRegister() {
  bindImagePreview("#avatarInput", "#avatarPreview");
  $("#registerForm").addEventListener("submit", async event => {
    event.preventDefault();
    const form = new FormData(event.target);
    const db = readDB();
    const id = form.get("id").trim();
    if (db.users.some(user => user.id === id)) return toast("這個 ID 已經被使用了");
    const file = $("#avatarInput").files[0];
    const avatar = file ? await compressImage(file, 420) : "";
    db.users.push({ id, name: form.get("name").trim(), password: form.get("password"), bio: form.get("bio").trim(), avatar, joinedAt: Date.now() });
    writeDB(db);
    toast("註冊成功，準備前往登入");
    setTimeout(() => location.href = "login.html", 850);
  });
}

function initHome() {
  const user = currentUser();
  if (!user) return location.href = "login.html";
  renderProfile("#profileSummary", user, true);
  const db = readDB();
  renderPosts("feed", "myPostList", db.posts.filter(post => post.authorId === user.id));
  $("#editProfileBtn")?.addEventListener("click", editProfile);
  $("#logoutBtnHome")?.addEventListener("click", logout);
}

function initProfile() {
  const id = new URLSearchParams(location.search).get("id") || currentUserId();
  const db = readDB();
  const user = db.users.find(item => item.id === id);
  if (!user) {
    $("#publicProfile").innerHTML = `<div class="empty">找不到這位使用者。</div>`;
    return;
  }
  renderProfile("#publicProfile", user, false);
  renderPosts("feed", "profilePostList", db.posts.filter(post => post.authorId === user.id));
  const followBtn = $("#followBtn");
  followBtn?.addEventListener("click", () => toggleFollow(user.id));
  updateFollowButton(user.id);
}

function renderProfile(selector, user, isSelf) {
  const db = readDB();
  const posts = db.posts.filter(post => post.authorId === user.id);
  const followers = db.follows.filter(item => item.to === user.id).length;
  $(selector).innerHTML = `
    <div class="profile-main">
      <img class="avatar big" src="${user.avatar || avatarFallback(user.id)}" alt="${user.name}">
      <div>
        <p class="eyebrow">${isSelf ? "My PawPaw Home" : "Public Profile"}</p>
        <h1>${escapeHTML(user.name)}</h1>
        <p class="user-id">@${escapeHTML(user.id)}</p>
        <p>${escapeHTML(user.bio || "這位毛友還在構思自我介紹。")}</p>
      </div>
    </div>
    <div class="profile-stats">
      <div class="stat"><strong>${posts.length}</strong><span>發文數量</span></div>
      <div class="stat"><strong>${followers}</strong><span>追蹤者</span></div>
      <div class="stat"><strong>${fullDate(user.joinedAt)}</strong><span>加入時間</span></div>
    </div>`;
}

function editProfile() {
  const user = currentUser();
  openModal(`
    <h2>編輯個人資料</h2>
    <form id="editProfileForm" class="stack-form">
      <label>使用者名稱<input name="name" value="${escapeHTML(user.name)}" required></label>
      <label>個人簡介<textarea name="bio" rows="4">${escapeHTML(user.bio || "")}</textarea></label>
      <label class="file-card"><input id="editAvatarInput" type="file" accept="image/*"><span>更換頭貼</span><img id="editAvatarPreview" class="${user.avatar ? "show" : ""}" src="${user.avatar || ""}" alt="頭貼預覽"></label>
      <div class="modal-actions"><button class="soft-btn" type="button" data-close-modal>取消</button><button class="primary-btn" type="submit">儲存</button></div>
    </form>`);
  bindImagePreview("#editAvatarInput", "#editAvatarPreview");
  $("#editProfileForm").addEventListener("submit", async event => {
    event.preventDefault();
    const form = new FormData(event.target);
    const db = readDB();
    const target = db.users.find(item => item.id === user.id);
    target.name = form.get("name").trim();
    target.bio = form.get("bio").trim();
    const file = $("#editAvatarInput").files[0];
    if (file) target.avatar = await compressImage(file, 420);
    writeDB(db);
    closeModal();
    toast("個人資料已更新");
    refreshCurrentView();
  });
}

function initCreatePost() {
  const user = currentUser();
  if (!user) return location.href = "login.html";
  $("#composeUser").innerHTML = `<img class="avatar" src="${user.avatar || avatarFallback(user.id)}" alt="${user.name}"><div><strong>@${user.id}</strong><div class="meta">${escapeHTML(user.name)}</div></div>`;
  setupDropZone();
  $("#postForm").addEventListener("submit", event => {
    event.preventDefault();
    const form = new FormData(event.target);
    const db = readDB();
    db.posts.push({
      id: uid("post"),
      authorId: user.id,
      title: form.get("title").trim(),
      content: form.get("content").trim(),
      tag: form.get("tag"),
      image: compressedPostImage,
      createdAt: Date.now(),
      likedBy: [],
      savedBy: [],
      comments: []
    });
    writeDB(db);
    toast("發布成功！正在同步到分享區");
    setTimeout(() => location.href = "home.html", 850);
  });
}

function setupDropZone() {
  const zone = $("#dropZone");
  const input = $("#postImageInput");
  const preview = $("#postImagePreview");
  zone.addEventListener("click", () => input.click());
  ["dragenter", "dragover"].forEach(type => zone.addEventListener(type, event => { event.preventDefault(); zone.classList.add("dragover"); }));
  ["dragleave", "drop"].forEach(type => zone.addEventListener(type, event => { event.preventDefault(); zone.classList.remove("dragover"); }));
  zone.addEventListener("drop", event => handlePostImage(event.dataTransfer.files[0], preview));
  input.addEventListener("change", () => handlePostImage(input.files[0], preview));
}

async function handlePostImage(file, preview) {
  if (!file || !file.type.startsWith("image/")) return toast("請選擇圖片檔");
  compressedPostImage = await compressImage(file, 1200);
  preview.src = compressedPostImage;
  preview.classList.add("show");
  toast("圖片已壓縮並加入預覽");
}

function bindImagePreview(inputSelector, previewSelector) {
  const input = $(inputSelector);
  const preview = $(previewSelector);
  input?.addEventListener("change", async () => {
    if (!input.files[0]) return;
    preview.src = await compressImage(input.files[0], 420);
    preview.classList.add("show");
  });
}

function compressImage(file, maxWidth) {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = event => {
      const image = new Image();
      image.onload = () => {
        const scale = Math.min(1, maxWidth / image.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", .82));
      };
      image.src = event.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function toggleFollow(targetId) {
  const me = currentUser();
  if (!me) return requireLoginModal("登入後就能追蹤喜歡的毛友囉！");
  if (me.id === targetId) return toast("這是你自己的小窩");
  const db = readDB();
  const existing = db.follows.findIndex(item => item.from === me.id && item.to === targetId);
  if (existing >= 0) db.follows.splice(existing, 1);
  else {
    db.follows.push({ from: me.id, to: targetId, createdAt: Date.now() });
    addNotification(db, targetId, `${me.name} 開始追蹤你了`);
  }
  writeDB(db);
  updateFollowButton(targetId);
  initProfile();
}

function updateFollowButton(targetId) {
  const btn = $("#followBtn");
  const me = currentUserId();
  if (!btn || !me || me === targetId) return;
  const followed = readDB().follows.some(item => item.from === me && item.to === targetId);
  btn.textContent = followed ? "已追蹤" : "追蹤";
}

function addNotification(db, to, text) {
  db.notifications.push({ id: uid("note"), to, text, read: false, createdAt: Date.now() });
}

function openNotifications() {
  const user = currentUser();
  const db = readDB();
  const notes = db.notifications.filter(note => note.to === user.id).sort((a, b) => b.createdAt - a.createdAt);
  openModal(`<h2>通知</h2><div class="notification-list">${notes.length ? notes.map(note => `<div class="notification-item"><strong>${note.read ? "已讀" : "新通知"}</strong><p>${escapeHTML(note.text)}</p><span class="meta">${nowText(note.createdAt)}</span></div>`).join("") : `<p class="empty">目前沒有通知。</p>`}</div><div class="modal-actions"><button class="primary-btn" data-close-modal>關閉</button></div>`);
  db.notifications.forEach(note => { if (note.to === user.id) note.read = true; });
  writeDB(db);
  renderNavbar();
}

function applyTheme() {
  if (localStorage.getItem(THEME_KEY) === "dark") document.body.classList.add("dark");
}

function toggleTheme() {
  document.body.classList.toggle("dark");
  localStorage.setItem(THEME_KEY, document.body.classList.contains("dark") ? "dark" : "light");
  toast(document.body.classList.contains("dark") ? "已切換深色模式" : "已切換明亮模式");
}

function logout() {
  localStorage.removeItem(SESSION_KEY);
  toast("已登出");
  setTimeout(() => location.href = "index.html", 500);
}

function requireLoginModal(message) {
  openModal(`<h2>${message}</h2><p>登入後可以按讚、留言、收藏與發布自己的毛孩日常。</p><div class="modal-actions"><button class="soft-btn" data-link="login.html">前往登入</button><button class="primary-btn" data-link="register.html">前往註冊</button></div>`);
}

function confirmModal(message, onConfirm) {
  openModal(`<h2>${message}</h2><div class="modal-actions"><button class="soft-btn" data-close-modal>取消</button><button id="confirmAction" class="danger-btn">確認</button></div>`);
  $("#confirmAction").addEventListener("click", () => { closeModal(); onConfirm(); });
}

function openModal(html) {
  $("#modalHost").innerHTML = `<div class="modal-backdrop"><div class="modal glass">${html}</div></div>`;
  $("[data-close-modal]")?.addEventListener("click", closeModal);
  $(".modal-backdrop")?.addEventListener("click", event => { if (event.target.classList.contains("modal-backdrop")) closeModal(); });
}

function closeModal() {
  $("#modalHost").innerHTML = "";
}

function toast(message) {
  const host = $("#toastHost");
  if (!host) return;
  const item = document.createElement("div");
  item.className = "toast";
  item.textContent = message;
  host.appendChild(item);
  setTimeout(() => item.remove(), 2600);
}
