# favhub 收藏助手 Chrome 插件

这是一个Chrome插件，可以帮助你快速将网页收藏到 favhub 系统（基于 GitHub Issues）。

## 功能特点

- 🔖 一键收藏当前网页到你的 favhub 仓库
- 📝 自动提取网页标题和描述
- 🏷️ 支持添加自定义标签
- 🔍 右键菜单快速收藏
- 💾 保存你的 GitHub 仓库设置

## 安装方法

### 开发者模式安装

1. 下载或克隆此仓库到本地
2. 打开 Chrome 浏览器，进入扩展管理页面 (chrome://extensions/)
3. 开启右上角的 "开发者模式"
4. 点击 "加载已解压的扩展程序"
5. 选择此仓库中的 `chrome-extension` 文件夹

## 使用方法

### 首次设置

1. 安装插件后，点击工具栏中的 favhub 图标
2. 在弹出窗口中，输入你的 GitHub 仓库信息（格式：`用户名/仓库名`）
3. 点击 "保存" 按钮确认

### 收藏网页

**方式一：使用弹出窗口**

1. 在想要收藏的网页上，点击工具栏中的 favhub 图标
2. 插件会自动填充网页标题和地址
3. 添加描述和选择标签
4. 点击 "保存收藏" 按钮
5. 将自动打开 GitHub Issues 创建页面，确认无误后提交

**方式二：使用右键菜单**

1. 在网页上右键点击，选择 "收藏到 favhub"
2. 将自动打开 GitHub Issues 创建页面
3. 补充描述和标签后提交

## 注意事项

- 需要先设置正确的 GitHub 仓库信息
- 该仓库需要是 favhub 格式（包含正确的 Issue 模板和 Action）
- 收藏成功后，GitHub Actions 会自动更新你的 favhub 网站数据

## 项目结构

```
chrome-extension/
├── manifest.json    // 插件清单文件
├── popup.html       // 弹出窗口 HTML
├── popup.css        // 弹出窗口样式
├── popup.js         // 弹出窗口脚本
├── background.js    // 后台脚本（右键菜单）
└── icon.svg           // 图标文件
```

## 其他帮助

如果你还没有 favhub 仓库，可以前往 [mewcoder/favhub](https://github.com/mewcoder/favhub) 查看如何创建。 