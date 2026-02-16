#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'fs';
import { join, dirname, basename, extname } from 'path';
import { spawn } from 'child_process';
import * as yaml from 'yaml';
import inquirer from 'inquirer';

// Import enhanced parser components
import { erpLexer } from './parser/lexer.js';
import { enhancedParser } from './parser/enhanced-parser.js';
import { EnhancedASTBuilder } from './parser/enhanced-ast-builder.js';
import { EnhancedCIRConverter } from './cir/enhanced-converter.js';
import { SQLiteGenerator } from './generators/sqlite-generator.js';
import { SQLiteBackendGenerator } from './generators/sqlite-backend-generator.js';
import { RefineGenerator } from './generators/refine-generator.js';

const program = new Command();

program
  .name('erp')
  .description('ERP Core - Advanced DSL-based business application generator')
  .version('0.1.0');

// Build command - полная генерация проекта
program
  .command('build')
  .description('Build complete ERP project from DSL files')
  .option('-i, --input <file>', 'Input DSL file or directory', 'domain.erp')
  .option('-o, --output <dir>', 'Output directory', 'output')
  .option('-c, --config <file>', 'Configuration file', 'erp.yaml')
  .option('--sql-only', 'Generate only SQL migration')
  .option('--backend-only', 'Generate only backend code')
  .option('--frontend-only', 'Generate only frontend code')
  .option('--watch', 'Watch for file changes and rebuild')
  .option('--verbose', 'Verbose output')
  .action(async (options) => {
    try {
      console.log(chalk.blue('🚀 ERP Core - Building Enhanced Project...\n'));
      
      // Load configuration
      const config = await loadConfig(options.config);
      console.log(chalk.gray(`Using config: ${options.config}`));
      
      // Collect DSL files
      const dslFiles = await collectDSLFiles(options.input);
      console.log(chalk.blue(`📖 Found ${dslFiles.length} DSL file(s)`));
      
      if (options.verbose) {
        dslFiles.forEach(file => console.log(chalk.gray(`  - ${file}`)));
      }
      
      // Parse all DSL files
      console.log(chalk.blue('🔍 Parsing DSL files...'));
      const ast = await parseDSLFiles(dslFiles, options.verbose);
      console.log(chalk.green('✅ All DSL files parsed successfully'));
      
      // Generate CIR
      console.log(chalk.blue('🔄 Generating Enhanced CIR...'));
      const cirConverter = new EnhancedCIRConverter();
      const cir = cirConverter.convert(ast);
      console.log(chalk.green('✅ Enhanced CIR generated'));
      
      // Apply configuration overrides
      applyCIRConfig(cir, config);
      
      // Create output directory structure
      const outputDir = options.output;
      mkdirSync(outputDir, { recursive: true });
      
      // Generate components based on options
      if (!options.frontendOnly) {
        await generateBackend(cir, outputDir, options);
      }
      
      if (!options.backendOnly) {
        await generateFrontend(cir, outputDir, options);
      }
      
      if (!options.frontendOnly && !options.backendOnly) {
        await generateProjectStructure(cir, outputDir, config, options);
      }
      
      // Save CIR and metadata
      const metadataPath = join(outputDir, 'metadata.json');
      writeFileSync(metadataPath, JSON.stringify({
        cir,
        config,
        buildTime: new Date().toISOString(),
        version: '0.1.0'
      }, null, 2));
      
      console.log(chalk.green('\n🎉 Build completed successfully!'));
      await showBuildSummary(cir, outputDir, options);
      
      // Watch mode
      if (options.watch) {
        console.log(chalk.blue('\n👀 Watching for file changes...'));
        await watchFiles(dslFiles, () => {
          console.log(chalk.yellow('🔄 Files changed, rebuilding...'));
          // Rebuild logic here
        });
      }
      
    } catch (error) {
      console.error(chalk.red('❌ Build failed:'));
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      if (options.verbose && error instanceof Error && error.stack) {
        console.error(chalk.gray(error.stack));
      }
      process.exit(1);
    }
  });

// Migrate command - управление миграциями БД
program
  .command('migrate')
  .description('Run database migrations')
  .option('-o, --output <dir>', 'Output directory', 'output')
  .option('--init', 'Initialize database')
  .option('--reset', 'Reset database (dangerous!)')
  .option('--status', 'Show migration status')
  .option('--dry-run', 'Show what would be executed')
  .action(async (options) => {
    try {
      console.log(chalk.blue('🗄️  ERP Core - Database Migration\n'));
      
      const outputDir = options.output;
      const metadataPath = join(outputDir, 'metadata.json');
      
      if (!existsSync(metadataPath)) {
        console.error(chalk.red('❌ No metadata found. Run "erp build" first.'));
        process.exit(1);
      }
      
      const metadata = JSON.parse(readFileSync(metadataPath, 'utf8'));
      const cir = metadata.cir;
      
      if (options.status) {
        await showMigrationStatus(outputDir, cir);
        return;
      }
      
      if (options.reset) {
        const confirm = await inquirer.prompt([{
          type: 'confirm',
          name: 'confirmed',
          message: '⚠️  This will DELETE ALL DATA. Are you sure?',
          default: false
        }]);
        
        if (!confirm.confirmed) {
          console.log(chalk.yellow('Migration cancelled.'));
          return;
        }
      }
      
      const backendDir = join(outputDir, 'backend');
      
      if (options.init || options.reset) {
        console.log(chalk.blue('🔧 Initializing database...'));
        await runCommand('npm', ['run', 'db:init'], backendDir);
        console.log(chalk.green('✅ Database initialized'));
      } else {
        console.log(chalk.blue('📊 Running migrations...'));
        if (options.dryRun) {
          console.log(chalk.yellow('📋 Dry run - showing migration SQL:'));
          const migrationPath = join(backendDir, 'migration.sql');
          if (existsSync(migrationPath)) {
            console.log(readFileSync(migrationPath, 'utf8'));
          }
        } else {
          await runCommand('npm', ['run', 'db:migrate'], backendDir);
          console.log(chalk.green('✅ Migrations completed'));
        }
      }
      
    } catch (error) {
      console.error(chalk.red('❌ Migration failed:'));
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    }
  });

// Serve command - запуск development серверов
program
  .command('serve')
  .description('Start development servers')
  .option('-o, --output <dir>', 'Output directory', 'output')
  .option('--backend-only', 'Start only backend server')
  .option('--frontend-only', 'Start only frontend server')
  .option('--port <port>', 'Backend port', '3000')
  .option('--frontend-port <port>', 'Frontend port', '3001')
  .option('--open', 'Open browser')
  .action(async (options) => {
    try {
      console.log(chalk.blue('🚀 ERP Core - Starting Development Servers\n'));
      
      const outputDir = options.output;
      const backendDir = join(outputDir, 'backend');
      const frontendDir = join(outputDir, 'frontend');
      
      // Check if project is built
      if (!existsSync(join(outputDir, 'metadata.json'))) {
        console.error(chalk.red('❌ Project not built. Run "erp build" first.'));
        process.exit(1);
      }
      
      // Check dependencies
      await ensureDependencies(outputDir, options);
      
      const processes: any[] = [];
      
      // Start backend
      if (!options.frontendOnly) {
        console.log(chalk.blue('🔧 Starting backend server...'));
        const backendProcess = spawn('npm', ['run', 'dev'], {
          cwd: backendDir,
          stdio: 'inherit',
          shell: true,
          env: { ...process.env, PORT: options.port }
        });
        
        processes.push(backendProcess);
        console.log(chalk.green(`✅ Backend starting on http://localhost:${options.port}`));
      }
      
      // Start frontend
      if (!options.backendOnly) {
        console.log(chalk.blue('🎨 Starting frontend server...'));
        const frontendProcess = spawn('npm', ['run', 'dev'], {
          cwd: frontendDir,
          stdio: 'inherit',
          shell: true,
          env: { ...process.env, PORT: options.frontendPort }
        });
        
        processes.push(frontendProcess);
        console.log(chalk.green(`✅ Frontend starting on http://localhost:${options.frontendPort}`));
      }
      
      // Show service URLs
      console.log(chalk.blue('\n🌐 Services:'));
      if (!options.frontendOnly) {
        console.log(chalk.cyan(`  API Server: http://localhost:${options.port}`));
        console.log(chalk.cyan(`  API Docs: http://localhost:${options.port}/docs`));
      }
      if (!options.backendOnly) {
        console.log(chalk.cyan(`  Frontend: http://localhost:${options.frontendPort}`));
      }
      
      // Open browser
      if (options.open && !options.backendOnly) {
        const open = await import('open');
        await open.default(`http://localhost:${options.frontendPort}`);
      }
      
      console.log(chalk.gray('\nPress Ctrl+C to stop all servers\n'));
      
      // Handle cleanup
      process.on('SIGINT', () => {
        console.log(chalk.yellow('\n🛑 Shutting down servers...'));
        processes.forEach(proc => proc.kill());
        process.exit(0);
      });
      
      // Wait for processes
      await Promise.all(processes.map(proc => new Promise(resolve => {
        proc.on('close', resolve);
      })));
      
    } catch (error) {
      console.error(chalk.red('❌ Serve failed:'));
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    }
  });

// Scaffold command - генерация компонентов
program
  .command('scaffold')
  .description('Generate project components')
  .argument('<type>', 'Component type (module, entity, action, form, role)')
  .argument('<name>', 'Component name')
  .option('-o, --output <dir>', 'Output directory', 'output')
  .option('--template <template>', 'Template to use')
  .option('--fields <fields>', 'Entity fields (comma-separated)')
  .option('--relations <relations>', 'Entity relations (comma-separated)')
  .action(async (type, name, options) => {
    try {
      console.log(chalk.blue(`🏗️  Scaffolding ${type}: ${name}\n`));
      
      const outputDir = options.output;
      const metadataPath = join(outputDir, 'metadata.json');
      
      if (!existsSync(metadataPath)) {
        console.error(chalk.red('❌ No project found. Run "erp build" first.'));
        process.exit(1);
      }
      
      switch (type.toLowerCase()) {
        case 'module':
          await scaffoldModule(name, outputDir, options);
          break;
        case 'entity':
          await scaffoldEntity(name, outputDir, options);
          break;
        case 'action':
          await scaffoldAction(name, outputDir, options);
          break;
        case 'form':
          await scaffoldForm(name, outputDir, options);
          break;
        case 'role':
          await scaffoldRole(name, outputDir, options);
          break;
        default:
          console.error(chalk.red(`❌ Unknown scaffold type: ${type}`));
          console.log(chalk.gray('Available types: module, entity, action, form, role'));
          process.exit(1);
      }
      
      console.log(chalk.green(`✅ ${type} "${name}" scaffolded successfully!`));
      console.log(chalk.blue('\n💡 Next steps:'));
      console.log('  1. Review and customize the generated code');
      console.log('  2. Run "erp build" to regenerate project');
      console.log('  3. Run "erp migrate" to update database');
      
    } catch (error) {
      console.error(chalk.red('❌ Scaffold failed:'));
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    }
  });

// Init command - инициализация проекта
program
  .command('init')
  .description('Initialize new ERP project')
  .argument('<name>', 'Project name')
  .option('-d, --dir <directory>', 'Project directory')
  .option('-t, --template <template>', 'Project template', 'basic')
  .option('--interactive', 'Interactive setup')
  .action(async (name, options) => {
    try {
      console.log(chalk.blue(`🚀 Initializing ERP project: ${name}\n`));
      
      const projectDir = options.dir || name.toLowerCase().replace(/\s+/g, '-');
      
      // Interactive setup
      let config: any = {
        name,
        version: '1.0.0',
        description: `ERP system for ${name}`,
        template: options.template
      };
      
      if (options.interactive) {
        config = await interactiveSetup(name, config);
      }
      
      // Create project directory
      mkdirSync(projectDir, { recursive: true });
      
      // Generate template files
      await generateTemplate(config, projectDir);
      
      console.log(chalk.green(`✅ Project "${name}" initialized successfully!`));
      console.log(chalk.blue('\n🎯 Next Steps:'));
      console.log(`  1. cd ${projectDir}`);
      console.log('  2. Edit domain.erp to define your business model');
      console.log('  3. erp build');
      console.log('  4. erp migrate --init');
      console.log('  5. erp serve');
      
    } catch (error) {
      console.error(chalk.red('❌ Init failed:'));
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    }
  });

// Validate command
program
  .command('validate')
  .description('Validate DSL files')
  .argument('[files...]', 'DSL files to validate')
  .option('--strict', 'Strict validation mode')
  .option('--fix', 'Auto-fix common issues')
  .action(async (files, options) => {
    try {
      const dslFiles = files.length > 0 ? files : await collectDSLFiles('.');
      
      console.log(chalk.blue(`🔍 Validating ${dslFiles.length} DSL file(s)...\n`));
      
      let hasErrors = false;
      
      for (const file of dslFiles) {
        console.log(chalk.blue(`Validating ${file}...`));
        
        try {
          const dslContent = readFileSync(file, 'utf8');
          await validateDSLFile(dslContent, file, options);
          console.log(chalk.green(`✅ ${file} is valid`));
        } catch (error) {
          console.error(chalk.red(`❌ ${file}: ${error instanceof Error ? error.message : String(error)}`));
          hasErrors = true;
        }
      }
      
      if (hasErrors) {
        console.log(chalk.red('\n❌ Validation failed'));
        process.exit(1);
      } else {
        console.log(chalk.green('\n✅ All files are valid'));
      }
      
    } catch (error) {
      console.error(chalk.red('❌ Validation failed:'));
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    }
  });

// Helper functions
async function loadConfig(configPath: string): Promise<any> {
  if (!existsSync(configPath)) {
    return {
      name: 'MyProject',
      version: '1.0.0',
      database: {
        type: 'sqlite',
        file: 'database.sqlite'
      }
    };
  }
  
  const content = readFileSync(configPath, 'utf8');
  if (configPath.endsWith('.yaml') || configPath.endsWith('.yml')) {
    return yaml.parse(content);
  } else {
    return JSON.parse(content);
  }
}

async function collectDSLFiles(input: string): Promise<string[]> {
  const files: string[] = [];
  
  if (statSync(input).isFile()) {
    if (input.endsWith('.erp')) {
      files.push(input);
    }
  } else {
    const entries = readdirSync(input);
    for (const entry of entries) {
      const fullPath = join(input, entry);
      if (statSync(fullPath).isFile() && entry.endsWith('.erp')) {
        files.push(fullPath);
      }
    }
  }
  
  return files;
}

async function parseDSLFiles(files: string[], verbose: boolean): Promise<any> {
  const astBuilder = new EnhancedASTBuilder();
  let combinedAST: any = null;
  
  for (const file of files) {
    if (verbose) {
      console.log(chalk.gray(`  Parsing ${file}...`));
    }
    
    const dslContent = readFileSync(file, 'utf8');
    const lexingResult = erpLexer.tokenize(dslContent);
    
    if (lexingResult.errors.length > 0) {
      throw new Error(`Lexing errors in ${file}: ${lexingResult.errors.map(e => e.message).join(', ')}`);
    }
    
    enhancedParser.input = lexingResult.tokens;
    const cst = enhancedParser.erpDocument();
    
    if (enhancedParser.errors.length > 0) {
      if (verbose) {
        console.log(chalk.yellow(`  Warnings in ${file}:`));
        enhancedParser.errors.forEach(error => {
          console.log(chalk.yellow(`    - ${error.message}`));
        });
      }
    }
    
    const ast = astBuilder.buildDocument(cst);
    
    if (!combinedAST) {
      combinedAST = ast;
    } else {
      // Merge multiple files
      combinedAST.entities.push(...ast.entities);
      combinedAST.actions.push(...ast.actions);
      combinedAST.forms.push(...ast.forms);
      combinedAST.roles.push(...ast.roles);
      combinedAST.modules.push(...ast.modules);
    }
  }
  
  return combinedAST;
}

function applyCIRConfig(cir: any, config: any): void {
  // Apply configuration overrides to CIR
  if (config.database) {
    cir.metadata.database = config.database;
  }
  
  if (config.conventions) {
    cir.conventionPacks.push(...config.conventions);
  }
}

async function generateBackend(cir: any, outputDir: string, options: any): Promise<void> {
  console.log(chalk.blue('🔧 Generating Enhanced Backend...'));
  
  const sqliteGenerator = new SQLiteGenerator();
  const backendGenerator = new SQLiteBackendGenerator();
  
  const sql = sqliteGenerator.generateMigration(cir);
  const backendFiles = backendGenerator.generateBackend(cir);
  
  const backendDir = join(outputDir, 'backend');
  mkdirSync(backendDir, { recursive: true });
  
  // Create directory structure
  const dirs = [
    'src', 'src/types', 'src/models', 'src/schemas', 'src/services',
    'src/routes', 'src/database', 'src/actions', 'src/events', 'src/middleware'
  ];
  
  for (const dir of dirs) {
    mkdirSync(join(backendDir, dir), { recursive: true });
  }
  
  // Write backend files
  for (const [fileName, content] of backendFiles) {
    writeFileSync(join(backendDir, fileName), content);
  }
  
  // Write migration
  writeFileSync(join(backendDir, 'migration.sql'), sql);
  
  console.log(chalk.green('✅ Backend generated'));
}

async function generateFrontend(cir: any, outputDir: string, options: any): Promise<void> {
  console.log(chalk.blue('🎨 Generating Enhanced Frontend...'));
  
  const refineGenerator = new RefineGenerator();
  const frontendFiles = refineGenerator.generateFrontend(cir);
  
  const frontendDir = join(outputDir, 'frontend');
  mkdirSync(frontendDir, { recursive: true });
  
  // Create directory structure
  const dirs = [
    'src', 'src/components', 'src/components/layout', 'src/pages',
    'src/providers', 'src/types', 'src/utils', 'src/forms'
  ];
  
  for (const dir of dirs) {
    mkdirSync(join(frontendDir, dir), { recursive: true });
  }
  
  // Create entity-specific directories
  for (const moduleName in cir.modules) {
    const module = cir.modules[moduleName];
    for (const entityName in module.entities) {
      const entityDir = join(frontendDir, 'src/pages', entityName.toLowerCase());
      mkdirSync(entityDir, { recursive: true });
    }
  }
  
  // Write frontend files
  for (const [fileName, content] of frontendFiles) {
    writeFileSync(join(frontendDir, fileName), content);
  }
  
  console.log(chalk.green('✅ Frontend generated'));
}

async function generateProjectStructure(cir: any, outputDir: string, config: any, options: any): Promise<void> {
  // Generate root package.json
  const rootPackageJson = {
    name: cir.metadata.name.toLowerCase().replace(/\s+/g, '-'),
    version: cir.metadata.version,
    description: config.description || `ERP system for ${cir.metadata.name}`,
    scripts: {
      'install:all': 'npm install && cd backend && npm install && cd ../frontend && npm install',
      'setup': 'npm run install:all',
      'dev:backend': 'cd backend && npm run dev',
      'dev:frontend': 'cd frontend && npm run dev',
      'dev': 'concurrently -n "backend,frontend" -c "blue,green" "npm run dev:backend" "npm run dev:frontend"',
      'build': 'cd backend && npm run build && cd ../frontend && npm run build',
      'start': 'npm run setup && npm run dev',
      'test': 'cd backend && npm test && cd ../frontend && npm test',
      'lint': 'cd backend && npm run lint && cd ../frontend && npm run lint'
    },
    devDependencies: {
      concurrently: '^8.2.0'
    },
    engines: {
      node: '>=18.0.0',
      npm: '>=9.0.0'
    }
  };
  
  writeFileSync(join(outputDir, 'package.json'), JSON.stringify(rootPackageJson, null, 2));
  
  // Generate comprehensive README
  const readme = await generateProjectReadme(cir, config);
  writeFileSync(join(outputDir, 'README.md'), readme);
  
  // Generate startup scripts
  const startScript = generateStartupScript(cir, 'sh');
  const startBat = generateStartupScript(cir, 'bat');
  
  writeFileSync(join(outputDir, 'start.sh'), startScript);
  writeFileSync(join(outputDir, 'start.bat'), startBat);
}

async function runCommand(command: string, args: string[], cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: 'inherit', shell: true });
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Command failed with code ${code}`));
    });
    child.on('error', reject);
  });
}

async function ensureDependencies(outputDir: string, options: any): Promise<void> {
  const backendDir = join(outputDir, 'backend');
  const frontendDir = join(outputDir, 'frontend');
  
  if (!existsSync(join(backendDir, 'node_modules'))) {
    console.log(chalk.blue('📦 Installing backend dependencies...'));
    await runCommand('npm', ['install'], backendDir);
  }
  
  if (!options.backendOnly && !existsSync(join(frontendDir, 'node_modules'))) {
    console.log(chalk.blue('📦 Installing frontend dependencies...'));
    await runCommand('npm', ['install'], frontendDir);
  }
}

async function showBuildSummary(cir: any, outputDir: string, options: any): Promise<void> {
  console.log(chalk.blue('\n📊 Build Summary:'));
  console.log(chalk.yellow(`  Project: ${cir.metadata.name} v${cir.metadata.version}`));
  console.log(chalk.yellow(`  Schema Version: ${cir.metadata.schemaVersion}`));
  console.log(chalk.yellow(`  Output Directory: ${outputDir}`));
  
  let totalEntities = 0;
  let totalActions = 0;
  let totalForms = 0;
  let totalRoles = 0;
  
  for (const moduleName in cir.modules) {
    const module = cir.modules[moduleName];
    totalEntities += Object.keys(module.entities).length;
    totalActions += Object.keys(module.actions).length;
    totalForms += Object.keys(module.forms || {}).length;
    totalRoles += Object.keys(module.roles || {}).length;
  }
  
  console.log(chalk.yellow(`  Entities: ${totalEntities}`));
  console.log(chalk.yellow(`  Actions: ${totalActions}`));
  console.log(chalk.yellow(`  Forms: ${totalForms}`));
  console.log(chalk.yellow(`  Roles: ${totalRoles}`));
  
  console.log(chalk.blue('\n🎯 Next Steps:'));
  console.log(`  1. cd ${outputDir}`);
  if (!options.frontendOnly && !options.backendOnly) {
    console.log('  2. npm run setup          # Install dependencies');
    console.log('  3. erp migrate --init     # Initialize database');
    console.log('  4. erp serve              # Start servers');
  } else if (options.backendOnly) {
    console.log('  2. cd backend && npm install');
    console.log('  3. npm run db:init');
    console.log('  4. npm run dev');
  } else if (options.frontendOnly) {
    console.log('  2. cd frontend && npm install');
    console.log('  3. npm run dev');
  }
}

async function validateDSLFile(content: string, file: string, options: any): Promise<void> {
  const lexingResult = erpLexer.tokenize(content);
  
  if (lexingResult.errors.length > 0) {
    throw new Error(`Lexing errors: ${lexingResult.errors.map(e => e.message).join(', ')}`);
  }
  
  enhancedParser.input = lexingResult.tokens;
  const cst = enhancedParser.erpDocument();
  
  if (enhancedParser.errors.length > 0) {
    if (options.strict) {
      throw new Error(`Parsing errors: ${enhancedParser.errors.map(e => e.message).join(', ')}`);
    }
  }
  
  const astBuilder = new EnhancedASTBuilder();
  astBuilder.buildDocument(cst);
}

// Scaffold functions
async function scaffoldEntity(name: string, outputDir: string, options: any): Promise<void> {
  console.log(chalk.blue(`Creating entity: ${name}`));
  
  const fields = options.fields ? options.fields.split(',').map((f: string) => f.trim()) : ['name: Text', 'description: Text'];
  const relations = options.relations ? options.relations.split(',').map((r: string) => r.trim()) : [];
  
  const entityDSL = `
entity ${name} {
  doc = "${name} entity"
  ${fields.map(f => `  ${f}`).join('\n')}
  ${relations.map(r => `  ${r}`).join('\n')}
  
  created_at: DateTime(auto_create)
  updated_at: DateTime(auto_update)
}
`;
  
  const scaffoldPath = join(outputDir, 'scaffold', `${name.toLowerCase()}.erp`);
  mkdirSync(dirname(scaffoldPath), { recursive: true });
  writeFileSync(scaffoldPath, entityDSL);
  
  console.log(chalk.green(`✅ Entity scaffolded: ${scaffoldPath}`));
}

async function scaffoldAction(name: string, outputDir: string, options: any): Promise<void> {
  console.log(chalk.blue(`Creating action: ${name}`));
  
  const actionDSL = `
action ${name}(entity: Entity) {
  doc = "${name} business action"
  emit ${name}Event(entity.id)
  call BusinessLogic.process${name}
}
`;
  
  const scaffoldPath = join(outputDir, 'scaffold', `${name.toLowerCase()}_action.erp`);
  mkdirSync(dirname(scaffoldPath), { recursive: true });
  writeFileSync(scaffoldPath, actionDSL);
  
  console.log(chalk.green(`✅ Action scaffolded: ${scaffoldPath}`));
}

async function scaffoldForm(name: string, outputDir: string, options: any): Promise<void> {
  // Implementation for form scaffolding
  console.log(chalk.gray(`Form scaffolding: ${name} (placeholder)`));
}

async function scaffoldRole(name: string, outputDir: string, options: any): Promise<void> {
  // Implementation for role scaffolding
  console.log(chalk.gray(`Role scaffolding: ${name} (placeholder)`));
}

async function scaffoldModule(name: string, outputDir: string, options: any): Promise<void> {
  // Implementation for module scaffolding
  console.log(chalk.gray(`Module scaffolding: ${name} (placeholder)`));
}

async function interactiveSetup(name: string, config: any): Promise<any> {
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'description',
      message: 'Project description:',
      default: `ERP system for ${name}`
    },
    {
      type: 'list',
      name: 'database',
      message: 'Database type:',
      choices: ['sqlite', 'postgresql', 'mysql'],
      default: 'sqlite'
    },
    {
      type: 'list',
      name: 'template',
      message: 'Project template:',
      choices: ['basic', 'sales', 'inventory', 'accounting'],
      default: 'basic'
    }
  ]);
  
  return { ...config, ...answers };
}

async function generateTemplate(config: any, projectDir: string): Promise<void> {
  // Generate template based on config
  const templateMap: Record<string, string> = {
    basic: generateBasicTemplate(config),
    sales: generateSalesTemplate(config),
    inventory: generateInventoryTemplate(config),
    accounting: generateAccountingTemplate(config)
  };
  
  const dsl = templateMap[config.template] || templateMap.basic;
  writeFileSync(join(projectDir, 'domain.erp'), dsl);
  
  // Generate config file
  const erpConfig = {
    name: config.name,
    version: config.version,
    description: config.description,
    database: {
      type: config.database || 'sqlite',
      file: 'database.sqlite'
    },
    conventions: ['Base.v1']
  };
  
  writeFileSync(join(projectDir, 'erp.yaml'), yaml.stringify(erpConfig));
  
  // Generate README
  const readme = `# ${config.name}

${config.description}

## Quick Start

\`\`\`bash
# Build project
erp build

# Initialize database
erp migrate --init

# Start development servers
erp serve
\`\`\`

## Features

- Generated with ERP Core DSL
- Full-stack TypeScript application
- React admin interface
- RESTful API with OpenAPI docs
- Role-based access control

## Documentation

- API: http://localhost:3000/docs
- Frontend: http://localhost:3001
`;
  
  writeFileSync(join(projectDir, 'README.md'), readme);
}

function generateBasicTemplate(config: any): string {
  return `erp ${config.name} ${config.version}

use pack Base.v1

entity Customer {
  doc = "Customer information"
  name: Text(required)
  email: Email(unique)
  phone: Phone?
  is_active: Bool=true
  
  created_at: DateTime(auto_create)
  updated_at: DateTime(auto_update)
}

entity Product {
  doc = "Product catalog"
  name: Text(required)
  description: Text?
  price: Money(min=0)
  is_active: Bool=true
  
  created_at: DateTime(auto_create)
  updated_at: DateTime(auto_update)
}

role Admin grants * on *
role User grants read on Product
`;
}

function generateSalesTemplate(config: any): string {
  return `erp ${config.name} ${config.version}

use pack Base.v1
use pack Sales.v1

module Sales {
  entity Customer {
    doc = "Customer information"
    code: Code(auto_seq="CUST-{####}")
    name: Text(required)
    email: Email(unique)
    phone: Phone?
    tier: Enum[Regular,VIP,Premium]=Regular
    
    created_at: DateTime(auto_create)
    updated_at: DateTime(auto_update)
  }
  
  entity Order {
    doc = "Sales order"
    number: Code(auto_seq="ORD-{YYYY}-{####}")
    customer: Customer(1)
    total: Money(calc=sum(lines.amount))
    status: Enum[Draft,Confirmed,Shipped,Delivered]=Draft
    
    created_at: DateTime(auto_create)
    updated_at: DateTime(auto_update)
  }
  
  action ConfirmOrder(order: Order) when order.status == "Draft" {
    order.status = "Confirmed"
    emit OrderConfirmed(order.id)
  }
}

role SalesManager grants crud on Customer,Order
role SalesAgent grants rcu on Customer,Order
role Customer grants read on Order
`;
}

function generateInventoryTemplate(config: any): string {
  return `erp ${config.name} ${config.version}

use pack Base.v1
use pack Inventory.v1

module Inventory {
  entity Product {
    doc = "Product in inventory"
    sku: Code(auto_seq="SKU-{######}")
    name: Text(required)
    category: ProductCategory(1)
    unit_cost: Money(min=0)
    unit_price: Money(min=0)
    stock_quantity: Int(min=0)=0
    
    created_at: DateTime(auto_create)
    updated_at: DateTime(auto_update)
  }
  
  entity ProductCategory {
    doc = "Product category"
    name: Text(required, unique)
    products: Product*(backref=category)
    
    created_at: DateTime(auto_create)
    updated_at: DateTime(auto_update)
  }
  
  action AdjustStock(product: Product, quantity: Int) {
    product.stock_quantity = product.stock_quantity + quantity
    emit StockAdjusted(product.id, quantity)
  }
}

role InventoryManager grants crud on Product,ProductCategory
role WarehouseWorker grants read,update on Product
`;
}

function generateAccountingTemplate(config: any): string {
  return `erp ${config.name} ${config.version}

use pack Base.v1
use pack Accounting.v2025

module Accounting {
  entity Account {
    doc = "Chart of accounts"
    code: Code(pattern="[0-9]{4}", unique)
    name: Text(required)
    type: Enum[Asset,Liability,Equity,Revenue,Expense]
    parent: Account?
    is_active: Bool=true
    
    created_at: DateTime(auto_create)
    updated_at: DateTime(auto_update)
  }
  
  entity JournalEntry {
    doc = "Journal entry"
    number: Code(auto_seq="JE-{YYYY}-{####}")
    date: Date(required)
    description: Text(required)
    status: Enum[Draft,Posted]=Draft
    
    created_at: DateTime(auto_create)
    updated_at: DateTime(auto_update)
  }
  
  action PostEntry(entry: JournalEntry) when entry.status == "Draft" {
    entry.status = "Posted"
    emit EntryPosted(entry.id)
  }
}

role Accountant grants crud on Account,JournalEntry
role BookKeeper grants rcu on JournalEntry
role Auditor grants read on *
`;
}

async function generateProjectReadme(cir: any, config: any): Promise<string> {
  return `# ${cir.metadata.name}

${config.description || 'Enterprise Resource Planning system'}

Generated with **ERP Core DSL** - Advanced business application generator.

## 🚀 Quick Start

\`\`\`bash
# Setup and start
npm run setup
erp migrate --init
erp serve
\`\`\`

## 📊 Project Statistics

- **Modules**: ${Object.keys(cir.modules).length}
- **Entities**: ${Object.values(cir.modules).reduce((sum: number, mod: any) => sum + Object.keys(mod.entities).length, 0)}
- **Actions**: ${Object.values(cir.modules).reduce((sum: number, mod: any) => sum + Object.keys(mod.actions).length, 0)}
- **Generated**: ${new Date().toLocaleDateString()}

## 🌐 Services

| Service | URL | Description |
|---------|-----|-------------|
| Frontend | http://localhost:3001 | React admin interface |
| Backend API | http://localhost:3000 | REST API server |
| API Docs | http://localhost:3000/docs | Interactive documentation |

## 🛠 Commands

\`\`\`bash
erp build              # Build project
erp migrate --init     # Initialize database
erp serve              # Start dev servers
erp validate           # Validate DSL files
erp scaffold entity Product  # Generate components
\`\`\`

## 📚 Documentation

For detailed documentation, visit the [ERP Core Documentation](https://erp-core.dev).
`;
}

function generateStartupScript(cir: any, type: 'sh' | 'bat'): string {
  if (type === 'sh') {
    return `#!/bin/bash
echo "🚀 Starting ${cir.metadata.name} Development Environment..."
echo ""

if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

echo "📦 Installing dependencies..."
npm run install:all

echo "🗄️  Setting up database..."
cd backend && npm run db:init && cd ..

echo "🎯 Starting development servers..."
echo "  Backend: http://localhost:3000"
echo "  Frontend: http://localhost:3001"
echo "  API Docs: http://localhost:3000/docs"
echo ""
echo "Press Ctrl+C to stop the servers"

npm run dev
`;
  } else {
    return `@echo off
echo 🚀 Starting ${cir.metadata.name} Development Environment...
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js 18+ first.
    pause
    exit /b 1
)

echo 📦 Installing dependencies...
call npm run install:all

echo 🗄️  Setting up database...
cd backend && call npm run db:init && cd ..

echo 🎯 Starting development servers...
echo   Backend: http://localhost:3000
echo   Frontend: http://localhost:3001
echo   API Docs: http://localhost:3000/docs
echo.
echo Press Ctrl+C to stop the servers

call npm run dev
pause
`;
  }
}

async function showMigrationStatus(outputDir: string, cir: any): Promise<void> {
  console.log(chalk.blue('📊 Migration Status\n'));
  
  const backendDir = join(outputDir, 'backend');
  const dbPath = join(backendDir, 'database.sqlite');
  
  if (existsSync(dbPath)) {
    console.log(chalk.green('✅ Database exists'));
    // Could add more detailed status checking here
  } else {
    console.log(chalk.yellow('⚠️  Database not initialized'));
  }
  
  console.log(chalk.blue(`\nSchema Version: ${cir.metadata.schemaVersion}`));
  console.log(chalk.blue(`Generated: ${cir.metadata.generatedAt}`));
}

async function watchFiles(files: string[], callback: () => void): Promise<void> {
  // Simple file watching implementation
  // In a real implementation, would use fs.watch or chokidar
  console.log(chalk.gray('File watching not implemented yet'));
}

program.parse(); 