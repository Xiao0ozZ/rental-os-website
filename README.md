# Rental OS 官网

这是 Rental OS 的独立原生静态官网，不需要 Node.js、npm、React、Vite 或其他打包工具。

## 本地查看

建议通过静态文件服务器预览，也可以将整个仓库交给任意静态托管服务。Hero 轮播清单需要通过 HTTP 读取。

## GitHub Pages

仓库已配置 `.github/workflows/pages.yml`。推送到 `main` 后，GitHub Actions 会将 `index.html` 与 `assets/` 发布到 Pages。

首次使用时，在 GitHub 仓库的 **Settings → Pages** 中将发布来源设为 **GitHub Actions**。页面地址通常为：

`https://你的账号.github.io/rental-os-website/`

## 文件说明

- `index.html`：官网页面、样式与 SEO 信息
- `assets/`：官网使用的本地图片素材
- Hero 图片按 `hero-<name>.<png|jpg|jpeg|webp>` 命名；运行 `scripts/generate-hero-manifest.ps1` 后最多加入 3 张。页面运行时会校验清单中的文件，已删除的图片自动跳过。
- `robots.txt` / `sitemap.xml`：搜索引擎抓取规则与站点地图
- `favicon.ico`：浏览器标签页图标（来自项目品牌资源）
- `.github/workflows/pages.yml`：GitHub Pages 自动发布工作流
