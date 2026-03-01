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
  console.log('=== 🚀 Релиз новой версии ===\n');

  // 1. Проверка чистоты working directory
  console.log('1. Проверка чистоты working directory...');
  if (!checkWorkingDirectoryClean()) {
    console.error('❌ Working directory не чистый. Закоммитьте или отмените изменения перед релизом.');
    process.exit(1);
  }
  console.log('✓ Working directory чистый\n');

  // 2. Проверка текущей ветки
  const branch = getCurrentBranch();
  if (branch !== 'main' && branch !== 'master') {
    console.warn(`⚠️  Вы находитесь на ветке "${branch}". Релиз делается с main/master.`);
    process.exit(1);
  }

  // 3. Чтение текущей версии
  console.log('2. Чтение текущей версии...');
  const packageJson = readPackageJson();
  const currentVersion = packageJson.version;
  console.log(`   Текущая версия: ${currentVersion}\n`);

  // 4. Получение коммитов с последнего релиза
  console.log('3. Анализ коммитов...');
  const commits = getCommitsSinceLastRelease();
  const lastReleaseCommit = getLastReleaseCommit();

  if (commits.length === 0) {
    console.log('⚠️  Нет новых коммитов с последнего релиза.');
  }

  console.log(`   Коммитов с последнего релиза: ${commits.length}`);

  // 5. Определение типа релиза
  const versionType = determineVersionType(commits);
  console.log(`   Тип релиза: ${versionType}\n`);

  // 6. Вычисление новой версии
  const newVersion = incrementVersion(currentVersion, versionType);
  console.log(`4. Новая версия: ${newVersion}\n`);

  console.log('=== Начало релиза ===\n');

  // 7. Обновление версии в package.json
  console.log('5. Обновление версии в package.json...');
  packageJson.version = newVersion;
  writePackageJson(packageJson);
  console.log(`✓ Версия обновлена: ${newVersion}\n`);

  // 8. Сборка
  console.log('6. Сборка (npm run build)...');
  try {
    execInDir(PUB_DIR, 'npm run build');
    console.log('✓ Сборка завершена\n');
  } catch (error) {
    console.error('❌ Ошибка при сборке!');
    process.exit(1);
  }

  // 9. Коммит и тег в публичном репозитории
  console.log('7. Создание коммита и тега в публичном репозитории...');
  execInDir(PUB_DIR, 'git add .');
  execInDir(PUB_DIR, `git commit -m "chore: release v${newVersion}"`);
  execInDir(PUB_DIR, `git tag v${newVersion}`);
  console.log(`✓ Коммит и тег v${newVersion} созданы\n`);

  // 10. Push
  console.log('8. Push изменений и тегов...');
  try {
    execInDir(PUB_DIR, 'git push origin HEAD');
    execInDir(PUB_DIR, 'git push origin --tags');
    console.log('✓ Push в публичный репозиторий завершён\n');
  } catch (error) {
    console.error('❌ Ошибка при push!');
    console.error('Изменения закоммичены локально. Выполните push вручную.');
    process.exit(1);
  }

  console.log('\n=== ✅ Релиз завершён! ===\n');
  console.log(`📦 Версия: v${newVersion}`);
  console.log(`🔗 Публичный репозиторий: ${PUB_DIR}`);
  console.log('\nСледующие шаги:');
  console.log('   • Опубликовать в VS Code Marketplace вручную');
  console.log(`   • Установить расширение: code-insiders --install-extension ${PUB_DIR}/qwen-commit-${newVersion}.vsix\n`);
}

// Запуск
release().catch((error) => {
  console.error('❌ Ошибка релиза:', error.message);
  process.exit(1);
});
