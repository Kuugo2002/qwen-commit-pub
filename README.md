# Qwen Commit

基于 Qwen CLI 的 VS Code AI 提交消息生成器。

[🇺🇸 English](README.en.md) | **🇨🇳 中文**

![screenshot](https://raw.githubusercontent.com/darqus/qwen-commit-pub/refs/heads/main/static/ss_qwen_commit.png)

<video src="https://raw.githubusercontent.com/darqus/assets/527dfb8f6eb4de43ed235f2e11534a511115b757/video/qwen-commit.mp4" controls></video>

## 功能特性

- 🤖 **AI 生成提交消息** - 使用 Qwen AI 根据代码变更自动生成提交消息
- 📝 **约定式提交** - 遵循行业标准的 Conventional Commits 规范
- 🎯 **智能集成** - 无缝集成 VS Code 源代码管理面板
- 🌍 **多语言支持** - 支持英文、中文
- ⚡ **快速高效** - 使用本地 Qwen CLI 快速生成
- 🛑 **可取消** - 随时停止生成

## 环境要求

- 必须安装 [Qwen CLI](https://github.com/QwenLM/qwen-code) 并添加到系统 PATH
- 工作区已初始化 Git 仓库

## 安装


### 从 VSIX 安装

1. 从发布页面下载最新的 `.vsix` 文件
2. 打开 VS Code
3. 进入扩展面板 (Ctrl+Shift+X)
4. 点击 "..." 菜单 → "从 VSIX 安装..."
5. 选择下载的文件

### 安装 Qwen CLI

查看 [Qwen CLI 仓库](https://github.com/QwenLM/qwen-code) 的安装说明。

## 开发

### 前置要求

- Node.js 18+ 和 npm/yarn
- VS Code

### 设置

```bash
# 克隆仓库
git clone https://github.com/darqus/qwen-commit-pub.git
cd qwen-commit-pub

# 安装依赖
npm install
# 或
yarn install
```

### 构建

```bash
# 编译 TypeScript
npm run compile
# 或
yarn compile

# 开发监视模式
npm run watch
# 或
yarn watch
```

### 打包

```bash
# 创建 VSIX 包
npm run package
# 或
yarn package
```

### 本地安装

```bash
# 构建并安装（一步完成）
npm run build-and-install
# 或
yarn build-and-install

# 或手动安装 VSIX（版本号会自动替换）
code --install-extension qwen-commit-$(node -p "require('./package.json').version").vsix
```

### 更新依赖

```bash
# 更新所有依赖
npm update
# 或
yarn upgrade

# 检查过时的包
npm outdated
# 或
yarn outdated
```

## 使用方法

### 生成提交消息

1. 修改代码
2. 打开源代码管理面板 (Ctrl+Shift+G)
3. 在变更部分点击 Qwen 图标
4. 等待 AI 生成提交消息
5. 检查并提交

### 键盘快捷键

- 生成提交消息：点击源代码管理中的 Qwen 图标
- 停止生成：在生成过程中点击停止图标

## 提交消息格式

生成的消息遵循约定式提交规范：

```
<type>(<scope>): <subject>

<body>
```

**类型说明：**

- `feat` - 新功能
- `fix` - 修复 bug
- `docs` - 文档更新
- `style` - 代码格式调整
- `refactor` - 代码重构
- `perf` - 性能优化
- `test` - 测试相关
- `chore` - 构建/工具/配置维护
- `ci` - CI/CD 变更
- `build` - 构建系统变更

**示例：**

```
feat(auth): 添加 JWT 令牌验证

实现 JWT 令牌验证中间件以保护 API 端点。
包含令牌过期检查和签名验证。
```

## 配置

目前，扩展与 Qwen CLI 开箱即用。未来版本将包含可自定义的设置。

## 故障排除

### "Qwen CLI not found"

确保 Qwen CLI 已安装并添加到 PATH：

```bash
qwen --version
```

### "No changes to commit"

确保 Git 仓库中有未提交的变更。

### "Git extension not found"

确保 VS Code 内置的 Git 扩展已启用。

## 贡献

欢迎贡献！请随时提交 Pull Request。

## 许可证

MIT

## 致谢

由阿里巴巴云的 [Qwen AI](https://github.com/QwenLM/Qwen) 提供支持。
