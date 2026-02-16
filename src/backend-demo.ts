#!/usr/bin/env node

import { erpLexer } from './parser/lexer.js';
import { simpleParser } from './parser/simple-parser.js';
import { SimpleASTBuilder } from './parser/simple-ast-builder.js';
import { CIRConverter } from './cir/converter.js';
import { SQLGenerator } from './generators/sql-generator.js';
import { TypeScriptGenerator } from './generators/typescript-generator.js';
import chalk from 'chalk';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

// Пример DSL для генерации полного backend
const sampleDSL = `
erp ShopERP 1.0

use pack Base.v1
use pack Ecommerce.v1

entity Customer {
  doc = "Customer account"
  name: Text
  email: Email
  phone: Phone
  is_active: Bool
  registration_date: Date
}

entity Product {
  doc = "Product in catalog"
  name: Text
  description: Text
  price: Money
  category: Text
  in_stock: Bool
  stock_quantity: Int
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

role Admin grants all on Customer
role Admin grants all on Product
role Admin grants all on Order
role Manager grants read on Customer
role Manager grants all on Product
role Customer grants read on Customer
role Customer grants read on Product
role Guest grants read on Product
`;

console.log(chalk.blue('🚀 ERP Core - Backend Generation Demo\n'));

console.log(chalk.gray('--- Input DSL ---'));
console.log(sampleDSL);
console.log(chalk.gray('--- End Input ---\n'));

const astBuilder = new SimpleASTBuilder();
const cirConverter = new CIRConverter();
const sqlGenerator = new SQLGenerator();
const tsGenerator = new TypeScriptGenerator();

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
  
  // Display results
  console.log(chalk.blue('\n📊 Generation Results:'));
  console.log(chalk.gray('---'));
  
  console.log(chalk.yellow(`Project: ${cir.metadata.name} v${cir.metadata.version}`));
  console.log(chalk.yellow(`Generated Files: ${backendFiles.size}`));
  
  const mainModule = cir.modules['Main'];
  console.log(chalk.yellow(`Entities: ${Object.keys(mainModule.entities).length}`));
  console.log(chalk.yellow(`Actions: ${Object.keys(mainModule.actions).length}`));
  console.log(chalk.yellow(`Roles: ${Object.keys(mainModule.roles || {}).length}`));
  
  // Show generated files
  console.log(chalk.blue('\n📁 Generated Files:'));
  for (const [fileName, content] of backendFiles) {
    console.log(chalk.cyan(`  ${fileName} (${Math.round(content.length / 1024)}KB)`));
  }
  
  // Create output directory structure
  const outputDir = 'output/backend';
  console.log(chalk.blue(`\n💾 Creating backend project in ${outputDir}...`));
  
  // Create directories
  mkdirSync(outputDir, { recursive: true });
  mkdirSync(join(outputDir, 'src'), { recursive: true });
  mkdirSync(join(outputDir, 'src/types'), { recursive: true });
  mkdirSync(join(outputDir, 'src/models'), { recursive: true });
  mkdirSync(join(outputDir, 'src/schemas'), { recursive: true });
  mkdirSync(join(outputDir, 'src/services'), { recursive: true });
  mkdirSync(join(outputDir, 'src/routes'), { recursive: true });
  mkdirSync(join(outputDir, 'src/database'), { recursive: true });
  
  // Write all generated files
  for (const [fileName, content] of backendFiles) {
    const filePath = join(outputDir, fileName);
    writeFileSync(filePath, content);
  }
  
  // Also save SQL migration
  writeFileSync(join(outputDir, 'migration.sql'), sql);
  
  console.log(chalk.green('✅ Backend project created successfully!'));
  
  // Show project structure
  console.log(chalk.blue('\n📂 Project Structure:'));
  console.log(`${outputDir}/`);
  console.log('├── package.json');
  console.log('├── README.md');
  console.log('├── migration.sql');
  console.log('└── src/');
  console.log('    ├── app.ts');
  console.log('    ├── server.ts');
  console.log('    ├── types/');
  console.log('    │   └── index.ts');
  console.log('    ├── models/');
  console.log('    │   └── index.ts');
  console.log('    ├── schemas/');
  console.log('    │   └── index.ts');
  console.log('    ├── services/');
  console.log('    │   ├── CustomerService.ts');
  console.log('    │   ├── ProductService.ts');
  console.log('    │   ├── OrderService.ts');
  console.log('    │   └── OrderItemService.ts');
  console.log('    ├── routes/');
  console.log('    │   ├── customer.ts');
  console.log('    │   ├── product.ts');
  console.log('    │   ├── order.ts');
  console.log('    │   └── orderitem.ts');
  console.log('    └── database/');
  console.log('        └── connection.ts');
  
  // Show sample API endpoints
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
  
  // Show next steps
  console.log(chalk.blue('\n🎯 Next Steps:'));
  console.log(`  1. cd ${outputDir}`);
  console.log('  2. npm install');
  console.log('  3. Set up PostgreSQL database');
  console.log('  4. Run migration: psql -d your_db < migration.sql');
  console.log('  5. Create .env file with database credentials');
  console.log('  6. npm run dev');
  console.log('  7. Visit http://localhost:3000/docs for API documentation');
  
  console.log(chalk.green('\n✨ Full backend generation completed successfully!'));
  
  // Show architecture
  console.log(chalk.blue('\n🏗️  Complete Architecture:'));
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
  console.log('  ' + chalk.green('✅ Complete REST API') + ' + Swagger Docs');
  
} catch (error) {
  console.error(chalk.red('❌ Generation failed:'));
  console.error(chalk.red(error instanceof Error ? error.message : String(error)));
  process.exit(1);
} 