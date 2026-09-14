# Rental OS 官网

这是一个独立的原生静态网站，不需要 Node.js、npm、React、Vite 或其他打包工具。

## 本地查看

直接双击 `index.html` 即可打开。也可以把整个文件夹放到任意静态文件服务器上。

## 发布到 GitHub Pages（最简单的方式）

这个目录应作为一个**独立 GitHub 仓库的根目录**使用，不要把上一级 `rental-OS` 主项目整个上传成官网仓库。

1. 在 GitHub 新建一个 **Public** 仓库，例如 `rental-os-website`，这样发布后的页面可被公网访问。
2. 把本目录里面的网页文件和 `images/` 文件夹上传到仓库根目录。仓库根目录应直接看到 `index.html`、`style.css` 和 `images/`，不要多套一层 `rental-os-website/` 文件夹。
3. 在仓库的 **Settings → Pages** 中，将 **Source** 设为 **Deploy from a branch**，选择 `main` 和 `/(root)`，点击 **Save**。
4. 等待一会儿，GitHub 会提供类似 `https://你的账号.github.io/rental-os-website/` 的公网地址。

如果你希望以后每次提交都通过工作流发布，也可以把本目录中的 `.github/workflows/pages.yml` 一并上传，然后在 Pages 的 **Source** 中选择 **GitHub Actions**。

工作流只把网页运行所需的静态文件放进发布包，`README.md`、`.github/`、`_dev/` 和素材提示文件不会被发布到网页目录。

## 发布前配置

如果需要让访客打开真实管理端或发送演示咨询，修改 `site-config.js`：

```js
window.RENTAL_OS_SITE_CONFIG = {
  adminUrl: "https://你的管理端地址/",
  demoEmail: "你的咨询邮箱@example.com",
};
```

- `adminUrl` 留空时，“管理端登录”只显示说明，不会收集账号密码。
- `demoEmail` 留空时，“预约演示”只做本地预览，不发送、不保存信息。
- 配置 `demoEmail` 后，表单提交只会生成一封 `mailto` 草稿，由访客在自己的邮件客户端中检查并确认发送；官网本身仍不接收表单数据。

## 文件说明

- `index.html`：页面结构与 SEO 信息
- `style.css`：响应式样式
- `script.js`：行业切换、流程演示、弹窗与表单交互
- `site-config.js`：发布时可选的管理端和咨询邮箱配置
- `images/`：官网场景图
- `.github/workflows/pages.yml`：GitHub Pages 自动发布工作流
