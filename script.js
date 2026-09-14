/*
 * Rental OS 官网 — 静态站点交互脚本
 *
 * 纯原生 JS，无构建、无依赖。双击 index.html 即可运行，也可整目录上传部署。
 * 数据（行业 / 流程）集中在本文件顶部，正文结构由 index.html 提供骨架，此处只做填充与交互。
 *
 * 默认不连接业务数据库、不发送也不保存访客信息。若在 site-config.js 配置咨询邮箱，
 * 提交后只会生成 mailto 草稿，由访客在自己的邮件客户端中确认发送。
 */
(function () {
  "use strict";

  var SITE_CONFIG = window.RENTAL_OS_SITE_CONFIG || {};
  var ADMIN_URL =
    typeof SITE_CONFIG.adminUrl === "string" ? SITE_CONFIG.adminUrl.trim() : "";
  var DEMO_EMAIL =
    typeof SITE_CONFIG.demoEmail === "string"
      ? SITE_CONFIG.demoEmail.trim()
      : "";

  function isHttpUrl(value) {
    try {
      var parsed = new URL(value, window.location.href);
      return /^https?:$/.test(parsed.protocol) && Boolean(parsed.hostname);
    } catch (error) {
      return false;
    }
  }

  function isEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  /* ------------------------------------------------------------------ *
   * 数据
   * ------------------------------------------------------------------ */

  var ICONS = {
    arrow: '<path d="M4 12h15m-6-6 6 6-6 6"/>',
    external:
      '<path d="M14 4h6v6"/><path d="m20 4-9 9"/><path d="M18 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5"/>',
    camera:
      '<path d="m8 6 2-3h4l2 3h4v14H4V6Z"/><circle cx="12" cy="12" r="4"/>',
    car: '<path d="m5 10 2-6h10l2 6M3 10h18v8H3ZM6 18v3m12-3v3M6 14h2m8 0h2"/>',
    tent: '<path d="m12 3 10 18H2L12 3Zm0 8-5 10m5-10 5 10M10 2l4 5"/>',
    equipment:
      '<path d="M3 17h11v4H3Zm2 0V9h7v8m0-8 4-5 5 9m-3 0h4v4h-6M7 9V5h5v4"/>',
    box: '<path d="m3 7 9-5 9 5v10l-9 5-9-5V7Zm0 0 9 5 9-5m-9 5v10M7 4.8l9 5"/>',
    orders: '<path d="M6 3h12v18H6ZM9 7h6M9 11h6m-6 4h3"/>',
    money:
      '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m9 8 3 4 3-4m-6 4h6m-6 3h6m-3-3v5"/>',
    users:
      '<circle cx="9" cy="7" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3m1-16a3 3 0 0 1 0 6m2 3a5 5 0 0 1 3 4v3"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    play: '<path d="m9 5 10 7-10 7Z"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    close: '<path d="m6 6 12 12M6 18 18 6"/>',
  };

  var ICON_ATTRS =
    'class="icon" width="22" height="22" viewBox="0 0 24 24" fill="none" ' +
    'stroke="currentColor" stroke-width="1.6" stroke-linecap="round" ' +
    'stroke-linejoin="round" aria-hidden="true"';

  function icon(name, className) {
    var cls = className ? "icon " + className : "icon";
    return (
      '<svg class="' + cls + '" width="22" height="22" viewBox="0 0 24 24" ' +
      'fill="none" stroke="currentColor" stroke-width="1.6" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      (ICONS[name] || "") +
      "</svg>"
    );
  }

  var INDUSTRY_STRIP_ICONS = {
    camera:
      '<path d="m8 6 2-3h4l2 3h4v14H4V6Z"/><circle cx="12" cy="12" r="4"/>',
    car: '<path d="m5 10 2-6h10l2 6M3 10h18v8H3ZM6 18v3m12-3v3M6 14h2m8 0h2"/>',
    tent: '<path d="m12 3 10 18H2L12 3Zm0 8-5 10m5-10 5 10M10 2l4 5"/>',
    equipment:
      '<path d="M3 17h11v4H3Zm2 0V9h7v8m0-8 4-5 5 9m-3 0h4v4h-6M7 9V5h5v4"/>',
  };

  var FAQS = [
    [
      "Rental OS 是租赁商城，还是商户管理系统？",
      "Rental OS 面向租赁商户，管理会员、商品、库存、价格与订单。这里是产品官网，不是租客下单商城。租客端 App 和线上预订入口属于后续独立交付范围。",
    ],
    [
      "一个商户可以管理不同的租赁品类吗？",
      "产品按经营空间组织业务。同一商户可设置不同品类的空间，共享客户主档，并分别管理各空间的商品、价格、库存与订单。",
    ],
    [
      "可以按小时、按天收费，也能处理续租吗？",
      "计价单位、价格与续租方式由经营规则决定。演示时可以结合你的计费习惯，核对按小时、按天、续租、逾时和优惠的具体计算结果。",
    ],
    [
      "现在可以直接开通并用于正式经营吗？",
      "当前以首批业务演练和产品演示为主。正式使用前，需要确认行业功能、环境、权限和收退款方案。本页面不提供自动开通，也不处理真实客户款项。",
    ],
  ];

  var INDUSTRIES = [
    {
      name: "摄影器材",
      english: "CAMERA RENTAL SOFTWARE",
      iconName: "camera",
      image: "hero-camera",
      title: "器材多、订单杂，\n用系统统一管理。",
      description:
        "面向摄影器材租赁企业，将商品档案、器材库存、预分配与交还检查放进同一套管理系统。",
      points: [
        "型号、资产与定价分组各司其职",
        "按租期查看可用量与分配情况",
        "交还后检查，符合条件再出租",
      ],
      status: "首批业务演练场景",
    },
    {
      name: "车辆载具",
      english: "VEHICLE RENTAL SOFTWARE",
      iconName: "car",
      image: "vehicle",
      title: "从车组定价到车辆调度，\n业务信息统一管理。",
      description:
        "面向车辆租赁企业，分别维护厂牌车型、车辆资产和定价车组，衔接订单与车辆的使用安排。",
      points: [
        "独立管理车型与单台车辆",
        "定价车组包含多个车型",
        "衔接预约、分配、续租与归还",
      ],
      status: "行业适配场景 · 开放范围以演示为准",
    },
    {
      name: "露营装备",
      english: "OUTDOOR RENTAL SOFTWARE",
      iconName: "tent",
      image: "camping",
      title: "装备按件或按数量，\n库存都能有据可查。",
      description:
        "面向露营装备租赁商户，兼顾独立资产与数量库存，为套装出租、分批交还和清点提供管理依据。",
      points: [
        "序列化资产与数量库存",
        "套装与增值服务组合出租",
        "归还后检查、清洁与缺件处理",
      ],
      status: "行业适配场景 · 开放范围以演示为准",
    },
    {
      name: "工程设备",
      english: "EQUIPMENT RENTAL SOFTWARE",
      iconName: "equipment",
      image: "construction",
      title: "设备台账与租赁订单，\n不再分开记录。",
      description:
        "面向工程设备租赁企业，将型号、资产与订单关联起来，让设备占用和交还状态有据可查。",
      points: [
        "设备型号与单台资产台账",
        "按租期统筹可用库存",
        "异常设备隔离，检查后再投入",
      ],
      status: "行业适配场景 · 开放范围以演示为准",
    },
  ];

  var FLOW = [
    {
      name: "预约报价",
      verb: "报价清楚，预约才踏实。",
      copy: "选择会员、租用商品和租期，查看租金、服务与优惠的组成。",
      state: "待确认",
      action: "查看商品分配",
      amount: "¥ 960.00",
      fact: "基础租金 ¥ 1,080.00 − 方案优惠 ¥ 120.00",
      detail: [
        "个人会员 · 陈先生（示例）",
        "09.18 10:00 — 09.21 10:00",
        "价格版本 v1.2 · 租期 3 天",
      ],
    },
    {
      name: "商品分配",
      verb: "先看可用，再安排交付。",
      copy: "检查租期与缓冲时间，为订单预分配具体资产，并锁定交付对象。",
      state: "已锁分配",
      action: "查看领取记录",
      amount: "2 件",
      fact: "2 件已分配 · 0 件待分配",
      detail: [
        "相机机身 · CAM-001",
        "标准变焦镜头 · LENS-008",
        "租期与缓冲时间 · 无占用冲突",
      ],
    },
    {
      name: "领取使用",
      verb: "交出去的每一件，都有记录。",
      copy: "核对资产与附件，记录领取检查结果，进入租用流程。",
      state: "租用中",
      action: "查看归还检查",
      amount: "2 / 2",
      fact: "已核对资产 · 领取附件齐全",
      detail: [
        "机身、镜头与电池 · 已核对",
        "领取检查 · 已记录",
        "续租前重新检查后续库存",
      ],
    },
    {
      name: "归还检查",
      verb: "归还了，不等于可出租了。",
      copy: "逐项记录交还与检查结果，异常商品保留待处理状态。",
      state: "检查完成",
      action: "查看结算结果",
      amount: "2 / 2",
      fact: "已交还 · 已检查 · 无异常费用",
      detail: [
        "相机机身 · 外观与功能正常",
        "镜头与附件 · 清点齐全",
        "缓冲时间结束后恢复可租",
      ],
    },
    {
      name: "费用结算",
      verb: "一笔订单，收尾也清清楚楚。",
      copy: "核对应收、已收与退款事项，保留费用来源及处理记录。",
      state: "已完成",
      action: "重新体验流程",
      amount: "¥ 0.00",
      fact: "应收 ¥ 960.00 · 示例已收 ¥ 960.00",
      detail: ["待补款 · ¥ 0.00", "待退款 · 无", "订单完成 · 资产按规则恢复可租"],
    },
  ];

  /* ------------------------------------------------------------------ *
   * 小工具
   * ------------------------------------------------------------------ */

  function $(selector, root) {
    return (root || document).querySelector(selector);
  }

  function $$(selector, root) {
    return Array.prototype.slice.call(
      (root || document).querySelectorAll(selector),
    );
  }

  // 多行文案用 \n 分段，转成 <br> 保持与 React 版一致。
  function withBreaks(text) {
    return String(text)
      .split("\n")
      .map(function (line) {
        return escapeHtml(line);
      })
      .join("<br>");
  }

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function prefersReducedMotion() {
    return (
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  /* ------------------------------------------------------------------ *
   * 滚动进入动画
   * ------------------------------------------------------------------ */

  function setupReveal() {
    var targets = $$(".reveal");
    if (!targets.length) return;

    // 不支持 IntersectionObserver 时直接显示，避免内容永远不可见。
    if (typeof IntersectionObserver !== "function") {
      targets.forEach(function (el) {
        el.classList.add("visible");
      });
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08 },
    );

    targets.forEach(function (el) {
      observer.observe(el);
    });
  }

  /* ------------------------------------------------------------------ *
   * 行业条与常见问题（一次渲染，不随交互变化）
   * ------------------------------------------------------------------ */

  function renderIndustryStrip() {
    var strip = $("#industry-strip");
    if (!strip) return;
    strip.innerHTML = INDUSTRIES.map(function (item, i) {
      return (
        '<button type="button" data-industry="' +
        i +
        '">' +
        '<svg class="icon" width="22" height="22" viewBox="0 0 24 24" ' +
        'fill="none" stroke="currentColor" stroke-width="1.6" ' +
        'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        (INDUSTRY_STRIP_ICONS[item.iconName] || "") +
        "</svg>" +
        "<span>" +
        escapeHtml(item.name) +
        "</span>" +
        icon("arrow", "strip-arrow") +
        "</button>"
      );
    }).join("");
  }

  function renderFaqs() {
    var list = $("#faq-list");
    if (!list) return;
    list.innerHTML = FAQS.map(function (pair, i) {
      return (
        "<details" +
        (i === 0 ? " open" : "") +
        ">" +
        "<summary>" +
        escapeHtml(pair[0]) +
        '<span aria-hidden="true">+</span>' +
        "</summary>" +
        "<p>" +
        escapeHtml(pair[1]) +
        "</p>" +
        "</details>"
      );
    }).join("");
  }

  /* ------------------------------------------------------------------ *
   * 行业切换
   * ------------------------------------------------------------------ */

  var industryIndex = 0;

  function renderIndustryMenu() {
    var menu = $("#industry-menu");
    if (!menu) return;

    menu.innerHTML = INDUSTRIES.map(function (item, i) {
      return (
        '<button type="button" class="' +
        (i === industryIndex ? "active" : "") +
        '" aria-pressed="' +
        (i === industryIndex) +
        '" data-industry="' +
        i +
        '">' +
        "<span>" +
        icon(item.iconName) +
        escapeHtml(item.name) +
        "</span>" +
        icon("arrow") +
        "</button>"
      );
    }).join("");
  }

  function renderIndustryPanel() {
    var current = INDUSTRIES[industryIndex];
    if (!current) return;

    var photo = $("#industry-photo");
    if (photo) {
      photo.innerHTML =
        '<img src="./images/' +
        encodeURIComponent(current.image) +
        '.png" alt="' +
        escapeHtml(current.name) +
        '租赁场景（AI 生成）" loading="lazy" width="1536" height="1024">' +
        "<span>" +
        escapeHtml(current.english) +
        "</span>";
    }

    var copy = $("#industry-copy");
    if (copy) {
      copy.innerHTML =
        '<span class="eyebrow">' +
        escapeHtml(current.name) +
        "</span>" +
        "<h3>" +
        withBreaks(current.title) +
        "</h3>" +
        "<p>" +
        escapeHtml(current.description) +
        "</p>" +
        "<ul>" +
        current.points
          .map(function (point) {
            return "<li>" + icon("check") + escapeHtml(point) + "</li>";
          })
          .join("") +
        "</ul>" +
        '<button type="button" class="text-link" data-demo>了解适用方案 ' +
        icon("arrow") +
        "</button>" +
        "<small>" +
        escapeHtml(current.status) +
        "</small>";
    }
  }

  function selectIndustry(index, scroll) {
    if (index < 0 || index >= INDUSTRIES.length) return;
    industryIndex = index;
    renderIndustryMenu();
    renderIndustryPanel();

    var select = $("#industry-select");
    if (select && select.value !== INDUSTRIES[index].name) {
      select.value = INDUSTRIES[index].name;
    }

    // 行业名同时出现在演示窗口的侧边栏标题里。
    $$("[data-industry-window-title]").forEach(function (el) {
      el.textContent = "Rental OS / " + INDUSTRIES[index].name + "经营空间";
    });
    $$("[data-industry-workspace]").forEach(function (el) {
      el.textContent = INDUSTRIES[index].name + "空间⌄";
    });

    if (scroll) {
      var section = $("#industries");
      if (section) {
        section.scrollIntoView({
          behavior: prefersReducedMotion() ? "auto" : "smooth",
          block: "start",
        });
      }
    }
  }

  /* ------------------------------------------------------------------ *
   * 流程 5 步切换
   * ------------------------------------------------------------------ */

  var flowIndex = 0;

  function renderFlowTabs() {
    var tabs = $("#flow-tabs");
    if (!tabs) return;

    tabs.innerHTML = FLOW.map(function (item, i) {
      return (
        '<button type="button" id="flow-tab-' +
        i +
        '" role="tab" aria-selected="' +
        (i === flowIndex) +
        '" aria-controls="flow-panel" tabindex="' +
        (i === flowIndex ? "0" : "-1") +
        '" data-flow="' +
        i +
        '">' +
        "<span>0" +
        (i + 1) +
        "</span>" +
        escapeHtml(item.name) +
        icon("arrow") +
        "</button>"
      );
    }).join("");
  }

  function renderFlowPanel() {
    var stage = FLOW[flowIndex];
    if (!stage) return;

    var story = $("#flow-story");
    if (story) {
      story.innerHTML =
        '<span class="chapter">0' +
        (flowIndex + 1) +
        " / 05</span>" +
        "<h3>" +
        escapeHtml(stage.verb) +
        "</h3>" +
        "<p>" +
        escapeHtml(stage.copy) +
        "</p>" +
        '<button type="button" class="text-link" data-flow-next>' +
        escapeHtml(stage.action) +
        icon("arrow") +
        "</button>" +
        "<small>交互示意 · 非实时业务数据</small>";
    }

    var content = $("#app-content");
    if (content) {
      var amountLabel =
        flowIndex === 0 ? "报价应付" : flowIndex === 4 ? "剩余待结算" : "本环节核对";

      content.innerHTML =
        '<div class="app-breadcrumb">租赁订单 / 订单详情</div>' +
        '<div class="app-order-heading">' +
        "<div><h4>拍摄器材租赁</h4><span>DEMO-20260918001</span></div>" +
        '<span class="order-status">' +
        escapeHtml(stage.state) +
        "</span>" +
        "</div>" +
        '<div class="order-item">' +
        '<img src="./images/hero-camera.png" alt="示例相机套装" loading="lazy">' +
        "<div><strong>全画幅相机 + 标准变焦镜头</strong>" +
        "<span>标准拍摄组合 · 2 件器材</span></div>" +
        "</div>" +
        '<div class="order-facts">' +
        stage.detail
          .map(function (line, i) {
            return (
              "<div>" +
              '<span class="fact-check">' +
              icon("check") +
              "</span>" +
              escapeHtml(line) +
              '<span class="fact-index">0' +
              (i + 1) +
              "</span>" +
              "</div>"
            );
          })
          .join("") +
        "</div>" +
        '<div class="order-total">' +
        "<div><span>" +
        amountLabel +
        "</span><strong>" +
        escapeHtml(stage.amount) +
        "</strong></div>" +
        "<span>" +
        escapeHtml(stage.fact) +
        "</span>" +
        "</div>" +
        '<div class="app-footnote">' +
        icon("check") +
        " 每一步状态与操作，都留有记录。</div>";
    }

    var panel = $("#flow-panel");
    if (panel) {
      panel.setAttribute("aria-labelledby", "flow-tab-" + flowIndex);
    }
  }

  function selectFlow(index, focusTab) {
    var next = ((index % FLOW.length) + FLOW.length) % FLOW.length;
    // 轮换元素以重放淡入动画：与 React 版的 key 变化等效。
    var storyWrap = $("#flow-story");
    if (storyWrap) {
      storyWrap.classList.remove("is-swapping");
      void storyWrap.offsetWidth;
    }

    flowIndex = next;
    renderFlowTabs();
    renderFlowPanel();

    // 面板内容为重绘节点，重绘后需要重放一次入场过渡。
    [storyWrap, $("#app-content")].forEach(function (el) {
      if (!el) return;
      el.style.animation = "none";
      void el.offsetWidth;
      el.style.animation = "";
    });

    if (focusTab) {
      var tab = $("#flow-tab-" + next);
      if (tab) tab.focus();
    }
  }

  function handleFlowKeydown(event) {
    var keys = ["ArrowRight", "ArrowLeft", "Home", "End"];
    if (keys.indexOf(event.key) === -1) return;
    event.preventDefault();

    var next;
    if (event.key === "Home") next = 0;
    else if (event.key === "End") next = FLOW.length - 1;
    else next = flowIndex + (event.key === "ArrowRight" ? 1 : -1);

    selectFlow(next, true);
  }

  /* ------------------------------------------------------------------ *
   * 弹窗（预约演示 / 隐私说明 / 管理端登录）
   * ------------------------------------------------------------------ */

  var modal = null;
  var opener = null;

  function dialogTemplate(kind) {
    if (kind === "demo") {
      return (
        '<span class="eyebrow">LET’S TALK RENTAL</span>' +
        '<h2 id="dialog-title">从你的业务开始。</h2>' +
        '<p class="modal-intro">告诉我们你在经营什么，找到适合的演示场景。</p>' +
        '<div class="modal-body" data-demo-body></div>'
      );
    }
    if (kind === "privacy") {
      return (
        '<span class="eyebrow">PRIVACY</span>' +
      '<h2 id="dialog-title">隐私说明</h2>' +
        "<p>本官网是独立静态站点，不连接业务数据库，不使用广告追踪或分析 Cookie。默认不会发送或保存预约信息；如果站点配置了咨询邮箱，提交后只生成邮件草稿，由访客手动确认发送。</p>" +
        "<p>页面所示订单与会员为虚构示例，行业照片由 AI 生成，不代表真实客户案例。</p>" +
        "<p>正式上线时，将根据实际运营主体和信息处理方式提供完整隐私政策。</p>"
      );
    }
    // login
    var loginAction = isHttpUrl(ADMIN_URL)
      ? '<a class="button primary" href="' +
        escapeHtml(ADMIN_URL) +
        '" target="_blank" rel="noopener">打开管理端 ' +
        icon("arrow") +
        "</a>"
      : '<button type="button" class="button primary" data-close>知道了 ' +
        icon("arrow") +
        "</button>";
    var loginCopy = isHttpUrl(ADMIN_URL)
      ? "管理端地址已配置，将在新窗口打开。官网不会接收你的账号和密码。"
      : "此官网尚未配置管理端地址。请在 site-config.js 填入管理端 URL；官网不会接收你的账号和密码。";
    return (
      '<span class="eyebrow">RENTAL OS ADMIN</span>' +
      '<h2 id="dialog-title">管理端独立运行</h2>' +
      "<p>" +
      loginCopy +
      "</p>" +
      loginAction
    );
  }

  function demoFormTemplate() {
    var options = INDUSTRIES.map(function (item) {
      return "<option>" + escapeHtml(item.name) + "</option>";
    }).join("");

    var previewNotice = isEmail(DEMO_EMAIL)
      ? "提交后不会自动上传信息，将由你的邮件客户端打开一封待确认的咨询邮件。"
      : "预览模式：表单仅用于体验，不发送、不保存个人信息。";

    return (
      '<form novalidate data-demo-form>' +
      "<label>商户名称" +
      '<input name="company" required maxlength="80" placeholder="例如：光影器材租赁" autocomplete="organization">' +
      "</label>" +
      '<div class="form-row">' +
      "<label>你的称呼" +
      '<input name="name" required maxlength="40" placeholder="怎么称呼你" autocomplete="name">' +
      "</label>" +
      "<label>经营品类" +
      '<select name="industry" id="industry-select">' +
      options +
      "<option>其他租赁业务</option>" +
      "</select>" +
      "</label>" +
      "</div>" +
      "<label>手机号或 Email" +
      '<input name="contact" required maxlength="120" minlength="5" placeholder="填写一种方便联系的方式">' +
      "</label>" +
      "<label>想重点了解什么 <span class=\"optional\">（选填）</span>" +
      '<textarea name="needs" maxlength="500" rows="3" placeholder="例如：多门店库存、长短租计费、企业会员…"></textarea>' +
      "</label>" +
      '<p class="preview-notice">' +
      previewNotice +
      "</p>" +
      '<button class="button primary form-submit" type="submit">预览预约结果 ' +
      icon("arrow") +
      "</button>" +
      "</form>"
    );
  }

  function demoResultTemplate(values) {
    if (isEmail(DEMO_EMAIL)) {
      var subject = "Rental OS 系统演示咨询 - " + values.company;
      var body = [
        "商户名称：" + values.company,
        "联系人：" + values.name,
        "经营品类：" + values.industry,
        "联系方式：" + values.contact,
        "重点了解：" + (values.needs || "未填写"),
      ].join("\n");
      var mailto =
        "mailto:" +
        DEMO_EMAIL +
        "?subject=" +
        encodeURIComponent(subject) +
        "&body=" +
        encodeURIComponent(body);

      return (
        '<div class="preview-result" role="status">' +
        icon("check") +
        "<h3>咨询内容已准备好</h3>" +
        "<p>信息没有上传到官网。点击下方按钮后，会打开你的邮件客户端，请确认收件人和内容后再发送。</p>" +
        '<a class="button primary" href="' +
        escapeHtml(mailto) +
        '">打开邮件客户端 ' +
        icon("arrow") +
        "</a>" +
        '<button type="button" class="button ghost modal-result-secondary" data-close>返回官网</button>' +
        "</div>"
      );
    }

    return (
      '<div class="preview-result" role="status">' +
      icon("check") +
      "<h3>预约表单预览完成</h3>" +
      "<p>当前尚未配置联系渠道，信息没有发送或保存。配置 site-config.js 后，提交结果可以交给你的邮件客户端确认发送。</p>" +
      '<button type="button" class="button primary" data-close>返回官网 ' +
      icon("arrow") +
      "</button>" +
      "</div>"
    );
  }

  function openDialog(kind) {
    if (!modal) return;
    opener = document.activeElement;

    var inner = $(".modal-inner", modal);
    if (!inner) return;

    inner.innerHTML =
      '<button type="button" class="modal-close" data-close aria-label="关闭弹窗">' +
      icon("close") +
      "</button>" +
      dialogTemplate(kind);

    var demoBody = $("[data-demo-body]", modal);
    if (demoBody) demoBody.innerHTML = demoFormTemplate();

    var select = $("#industry-select", modal);
    if (select) select.value = INDUSTRIES[industryIndex].name;

    modal.setAttribute("data-dialog", kind);
    if (typeof modal.showModal === "function") {
      modal.showModal();
    } else {
      modal.setAttribute("open", "");
    }

    document.body.classList.add("modal-open");

    // 弹窗内首个可操作控件获得焦点，键盘与读屏用户不会停在页面背后。
    var first = $("input, select, textarea, button:not(.modal-close)", inner);
    if (first) {
      try {
        first.focus({ preventScroll: true });
      } catch (e) {
        first.focus();
      }
    }
  }

  function closeDialog() {
    if (!modal) return;
    if (typeof modal.close === "function" && modal.open) {
      modal.close();
    } else {
      modal.removeAttribute("open");
    }
    document.body.classList.remove("modal-open");

    if (opener && typeof opener.focus === "function") {
      try {
        opener.focus({ preventScroll: true });
      } catch (e) {
        opener.focus();
      }
    }
    opener = null;
  }

  function handleDemoSubmit(form) {
    // 预览模式：仅做校验与结果展示，绝不发送或保存访客信息。
    var fields = $$("input[required], textarea[required]", form);
    var firstInvalid = null;

    fields.forEach(function (field) {
      var value = (field.value || "").trim();
      var invalid =
        !value || (field.minLength > 0 && value.length < field.minLength);
      field.classList.toggle("is-invalid", invalid);
      if (invalid && !firstInvalid) firstInvalid = field;
    });

    if (firstInvalid) {
      firstInvalid.focus();
      return;
    }

    var values = {
      company: (form.elements.company.value || "").trim(),
      name: (form.elements.name.value || "").trim(),
      industry: (form.elements.industry.value || "").trim(),
      contact: (form.elements.contact.value || "").trim(),
      needs: (form.elements.needs.value || "").trim(),
    };

    var body = $("[data-demo-body]", modal);
    if (body) body.innerHTML = demoResultTemplate(values);

    var result = $(".preview-result", modal);
    if (result) {
      var closeBtn = $("[data-close]", result);
      if (closeBtn) closeBtn.focus();
    }
  }

  /* ------------------------------------------------------------------ *
   * 移动端导航
   * ------------------------------------------------------------------ */

  function setMenuOpen(open) {
    var nav = $("#nav-links");
    var toggle = $("#menu-toggle");
    if (nav) nav.classList.toggle("open", open);
    if (toggle) {
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "关闭导航" : "打开导航");
      var iconSlot = $(".menu-icon", toggle);
      if (iconSlot) iconSlot.innerHTML = icon(open ? "close" : "menu");
    }
  }

  /* ------------------------------------------------------------------ *
   * 统一事件委托
   * ------------------------------------------------------------------ */

  function bindEvents() {
    document.addEventListener("click", function (event) {
      var target = event.target;
      if (!(target instanceof Element)) return;

      var industryBtn = target.closest("[data-industry]");
      if (industryBtn) {
        selectIndustry(Number(industryBtn.getAttribute("data-industry")), false);
        return;
      }

      var flowBtn = target.closest("[data-flow]");
      if (flowBtn) {
        selectFlow(Number(flowBtn.getAttribute("data-flow")), false);
        return;
      }

      if (target.closest("[data-flow-next]")) {
        selectFlow(flowIndex + 1, false);
        return;
      }

      if (target.closest("[data-demo]")) {
        setMenuOpen(false);
        openDialog("demo");
        return;
      }

      if (target.closest("[data-privacy]")) {
        openDialog("privacy");
        return;
      }

      if (target.closest("[data-login]")) {
        openDialog("login");
        return;
      }

      if (target.closest("[data-close]")) {
        closeDialog();
        return;
      }

      var toggle = target.closest("#menu-toggle");
      if (toggle) {
        var nav = $("#nav-links");
        setMenuOpen(!(nav && nav.classList.contains("open")));
        return;
      }

      // 点到弹窗遮罩空白处即关闭（与 React 版行为一致）。
      if (target === modal) {
        var rect = modal.getBoundingClientRect();
        var outside =
          event.clientX < rect.left ||
          event.clientX > rect.right ||
          event.clientY < rect.top ||
          event.clientY > rect.bottom;
        if (outside) closeDialog();
      }
    });

    // 移动端点击导航后收起面板。
    $$("#nav-links a").forEach(function (link) {
      link.addEventListener("click", function () {
        setMenuOpen(false);
      });
    });

    var tabs = $("#flow-tabs");
    if (tabs) tabs.addEventListener("keydown", handleFlowKeydown);

    if (modal) {
      modal.addEventListener("cancel", function (event) {
        event.preventDefault();
        closeDialog();
      });
      modal.addEventListener("close", function () {
        document.body.classList.remove("modal-open");
      });
    }

    document.addEventListener("submit", function (event) {
      var form = event.target;
      if (form instanceof HTMLFormElement && form.hasAttribute("data-demo-form")) {
        event.preventDefault();
        handleDemoSubmit(form);
      }
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && modal && modal.open === false) {
        var nav = $("#nav-links");
        if (nav && nav.classList.contains("open")) setMenuOpen(false);
      }
    });
  }

  /* ------------------------------------------------------------------ *
   * 启动
   * ------------------------------------------------------------------ */

  function init() {
    modal = $("#modal");
    renderIndustryStrip();
    renderIndustryMenu();
    renderIndustryPanel();
    renderFaqs();
    renderFlowTabs();
    renderFlowPanel();
    setupReveal();
    bindEvents();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
