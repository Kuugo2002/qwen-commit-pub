"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.initLocale = initLocale;
exports.t = t;
const vscode = __importStar(require("vscode"));
const translations = {
    zh: {
        statusBarGenerating: "$(sync~spin) Qwen 正在生成...",
        statusBarIdle: "$(qwen-icon) Qwen Commit",
        tooltipStop: "点击停止",
        tooltipGenerate: "点击生成提交消息",
        alreadyGenerating: "生成已在进行中",
        generationStopped: "生成已停止",
        noWorkspace: "没有打开的工作区文件夹",
        noChanges: "没有要提交的变化",
        noChangesToAnalyze: "没有要分析的变化",
        commitGenerated: "提交消息已生成！",
        emptyMessage: "Qwen 返回空消息",
        generationCancelled: "生成已取消",
        gitError: "Git 错误：{0}",
        qwenError: "Qwen CLI 错误：{0}",
        qwenCliNotFound: "未找到 Qwen CLI。请使用以下命令安装：npm install -g @qwen-code/qwen-code@latest",
        qwenCliTooLargeDiff: "diff 太大。请尝试提交较小的更改。",
        gitExtensionNotFound: "未找到 Git 扩展",
        gitRepoNotFound: "未找到 Git 仓库",
        unknownError: "未知错误",
        progressTitle: "Qwen 正在生成提交消息...",
        notGitRepo: "目录不是 git 仓库",
        initRepo: "初始化仓库",
        cancel: "取消",
        repoInitialized: "Git 仓库已初始化",
        emptyRepoNoStaged: "仓库为空且暂存区没有文件。请在生成提交消息前使用 `git add .` 添加文件。",
        stageFiles: "显示命令",
        commandsCopied: "命令已复制到剪贴板",
        gitCredentialsMissing: "Git 未配置。请设置您的姓名和邮箱以继续。",
        configureGit: "配置 Git",
        gitConfigured: "Git 配置成功",
        gitUserNamePrompt: "输入您的 Git 用户名",
        gitUserEmailPrompt: "输入您的 Git 邮箱",
    },
    en: {
        statusBarGenerating: "$(sync~spin) Qwen generating...",
        statusBarIdle: "$(qwen-icon) Qwen Commit",
        tooltipStop: "Click to stop",
        tooltipGenerate: "Click to generate commit message",
        alreadyGenerating: "Generation already in progress",
        generationStopped: "Generation stopped",
        noWorkspace: "No workspace folders open",
        noChanges: "No changes to commit",
        noChangesToAnalyze: "No changes to analyze",
        commitGenerated: "Commit message generated!",
        emptyMessage: "Qwen returned empty message",
        generationCancelled: "Generation cancelled",
        gitError: "Git error: {0}",
        qwenError: "Qwen CLI error: {0}",
        qwenCliNotFound: "Qwen CLI not found. Install it with: npm npm install -g @qwen-code/qwen-code@latest",
        qwenCliTooLargeDiff: "Diff is too large. Try committing smaller changes.",
        gitExtensionNotFound: "Git extension not found",
        gitRepoNotFound: "Git repository not found",
        unknownError: "Unknown error",
        progressTitle: "Qwen generating commit message...",
        notGitRepo: "Directory is not a git repository",
        initRepo: "Initialize Repository",
        cancel: "Cancel",
        repoInitialized: "Git repository initialized",
        emptyRepoNoStaged: "Repository is empty and no files in staging area. Add files with `git add .` before generating commit message.",
        stageFiles: "Show Commands",
        commandsCopied: "Commands copied to clipboard",
        gitCredentialsMissing: "Git is not configured. Please set your name and email to continue.",
        configureGit: "Configure Git",
        gitConfigured: "Git configured successfully",
        gitUserNamePrompt: "Enter your Git user name",
        gitUserEmailPrompt: "Enter your Git user email",
    },
};
let currentLocale = "en";
function initLocale() {
    const vscodeLang = vscode.env.language;
    currentLocale = vscodeLang.startsWith("zh") ? "zh" : "en";
}
function t(key, ...args) {
    let message = translations[currentLocale][key] || translations.en[key];
    args.forEach((arg, i) => {
        message = message.replace(`{${i}}`, arg);
    });
    return message;
}
