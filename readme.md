<p align="center">
  <img src="logo.svg" alt="favhub logo" width="128" height="128">
  <h1 align="center">favhub 收藏管理</h1>
</p>

📚 使用 GitHub Issues 管理收藏，并通过 GitHub Pages 展示的个人收藏网站。让你的书签管理更加高效！

## ✨ 主要功能

- 📝 使用 Issue 录入新的收藏条目，通过特殊标识 `[收藏]` 进行区分
- 🤖 使用 GitHub Action 监听 Issue 变化，自动将收藏数据保存为 JSON
- 🎨 使用 GitHub Pages 展示收藏内容，基于 Tailwind CSS 构建美观的界面

## 📋 条目字段

每个收藏条目包含以下字段：
- 📌 **title**: 收藏项的标题
- 🔗 **url**: 收藏项的链接
- 📄 **description**: 收藏项的描述
- 🏷️ **tags**: 标签列表（支持多选）

## 🚀 如何使用

###  添加新收藏

有两种方式添加新的收藏：

- 🖱️ 在网站上点击"添加新收藏"按钮，填写 Issue 模板
- ➕ 直接在 GitHub 仓库创建一个新 Issue，标题必须包含 `[收藏]` 标识

填写表单时可以选择多个标签，也可以添加自定义标签。


###  部署说明

1. 🍴 Fork 本仓库
2. ⚙️ 启用 GitHub Pages（Settings > Pages > Source 选择 main 分支）
3. ⏳ 等待 GitHub Action 自动构建并部署
4. 🌐 访问 `https://[你的用户名].github.io/[仓库名]` 查看站点

## 🔧 技术细节

- 🎭 前端：HTML + Tailwind CSS + 原生 JavaScript
- 💾 数据存储：GitHub Issues 转换为 JSON 文件
- 🤖 自动化：GitHub Actions
- 🚀 部署：GitHub Pages

## ⚙️ 自定义

- 📝 修改 `.github/ISSUE_TEMPLATE/favorite.yml` 可以自定义 Issue 模板和预设标签
- 🔧 修改 `.github/scripts/sync-issues.js` 中的 `COMMON_TAGS` 可以更改常用标签列表
- 🎨 修改 `index.html` 可以自定义界面外观

## 👥 贡献

欢迎提交 Pull Request 或提出建议！💡

## 📜 许可

MIT License