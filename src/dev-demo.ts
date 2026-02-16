#!/usr/bin/env node

import { erpLexer } from './parser/lexer.js';
import { simpleParser } from './parser/simple-parser.js';
import { SimpleASTBuilder } from './parser/simple-ast-builder.js';
import { CIRConverter } from './cir/converter.js';
import { SQLiteGenerator } from './generators/sqlite-generator.js';
import { SQLiteBackendGenerator } from './generators/sqlite-backend-generator.js';
import { RefineGenerator } from './generators/refine-generator.js';
import chalk from 'chalk';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { spawn } from 'child_process';

// Пример DSL для dev версии
const sampleDSL = `
erp TestProject 1.0

use pack Base.v1

entity Customer {
  doc = "Customer information"
  name: Text
  email: Email
  phone: Phone
  is_active: Bool
}

entity Product {
  doc = "Product catalog"
  name: Text
  description: Text
  price: Money
  category: Text
  in_stock: Bool
}

entity Order {
  doc = "Customer order"
  customer: Customer
  order_date: Date
  total_amount: Money
  status: Enum
}

action CreateOrder {
  emit OrderCreated
  call UpdateInventory
}

role Admin grants all on Customer
role Admin grants all on Product
role Admin grants all on Order
role Customer grants read on Product
role Guest grants read on Product

`;

console.log(chalk.blue('🚀 ERP Core - Dev Demo with Auto Setup\n'));

console.log(chalk.gray('--- Input DSL ---'));
console.log(sampleDSL);
console.log(chalk.gray('--- End Input ---\n'));

const astBuilder = new SimpleASTBuilder();
const cirConverter = new CIRConverter();
const sqliteGenerator = new SQLiteGenerator();
const backendGenerator = new SQLiteBackendGenerator();
const refineGenerator = new RefineGenerator();

// Utility functions
function runCommand(command: string, args: string[], cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(chalk.blue(`📦 Running: ${command} ${args.join(' ')}`));
    
    const child = spawn(command, args, {
      cwd,
      stdio: 'inherit',
      shell: true
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with code ${code}`));
      }
    });
    
    child.on('error', (error) => {
      reject(error);
    });
  });
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
try {
  // Step 1: Parse DSL
  console.log(chalk.blue('🔍 Step 1: Parsing DSL...'));
  const lexingResult = erpLexer.tokenize(sampleDSL);
  
  if (lexingResult.errors.length > 0) {
    throw new Error('Lexing failed: ' + lexingResult.errors.map(e => e.message).join(', '));
  }
  
  simpleParser.input = lexingResult.tokens;
  const cst = simpleParser.erpDocument();
  
  if (simpleParser.errors.length > 0) {
    throw new Error('Parsing failed: ' + simpleParser.errors.map(e => e.message).join(', '));
  }
  
  const ast = astBuilder.buildDocument(cst);
  console.log(chalk.green('✅ DSL parsed successfully'));
  
  // Step 2: Generate CIR
  console.log(chalk.blue('🔍 Step 2: Generating CIR...'));
  const cir = cirConverter.convert(ast);
  console.log(chalk.green('✅ CIR generated'));
  
  // Step 3: Generate SQLite migration
  console.log(chalk.blue('🔍 Step 3: Generating SQLite migration...'));
  const sql = sqliteGenerator.generateMigration(cir);
  console.log(chalk.green('✅ SQLite migration generated'));
  
  // Step 4: Generate Backend
  console.log(chalk.blue('🔍 Step 4: Generating SQLite backend...'));
  const backendFiles = backendGenerator.generateBackend(cir);
  console.log(chalk.green('✅ SQLite backend generated'));
  
  // Step 5: Generate Frontend
  console.log(chalk.blue('🔍 Step 5: Generating React frontend...'));
  const frontendFiles = refineGenerator.generateFrontend(cir);
  console.log(chalk.green('✅ React frontend generated'));
  
  // Display results
  console.log(chalk.blue('\n📊 Generation Results:'));
  console.log(chalk.gray('---'));
  
  console.log(chalk.yellow(`Project: ${cir.metadata.name} v${cir.metadata.version}`));
  console.log(chalk.yellow(`Backend Files: ${backendFiles.size}`));
  console.log(chalk.yellow(`Frontend Files: ${frontendFiles.size}`));
  
  const mainModule = cir.modules['Main'];
  console.log(chalk.yellow(`Entities: ${Object.keys(mainModule.entities).length}`));
  console.log(chalk.yellow(`Actions: ${Object.keys(mainModule.actions).length}`));
  console.log(chalk.yellow(`Roles: ${Object.keys(mainModule.roles || {}).length}`));
  
  // Create output directory structure
  const outputDir = 'output/dev-demo';
  console.log(chalk.blue(`\n💾 Creating dev project in ${outputDir}...`));
  
  // Create backend directories
  const backendDir = join(outputDir, 'backend');
  mkdirSync(backendDir, { recursive: true });
  mkdirSync(join(backendDir, 'src'), { recursive: true });
  mkdirSync(join(backendDir, 'src/types'), { recursive: true });
  mkdirSync(join(backendDir, 'src/models'), { recursive: true });
  mkdirSync(join(backendDir, 'src/schemas'), { recursive: true });
  mkdirSync(join(backendDir, 'src/services'), { recursive: true });
  mkdirSync(join(backendDir, 'src/routes'), { recursive: true });
  mkdirSync(join(backendDir, 'src/database'), { recursive: true });
  
  // Create frontend directories
  const frontendDir = join(outputDir, 'frontend');
  mkdirSync(frontendDir, { recursive: true });
  mkdirSync(join(frontendDir, 'src'), { recursive: true });
  mkdirSync(join(frontendDir, 'src/components'), { recursive: true });
  mkdirSync(join(frontendDir, 'src/components/layout'), { recursive: true });
  mkdirSync(join(frontendDir, 'src/pages'), { recursive: true });
  mkdirSync(join(frontendDir, 'src/providers'), { recursive: true });
  mkdirSync(join(frontendDir, 'src/types'), { recursive: true });
  mkdirSync(join(frontendDir, 'src/utils'), { recursive: true });
  
  // Create pages directories for each entity
  for (const moduleName in cir.modules) {
    const module = cir.modules[moduleName];
    for (const entityName in module.entities) {
      const lowerName = entityName.toLowerCase();
      mkdirSync(join(frontendDir, 'src/pages', lowerName), { recursive: true });
    }
  }
  
  // Write backend files
  for (const [fileName, content] of backendFiles) {
    const filePath = join(backendDir, fileName);
    writeFileSync(filePath, content);
  }
  
  // Write frontend files
  for (const [fileName, content] of frontendFiles) {
    const filePath = join(frontendDir, fileName);
    writeFileSync(filePath, content);
  }
  
  // Write SQL migration
  writeFileSync(join(backendDir, 'migration.sql'), sql);
  
  // Create root package.json and scripts
  const rootPackageJson = {
    name: `${cir.metadata.name.toLowerCase()}-dev`,
    version: cir.metadata.version,
    description: `Generated dev application for ${cir.metadata.name}`,
    scripts: {
      'install:all': 'pnpm install && cd backend && pnpm install && cd ../frontend && pnpm install',
      'setup': 'pnpm run install:all && cd backend && pnpm run db:init',
      'dev:backend': 'cd backend && pnpm run dev',
      'dev:frontend': 'cd frontend && pnpm run dev',
      'dev': 'concurrently -n "backend,frontend" -c "blue,green" "pnpm run dev:backend" "pnpm run dev:frontend"',
      'start': 'pnpm run setup && pnpm run dev'
    },
    devDependencies: {
      concurrently: '^8.2.0'
    }
  };
  
  writeFileSync(join(outputDir, 'package.json'), JSON.stringify(rootPackageJson, null, 2));
  
  // Create startup script
  const startupScript = `#!/bin/bash
echo "🚀 Starting ${cir.metadata.name} Development Environment..."
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm is not installed. Please install pnpm first."
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
echo ""

npm run dev
`;
  
  writeFileSync(join(outputDir, 'start.sh'), startupScript);
  
  // Create Windows batch file
  const startupBat = `@echo off
echo 🚀 Starting ${cir.metadata.name} Development Environment...
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js first.
    pause
    exit /b 1
)

where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ npm is not installed. Please install npm first.
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
echo.

call npm run dev
pause
`;
  
  writeFileSync(join(outputDir, 'start.bat'), startupBat);
  
  // Create README
  const rootReadme = `# ${cir.metadata.name} - Development Environment

Generated full stack application with SQLite backend and React frontend.

## 🚀 Quick Start

### Option 1: Automatic Setup (Recommended)

**Windows:**
\`\`\`bash
# Double-click start.bat or run:
start.bat
\`\`\`

**Linux/Mac:**
\`\`\`bash
chmod +x start.sh
./start.sh
\`\`\`

### Option 2: Manual Setup

\`\`\`bash
# Install dependencies
npm run install:all

# Set up database
cd backend && npm run db:init && cd ..

# Start development servers
npm run dev
\`\`\`

## 📊 Project Structure

\`\`\`
${outputDir}/
├── backend/          # SQLite + TypeScript backend
│   ├── src/
│   │   ├── models/   # Database models
│   │   ├── routes/   # API routes
│   │   ├── services/ # Business logic
│   │   └── types/    # TypeScript types
│   ├── database.sqlite # SQLite database
│   └── migration.sql   # Database schema
├── frontend/         # React frontend
│   ├── src/
│   │   ├── components/ # UI components
│   │   ├── pages/      # Page components
│   │   ├── api/        # API client
│   │   └── types/      # TypeScript types
│   └── dist/          # Built files
├── package.json      # Root package.json
├── start.sh          # Linux/Mac startup script
└── start.bat         # Windows startup script
\`\`\`

## 🌐 Services

- **Backend**: http://localhost:3000
- **Frontend**: http://localhost:3001
- **API Docs**: http://localhost:3000/docs
- **Database**: SQLite (database.sqlite)

## 🔧 Features

### Backend
- ⚡ Fastify web framework
- 🗄️ SQLite database
- 📖 Swagger/OpenAPI documentation
- ✅ Zod validation
- 🔒 CORS, Helmet, Rate limiting
- 🏗️ Full TypeScript support

### Frontend
- ⚛️ React 18 + TypeScript
- 🎨 Tailwind CSS
- 🔄 React Query for data fetching
- 📝 React Hook Form
- 🧭 React Router
- 📱 Responsive design

## 🛠️ Development

### Backend Only
\`\`\`bash
cd backend
npm run dev
\`\`\`

### Frontend Only
\`\`\`bash
cd frontend
npm run dev
\`\`\`

### Reset Database
\`\`\`bash
cd backend
npm run db:reset
\`\`\`

## 📋 Generated Entities

${Object.keys(mainModule.entities).map(entityName => `- **${entityName}**: CRUD operations with REST API`).join('\n')}

## 🎯 Next Steps

1. Customize the entities in your DSL
2. Regenerate the code with new features
3. Add custom business logic in services
4. Extend the UI components
5. Deploy to production

## 📝 API Documentation

Visit http://localhost:3000/docs when the backend is running to see the interactive API documentation.
`;
  
  writeFileSync(join(outputDir, 'README.md'), rootReadme);
  
  console.log(chalk.green('✅ Dev project created successfully!'));
  
  // Show project structure
  console.log(chalk.blue('\n📂 Project Structure:'));
  console.log(`${outputDir}/`);
  console.log('├── backend/');
  console.log('│   ├── src/');
  console.log('│   ├── database.sqlite (will be created)');
  console.log('│   └── migration.sql');
  console.log('├── frontend/');
  console.log('│   └── src/');
  console.log('├── package.json');
  console.log('├── start.sh (Linux/Mac)');
  console.log('├── start.bat (Windows)');
  console.log('└── README.md');
  
  // Show generated entities
  console.log(chalk.blue('\n🏗️  Generated Entities:'));
  for (const entityName in mainModule.entities) {
    const entity = mainModule.entities[entityName];
    console.log(chalk.cyan(`  ${entityName}:`));
    console.log(chalk.gray(`    Fields: ${Object.keys(entity.fields).length}`));
    console.log(chalk.gray(`    SQLite table with full CRUD API`));
    console.log(chalk.gray(`    React components for list/form/detail`));
  }
  
  // Auto setup option
  console.log(chalk.blue('\n🎯 Auto Setup & Launch:'));
  console.log(chalk.yellow('Would you like to automatically install dependencies and start the servers?'));
  console.log(chalk.gray('This will run: npm install, setup database, and start both servers'));
  console.log('');
  
  // Ask for auto setup
  const { createInterface } = await import('readline');
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  rl.question(chalk.cyan('Start automatically? (y/n): '), async (answer) => {
    rl.close();
    
    if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
      console.log(chalk.blue('\n🚀 Starting automatic setup...'));
      
      try {
        // Install root dependencies
        console.log(chalk.blue('\n📦 Installing root dependencies...'));
        await runCommand('npm', ['install'], outputDir);
        
        // Install backend dependencies
        console.log(chalk.blue('\n📦 Installing backend dependencies...'));
        await runCommand('npm', ['install'], backendDir);
        
        // Install frontend dependencies
        console.log(chalk.blue('\n📦 Installing frontend dependencies...'));
        await runCommand('npm', ['install'], frontendDir);
        
        // Initialize database
        console.log(chalk.blue('\n🗄️  Initializing database...'));
        await runCommand('npm', ['run', 'db:init'], backendDir);
        
        console.log(chalk.green('\n✅ Setup completed successfully!'));
        console.log(chalk.blue('\n🎯 Starting development servers...'));
        console.log(chalk.yellow('Backend: http://localhost:3000'));
        console.log(chalk.yellow('Frontend: http://localhost:3001'));
        console.log(chalk.yellow('API Docs: http://localhost:3000/docs'));
        console.log('');
        console.log(chalk.gray('Press Ctrl+C to stop the servers'));
        console.log('');
        
        // Start dev servers
        await runCommand('npm', ['run', 'dev'], outputDir);
        
      } catch (error) {
        console.error(chalk.red('\n❌ Setup failed:'));
        console.error(chalk.red(error instanceof Error ? error.message : String(error)));
        console.log(chalk.blue('\n🔧 Manual setup instructions:'));
        console.log(`  1. cd ${outputDir}`);
        console.log('  2. npm run install:all');
        console.log('  3. cd backend && npm run db:init && cd ..');
        console.log('  4. npm run dev');
      }
    } else {
      console.log(chalk.blue('\n🔧 Manual setup instructions:'));
      console.log(`  1. cd ${outputDir}`);
      console.log('  2. npm run install:all');
      console.log('  3. cd backend && npm run db:init && cd ..');
      console.log('  4. npm run dev');
      console.log('');
      console.log(chalk.gray('Or use the startup scripts:'));
      console.log(chalk.gray('  Windows: start.bat'));
      console.log(chalk.gray('  Linux/Mac: ./start.sh'));
    }
  });
  
  console.log(chalk.green('\n✨ Dev demo generation completed successfully!'));
  
  // Show complete architecture
  console.log(chalk.blue('\n🏗️  Complete Dev Architecture:'));
  console.log('  DSL Text');
  console.log('     ↓');
  console.log('  ' + chalk.green('✅ Lexer + Parser') + ' → AST');
  console.log('     ↓');
  console.log('  ' + chalk.green('✅ CIR Converter') + ' → Normalized IR');
  console.log('     ↓');
  console.log('  ' + chalk.green('✅ SQLite Generator') + ' → SQLite Migration');
  console.log('     ↓');
  console.log('  ' + chalk.green('✅ Backend Generator') + ' → Fastify + SQLite');
  console.log('     ↓');
  console.log('  ' + chalk.green('✅ React Generator') + ' → React Frontend');
  console.log('     ↓');
  console.log('  ' + chalk.green('✅ Auto Setup') + ' → Ready to Use!');
  
} catch (error) {
  console.error(chalk.red('❌ Generation failed:'));
  console.error(chalk.red(error instanceof Error ? error.message : String(error)));
  process.exit(1);
}
}

// Run the main function
main().catch(error => {
  console.error(chalk.red('❌ Fatal error:'));
  console.error(chalk.red(error instanceof Error ? error.message : String(error)));
  process.exit(1);
}); 