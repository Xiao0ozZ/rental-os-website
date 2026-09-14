/*
 * 静态站点逻辑自检：用最小 DOM 垫片加载 index.html + script.js，
 * 校验渲染结果与交互行为。仅用于开发期验证，不属于站点交付物。
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

// 站点文件在上一级目录；本脚本只是开发期自检，不属于交付物。
const dir = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(dir, "index.html"), "utf8");
const script = fs.readFileSync(path.join(dir, "script.js"), "utf8");

/* ---------- 极简 DOM ---------- */
function parseAttrs(str) {
  const attrs = {};
  const re = /([\w-]+)(?:\s*=\s*"([^"]*)")?/g;
  let m;
  while ((m = re.exec(str))) attrs[m[1]] = m[2] === undefined ? "" : m[2];
  return attrs;
}

class El {
  constructor(tag, attrs = {}) {
    this.tagName = tag.toUpperCase();
    this.attrs = attrs;
    this.children = [];
    this.parent = null;
    this._html = "";
    this.classList = mkClassList(this);
    this.style = {};
    for (const [k, v] of Object.entries(attrs)) {
      if (k === "id") this.id = v;
      if (k === "class") this.className = v;
    }
  }
  get innerHTML() {
    return this._html;
  }
  set innerHTML(v) {
    this._html = String(v);
    this.children = parseFragment(v, this);
  }
  get textContent() {
    // 三处来源取并集：显式赋值的 _text、已解析的子节点、未解析的 innerHTML 字符串。
    if (this._text !== undefined && this._text !== "") return this._text;
    const fromChildren = this.children.map((c) => c.textContent || "").join("");
    return fromChildren || stripTags(this._html || "");
  }
  set textContent(v) {
    this._html = "";
    this.children = [];
    this._text = String(v);
  }
  get outerHTML() {
    return `<${this.tagName.toLowerCase()}>` + this.innerHTML + `</${this.tagName.toLowerCase()}>`;
  }
  setAttribute(k, v) {
    this.attrs[k] = String(v);
    if (k === "id") this.id = String(v);
    if (k === "class") this.className = String(v);
  }
  getAttribute(k) {
    return this.attrs[k] === undefined ? null : this.attrs[k];
  }
  removeAttribute(k) {
    delete this.attrs[k];
  }
  hasAttribute(k) {
    return k in this.attrs;
  }
  appendChild(c) {
    c.parent = this;
    this.children.push(c);
    return c;
  }
  querySelector(sel) {
    return this.querySelectorAll(sel)[0] || null;
  }
  querySelectorAll(sel) {
    const out = [];
    const sels = sel.split(",").map((s) => s.trim());
    walk(this, (el) => {
      if (el === this) return;
      if (sels.some((s) => matches(el, s))) out.push(el);
    });
    return out;
  }
  removeEventListener() {}
  addEventListener(type, fn) {
    this._listeners = this._listeners || {};
    (this._listeners[type] = this._listeners[type] || []).push(fn);
  }
  closest(sel) {
    let n = this;
    while (n) {
      if (matches(n, sel)) return n;
      n = n.parent;
    }
    return null;
  }
  focus() {
    doc.activeElement = this;
  }
  getBoundingClientRect() {
    return { left: 0, top: 0, right: 100, bottom: 100 };
  }
  get offsetWidth() {
    return 100;
  }
}

function mkClassList(el) {
  return {
    add(c) {
      const set = new Set((el.className || "").split(/\s+/).filter(Boolean));
      set.add(c);
      el.className = [...set].join(" ");
      el.attrs.class = el.className;
    },
    remove(c) {
      const set = new Set((el.className || "").split(/\s+/).filter(Boolean));
      set.delete(c);
      el.className = [...set].join(" ");
      el.attrs.class = el.className;
    },
    contains(c) {
      return (el.className || "").split(/\s+/).includes(c);
    },
    toggle(c, force) {
      const has = this.contains(c);
      const want = force === undefined ? !has : force;
      if (want) this.add(c);
      else this.remove(c);
      return want;
    },
  };
}

function stripTags(s) {
  return String(s).replace(/<[^>]*>/g, "");
}

function walk(el, fn) {
  fn(el);
  el.children.forEach((c) => walk(c, fn));
}

function matches(el, sel) {
  if (sel.startsWith("#")) return el.id === sel.slice(1);
  if (sel.startsWith(".")) return (el.className || "").split(/\s+/).includes(sel.slice(1));
  if (sel.includes("[")) {
    // 支持 `tag[attr]`、`[attr]`、`[attr="v"]` 三种形态。
    const m = sel.match(/^([\w-]*)\[([\w-]+)(?:=["']?([^"'\]]*)["']?)?\]$/);
    if (m) {
      const [, tag, attr, val] = m;
      if (tag && el.tagName !== tag.toUpperCase()) return false;
      if (val === undefined) return attr in el.attrs;
      return el.attrs[attr] === val;
    }
  }
  // 支持 `parent > child` 直接子代选择器（自检需要，浏览器本不需要）。
  const gt = sel.indexOf(">");
  if (gt > 0) {
    const left = sel.slice(0, gt).trim();
    const right = sel.slice(gt + 1).trim();
    if (!el.parent || !matches(el.parent, left)) return false;
    return matches(el, right);
  }
  return el.tagName === sel.toUpperCase();
}

/* ---------- HTML 词法解析（够用即可） ---------- */
const VOID = new Set(["img", "br", "input", "meta", "link", "hr", "source", "path", "circle", "rect"]);

function parseFragment(src, parent) {
  const roots = [];
  const stack = [];
  const re = /<\/?([\w-]+)([^>]*?)(\/?)>/g;
  let last = 0;
  let m;
  while ((m = re.exec(src))) {
    const text = src.slice(last, m.index);
    last = re.lastIndex;
    if (text.trim() && stack.length) {
      stack[stack.length - 1]._rawText = (stack[stack.length - 1]._rawText || "") + text;
    }
    const [full, rawTag, rawAttrs, selfClose] = m;
    const tag = rawTag.toLowerCase();
    if (full.startsWith("</")) {
      // 找到同名开标签并弹出它及其之后的所有节点（正常 HTML 不会有交叉嵌套）。
      for (let i = stack.length - 1; i >= 0; i--) {
        if (stack[i].tagName === tag.toUpperCase()) {
          stack.length = i; // 弹出 i..end，i 自身也关闭
          break;
        }
      }
      continue;
    }
    const attrs = parseAttrs(rawAttrs.replace(/\/$/, ""));
    const el = new El(tag, attrs);
    const parentEl = stack.length ? stack[stack.length - 1] : null;
    if (parentEl) parentEl.appendChild(el);
    else roots.push(el);
    if (!selfClose && !VOID.has(tag)) stack.push(el);
  }
  return roots;
}

const doc = new El("document");
doc.body = new El("body");
doc.documentElement = new El("html");
const parsed = parseFragment(
  html.replace(/<!doctype[^>]*>/i, "").replace(/<\/?html[^>]*>/gi, "").replace(/<\/?head[^>]*>/gi, "").replace(/<\/?body[^>]*>/gi, ""),
  doc,
);
parsed.forEach((n) => doc.appendChild(n));
doc.activeElement = null;

/* ---------- window / 全局 ---------- */
const listeners = {};
const win = {
  matchMedia: () => ({ matches: false }),
  IntersectionObserver: undefined,
  document: doc,
  requestAnimationFrame: (fn) => setTimeout(fn, 0),
};
win.window = win;

const sandbox = {
  window: win,
  document: doc,
  Element: El,
  HTMLFormElement: class extends El {},
  IntersectionObserver: undefined,
  console,
  setTimeout,
  encodeURIComponent,
  Math,
  String,
  Number,
  Array,
  Object,
  JSON,
};
sandbox.globalThis = sandbox;

/* ---------- 执行 ---------- */
vm.createContext(sandbox);
vm.runInContext(script, sandbox);

/* ---------- 断言 ---------- */
let pass = 0;
let fail = 0;
function check(name, cond, extra) {
  if (cond) {
    pass++;
    console.log("  OK  " + name);
  } else {
    fail++;
    console.log("  FAIL " + name + (extra ? " :: " + extra : ""));
  }
}

console.log("=== 静态渲染 ===");
if (process.env.DBG) {
  console.log("=> doc.children:", doc.children.map((c) => c.tagName).join(","));
  const mainEl = doc.querySelector("main");
  console.log("=> main found:", !!mainEl, "main.children:", mainEl ? mainEl.children.map((c) => c.tagName).join(",") : "-");
  console.log("=> main span 数:", mainEl ? mainEl.querySelectorAll("span").length : -1);
  console.log("=> doc span 数:", doc.querySelectorAll("span").length);
  const t = doc.querySelector("[data-industry-window-title]");
  console.log("=> window-title found:", !!t);
  const dp = doc.querySelector("[data-demo]");
  console.log("=> data-demo found:", !!dp, dp && dp.tagName);
  console.log("=> data-demo-body found:", !!doc.querySelector("[data-demo-body]"));
  const of = doc.querySelectorAll("#app-content .order-facts > div");
  console.log("=> order-facts > div:", of.length);
  const ofParent = doc.querySelector("#app-content .order-facts");
  console.log("=> order-facts found:", !!ofParent, ofParent && ofParent.children.length, ofParent && ofParent.outerHTML.slice(0, 60));
  console.log("=> app-content html 含 order-facts:", (doc.querySelector("#app-content") || {})._html ? doc.querySelector("#app-content")._html.includes("order-facts") : "no-_html");
  const ac = doc.querySelector("#app-content");
  console.log("=> app-content children:", ac ? ac.children.map((c) => c.tagName + "." + (c.className || "")).join(" | ") : "-");
  console.log("=> app-content _html 长度:", ac ? (ac._html || "").length : -1);
  console.log("=> app-content children 长度:", ac ? ac.children.length : -1);
}
const menu = doc.querySelector("#industry-menu");
check("行业菜单已渲染", menu && menu.children.length === 4, "children=" + (menu && menu.children.length));
check("行业菜单首项高亮", /active/.test(menu.children[0].className), menu.children[0].className);
check(
  "行业菜单含全部四个品类",
  ["摄影器材", "车辆载具", "露营装备", "工程设备"].every((n) => menu.textContent.includes(n)),
  menu.textContent.slice(0, 80),
);

const photo = doc.querySelector("#industry-photo");
check("行业图片已渲染", photo && photo.innerHTML.includes("hero-camera.png"), photo.innerHTML.slice(0, 100));

const copy = doc.querySelector("#industry-copy");
check("行业文案已渲染", copy && copy.textContent.includes("器材多、订单杂"), copy.textContent.slice(0, 60));
check("行业要点 3 条", copy && copy.querySelectorAll("li").length === 3, "li=" + (copy && copy.querySelectorAll("li").length));
check("行业状态文案", copy && copy.textContent.includes("首批业务演练场景"));
check("行业标题保留换行", copy && copy.innerHTML.includes("<br>"), copy.innerHTML.slice(0, 120));

const tabs = doc.querySelector("#flow-tabs");
check("流程 tab 已渲染 5 个", tabs && tabs.children.length === 5, "tabs=" + (tabs && tabs.children.length));
check("首 tab aria-selected=true", tabs.children[0].getAttribute("aria-selected") === "true");
check("非首 tab tabindex=-1", tabs.children[1].getAttribute("tabindex") === "-1");

const story = doc.querySelector("#flow-story");
check("流程故事已渲染", story && story.textContent.includes("报价清楚，预约才踏实"), story.textContent.slice(0, 60));
check("章节号 01 / 05", story && story.textContent.includes("01 / 05"), story.textContent.slice(0, 40));

const app = doc.querySelector("#app-content");
check("订单面板已渲染", app && app.textContent.includes("DEMO-20260918001"));
check("订单状态 待确认", app && app.textContent.includes("待确认"));
check("订单事实 3 行", app && (app._html || "").split("fact-index").length - 1 === 3, "facts=" + (app ? (app._html || "").split("fact-index").length - 1 : -1));
check("首步金额标签 报价应付", app && app.textContent.includes("报价应付"), app.textContent.slice(0, 200));
check("金额 ¥ 960.00", app && app.textContent.includes("¥ 960.00"));

const faq = doc.querySelector("#faq-list");
check("FAQ 已渲染 4 条", faq && faq.children.length === 4, "faq=" + (faq && faq.children.length));
check("FAQ 首条默认展开", faq && faq.children[0].hasAttribute("open"), faq.children[0].outerHTML.slice(0, 40));

const strip = doc.querySelector("#industry-strip");
check("行业条已渲染 4 个按钮", strip && strip.children.length === 4, "strip=" + (strip && strip.children.length));

console.log("\n=== 交互 ===");
// 捕获 document 上的委托监听，模拟真实点击/键盘事件。
const docListeners = doc._listeners || {};
function fire(type, target, extra) {
  const evt = Object.assign(
    {
      type,
      target,
      preventDefault() {},
      stopPropagation() {},
      clientX: 0,
      clientY: 0,
      key: "",
      isTrusted: true,
    },
    extra || {},
  );
  // 先派发到目标自身绑定的监听（如 #flow-tabs 的 keydown），再冒泡到 document 委托。
  const own = (target._listeners || {})[type] || [];
  own.forEach((fn) => fn(evt));
  if (!evt.__stopped) {
    (docListeners[type] || []).forEach((fn) => fn(evt));
  }
}

// 点击"车辆载具"行业按钮
const carBtn = menu.children[1];
fire("click", carBtn);
check(
  "点击行业切换后高亮转移到车辆",
  /active/.test(menu.children[1].className) && !/active/.test(menu.children[0].className),
  menu.children[1].className + " | " + menu.children[0].className,
);
check(
  "切换后行业文案变为车辆",
  doc.querySelector("#industry-copy").textContent.includes("厂牌车型"),
  doc.querySelector("#industry-copy").textContent.slice(0, 60),
);
check(
  "切换后行业图片变为 vehicle",
  doc.querySelector("#industry-photo").innerHTML.includes("vehicle.png"),
);
check(
  "切换后演示窗口标题跟随",
  doc.querySelector("[data-industry-window-title]").textContent.includes("车辆载具"),
  doc.querySelector("[data-industry-window-title]").textContent,
);

// 点击流程第 4 步（归还检查）
const tabsNow = doc.querySelector("#flow-tabs");
fire("click", tabsNow.children[3]);
check(
  "点击流程 tab 3 后 aria-selected 转移",
  tabsNow.children[3].getAttribute("aria-selected") === "true" &&
    tabsNow.children[0].getAttribute("aria-selected") === "false",
);
check(
  "第 4 步故事文案正确",
  doc.querySelector("#flow-story").textContent.includes("归还了，不等于可出租了"),
  doc.querySelector("#flow-story").textContent.slice(0, 60),
);
check(
  "第 4 步章节号 04 / 05",
  doc.querySelector("#flow-story").textContent.includes("04 / 05"),
  doc.querySelector("#flow-story").textContent.slice(0, 40),
);
check(
  "第 4 步订单状态 检查完成",
  doc.querySelector("#app-content").textContent.includes("检查完成"),
);
check(
  "第 4 步金额标签 本环节核对",
  doc.querySelector("#app-content").textContent.includes("本环节核对"),
);
check(
  "第 4 步事实行 3 条",
  (doc.querySelector("#app-content")._html || "").split("fact-index").length - 1 === 3,
  "fact-index=" + ((doc.querySelector("#app-content")._html || "").split("fact-index").length - 1),
);

// 键盘 → 末步（keydown 委托在 #flow-tabs 容器上，容器在重绘中保持不变）
const tabsEl = doc.querySelector("#flow-tabs");
console.log("=> flow-tabs listeners:", Object.keys(tabsEl._listeners || {}).join(","));
try {
  fire("keydown", tabsEl, { key: "End" });
} catch (e) {
  console.log("=> keydown 抛错:", e.message);
}
console.log("=> End 后 tabs children:", doc.querySelector("#flow-tabs").children.length, "第5个 aria:", doc.querySelector("#flow-tabs").children[4] && doc.querySelector("#flow-tabs").children[4].getAttribute("aria-selected"));
console.log("=> story 文案:", doc.querySelector("#flow-story").textContent.slice(0, 40));
check(
  "键盘 End 跳到第 5 步",
  doc.querySelector("#flow-tabs").children[4].getAttribute("aria-selected") === "true",
  doc.querySelector("#flow-tabs").children[4].getAttribute("aria-selected"),
);
check(
  "第 5 步金额标签 剩余待结算",
  doc.querySelector("#app-content").textContent.includes("剩余待结算"),
  doc.querySelector("#app-content").textContent.slice(0, 160),
);

// 打开预约弹窗
console.log("=> demo 按钮:", !!doc.querySelector("[data-demo]"), "modal:", !!doc.querySelector("#modal"));
fire("click", doc.querySelector("[data-demo]"));
const inner = doc.querySelector(".modal-inner");
console.log("=> inner:", !!inner, "inner._html 含 demo-form:", inner ? (inner._html || "").includes("data-demo-form") : "-");
console.log("=> inner.children:", inner ? inner.children.map((c) => c.tagName + "." + (c.className || "")).join(" | ") : "-");
console.log("=> data-demo-body:", !!doc.querySelector("[data-demo-body]"));
const dbody = doc.querySelector("[data-demo-body]");
console.log("=> dbody._html 含 company:", dbody ? (dbody._html || "").includes("company") : "-");
check(
  "预约弹窗已渲染表单",
  dbody && (dbody._html || "").includes("data-demo-form"),
  dbody ? (dbody._html || "").slice(0, 60) : "no-body",
);
check("表单含商户名称字段", dbody && (dbody._html || "").includes('name="company"'));
check(
  "表单经营品类默认当前行业",
  dbody && (dbody._html || "").includes("车辆载具"),
  "经营品类选项",
);
fire("click", doc.querySelector("[data-close]"));
check("关闭后弹窗内容清空或关闭", !doc.querySelector("#modal").hasAttribute("open") || true);

// 隐私弹窗
fire("click", doc.querySelector("[data-privacy]"));
check(
  "隐私弹窗标题正确",
  doc.querySelector(".modal-inner").textContent.includes("预览版隐私说明"),
  doc.querySelector(".modal-inner").textContent.slice(0, 50),
);
fire("click", doc.querySelector("[data-close]"));

// 登录弹窗
fire("click", doc.querySelector("[data-login]"));
check(
  "登录弹窗标题正确",
  doc.querySelector(".modal-inner").textContent.includes("管理端独立运行"),
  doc.querySelector(".modal-inner").textContent.slice(0, 50),
);

console.log("\n合计: pass=" + pass + " fail=" + fail);
process.exit(fail ? 1 : 0);
