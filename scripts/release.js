const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PUB_DIR = path.resolve(__dirname, '..');
const PACKAGE_JSON_PATH = path.join(PUB_DIR, 'package.json');

function exec(command, options = {}) {
  try {
    return execSync(command, {
      cwd: PUB_DIR,
      encoding: 'utf8',
      stdio: options.silent ? 'pipe' : 'inherit'
    }).trim();
  } catch (error) {
    if (options.silent) {
      return '';
    }
    throw error;
  }
}

function execInDir(dir, command) {
  execSync(command, {
    cwd: dir,
    encoding: 'utf8',
    stdio: 'inherit'
  });
}

function readPackageJson() {
  const content = fs.readFileSync(PACKAGE_JSON_PATH, 'utf8');
  return JSON.parse(content);
}

function writePackageJson(packageJson) {
  fs.writeFileSync(PACKAGE_JSON_PATH, JSON.stringify(packageJson, null, 2) + '\n');
}

function getLastReleaseCommit() {
  try {
    const commit = execSync('git log --oneline --grep="^chore: release v" -n 1 --pretty=format:"%H" 2>/dev/null', {
      encoding: 'utf8',
      cwd: PUB_DIR
    }).trim();
    return commit;
  } catch {
    return '';
  }
}

function getCommitsSinceLastRelease() {
  const lastReleaseCommit = getLastReleaseCommit();
  let commits;

  if (lastReleaseCommit) {
    commits = execSync(`git log ${lastReleaseCommit}..HEAD --pretty=format:"%s"`, {
      encoding: 'utf8',
      cwd: PUB_DIR
    });
  } else {
    commits = execSync('git log --pretty=format:"%s" -n 100', {
      encoding: 'utf8',
      cwd: PUB_DIR
    });
  }

  return commits.split('\n').filter(Boolean);
}

function determineVersionType(commits) {
  for (const commit of commits) {
    if (commit.includes('BREAKING') || commit.includes('!:')) {
      return 'major';
    }
  }

  for (const commit of commits) {
    if (commit.startsWith('feat') || commit.startsWith('feat(')) {
      return 'minor';
    }
  }

  return 'patch';
}

function incrementVersion(version, type) {
  const parts = version.split('.').map(Number);

  switch (type) {
    case 'major':
      parts[0]++;
      parts[1] = 0;
      parts[2] = 0;
      break;
    case 'minor':
      parts[1]++;
      parts[2] = 0;
      break;
    case 'patch':
      parts[2]++;
      break;
  }

  return parts.join('.');
}

function checkWorkingDirectoryClean() {
  const status = execSync('git status --porcelain', {
    encoding: 'utf8',
    cwd: PUB_DIR
  }).trim();

  return status.length === 0;
}

function getCurrentBranch() {
  return execSync('git rev-parse --abbrev-ref HEAD', {
    encoding: 'utf8',
    cwd: PUB_DIR
  }).trim();
}

async function release() {
  console.log('=== 🚀 新版本发布 ===\n');

  // 1. 检查工作目录是否干净
  console.log('1. 检查工作目录是否干净...');
  if (!checkWorkingDirectoryClean()) {
    console.error('❌ 工作目录不干净。请在发布前提交或撤销更改。');
    process.exit(1);
  }
  console.log('✓ 工作目录干净\n');

  // 2. 检查当前分支
  const branch = getCurrentBranch();
  if (branch !== 'main' && branch !== 'master') {
    console.warn(`⚠️  您当前在分支 "${branch}" 上。发布应从 main/master 分支进行。`);
    process.exit(1);
  }

  // 3. 读取当前版本
  console.log('2. 读取当前版本...');
  const packageJson = readPackageJson();
  const currentVersion = packageJson.version;
  console.log(`   当前版本：${currentVersion}\n`);

  // 4. 获取上次发布以来的提交
  console.log('3. 分析提交...');
  const commits = getCommitsSinceLastRelease();
  const lastReleaseCommit = getLastReleaseCommit();

  if (commits.length === 0) {
    console.log('⚠️  自上次发布以来没有新的提交。');
  }

  console.log(`   自上次发布以来的提交数：${commits.length}`);

  // 5. 确定发布类型
  const versionType = determineVersionType(commits);
  console.log(`   发布类型：${versionType}\n`);

  // 6. 计算新版本
  const newVersion = incrementVersion(currentVersion, versionType);
  console.log(`4. 新版本：${newVersion}\n`);

  console.log('=== 开始发布 ===\n');

  // 7. 更新 package.json 中的版本
  console.log('5. 更新 package.json 中的版本...');
  packageJson.version = newVersion;
  writePackageJson(packageJson);
  console.log(`✓ 版本已更新：${newVersion}\n`);

  // 8. 构建
  console.log('6. 构建 (npm run build)...');
  try {
    execInDir(PUB_DIR, 'npm run build');
    console.log('✓ 构建完成\n');
  } catch (error) {
    console.error('❌ 构建错误！');
    process.exit(1);
  }

  // 9. 在公共仓库中提交和打标签
  console.log('7. 在公共仓库中创建提交和标签...');
  execInDir(PUB_DIR, 'git add .');
  execInDir(PUB_DIR, `git commit -m "chore: release v${newVersion}"`);
  execInDir(PUB_DIR, `git tag v${newVersion}`);
  console.log(`✓ 提交和标签 v${newVersion} 已创建\n`);

  // 10. Push
  console.log('8. Push 更改和标签...');
  try {
    execInDir(PUB_DIR, 'git push origin HEAD');
    execInDir(PUB_DIR, 'git push origin --tags');
    console.log('✓ 已 Push 到公共仓库\n');
  } catch (error) {
    console.error('❌ Push 错误！');
    console.error('更改已在本地提交。请手动执行 push。');
    process.exit(1);
  }

  console.log('\n=== ✅ 发布完成！===\n');
  console.log(`📦 版本：v${newVersion}`);
  console.log(`🔗 公共仓库：${PUB_DIR}`);
  console.log('\n后续步骤:');
  console.log('   • 手动发布到 VS Code Marketplace');
  console.log(`   • 安装扩展：code-insiders --install-extension ${PUB_DIR}/qwen-commit-${newVersion}.vsix\n`);
}

// 启动
release().catch((error) => {
  console.error('❌ 发布错误:', error.message);
  process.exit(1);
});
