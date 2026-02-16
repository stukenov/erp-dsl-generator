#!/usr/bin/env node

import { erpLexer } from './parser/lexer.js';
import { simpleParser } from './parser/simple-parser.js';
import { SimpleASTBuilder } from './parser/simple-ast-builder.js';
import { CIRConverter } from './cir/converter.js';
import { SQLGenerator } from './generators/sql-generator.js';
import { TypeScriptGenerator } from './generators/typescript-generator.js';
import { RefineGenerator } from './generators/refine-generator.js';
import chalk from 'chalk';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

// Пример DSL для генерации полного стека
const sampleDSL = `
erp ECommerceApp 1.0

use pack Base.v1
use pack Ecommerce.v1

entity Customer {
  doc = "Customer account"
  name: Text
  email: Email
  phone: Phone
  is_active: Bool
  registration_date: Date
  address: Text
}

entity Category {
  doc = "Product category"
  name: Text
  description: Text
  is_active: Bool
}

entity Product {
  doc = "Product in catalog"
  name: Text
  description: Text
  price: Money
  category: Category
  in_stock: Bool
  stock_quantity: Int
  image_url: Text
}

entity Order {
  doc = "Customer order"
  customer: Customer
  order_date: Date
  total_amount: Money
  status: Enum
  shipping_address: Text
  notes: Text
}

entity OrderItem {
  doc = "Order line item"
  order: Order
  product: Product
  quantity: Int
  unit_price: Money
  total_price: Money
}

action CreateOrder {
  emit OrderCreated
  call UpdateInventory
  call SendOrderConfirmation
}

action ProcessPayment {
  emit PaymentProcessed
  call UpdateOrderStatus
}

action ShipOrder {
  emit OrderShipped
  call SendTrackingInfo
}

action UpdateInventory {
  emit InventoryUpdated
}

role Admin grants all on Customer
role Admin grants all on Product
role Admin grants all on Order
role Admin grants all on Category
role Manager grants read on Customer
role Manager grants all on Product
role Manager grants all on Order
role Customer grants read on Customer
role Customer grants read on Product
role Customer grants create on Order
role Guest grants read on Product
role Guest grants read on Category
`;

console.log(chalk.blue('🚀 ERP Core - Full Stack Generation Demo\n'));

console.log(chalk.gray('--- Input DSL ---'));
console.log(sampleDSL);
console.log(chalk.gray('--- End Input ---\n'));

const astBuilder = new SimpleASTBuilder();
const cirConverter = new CIRConverter();
const sqlGenerator = new SQLGenerator();
const tsGenerator = new TypeScriptGenerator();
const refineGenerator = new RefineGenerator();

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
  
  // Step 3: Generate SQL
  console.log(chalk.blue('🔍 Step 3: Generating SQL migration...'));
  const sql = sqlGenerator.generateMigration(cir);
  console.log(chalk.green('✅ SQL migration generated'));
  
  // Step 4: Generate TypeScript Backend
  console.log(chalk.blue('🔍 Step 4: Generating TypeScript backend...'));
  const backendFiles = tsGenerator.generateBackend(cir);
  console.log(chalk.green('✅ TypeScript backend generated'));
  
  // Step 5: Generate React Frontend
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
  const outputDir = 'output/fullstack';
  console.log(chalk.blue(`\n💾 Creating full stack project in ${outputDir}...`));
  
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
  mkdirSync(join(frontendDir, 'src/pages'), { recursive: true });
  mkdirSync(join(frontendDir, 'src/hooks'), { recursive: true });
  mkdirSync(join(frontendDir, 'src/api'), { recursive: true });
  mkdirSync(join(frontendDir, 'src/types'), { recursive: true });
  mkdirSync(join(frontendDir, 'src/utils'), { recursive: true });
  mkdirSync(join(frontendDir, 'src/styles'), { recursive: true });
  mkdirSync(join(frontendDir, 'src/router'), { recursive: true });
  
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
  writeFileSync(join(outputDir, 'migration.sql'), sql);
  
  // Create root package.json and README
  const rootPackageJson = {
    name: `${cir.metadata.name.toLowerCase()}-fullstack`,
    version: cir.metadata.version,
    description: `Generated full stack application for ${cir.metadata.name}`,
    scripts: {
      'install:all': 'npm install && cd backend && npm install && cd ../frontend && npm install',
      'dev:backend': 'cd backend && npm run dev',
      'dev:frontend': 'cd frontend && npm run dev',
      'dev': 'concurrently "npm run dev:backend" "npm run dev:frontend"',
      'build:backend': 'cd backend && npm run build',
      'build:frontend': 'cd frontend && npm run build',
      'build': 'npm run build:backend && npm run build:frontend'
    },
    devDependencies: {
      concurrently: '^8.2.0'
    }
  };
  
  writeFileSync(join(outputDir, 'package.json'), JSON.stringify(rootPackageJson, null, 2));
  
  // Create root README
  const rootReadme = `# ${cir.metadata.name} - Full Stack Application

Generated full stack application with TypeScript backend and React frontend.

## Project Structure

\`\`\`
${outputDir}/
├── backend/          # TypeScript/Fastify backend
├── frontend/         # React frontend
├── migration.sql     # Database migration
├── package.json      # Root package.json
└── README.md         # This file
\`\`\`

## Quick Start

\`\`\`bash
# Install all dependencies
npm run install:all

# Set up database
createdb ${cir.metadata.name.toLowerCase()}_db
psql -d ${cir.metadata.name.toLowerCase()}_db < migration.sql

# Configure environment
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
# Edit .env files with your configuration

# Start development servers
npm run dev
\`\`\`

## Services

- **Backend**: http://localhost:3000
- **Frontend**: http://localhost:3001
- **API Docs**: http://localhost:3000/docs

## Features

### Backend
- TypeScript + Fastify
- PostgreSQL database
- REST API with OpenAPI docs
- Input validation with Zod
- CRUD operations for all entities

### Frontend
- React 18 + TypeScript
- Tailwind CSS styling
- React Query for data fetching
- React Hook Form for forms
- Responsive design

## Development

Each service can be run independently:

\`\`\`bash
# Backend only
npm run dev:backend

# Frontend only
npm run dev:frontend
\`\`\`

## Production Build

\`\`\`bash
npm run build
\`\`\`
`;
  
  writeFileSync(join(outputDir, 'README.md'), rootReadme);
  
  console.log(chalk.green('✅ Full stack project created successfully!'));
  
  // Show project structure
  console.log(chalk.blue('\n📂 Project Structure:'));
  console.log(`${outputDir}/`);
  console.log('├── backend/');
  console.log('│   ├── package.json');
  console.log('│   ├── README.md');
  console.log('│   └── src/');
  console.log('│       ├── app.ts');
  console.log('│       ├── server.ts');
  console.log('│       ├── types/');
  console.log('│       ├── models/');
  console.log('│       ├── schemas/');
  console.log('│       ├── services/');
  console.log('│       ├── routes/');
  console.log('│       └── database/');
  console.log('├── frontend/');
  console.log('│   ├── package.json');
  console.log('│   ├── README.md');
  console.log('│   ├── index.html');
  console.log('│   └── src/');
  console.log('│       ├── App.tsx');
  console.log('│       ├── main.tsx');
  console.log('│       ├── components/');
  console.log('│       ├── pages/');
  console.log('│       ├── hooks/');
  console.log('│       ├── api/');
  console.log('│       ├── types/');
  console.log('│       ├── utils/');
  console.log('│       └── router/');
  console.log('├── migration.sql');
  console.log('├── package.json');
  console.log('└── README.md');
  
  // Show generated entities
  console.log(chalk.blue('\n🏗️  Generated Entities:'));
  for (const entityName in mainModule.entities) {
    const entity = mainModule.entities[entityName];
    console.log(chalk.cyan(`  ${entityName}:`));
    console.log(chalk.gray(`    Fields: ${Object.keys(entity.fields).length}`));
    console.log(chalk.gray(`    Relations: ${Object.keys(entity.relations || {}).length}`));
    console.log(chalk.gray(`    Backend: API + Service + Model`));
    console.log(chalk.gray(`    Frontend: List + Form + Detail components`));
  }
  
  // Show API endpoints
  console.log(chalk.blue('\n🌐 Generated API Endpoints:'));
  for (const entityName in mainModule.entities) {
    const routeName = entityName.toLowerCase();
    console.log(chalk.cyan(`  ${entityName}:`));
    console.log(chalk.gray(`    GET    /api/${routeName}s`));
    console.log(chalk.gray(`    GET    /api/${routeName}s/:id`));
    console.log(chalk.gray(`    POST   /api/${routeName}s`));
    console.log(chalk.gray(`    PUT    /api/${routeName}s/:id`));
    console.log(chalk.gray(`    DELETE /api/${routeName}s/:id`));
  }
  
  // Show frontend pages
  console.log(chalk.blue('\n📱 Generated Frontend Pages:'));
  for (const entityName in mainModule.entities) {
    const routeName = entityName.toLowerCase();
    console.log(chalk.cyan(`  ${entityName}:`));
    console.log(chalk.gray(`    /${routeName}s - List view`));
    console.log(chalk.gray(`    /${routeName}s/new - Create form`));
    console.log(chalk.gray(`    /${routeName}s/:id - Detail view`));
    console.log(chalk.gray(`    /${routeName}s/:id/edit - Edit form`));
  }
  
  // Show next steps
  console.log(chalk.blue('\n🎯 Next Steps:'));
  console.log(`  1. cd ${outputDir}`);
  console.log('  2. npm run install:all');
  console.log('  3. Set up PostgreSQL database');
  console.log('  4. Run migration: psql -d your_db < migration.sql');
  console.log('  5. Configure .env files in backend/ and frontend/');
  console.log('  6. npm run dev');
  console.log('  7. Visit http://localhost:3001 for the app');
  console.log('  8. Visit http://localhost:3000/docs for API docs');
  
  console.log(chalk.green('\n✨ Full stack generation completed successfully!'));
  
  // Show complete architecture
  console.log(chalk.blue('\n🏗️  Complete Full Stack Architecture:'));
  console.log('  DSL Text');
  console.log('     ↓');
  console.log('  ' + chalk.green('✅ Lexer + Parser') + ' → AST');
  console.log('     ↓');
  console.log('  ' + chalk.green('✅ CIR Converter') + ' → Normalized IR');
  console.log('     ↓');
  console.log('  ' + chalk.green('✅ SQL Generator') + ' → PostgreSQL Migration');
  console.log('     ↓');
  console.log('  ' + chalk.green('✅ TypeScript Generator') + ' → Fastify Backend');
  console.log('     ↓');
  console.log('  ' + chalk.green('✅ React Generator') + ' → React Frontend');
  console.log('     ↓');
  console.log('  ' + chalk.green('✅ Complete Full Stack App') + ' + API Docs');
  
  console.log(chalk.blue('\n📈 Generation Statistics:'));
  console.log(`  Total Files Generated: ${backendFiles.size + frontendFiles.size + 3}`);
  console.log(`  Backend Files: ${backendFiles.size}`);
  console.log(`  Frontend Files: ${frontendFiles.size}`);
  console.log(`  Configuration Files: 3`);
  console.log(`  Lines of Code: ~${Math.round((backendFiles.size + frontendFiles.size) * 50)}`);
  
} catch (error) {
  console.error(chalk.red('❌ Generation failed:'));
  console.error(chalk.red(error instanceof Error ? error.message : String(error)));
  process.exit(1);
} 