#!/usr/bin/env node

import { erpLexer } from './parser/lexer.js';
import { enhancedParser } from './parser/enhanced-parser.js';
import { EnhancedASTBuilder } from './parser/enhanced-ast-builder.js';
import { EnhancedCIRConverter } from './cir/enhanced-converter.js';
import { SQLiteGenerator } from './generators/sqlite-generator.js';
import { SQLiteBackendGenerator } from './generators/sqlite-backend-generator.js';
import { RefineGenerator } from './generators/refine-generator.js';
import chalk from 'chalk';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { spawn } from 'child_process';

// Улучшенный пример DSL с полной поддержкой спецификации
const enhancedDSL = `
erp MyCompanyERP 0.1

use pack Base.v0
use pack Accounting.v2025

module Sales {
  doc = "Модуль продаж и работы с клиентами"

  entity Customer {
    doc = "Клиент компании"
    pk = id
    code: Code(auto_seq="CUST-{YYYY}-{####}", max=16, unique)
    name: Text(1..200, required, i18n)
    email: Email(unique)
    phone: Phone?
    tier: Enum[Regular,VIP,Blocked]=Regular
    tags: Tag[]
    addr: Address
    is_active: Bool=true
    
    # audit fields
    created_at: DateTime(auto_create)
    updated_at: DateTime(auto_update)
  }

  entity Product {
    doc = "Товар или услуга"
    pk = id
    code: Code(auto_seq="PROD-{####}", max=16, unique)
    name: Text(1..200, required)
    description: Text(max=1000)
    price: Money(required, min=0)
    category: ProductCategory(1)
    in_stock: Bool=true
    stock_quantity: Int(min=0)=0
    
    created_at: DateTime(auto_create)
    updated_at: DateTime(auto_update)
  }

  entity ProductCategory {
    doc = "Категория товаров"
    pk = id
    code: Code(auto_seq="CAT-{###}", max=16, unique)
    name: Text(1..100, required, unique)
    parent: ProductCategory?
    products: Product*(backref=category)
    
    created_at: DateTime(auto_create)
    updated_at: DateTime(auto_update)
  }

  entity Order {
    doc = "Заказ клиента"
    pk = id
    number: Code(auto_seq="ORD-{YYYY}-{####}", unique)
    customer: Customer(1, backref=orders)
    lines: OrderLine*(backref=order, cascade)
    total_amount: Money(calc=sum(lines.amount), min=0)
    status: Enum[Draft,Confirmed,Shipped,Billed,Closed]=Draft
    order_date: Date(auto_create)
    notes: Text(max=500)?
    
    created_at: DateTime(auto_create)
    updated_at: DateTime(auto_update)
  }

  entity OrderLine {
    doc = "Строка заказа"
    order: Order(1, cascade)
    product: Product(1)
    qty: Decimal(12,3, min=0, required)
    price: Money(required, min=0)
    discount: Decimal(5,2, min=0, max=100)=0
    amount: Money(calc=qty*price*(1-discount/100))
  }

  # Actions for business logic
  action ConfirmOrder(order: Order) when order.status == "Draft" {
    order.status = "Confirmed"
    emit OrderConfirmed(order.id)
    call Inventory.UpdateStock(order.lines)
  }

  action ShipOrder(order: Order) when order.status == "Confirmed" {
    order.status = "Shipped"
    emit OrderShipped(order.id)
    call Billing.CreateInvoice(order.id)
  }

  action CloseOrder(order: Order) when order.status == "Billed" {
    order.status = "Closed"
    emit OrderClosed(order.id)
  }

  action CancelOrder(order: Order) when order.status != "Closed" {
    order.status = "Cancelled"
    emit OrderCancelled(order.id)
    call Inventory.RestoreStock(order.lines)
  }

  # Workflow for order lifecycle
  workflow OrderLifecycle for Order initial=Draft {
    Draft -> Confirmed on confirmOrder()
    Confirmed -> Shipped on shipOrder()
    Shipped -> Billed on createInvoice()
    Billed -> Closed on closeOrder()
    Draft -> Cancelled on cancelOrder()
    Confirmed -> Cancelled on cancelOrder()
  }

  # UI Forms
  form CustomerEdit for Customer layout=2col {
    group "Основная информация" {
      code, name, email, phone, tier
    }
    group "Адрес" collapsible {
      addr
    }
    group "Дополнительно" collapsible {
      tags, is_active
    }
  }

  form OrderEdit for Order layout=single {
    group "Заказ" {
      number, customer, order_date, status
    }
    group "Строки заказа" {
      lines
    }
    group "Итого" {
      total_amount, notes
    }
  }

  # Access control with field-level permissions
  role Admin grants * on *
  role SalesManager grants crud on Customer,Order,OrderLine,Product,ProductCategory
  role SalesAgent grants rcu on Customer,Order,OrderLine except fields tier,total_amount
  role Viewer grants r on * except fields created_at,updated_at
  role Customer grants r on Product,ProductCategory
}

module Inventory {
  doc = "Модуль управления складом"

  entity Warehouse {
    doc = "Склад"
    code: Code(auto_seq="WH-{###}", unique)
    name: Text(required)
    address: Address
    is_active: Bool=true
  }

  entity StockItem {
    doc = "Складская позиция"
    warehouse: Warehouse(1)
    product: Product(1)
    quantity: Int(min=0)=0
    reserved: Int(min=0)=0
    available: Int(calc=quantity-reserved)
  }

  action UpdateStock(orderLines: OrderLine[]) {
    call ProcessStockMovement
    emit StockUpdated
  }

  action RestoreStock(orderLines: OrderLine[]) {
    call ReverseStockMovement
    emit StockRestored
  }
}

# Global roles
role System grants all on *
role Guest grants read on Product,ProductCategory
`;

console.log(chalk.blue('🚀 ERP Core - Enhanced Demo with Full DSL Support\n'));

console.log(chalk.gray('--- Enhanced Input DSL ---'));
console.log(enhancedDSL);
console.log(chalk.gray('--- End Enhanced Input ---\n'));

const astBuilder = new EnhancedASTBuilder();
const cirConverter = new EnhancedCIRConverter();
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

async function main() {
try {
  // Step 1: Parse Enhanced DSL
  console.log(chalk.blue('🔍 Step 1: Parsing Enhanced DSL...'));
  const lexingResult = erpLexer.tokenize(enhancedDSL);
  
  if (lexingResult.errors.length > 0) {
    throw new Error('Lexing failed: ' + lexingResult.errors.map(e => e.message).join(', '));
  }
  
  enhancedParser.input = lexingResult.tokens;
  const cst = enhancedParser.erpDocument();
  
  if (enhancedParser.errors.length > 0) {
    console.log(chalk.yellow('⚠️  Parser warnings:'));
    enhancedParser.errors.forEach(error => {
      console.log(chalk.yellow(`   - ${error.message}`));
    });
  }
  
  const ast = astBuilder.buildDocument(cst);
  console.log(chalk.green('✅ Enhanced DSL parsed successfully'));
  
  // Show parsed structure
  console.log(chalk.blue('\n📋 Parsed Structure:'));
  console.log(chalk.cyan(`  Project: ${ast.name} v${ast.version}`));
  console.log(chalk.cyan(`  Convention Packs: ${ast.packs.length}`));
  console.log(chalk.cyan(`  Modules: ${ast.modules.length}`));
  console.log(chalk.cyan(`  Entities: ${ast.entities.length}`));
  console.log(chalk.cyan(`  Actions: ${ast.actions.length}`));
  console.log(chalk.cyan(`  Workflows: ${ast.workflows?.length || 0}`));
  console.log(chalk.cyan(`  Forms: ${ast.forms.length}`));
  console.log(chalk.cyan(`  Roles: ${ast.roles.length}`));
  
  // Step 2: Generate Enhanced CIR
  console.log(chalk.blue('\n🔍 Step 2: Generating Enhanced CIR...'));
  const cir = cirConverter.convert(ast);
  console.log(chalk.green('✅ Enhanced CIR generated'));
  
  // Show CIR details
  console.log(chalk.blue('\n📊 CIR Analysis:'));
  for (const moduleName in cir.modules) {
    const module = cir.modules[moduleName];
    console.log(chalk.yellow(`  Module ${moduleName}:`));
    console.log(chalk.gray(`    Entities: ${Object.keys(module.entities).length}`));
    console.log(chalk.gray(`    Actions: ${Object.keys(module.actions).length}`));
    console.log(chalk.gray(`    Forms: ${Object.keys(module.forms || {}).length}`));
    console.log(chalk.gray(`    Roles: ${Object.keys(module.roles || {}).length}`));
    
    // Show entity details
    for (const entityName in module.entities) {
      const entity = module.entities[entityName];
      const fieldCount = Object.keys(entity.fields).length;
      const relationCount = Object.keys(entity.relations).length;
      console.log(chalk.gray(`      ${entityName}: ${fieldCount} fields, ${relationCount} relations`));
    }
  }
  
  // Step 3: Generate SQLite migration
  console.log(chalk.blue('\n🔍 Step 3: Generating SQLite migration...'));
  const sql = sqliteGenerator.generateMigration(cir);
  console.log(chalk.green('✅ SQLite migration generated'));
  
  // Step 4: Generate Enhanced Backend
  console.log(chalk.blue('\n🔍 Step 4: Generating Enhanced Backend...'));
  const backendFiles = backendGenerator.generateBackend(cir);
  console.log(chalk.green('✅ Enhanced Backend generated'));
  
  // Step 5: Generate Enhanced Frontend
  console.log(chalk.blue('\n🔍 Step 5: Generating Enhanced Frontend...'));
  const frontendFiles = refineGenerator.generateFrontend(cir);
  console.log(chalk.green('✅ Enhanced Frontend generated'));
  
  // Display generation results
  console.log(chalk.blue('\n📊 Generation Results:'));
  console.log(chalk.gray('---'));
  
  console.log(chalk.yellow(`Project: ${cir.metadata.name} v${cir.metadata.version}`));
  console.log(chalk.yellow(`Schema Version: ${cir.metadata.schemaVersion}`));
  console.log(chalk.yellow(`Backend Files: ${backendFiles.size}`));
  console.log(chalk.yellow(`Frontend Files: ${frontendFiles.size}`));
  console.log(chalk.yellow(`Convention Packs: ${cir.conventionPacks.length}`));
  
  let totalEntities = 0;
  let totalActions = 0;
  let totalRoles = 0;
  let totalForms = 0;
  
  for (const moduleName in cir.modules) {
    const module = cir.modules[moduleName];
    totalEntities += Object.keys(module.entities).length;
    totalActions += Object.keys(module.actions).length;
    totalRoles += Object.keys(module.roles || {}).length;
    totalForms += Object.keys(module.forms || {}).length;
  }
  
  console.log(chalk.yellow(`Total Entities: ${totalEntities}`));
  console.log(chalk.yellow(`Total Actions: ${totalActions}`));
  console.log(chalk.yellow(`Total Forms: ${totalForms}`));
  console.log(chalk.yellow(`Total Roles: ${totalRoles}`));
  
  // Create enhanced output directory structure
  const outputDir = 'output/enhanced-demo';
  console.log(chalk.blue(`\n💾 Creating enhanced project in ${outputDir}...`));
  
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
  mkdirSync(join(backendDir, 'src/actions'), { recursive: true });
  mkdirSync(join(backendDir, 'src/events'), { recursive: true });
  mkdirSync(join(backendDir, 'src/middleware'), { recursive: true });
  
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
  mkdirSync(join(frontendDir, 'src/forms'), { recursive: true });
  
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
  
  // Write CIR for inspection
  writeFileSync(join(outputDir, 'cir.json'), JSON.stringify(cir, null, 2));
  
  // Create enhanced root package.json
  const rootPackageJson = {
    name: `${cir.metadata.name.toLowerCase()}-enhanced`,
    version: cir.metadata.version,
    description: `Enhanced full-stack application for ${cir.metadata.name} with DSL features`,
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
    keywords: ['erp', 'dsl', 'full-stack', 'generated', 'business-automation'],
    engines: {
      node: '>=18.0.0',
      npm: '>=9.0.0'
    }
  };
  
  writeFileSync(join(outputDir, 'package.json'), JSON.stringify(rootPackageJson, null, 2));
  
  // Create enhanced startup script
  const startupScript = `#!/bin/bash
echo "🚀 Starting ${cir.metadata.name} Enhanced Development Environment..."
echo "   Full DSL Support | Modules | Actions | Workflows | Forms | ACL"
echo ""

# Check dependencies
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
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
echo "  GraphQL: http://localhost:3000/graphql"
echo ""
echo "Features enabled:"
echo "  ✅ Multi-module architecture"
echo "  ✅ Advanced field types & constraints"
echo "  ✅ Relations & foreign keys"
echo "  ✅ Business actions & workflows"
echo "  ✅ Role-based access control"
echo "  ✅ Custom forms & layouts"
echo "  ✅ Event-driven architecture"
echo "  ✅ Auto-generated CRUD APIs"
echo "  ✅ Real-time UI updates"
echo ""
echo "Press Ctrl+C to stop the servers"
echo ""

npm run dev
`;
  
  writeFileSync(join(outputDir, 'start.sh'), startupScript);
  
  // Create Windows batch file
  const startupBat = `@echo off
echo 🚀 Starting ${cir.metadata.name} Enhanced Development Environment...
echo    Full DSL Support ^| Modules ^| Actions ^| Workflows ^| Forms ^| ACL
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js 18+ first.
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
echo   GraphQL: http://localhost:3000/graphql
echo.
echo Features enabled:
echo   ✅ Multi-module architecture
echo   ✅ Advanced field types ^& constraints
echo   ✅ Relations ^& foreign keys
echo   ✅ Business actions ^& workflows
echo   ✅ Role-based access control
echo   ✅ Custom forms ^& layouts
echo   ✅ Event-driven architecture
echo   ✅ Auto-generated CRUD APIs
echo   ✅ Real-time UI updates
echo.
echo Press Ctrl+C to stop the servers
echo.

call npm run dev
pause
`;
  
  writeFileSync(join(outputDir, 'start.bat'), startupBat);
  
  // Create enhanced README
  const rootReadme = `# ${cir.metadata.name} - Enhanced Full-Stack Application

> 🚀 **Generated with Enhanced ERP DSL** - Complete business application with advanced features

## ✨ Features

### 🏗️ **Architecture**
- **Multi-module design** - Organized business domains
- **Event-driven** - Actions trigger events and workflows
- **Type-safe** - Full TypeScript support throughout
- **Auto-generated** - From single DSL source of truth

### 📊 **Data & Business Logic**
- **Rich field types** - Code, Money, Enum with constraints
- **Smart relations** - One-to-many, many-to-one with backref
- **Calculated fields** - Auto-computed totals and aggregations
- **Audit trails** - Automatic created_at/updated_at tracking

### 🔐 **Security & Access**
- **Role-based access control** - Entity and field-level permissions
- **Field masking** - Sensitive data protection
- **Action permissions** - Business operation access control

### 🎨 **User Interface**
- **Custom forms** - Tailored layouts and field groups
- **Smart widgets** - Auto-selected based on field types
- **Responsive design** - Mobile-first with Ant Design
- **Real-time updates** - Live data synchronization

### ⚡ **Backend API**
- **Auto-generated CRUD** - REST APIs for all entities
- **Business actions** - Custom operations with validation
- **Event system** - Pub/sub for decoupled architecture
- **OpenAPI docs** - Interactive API documentation

## 🚀 Quick Start

### Automatic Setup (Recommended)

**Windows:**
\`\`\`bash
start.bat
\`\`\`

**Linux/Mac:**
\`\`\`bash
chmod +x start.sh
./start.sh
\`\`\`

### Manual Setup

\`\`\`bash
# Install all dependencies
npm run install:all

# Initialize database
cd backend && npm run db:init && cd ..

# Start development servers
npm run dev
\`\`\`

## 🌐 Services

| Service | URL | Description |
|---------|-----|-------------|
| **Frontend** | http://localhost:3001 | React admin interface |
| **Backend API** | http://localhost:3000 | REST API server |
| **API Docs** | http://localhost:3000/docs | Interactive documentation |
| **Database** | SQLite file | Lightweight embedded database |

## 📂 Project Structure

\`\`\`
${outputDir}/
├── backend/              # TypeScript backend
│   ├── src/
│   │   ├── models/       # Database models
│   │   ├── routes/       # API endpoints
│   │   ├── services/     # Business logic
│   │   ├── actions/      # Business actions
│   │   ├── events/       # Event handlers
│   │   └── middleware/   # Auth & validation
│   └── migration.sql     # Database schema
├── frontend/             # React frontend
│   ├── src/
│   │   ├── components/   # UI components
│   │   ├── pages/        # Entity pages
│   │   ├── forms/        # Custom forms
│   │   └── providers/    # Data & auth
├── cir.json             # Generated IR for inspection
└── README.md            # This file
\`\`\`

## 🏢 Generated Modules

${Object.keys(cir.modules).map(moduleName => {
  const module = cir.modules[moduleName];
  const entityCount = Object.keys(module.entities).length;
  const actionCount = Object.keys(module.actions).length;
  return `### ${moduleName}
${module.entities && Object.keys(module.entities).length > 0 ? `
**Entities:** ${Object.keys(module.entities).map(name => `\`${name}\``).join(', ')}

**Features:**
- ${entityCount} business entities
- ${actionCount} business actions
- Full CRUD operations
- Role-based permissions` : ''}`;
}).join('\n\n')}

## 📋 Generated Entities

${Object.values(cir.modules).flatMap(module => 
  Object.entries(module.entities).map(([entityName, entity]) => {
    const fieldCount = Object.keys(entity.fields).length;
    const relationCount = Object.keys(entity.relations).length;
    return `### ${entityName}
- **Fields:** ${fieldCount} (including constraints & validation)
- **Relations:** ${relationCount}
- **API:** \`/api/${entityName.toLowerCase()}s\`
- **Documentation:** ${entity.doc || 'Business entity'}`;
  })
).join('\n\n')}

## 🔧 Development

### Backend Development
\`\`\`bash
cd backend
npm run dev          # Start with hot reload
npm run build        # Build for production
npm run test         # Run tests
npm run db:reset     # Reset database
\`\`\`

### Frontend Development
\`\`\`bash
cd frontend
npm run dev          # Start with hot reload
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Lint code
\`\`\`

### Database Operations
\`\`\`bash
cd backend
npm run db:init      # Initialize database
npm run db:migrate   # Run migrations
npm run db:seed      # Seed test data
npm run db:reset     # Reset everything
\`\`\`

## 🎯 Business Logic

### Available Actions
${Object.values(cir.modules).flatMap(module => 
  Object.entries(module.actions).map(([actionName, action]) => 
    `- **${actionName}** - ${action.condition ? `Condition: \`${action.condition}\`` : 'No conditions'}`
  )
).join('\n')}

### Role-Based Access
${Object.values(cir.modules).flatMap(module => 
  Object.entries(module.roles || {}).map(([roleName, role]) => 
    `- **${roleName}** - ${role.grants.map(g => `${g.permissions.join('/')} on ${g.entities.join(',')}`).join('; ')}`
  )
).join('\n')}

## 📚 API Documentation

Visit **http://localhost:3000/docs** when running to explore:

- 📖 Interactive API documentation
- 🧪 Try API endpoints live
- 📝 Request/response schemas
- 🔐 Authentication examples

## 🛠️ Customization

### Adding New Fields
1. Update your DSL source
2. Regenerate with \`erp build\`
3. Run \`npm run db:migrate\`

### Custom Business Logic
- Add custom services in \`backend/src/services/\`
- Implement action handlers in \`backend/src/actions/\`
- Create event listeners in \`backend/src/events/\`

### UI Customization
- Modify forms in \`frontend/src/forms/\`
- Customize components in \`frontend/src/components/\`
- Update themes in \`frontend/src/providers/\`

## 🚢 Production Deployment

### Build for Production
\`\`\`bash
npm run build
\`\`\`

### Environment Variables
Create \`.env.production\`:
\`\`\`bash
NODE_ENV=production
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-key
CORS_ORIGIN=https://yourdomain.com
\`\`\`

### Docker Deployment
\`\`\`bash
docker build -t ${cir.metadata.name.toLowerCase()}-app .
docker run -p 3000:3000 ${cir.metadata.name.toLowerCase()}-app
\`\`\`

---

**Generated by ERP Core DSL** - From specification to production-ready application
`;
  
  writeFileSync(join(outputDir, 'README.md'), rootReadme);
  
  console.log(chalk.green('✅ Enhanced project created successfully!'));
  
  // Show enhanced project structure
  console.log(chalk.blue('\n📂 Enhanced Project Structure:'));
  console.log(`${outputDir}/`);
  console.log('├── backend/               # Enhanced TypeScript backend');
  console.log('│   ├── src/actions/       # Business action handlers');
  console.log('│   ├── src/events/        # Event system');
  console.log('│   ├── src/middleware/    # Auth & validation');
  console.log('│   └── migration.sql      # Database schema');
  console.log('├── frontend/              # Enhanced React frontend');
  console.log('│   ├── src/forms/         # Custom form components');
  console.log('│   └── src/pages/         # Entity-specific pages');
  console.log('├── cir.json              # Generated IR');
  console.log('├── package.json          # Root configuration');
  console.log('├── start.sh (Linux/Mac)  # Enhanced startup');
  console.log('├── start.bat (Windows)   # Enhanced startup');
  console.log('└── README.md             # Comprehensive docs');
  
  // Show enhanced features
  console.log(chalk.blue('\n🎯 Enhanced Features Generated:'));
  console.log(chalk.green('✅ Multi-module architecture'));
  console.log(chalk.green('✅ Advanced field types & constraints'));
  console.log(chalk.green('✅ Entity relations with foreign keys'));
  console.log(chalk.green('✅ Business actions with conditions'));
  console.log(chalk.green('✅ Workflow state machines'));
  console.log(chalk.green('✅ Custom forms & layouts'));
  console.log(chalk.green('✅ Role-based access control'));
  console.log(chalk.green('✅ Field-level permissions'));
  console.log(chalk.green('✅ Event-driven architecture'));
  console.log(chalk.green('✅ Auto-generated documentation'));
  
  // Show statistics
  console.log(chalk.blue('\n📊 Generation Statistics:'));
  for (const moduleName in cir.modules) {
    const module = cir.modules[moduleName];
    console.log(chalk.cyan(`  Module ${moduleName}:`));
    
    for (const entityName in module.entities) {
      const entity = module.entities[entityName];
      const fieldCount = Object.keys(entity.fields).length;
      const relationCount = Object.keys(entity.relations).length;
      
      console.log(chalk.gray(`    ${entityName}:`));
      console.log(chalk.gray(`      - ${fieldCount} fields with constraints`));
      console.log(chalk.gray(`      - ${relationCount} relations`));
      console.log(chalk.gray(`      - Full CRUD API generated`));
      console.log(chalk.gray(`      - React components with forms`));
    }
    
    if (Object.keys(module.actions).length > 0) {
      console.log(chalk.gray(`    Actions: ${Object.keys(module.actions).join(', ')}`));
    }
  }
  
  console.log(chalk.green('\n✨ Enhanced demo generation completed successfully!'));
  console.log(chalk.blue('\n🏗️  Complete Enhanced Architecture:'));
  console.log('  Enhanced DSL Text');
  console.log('     ↓');
  console.log('  ' + chalk.green('✅ Enhanced Lexer + Parser') + ' → Rich AST');
  console.log('     ↓');
  console.log('  ' + chalk.green('✅ Enhanced CIR Converter') + ' → Full-featured IR');
  console.log('     ↓');
  console.log('  ' + chalk.green('✅ SQLite Generator') + ' → Schema with Relations');
  console.log('     ↓');
  console.log('  ' + chalk.green('✅ Backend Generator') + ' → Actions + Events + ACL');
  console.log('     ↓');
  console.log('  ' + chalk.green('✅ Frontend Generator') + ' → Forms + Workflows');
  console.log('     ↓');
  console.log('  ' + chalk.green('✅ Auto Setup') + ' → Production-Ready App!');
  
  console.log(chalk.blue('\n🎉 Ready to run:'));
  console.log(chalk.yellow(`  cd ${outputDir}`));
  console.log(chalk.yellow('  ./start.sh        # Linux/Mac'));
  console.log(chalk.yellow('  start.bat         # Windows'));
  
} catch (error) {
  console.error(chalk.red('❌ Enhanced generation failed:'));
  console.error(chalk.red(error instanceof Error ? error.message : String(error)));
  
  // Show debug info
  if (error instanceof Error && error.stack) {
    console.log(chalk.gray('\n🔍 Debug trace:'));
    console.log(chalk.gray(error.stack));
  }
  
  process.exit(1);
}
}

// Run the enhanced main function
main().catch(error => {
  console.error(chalk.red('❌ Fatal error in enhanced demo:'));
  console.error(chalk.red(error instanceof Error ? error.message : String(error)));
  process.exit(1);
}); 