#!/usr/bin/env node

import { erpLexer } from './parser/lexer.js';
import { simpleParser } from './parser/simple-parser.js';
import { SimpleASTBuilder } from './parser/simple-ast-builder.js';
import { CIRConverter } from './cir/converter.js';
import { SQLGenerator } from './generators/sql-generator.js';
import chalk from 'chalk';
import { writeFileSync } from 'fs';

// Пример DSL для полной демонстрации
const sampleDSL = `
erp CompanyERP 1.0

use pack Base.v1
use pack CRM.v2

entity Customer {
  doc = "Customer information"
  name: Text
  email: Email
  phone: Phone
  status: Enum
  is_active: Bool
}

entity Order {
  doc = "Customer order"
  customer: Customer
  order_date: Date
  total_amount: Money
  status: Enum
  notes: Text
}

entity Product {
  doc = "Product catalog"
  name: Text
  price: Money
  category: Text
  in_stock: Bool
}

action CreateOrder {
  emit OrderCreated
  call SendConfirmationEmail
}

action ProcessPayment {
  emit PaymentProcessed
  call UpdateInventory
}

action ActivateCustomer {
  emit CustomerActivated
}

role SuperAdmin grants all on Customer
role Admin grants all on Order
role Manager grants read on Product
role Customer grants read on Customer
role Guest grants read on Product
`;

console.log(chalk.blue('🚀 ERP Core - Full Pipeline Demo\n'));

console.log(chalk.gray('--- Input DSL ---'));
console.log(sampleDSL);
console.log(chalk.gray('--- End Input ---\n'));

const astBuilder = new SimpleASTBuilder();
const cirConverter = new CIRConverter();
const sqlGenerator = new SQLGenerator();

try {
  // Step 1: Lexical Analysis
  console.log(chalk.blue('🔍 Step 1: Lexical Analysis...'));
  const lexingResult = erpLexer.tokenize(sampleDSL);
  
  if (lexingResult.errors.length > 0) {
    throw new Error('Lexing failed: ' + lexingResult.errors.map(e => e.message).join(', '));
  }
  
  console.log(chalk.green(`✅ Tokenized ${lexingResult.tokens.length} tokens`));
  
  // Step 2: Syntax Analysis
  console.log(chalk.blue('🔍 Step 2: Syntax Analysis...'));
  simpleParser.input = lexingResult.tokens;
  const cst = simpleParser.erpDocument();
  
  if (simpleParser.errors.length > 0) {
    throw new Error('Parsing failed: ' + simpleParser.errors.map(e => e.message).join(', '));
  }
  
  console.log(chalk.green('✅ Generated CST'));
  
  // Step 3: AST Building
  console.log(chalk.blue('🔍 Step 3: AST Building...'));
  const ast = astBuilder.buildDocument(cst);
  console.log(chalk.green('✅ Generated AST'));
  
  // Step 4: CIR Conversion
  console.log(chalk.blue('🔍 Step 4: CIR Conversion...'));
  const cir = cirConverter.convert(ast);
  console.log(chalk.green('✅ Generated CIR'));
  
  // Step 5: SQL Generation
  console.log(chalk.blue('🔍 Step 5: SQL Generation...'));
  const sql = sqlGenerator.generateMigration(cir);
  console.log(chalk.green('✅ Generated SQL migration'));
  
  // Display results
  console.log(chalk.blue('\n📊 Pipeline Results:'));
  console.log(chalk.gray('---'));
  
  console.log(chalk.yellow(`Project: ${cir.metadata.name} v${cir.metadata.version}`));
  console.log(chalk.yellow(`Schema Version: ${cir.metadata.schemaVersion}`));
  console.log(chalk.yellow(`Convention Packs: ${cir.conventionPacks.length}`));
  
  // Show statistics
  const mainModule = cir.modules['Main'];
  console.log(chalk.yellow(`Entities: ${Object.keys(mainModule.entities).length}`));
  console.log(chalk.yellow(`Actions: ${Object.keys(mainModule.actions).length}`));
  console.log(chalk.yellow(`Roles: ${Object.keys(mainModule.roles || {}).length}`));
  
  // Show entities with details
  console.log(chalk.blue('\n📝 Generated Entities:'));
  for (const entityName in mainModule.entities) {
    const entity = mainModule.entities[entityName];
    console.log(chalk.cyan(`  ${entityName} (${entity.tableName})`));
    console.log(chalk.gray(`    Fields: ${Object.keys(entity.fields).length}`));
    console.log(chalk.gray(`    Relations: ${Object.keys(entity.relations).length}`));
    if (entity.doc) {
      console.log(chalk.gray(`    Doc: ${entity.doc}`));
    }
  }
  
  // Show generated SQL
  console.log(chalk.blue('\n💾 Generated SQL Migration:'));
  console.log(chalk.gray('---'));
  console.log(sql);
  console.log(chalk.gray('---'));
  
  // Save outputs
  console.log(chalk.blue('\n💾 Saving outputs...'));
  
  // Save AST
  writeFileSync('output/ast.json', JSON.stringify(ast, null, 2));
  console.log(chalk.green('✅ AST saved to output/ast.json'));
  
  // Save CIR
  writeFileSync('output/cir.json', JSON.stringify(cir, null, 2));
  console.log(chalk.green('✅ CIR saved to output/cir.json'));
  
  // Save SQL
  writeFileSync('output/migration.sql', sql);
  console.log(chalk.green('✅ SQL migration saved to output/migration.sql'));
  
  console.log(chalk.green('\n✨ Full pipeline completed successfully!'));
  
  // Show architecture
  console.log(chalk.blue('\n🏗️  Architecture Flow:'));
  console.log('  DSL Text');
  console.log('     ↓');
  console.log('  ' + chalk.green('✅ Lexer') + ' → Tokens');
  console.log('     ↓');
  console.log('  ' + chalk.green('✅ Parser') + ' → CST');
  console.log('     ↓');
  console.log('  ' + chalk.green('✅ AST Builder') + ' → AST');
  console.log('     ↓');
  console.log('  ' + chalk.green('✅ CIR Converter') + ' → Normalized IR');
  console.log('     ↓');
  console.log('  ' + chalk.green('✅ SQL Generator') + ' → PostgreSQL Migration');
  
  console.log(chalk.blue('\n🎯 What\'s Next:'));
  console.log('  1. ✅ Complete DSL → SQL pipeline');
  console.log('  2. ⏳ TypeScript backend generator');
  console.log('  3. ⏳ React frontend generator');
  console.log('  4. ⏳ API documentation generator');
  console.log('  5. ⏳ Test fixtures generator');
  
} catch (error) {
  console.error(chalk.red('❌ Pipeline failed:'));
  console.error(chalk.red(error instanceof Error ? error.message : String(error)));
  process.exit(1);
} 