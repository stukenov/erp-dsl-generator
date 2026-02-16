#!/usr/bin/env node

import { erpLexer } from './parser/lexer.js';
import { simpleParser } from './parser/simple-parser.js';
import { SimpleASTBuilder } from './parser/simple-ast-builder.js';
import { CIRConverter } from './cir/converter.js';
import { SQLiteGenerator } from './generators/sqlite-generator.js';
import { SQLiteBackendGenerator } from './generators/sqlite-backend-generator.js';
import { RefineGenerator } from './generators/refine-generator.js';
import chalk from 'chalk';
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'fs';
import { join, basename, extname, resolve } from 'path';
import { spawn } from 'child_process';
import * as yaml from 'yaml';

// Получаем папку из аргументов командной строки
const inputFolder = process.argv[2];

if (!inputFolder) {
  console.error(chalk.red('❌ Ошибка: Не указана папка с .erp файлами'));
  console.log(chalk.blue('📖 Использование:'));
  console.log(chalk.yellow('  npm run demo:folder <путь_к_папке>'));
  console.log(chalk.yellow('  tsx src/folder-demo.ts ./my-erp-project'));
  console.log(chalk.yellow('  tsx src/folder-demo.ts /path/to/erp/files'));
  console.log('');
  console.log(chalk.gray('Пример структуры папки:'));
  console.log(chalk.gray('  my-project/'));
  console.log(chalk.gray('  ├── domain.erp          # Основные сущности'));
  console.log(chalk.gray('  ├── sales.erp           # Модуль продаж'));
  console.log(chalk.gray('  ├── inventory.erp       # Модуль склада'));
  console.log(chalk.gray('  ├── security.erp        # Роли и права'));
  console.log(chalk.gray('  └── erp.yaml            # Конфигурация (опционально)'));
  process.exit(1);
}

const folderPath = resolve(inputFolder);

// Проверяем существование папки
if (!existsSync(folderPath)) {
  console.error(chalk.red(`❌ Папка не существует: ${folderPath}`));
  process.exit(1);
}

if (!statSync(folderPath).isDirectory()) {
  console.error(chalk.red(`❌ Указанный путь не является папкой: ${folderPath}`));
  process.exit(1);
}

console.log(chalk.blue('🚀 ERP Core - Генерация из реальных .erp файлов\n'));
console.log(chalk.gray(`📁 Исходная папка: ${folderPath}`));

// Функция для поиска всех .erp файлов в папке
function findERPFiles(dir: string): string[] {
  const files: string[] = [];
  
  try {
    const entries = readdirSync(dir);
    
    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);
      
      if (stat.isFile() && entry.endsWith('.erp')) {
        files.push(fullPath);
      } else if (stat.isDirectory() && !entry.startsWith('.') && entry !== 'node_modules') {
        // Рекурсивно ищем в подпапках
        files.push(...findERPFiles(fullPath));
      }
    }
  } catch (error) {
    console.warn(chalk.yellow(`⚠️  Не удалось прочитать папку: ${dir}`));
  }
  
  return files;
}

// Функция для загрузки конфигурации
function loadConfig(dir: string): any {
  const configFiles = ['erp.yaml', 'erp.yml', 'erp.json'];
  
  for (const configFile of configFiles) {
    const configPath = join(dir, configFile);
    if (existsSync(configPath)) {
      try {
        const content = readFileSync(configPath, 'utf8');
        console.log(chalk.blue(`📋 Найден конфигурационный файл: ${configFile}`));
        
        if (configFile.endsWith('.json')) {
          return JSON.parse(content);
        } else {
          return yaml.parse(content);
        }
      } catch (error) {
        console.warn(chalk.yellow(`⚠️  Ошибка чтения конфигурации ${configFile}: ${error}`));
      }
    }
  }
  
  // Дефолтная конфигурация
  return {
    name: basename(folderPath),
    version: '1.0.0',
    description: `ERP система на основе ${basename(folderPath)}`,
    database: {
      type: 'sqlite',
      file: 'database.sqlite'
    },
    conventions: ['Base.v1']
  };
}

// Функция для объединения AST из нескольких файлов
function mergeASTs(asts: any[]): any {
  if (asts.length === 0) {
    throw new Error('Не найдено ни одного валидного AST');
  }
  
  if (asts.length === 1) {
    return asts[0];
  }
  
  // Берем первый AST как основу
  const mergedAST = { ...asts[0] };
  
  // Объединяем массивы из остальных AST
  for (let i = 1; i < asts.length; i++) {
    const ast = asts[i];
    
    if (ast.entities) mergedAST.entities.push(...ast.entities);
    if (ast.actions) mergedAST.actions.push(...ast.actions);
    if (ast.roles) mergedAST.roles.push(...ast.roles);
    if (ast.modules) mergedAST.modules.push(...ast.modules);
    if (ast.packs) {
      // Объединяем пакеты, избегая дублирования
      const existingPacks = new Set(mergedAST.packs);
      for (const pack of ast.packs) {
        if (!existingPacks.has(pack)) {
          mergedAST.packs.push(pack);
          existingPacks.add(pack);
        }
      }
    }
  }
  
  return mergedAST;
}

// Утилиты
function runCommand(command: string, args: string[], cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(chalk.blue(`📦 Выполнение: ${command} ${args.join(' ')}`));
    
    const child = spawn(command, args, {
      cwd,
      stdio: 'inherit',
      shell: true
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Команда завершилась с кодом ${code}`));
      }
    });
    
    child.on('error', (error) => {
      reject(error);
    });
  });
}

async function main() {
  try {
    // Шаг 1: Поиск .erp файлов
    console.log(chalk.blue('🔍 Шаг 1: Поиск .erp файлов...'));
    const erpFiles = findERPFiles(folderPath);
    
    if (erpFiles.length === 0) {
      console.error(chalk.red('❌ В указанной папке не найдено .erp файлов'));
      console.log(chalk.gray('💡 Убедитесь, что файлы имеют расширение .erp'));
      process.exit(1);
    }
    
    console.log(chalk.green(`✅ Найдено ${erpFiles.length} .erp файл(ов):`));
    erpFiles.forEach((file, index) => {
      const relativePath = file.replace(folderPath, '').replace(/^[\/\\]/, '');
      console.log(chalk.gray(`  ${index + 1}. ${relativePath}`));
    });
    
    // Шаг 2: Загрузка конфигурации
    console.log(chalk.blue('\n🔍 Шаг 2: Загрузка конфигурации...'));
    const config = loadConfig(folderPath);
    console.log(chalk.green('✅ Конфигурация загружена'));
    console.log(chalk.cyan(`  Проект: ${config.name} v${config.version}`));
    console.log(chalk.cyan(`  База данных: ${config.database?.type || 'sqlite'}`));
    console.log(chalk.cyan(`  Пакеты соглашений: ${config.conventions?.length || 0}`));
    
    // Шаг 3: Парсинг всех файлов
    console.log(chalk.blue('\n🔍 Шаг 3: Парсинг .erp файлов...'));
    const astBuilder = new SimpleASTBuilder();
    const parsedASTs: any[] = [];
    let totalErrors = 0;
    let totalWarnings = 0;
    
    for (const filePath of erpFiles) {
      const fileName = basename(filePath);
      console.log(chalk.gray(`  Обработка ${fileName}...`));
      
      try {
        const dslContent = readFileSync(filePath, 'utf8');
        
        if (!dslContent.trim()) {
          console.log(chalk.yellow(`  ⚠️  Файл ${fileName} пуст, пропускаем`));
          continue;
        }
        
        const lexingResult = erpLexer.tokenize(dslContent);
        
        if (lexingResult.errors.length > 0) {
          console.error(chalk.red(`  ❌ Ошибки лексера в ${fileName}:`));
          lexingResult.errors.forEach(error => {
            console.error(chalk.red(`     - ${error.message}`));
          });
          totalErrors += lexingResult.errors.length;
          continue;
        }
        
        simpleParser.input = lexingResult.tokens;
        const cst = simpleParser.erpDocument();
        
        if (simpleParser.errors.length > 0) {
          console.log(chalk.yellow(`  ⚠️  Предупреждения парсера в ${fileName}:`));
          simpleParser.errors.forEach((error: any) => {
            console.log(chalk.yellow(`     - ${error.message}`));
          });
          totalWarnings += simpleParser.errors.length;
        }
        
        const ast = astBuilder.buildDocument(cst);
        
        // Если AST пуст или не содержит полезных данных, пропускаем
        if (!ast || (!ast.entities?.length && !ast.modules?.length && !ast.actions?.length)) {
          console.log(chalk.yellow(`  ⚠️  Файл ${fileName} не содержит полезных данных, пропускаем`));
          continue;
        }
        
        parsedASTs.push(ast);
        console.log(chalk.green(`  ✅ ${fileName} успешно обработан`));
        
      } catch (error) {
        console.error(chalk.red(`  ❌ Ошибка обработки ${fileName}:`));
        console.error(chalk.red(`     ${error instanceof Error ? error.message : String(error)}`));
        totalErrors++;
      }
    }
    
    if (parsedASTs.length === 0) {
      console.error(chalk.red('\n❌ Не удалось обработать ни одного файла'));
      console.log(chalk.gray('💡 Проверьте синтаксис .erp файлов'));
      process.exit(1);
    }
    
    console.log(chalk.green(`✅ Обработано ${parsedASTs.length} из ${erpFiles.length} файлов`));
    if (totalWarnings > 0) {
      console.log(chalk.yellow(`⚠️  Всего предупреждений: ${totalWarnings}`));
    }
    if (totalErrors > 0) {
      console.log(chalk.red(`❌ Всего ошибок: ${totalErrors}`));
    }
    
    // Шаг 4: Объединение AST
    console.log(chalk.blue('\n🔍 Шаг 4: Объединение AST...'));
    const mergedAST = mergeASTs(parsedASTs);
    
    // Применяем конфигурацию к AST
    if (config.name && !mergedAST.name) {
      mergedAST.name = config.name;
    }
    if (config.version && !mergedAST.version) {
      mergedAST.version = config.version;
    }
    
    console.log(chalk.green('✅ AST успешно объединен'));
    
    // Показываем структуру
    console.log(chalk.blue('\n📋 Структура проекта:'));
    console.log(chalk.cyan(`  Проект: ${mergedAST.name || 'Unnamed'} v${mergedAST.version || '1.0.0'}`));
    console.log(chalk.cyan(`  Пакеты соглашений: ${mergedAST.packs?.length || 0}`));
    console.log(chalk.cyan(`  Модули: ${mergedAST.modules?.length || 0}`));
    console.log(chalk.cyan(`  Сущности: ${mergedAST.entities?.length || 0}`));
    console.log(chalk.cyan(`  Действия: ${mergedAST.actions?.length || 0}`));
    console.log(chalk.cyan(`  Формы: ${mergedAST.forms?.length || 0}`));
    console.log(chalk.cyan(`  Роли: ${mergedAST.roles?.length || 0}`));
    console.log(chalk.cyan(`  Workflow: ${mergedAST.workflows?.length || 0}`));
    
    // Шаг 5: Генерация CIR
    console.log(chalk.blue('\n🔍 Шаг 5: Генерация CIR...'));
    const cirConverter = new CIRConverter();
    const cir = cirConverter.convert(mergedAST);
    
    // Применяем конфигурацию к CIR
    if (config.database) {
      cir.metadata.database = config.database;
    }
    if (config.conventions) {
      cir.conventionPacks.push(...config.conventions);
    }
    
    console.log(chalk.green('✅ CIR успешно сгенерирован'));
    
    // Анализ CIR
    console.log(chalk.blue('\n📊 Анализ CIR:'));
    let totalEntities = 0;
    let totalActions = 0;
    let totalRoles = 0;
    let totalForms = 0;
    
    for (const moduleName in cir.modules) {
      const module = cir.modules[moduleName];
      const entityCount = Object.keys(module.entities).length;
      const actionCount = Object.keys(module.actions).length;
      
      totalEntities += entityCount;
      totalActions += actionCount;
      totalRoles += Object.keys(module.roles || {}).length;
      totalForms += Object.keys(module.forms || {}).length;
      
      console.log(chalk.yellow(`  Модуль ${moduleName}:`));
      console.log(chalk.gray(`    Сущности: ${entityCount}`));
      console.log(chalk.gray(`    Действия: ${actionCount}`));
      
      // Показываем детали сущностей
      for (const entityName in module.entities) {
        const entity = module.entities[entityName];
        const fieldCount = Object.keys(entity.fields).length;
        const relationCount = Object.keys(entity.relations).length;
        console.log(chalk.gray(`      ${entityName}: ${fieldCount} полей, ${relationCount} связей`));
      }
    }
    
    console.log(chalk.yellow(`Итого: ${totalEntities} сущностей, ${totalActions} действий, ${totalForms} форм, ${totalRoles} ролей`));
    
    // Шаг 6: Генерация кода
    console.log(chalk.blue('\n🔍 Шаг 6: Генерация кода...'));
    
    const sqliteGenerator = new SQLiteGenerator();
    const backendGenerator = new SQLiteBackendGenerator();
    const refineGenerator = new RefineGenerator();
    
    const sql = sqliteGenerator.generateMigration(cir);
    const backendFiles = backendGenerator.generateBackend(cir);
    const frontendFiles = refineGenerator.generateFrontend(cir);
    
    console.log(chalk.green('✅ Код успешно сгенерирован'));
    console.log(chalk.yellow(`  SQL миграция: готова`));
    console.log(chalk.yellow(`  Backend файлы: ${backendFiles.size}`));
    console.log(chalk.yellow(`  Frontend файлы: ${frontendFiles.size}`));
    
    // Шаг 7: Создание проекта
    console.log(chalk.blue('\n🔍 Шаг 7: Создание проекта...'));
    
    const projectName = (cir.metadata.name || config.name || basename(folderPath))
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    
    const outputDir = join('output', `${projectName}-from-folder`);
    console.log(chalk.gray(`📁 Выходная папка: ${outputDir}`));
    
    // Создаем структуру папок
    const backendDir = join(outputDir, 'backend');
    const frontendDir = join(outputDir, 'frontend');
    
    mkdirSync(backendDir, { recursive: true });
    mkdirSync(frontendDir, { recursive: true });
    
    // Backend структура
    const backendDirs = [
      'src', 'src/types', 'src/models', 'src/schemas', 'src/services',
      'src/routes', 'src/database', 'src/actions', 'src/events', 'src/middleware'
    ];
    
    for (const dir of backendDirs) {
      mkdirSync(join(backendDir, dir), { recursive: true });
    }
    
    // Frontend структура
    const frontendDirs = [
      'src', 'src/components', 'src/components/layout', 'src/pages',
      'src/providers', 'src/types', 'src/utils', 'src/forms'
    ];
    
    for (const dir of frontendDirs) {
      mkdirSync(join(frontendDir, dir), { recursive: true });
    }
    
    // Создаем папки для страниц сущностей
    for (const moduleName in cir.modules) {
      const module = cir.modules[moduleName];
      for (const entityName in module.entities) {
        const lowerName = entityName.toLowerCase();
        mkdirSync(join(frontendDir, 'src/pages', lowerName), { recursive: true });
      }
    }
    
    // Записываем файлы
    for (const [fileName, content] of backendFiles) {
      writeFileSync(join(backendDir, fileName), content);
    }
    
    for (const [fileName, content] of frontendFiles) {
      writeFileSync(join(frontendDir, fileName), content);
    }
    
    writeFileSync(join(backendDir, 'migration.sql'), sql);
    writeFileSync(join(outputDir, 'cir.json'), JSON.stringify(cir, null, 2));
    writeFileSync(join(outputDir, 'config.json'), JSON.stringify(config, null, 2));
    
    // Создаем корневой package.json
    const rootPackageJson = {
      name: projectName,
      version: cir.metadata.version,
      description: config.description || `ERP система на основе ${basename(folderPath)}`,
      scripts: {
        'install:all': 'npm install && cd backend && npm install && cd ../frontend && npm install',
        'setup': 'npm run install:all && cd backend && npm run db:init',
        'dev:backend': 'cd backend && npm run dev',
        'dev:frontend': 'cd frontend && npm run dev',
        'dev': 'concurrently -n "backend,frontend" -c "blue,green" "npm run dev:backend" "npm run dev:frontend"',
        'start': 'npm run setup && npm run dev',
        'build': 'cd backend && npm run build && cd ../frontend && npm run build',
        'test': 'cd backend && npm test && cd ../frontend && npm test',
        'lint': 'cd backend && npm run lint && cd ../frontend && npm run lint'
      },
      devDependencies: {
        concurrently: '^8.2.0'
      },
      keywords: ['erp', 'business', 'generated', 'full-stack'],
      engines: {
        node: '>=18.0.0',
        npm: '>=9.0.0'
      }
    };
    
    writeFileSync(join(outputDir, 'package.json'), JSON.stringify(rootPackageJson, null, 2));
    
    // Создаем startup скрипты
    const startScript = `#!/bin/bash
echo "🚀 Запуск ${cir.metadata.name || projectName}..."
echo "   Сгенерировано из: ${folderPath}"
echo "   Файлов обработано: ${parsedASTs.length}"
echo ""

if ! command -v node &> /dev/null; then
    echo "❌ Node.js не установлен. Установите Node.js 18+ сначала."
    exit 1
fi

echo "📦 Установка зависимостей..."
npm run install:all

echo "🗄️  Настройка базы данных..."
cd backend && npm run db:init && cd ..

echo "🎯 Запуск серверов разработки..."
echo "  Backend: http://localhost:3000"
echo "  Frontend: http://localhost:3001"
echo "  API Docs: http://localhost:3000/docs"
echo ""
echo "Нажмите Ctrl+C для остановки серверов"

npm run dev
`;
    
    const startBat = `@echo off
echo 🚀 Запуск ${cir.metadata.name || projectName}...
echo    Сгенерировано из: ${folderPath}
echo    Файлов обработано: ${parsedASTs.length}
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Node.js не установлен. Установите Node.js 18+ сначала.
    pause
    exit /b 1
)

echo 📦 Установка зависимостей...
call npm run install:all

echo 🗄️  Настройка базы данных...
cd backend && call npm run db:init && cd ..

echo 🎯 Запуск серверов разработки...
echo   Backend: http://localhost:3000
echo   Frontend: http://localhost:3001
echo   API Docs: http://localhost:3000/docs
echo.
echo Нажмите Ctrl+C для остановки серверов

call npm run dev
pause
`;
    
    writeFileSync(join(outputDir, 'start.sh'), startScript);
    writeFileSync(join(outputDir, 'start.bat'), startBat);
    
    // Создаем README
    const readme = `# ${cir.metadata.name || projectName}

${config.description || `ERP система на основе ${basename(folderPath)}`}

> 🚀 **Сгенерировано с помощью ERP Core DSL** из реальных .erp файлов

## 📂 Исходные файлы

Проект сгенерирован из следующих .erp файлов:

${erpFiles.map((file, index) => {
  const relativePath = file.replace(folderPath, '').replace(/^[\/\\]/, '');
  return `${index + 1}. \`${relativePath}\``;
}).join('\n')}

**Всего обработано:** ${parsedASTs.length} из ${erpFiles.length} файлов

## 📊 Статистика проекта

- **Модули:** ${Object.keys(cir.modules).length}
- **Сущности:** ${totalEntities}
- **Действия:** ${totalActions}
- **Формы:** ${totalForms}
- **Роли:** ${totalRoles}
- **Дата генерации:** ${new Date().toLocaleDateString()}

## 🚀 Быстрый запуск

### Автоматический запуск

**Windows:**
\`\`\`bash
start.bat
\`\`\`

**Linux/Mac:**
\`\`\`bash
chmod +x start.sh
./start.sh
\`\`\`

### Ручной запуск

\`\`\`bash
# Установка зависимостей
npm run install:all

# Инициализация базы данных
cd backend && npm run db:init && cd ..

# Запуск серверов разработки
npm run dev
\`\`\`

## 🌐 Сервисы

| Сервис | URL | Описание |
|---------|-----|-------------|
| **Frontend** | http://localhost:3001 | React интерфейс администрирования |
| **Backend API** | http://localhost:3000 | REST API сервер |
| **API Docs** | http://localhost:3000/docs | Интерактивная документация |
| **База данных** | SQLite файл | Легкая встраиваемая БД |

## 🏢 Модули системы

${Object.keys(cir.modules).map(moduleName => {
  const module = cir.modules[moduleName];
  const entityCount = Object.keys(module.entities).length;
  const actionCount = Object.keys(module.actions).length;
  
  return `### ${moduleName}

${module.doc ? `*${module.doc}*\n` : ''}
**Сущности:** ${Object.keys(module.entities).map(name => `\`${name}\``).join(', ')}

**Возможности:**
- ${entityCount} бизнес-сущностей
- ${actionCount} бизнес-действий
- Полные CRUD операции
- Контроль доступа на основе ролей`;
}).join('\n\n')}

## 📋 Сущности

${Object.values(cir.modules).flatMap(module => 
  Object.entries(module.entities).map(([entityName, entity]) => {
    const fieldCount = Object.keys(entity.fields).length;
    const relationCount = Object.keys(entity.relations).length;
    return `### ${entityName}
${entity.doc ? `*${entity.doc}*\n` : ''}
- **Поля:** ${fieldCount} (с ограничениями и валидацией)
- **Связи:** ${relationCount}
- **API:** \`/api/${entityName.toLowerCase()}s\``;
  })
).join('\n\n')}

## 🔧 Разработка

### Backend
\`\`\`bash
cd backend
npm run dev          # Запуск с горячей перезагрузкой
npm run build        # Сборка для продакшена
npm run test         # Запуск тестов
npm run db:reset     # Сброс базы данных
\`\`\`

### Frontend
\`\`\`bash
cd frontend
npm run dev          # Запуск с горячей перезагрузкой
npm run build        # Сборка для продакшена
npm run preview      # Просмотр продакшен сборки
npm run lint         # Проверка кода
\`\`\`

## 📚 Документация API

Посетите **http://localhost:3000/docs** для изучения:

- 📖 Интерактивной документации API
- 🧪 Тестирования API endpoints
- 📝 Схем запросов/ответов
- 🔐 Примеров аутентификации

## 🛠️ Настройка

### Добавление новых полей
1. Обновите исходные .erp файлы
2. Перегенерируйте с помощью \`npm run demo:folder ${inputFolder}\`
3. Выполните \`npm run db:migrate\`

### Кастомная бизнес-логика
- Добавьте сервисы в \`backend/src/services/\`
- Реализуйте обработчики действий в \`backend/src/actions/\`
- Создайте слушатели событий в \`backend/src/events/\`

## 📁 Структура проекта

\`\`\`
${outputDir}/
├── backend/              # TypeScript backend
│   ├── src/actions/      # Обработчики бизнес-действий
│   ├── src/events/       # Система событий
│   ├── src/middleware/   # Аутентификация и валидация
│   └── migration.sql     # Схема базы данных
├── frontend/             # React frontend
│   ├── src/forms/        # Кастомные компоненты форм
│   └── src/pages/        # Страницы для сущностей
├── cir.json             # Сгенерированное IR
├── config.json          # Конфигурация проекта
└── README.md            # Этот файл
\`\`\`

---

**Сгенерировано ERP Core DSL** - От спецификации к готовому приложению
`;
    
    writeFileSync(join(outputDir, 'README.md'), readme);
    
    console.log(chalk.green('✅ Проект успешно создан!'));
    
    // Показываем итоговую информацию
    console.log(chalk.blue('\n📊 Результаты генерации:'));
    console.log(chalk.yellow(`  Проект: ${cir.metadata.name || projectName} v${cir.metadata.version}`));
    console.log(chalk.yellow(`  Выходная папка: ${outputDir}`));
    console.log(chalk.yellow(`  Обработано файлов: ${parsedASTs.length}/${erpFiles.length}`));
    console.log(chalk.yellow(`  Модули: ${Object.keys(cir.modules).length}`));
    console.log(chalk.yellow(`  Сущности: ${totalEntities}`));
    console.log(chalk.yellow(`  Действия: ${totalActions}`));
    console.log(chalk.yellow(`  Backend файлы: ${backendFiles.size}`));
    console.log(chalk.yellow(`  Frontend файлы: ${frontendFiles.size}`));
    
    console.log(chalk.blue('\n📂 Структура проекта:'));
    console.log(`${outputDir}/`);
    console.log('├── backend/               # TypeScript backend');
    console.log('├── frontend/              # React frontend');
    console.log('├── cir.json              # Сгенерированное IR');
    console.log('├── config.json           # Конфигурация');
    console.log('├── package.json          # Корневая конфигурация');
    console.log('├── start.sh (Linux/Mac)  # Скрипт запуска');
    console.log('├── start.bat (Windows)   # Скрипт запуска');
    console.log('└── README.md             # Документация');
    
    console.log(chalk.green('\n🎉 Готово к запуску:'));
    console.log(chalk.yellow(`  cd ${outputDir}`));
    console.log(chalk.yellow('  ./start.sh        # Linux/Mac'));
    console.log(chalk.yellow('  start.bat         # Windows'));
    
    console.log(chalk.blue('\n💡 Полезные команды:'));
    console.log(chalk.gray('  npm run dev       # Запуск серверов разработки'));
    console.log(chalk.gray('  npm run build     # Сборка для продакшена'));
    console.log(chalk.gray('  npm run test      # Запуск тестов'));
    
    if (totalWarnings > 0 || totalErrors > 0) {
      console.log(chalk.blue('\n⚠️  Внимание:'));
      if (totalWarnings > 0) {
        console.log(chalk.yellow(`  - Обнаружено ${totalWarnings} предупреждений при парсинге`));
      }
      if (totalErrors > 0) {
        console.log(chalk.red(`  - ${totalErrors} файлов не удалось обработать из-за ошибок`));
      }
      console.log(chalk.gray('  - Проверьте синтаксис .erp файлов для устранения проблем'));
    }
    
  } catch (error) {
    console.error(chalk.red('\n❌ Ошибка генерации:'));
    console.error(chalk.red(error instanceof Error ? error.message : String(error)));
    
    if (error instanceof Error && error.stack) {
      console.log(chalk.gray('\n🔍 Отладочная информация:'));
      console.log(chalk.gray(error.stack));
    }
    
    console.log(chalk.blue('\n💡 Возможные решения:'));
    console.log(chalk.gray('  1. Проверьте синтаксис .erp файлов'));
    console.log(chalk.gray('  2. Убедитесь, что файлы содержат валидные определения'));
    console.log(chalk.gray('  3. Проверьте права доступа к файлам и папкам'));
    console.log(chalk.gray('  4. Запустите с флагом --verbose для подробной информации'));
    
    process.exit(1);
  }
}

// Запускаем главную функцию
main().catch(error => {
  console.error(chalk.red('❌ Критическая ошибка:'));
  console.error(chalk.red(error instanceof Error ? error.message : String(error)));
  process.exit(1);
}); 