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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const i18n_1 = require("./i18n");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
/**
 * 执行命令并通过 stdin 传递数据
 */
function execWithStdin(command, options, stdinData) {
    return new Promise((resolve, reject) => {
        // Windows 使用 shell: true 以正确运行 .cmd/.bat 文件
        // macOS/Linux 也需要 shell: true 以运行 npm global 包（如 qwen 等）
        const isWindows = process.platform === 'win32';
        const isMacOrLinux = process.platform === 'darwin' || process.platform === 'linux';
        const useShell = isWindows || isMacOrLinux;
        const child = (0, child_process_1.spawn)(command, {
            cwd: options.cwd,
            stdio: ['pipe', 'pipe', 'pipe'],
            shell: useShell,
        });
        let stdout = '';
        let stderr = '';
        child.stdout.on('data', (data) => {
            stdout += data.toString();
        });
        child.stderr.on('data', (data) => {
            stderr += data.toString();
        });
        // 通过 AbortSignal 处理取消
        if (options.signal) {
            options.signal.addEventListener('abort', () => {
                child.kill('SIGTERM');
                reject(new Error('AbortError'));
            });
        }
        child.on('close', (code) => {
            if (code === 0) {
                resolve({ stdout });
            }
            else {
                reject(new Error(stderr || `Process exited with code ${code}`));
            }
        });
        child.on('error', reject);
        // 将数据写入 stdin 并关闭流
        child.stdin.write(stdinData);
        child.stdin.end();
    });
}
// 全局状态用于跟踪生成
let isGenerating = false;
let abortController = null;
let statusBarItem;
function activate(context) {
    (0, i18n_1.initLocale)();
    console.log("Qwen Commit extension is now active");
    // 初始化 context key 以控制按钮可见性
    vscode.commands.executeCommand("setContext", "qwen-commit.isGenerating", false);
    // 创建 status bar item 用于显示状态
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    statusBarItem.name = "Qwen Commit";
    statusBarItem.command = "qwen-commit.generateCommitMessage";
    context.subscriptions.push(statusBarItem);
    updateStatusBar(false);
    // 生成提交消息命令
    const generateDisposable = vscode.commands.registerCommand("qwen-commit.generateCommitMessage", async () => {
        if (isGenerating) {
            vscode.window.showWarningMessage((0, i18n_1.t)("alreadyGenerating"));
            return;
        }
        await generateCommitMessage(context);
    });
    // 停止生成命令
    const stopDisposable = vscode.commands.registerCommand("qwen-commit.stopGeneration", async () => {
        if (abortController) {
            abortController.abort();
            isGenerating = false;
            vscode.commands.executeCommand("setContext", "qwen-commit.isGenerating", false);
            updateStatusBar(false);
            vscode.window.showInformationMessage((0, i18n_1.t)("generationStopped"));
        }
    });
    context.subscriptions.push(generateDisposable, stopDisposable);
}
function updateStatusBar(generating) {
    if (statusBarItem) {
        if (generating) {
            statusBarItem.text = (0, i18n_1.t)("statusBarGenerating");
            statusBarItem.tooltip = (0, i18n_1.t)("tooltipStop");
            statusBarItem.command = "qwen-commit.stopGeneration";
            statusBarItem.backgroundColor = new vscode.ThemeColor("statusBarItem.warningBackground");
            statusBarItem.show();
        }
        else {
            statusBarItem.text = (0, i18n_1.t)("statusBarIdle");
            statusBarItem.tooltip = (0, i18n_1.t)("tooltipGenerate");
            statusBarItem.command = "qwen-commit.generateCommitMessage";
            statusBarItem.backgroundColor = undefined;
            statusBarItem.hide();
        }
    }
}
async function generateCommitMessage(context) {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
        vscode.window.showErrorMessage((0, i18n_1.t)("noWorkspace"));
        return;
    }
    const workspacePath = workspaceFolders[0].uri.fsPath;
    try {
        // 检查目录是否为 git 仓库
        let isGitRepo = true;
        try {
            await execAsync("git rev-parse --git-dir", { cwd: workspacePath });
        }
        catch {
            isGitRepo = false;
        }
        if (!isGitRepo) {
            const action = await vscode.window.showErrorMessage((0, i18n_1.t)("notGitRepo"), { modal: true }, { title: (0, i18n_1.t)("initRepo") }, { title: (0, i18n_1.t)("cancel"), isCloseAffordance: true });
            if (action?.title === (0, i18n_1.t)("initRepo")) {
                try {
                    await execAsync("git init", { cwd: workspacePath });
                    vscode.window.showInformationMessage((0, i18n_1.t)("repoInitialized"));
                    // 初始化后递归调用函数
                    return await generateCommitMessage(context);
                }
                catch (initError) {
                    vscode.window.showErrorMessage((0, i18n_1.t)("gitError", initError instanceof Error ? initError.message : (0, i18n_1.t)("unknownError")));
                }
            }
            return;
        }
        // 获取变更文件列表
        const { stdout: gitStatus } = await execAsync("git status --porcelain", {
            cwd: workspacePath,
        });
        if (!gitStatus.trim()) {
            vscode.window.showInformationMessage((0, i18n_1.t)("noChanges"));
            return;
        }
        // 检查是否配置了 git credentials
        const credentialsConfigured = await checkGitCredentials(workspacePath);
        if (!credentialsConfigured) {
            const action = await vscode.window.showErrorMessage((0, i18n_1.t)("gitCredentialsMissing"), { modal: true }, { title: (0, i18n_1.t)("configureGit") }, { title: (0, i18n_1.t)("cancel"), isCloseAffordance: true });
            if (action?.title === (0, i18n_1.t)("configureGit")) {
                await configureGitCredentials(workspacePath);
            }
            return;
        }

        // 自动将所有变更添加到暂存区
        await execAsync("git add .", {
            cwd: workspacePath,
        });

        // 检查 HEAD 是否存在（仓库中是否有提交）
        let hasHead = true;
        try {
            await execAsync("git rev-parse HEAD", { cwd: workspacePath });
        }
        catch {
            hasHead = false;
        }
        let diffToUse = "";
        if (hasHead) {
            // 使用 staged 文件（已添加到索引的文件）
            const { stdout: stagedDiff } = await execAsync("git diff --cached HEAD", {
                cwd: workspacePath,
            });
            if (!stagedDiff.trim()) {
                vscode.window.showInformationMessage((0, i18n_1.t)("noChangesToAnalyze"));
                return;
            }
            diffToUse = stagedDiff;
        }
        else {
            // 仓库为空（没有提交）
            const { stdout: stagedDiff } = await execAsync("git diff --cached", {
                cwd: workspacePath,
            });
            if (stagedDiff.trim()) {
                // 有 staged 文件 — 使用它们
                diffToUse = stagedDiff;
            }
            else {
                // 没有 staged 文件 — 提示用户
                const action = await vscode.window.showInformationMessage((0, i18n_1.t)("emptyRepoNoStaged"), { modal: true }, { title: (0, i18n_1.t)("stageFiles") }, { title: (0, i18n_1.t)("cancel"), isCloseAffordance: true });
                if (action?.title === (0, i18n_1.t)("stageFiles")) {
                    vscode.env.clipboard.writeText(`# 添加文件到 staging area:\ngit add .\n\n# 然后通过 Qwen Commit 生成提交消息`);
                    vscode.window.showInformationMessage((0, i18n_1.t)("commandsCopied"));
                }
                return;
            }
        }
        await generateMessageWithQwen(diffToUse, workspacePath, context);
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : (0, i18n_1.t)("unknownError");
        vscode.window.showErrorMessage((0, i18n_1.t)("gitError", errorMessage));
    }
}
async function generateMessageWithQwen(diff, workspacePath, context) {
    isGenerating = true;
    abortController = new AbortController();
    // 更新 context key 以切换图标
    vscode.commands.executeCommand("setContext", "qwen-commit.isGenerating", true);
    updateStatusBar(true);
    const progressOptions = {
        location: vscode.ProgressLocation.Notification,
        title: (0, i18n_1.t)("progressTitle"),
        cancellable: true,
    };
    try {
        // 检查 qwen cli 是否存在
        try {
            // Windows 使用 shell: true 以正确运行 .cmd/.bat 文件
            // macOS/Linux 也需要 shell: true 以运行 npm global 包
            const options = {
                cwd: workspacePath,
                shell: true,
            };
            await execAsync("qwen --version", options);
        }
        catch {
            vscode.window.showErrorMessage((0, i18n_1.t)("qwenCliNotFound"));
            isGenerating = false;
            abortController = null;
            vscode.commands.executeCommand("setContext", "qwen-commit.isGenerating", false);
            updateStatusBar(false);
            return;
        }
        await vscode.window.withProgress(progressOptions, async (progress, token) => {
            // 通过进度令牌处理取消
            token.onCancellationRequested(() => {
                if (abortController) {
                    abortController.abort();
                }
            });
            progress.report({ increment: 10 });
            // 为 qwen cli 生成提示
            const prompt = `Generate a short and concise commit message based on the code changes below.

**ALWAYS respond in Chinese only**

Changes:
${diff}`;
            progress.report({ increment: 20 });
            // 通过 stdin 调用 qwen cli（避免 E2BIG）
            const { stdout } = await execWithStdin("qwen", {
                cwd: workspacePath,
                signal: abortController?.signal,
            }, prompt);
            progress.report({ increment: 50 });
            let commitMessage = stdout.trim();
            // 移除 markdown 格式和 code blocks
            // 首先从 code blocks 提取内容
            const codeBlockMatch = commitMessage.match(/```(?:\w+)?\s*([\s\S]*?)```/);
            if (codeBlockMatch) {
                commitMessage = codeBlockMatch[1].trim();
            }
            // 然后清理其他格式
            commitMessage = commitMessage
                .replace(/```/g, '') // 移除剩余的 ```
                .replace(/\*\*/g, '') // 移除 **
                .replace(/\*/g, '') // 移除 *
                .replace(/`/g, '') // 移除 `
                .replace(/\n{3,}/g, '\n\n') // 最多 2 个空行
                .trim();
            if (commitMessage) {
                // 将消息插入 Git SCM 输入框
                await setGitInputBoxValue(commitMessage);
                vscode.window.showInformationMessage((0, i18n_1.t)("commitGenerated"));
            }
            else {
                vscode.window.showWarningMessage((0, i18n_1.t)("emptyMessage"));
            }
            progress.report({ increment: 20 });
        });
    }
    catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
            // 生成已取消
            vscode.window.showInformationMessage((0, i18n_1.t)("generationCancelled"));
            return;
        }
        const errorMessage = error instanceof Error ? error.message : (0, i18n_1.t)("unknownError");
        // E2BIG 特殊处理（使用 stdin 时不应出现）
        if (errorMessage.includes("E2BIG")) {
            vscode.window.showErrorMessage((0, i18n_1.t)("qwenCliTooLargeDiff"));
        }
        else {
            vscode.window.showErrorMessage((0, i18n_1.t)("qwenError", errorMessage));
        }
        console.error("Qwen CLI error:", error);
    }
    finally {
        isGenerating = false;
        abortController = null;
        vscode.commands.executeCommand("setContext", "qwen-commit.isGenerating", false);
        updateStatusBar(false);
    }
}
async function setGitInputBoxValue(message) {
    const gitExtension = vscode.extensions.getExtension("vscode.git");
    if (!gitExtension) {
        throw new Error((0, i18n_1.t)("gitExtensionNotFound"));
    }
    const git = gitExtension.isActive ? gitExtension.exports : await gitExtension.activate();
    const api = git.getAPI(1);
    if (api.repositories.length === 0) {
        throw new Error((0, i18n_1.t)("gitRepoNotFound"));
    }
    api.repositories[0].inputBox.value = message;
}
/**
 * 检查是否配置了 git credentials（user.name 和 user.email）
 */
async function checkGitCredentials(workspacePath) {
    try {
        // 检查 user.name
        const { stdout: userName } = await execAsync("git config user.name", {
            cwd: workspacePath,
        });
        // 检查 user.email
        const { stdout: userEmail } = await execAsync("git config user.email", {
            cwd: workspacePath,
        });
        return userName.trim().length > 0 && userEmail.trim().length > 0;
    }
    catch {
        return false;
    }
}
/**
 * 通过输入框配置 git credentials
 */
async function configureGitCredentials(workspacePath) {
    // 请求输入用户名
    const userName = await vscode.window.showInputBox({
        prompt: (0, i18n_1.t)("gitUserNamePrompt"),
        placeHolder: "John Doe",
        ignoreFocusOut: true,
    });
    if (!userName) {
        return;
    }
    // 请求输入邮箱
    const userEmail = await vscode.window.showInputBox({
        prompt: (0, i18n_1.t)("gitUserEmailPrompt"),
        placeHolder: "johndoe@example.com",
        ignoreFocusOut: true,
    });
    if (!userEmail) {
        return;
    }
    // 在本地（项目级别）设置配置
    try {
        await execAsync(`git config user.name "${userName}"`, {
            cwd: workspacePath,
        });
        await execAsync(`git config user.email "${userEmail}"`, {
            cwd: workspacePath,
        });
        vscode.window.showInformationMessage((0, i18n_1.t)("gitConfigured"));
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : (0, i18n_1.t)("unknownError");
        vscode.window.showErrorMessage((0, i18n_1.t)("gitError", errorMessage));
    }
}
function deactivate() {
    if (statusBarItem) {
        statusBarItem.dispose();
    }
    console.log("Qwen Commit extension is now deactivated");
}
