#!/usr/bin/env node

import { erpLexer } from './parser/lexer.js';
import { simpleParser } from './parser/simple-parser.js';
import { SimpleASTBuilder } from './parser/simple-ast-builder.js';
import chalk from 'chalk';

// Пример DSL для демонстрации
const sampleDSL = `
erp TestERP 0.1

use pack Base.v0
use pack Sales.v1

entity Customer {
  doc = "Customer entity"
  name: Text
  email: Email
  phone: Phone
  status: Enum
}

entity Order {
  doc = "Order from customer"
  customer: Customer
  total: Money
  status: Enum
}

action CreateOrder {
  emit OrderCreated
  call NotifyCustomer
}

action ProcessPayment {
  emit PaymentProcessed
}

role Admin grants all on Customer
role Sales grants read on Order
role Customer grants read on Customer
`;

console.log(chalk.blue('🚀 ERP Core Full Parser Demo\n'));

console.log(chalk.gray('--- Sample DSL ---'));
console.log(sampleDSL);
console.log(chalk.gray('--- End Sample ---\n'));

const astBuilder = new SimpleASTBuilder();

try {
  // Step 1: Lexical analysis
  console.log(chalk.blue('🔍 Step 1: Lexical Analysis...'));
  const lexingResult = erpLexer.tokenize(sampleDSL);
  
  if (lexingResult.errors.length > 0) {
    console.error(chalk.red('❌ Lexing errors:'));
    lexingResult.errors.forEach(error => {
      console.error(chalk.red(`  Line ${error.line}:${error.column} - ${error.message}`));
    });
    process.exit(1);
  }
  
  console.log(chalk.green(`✅ Lexing successful! Generated ${lexingResult.tokens.length} tokens\n`));
  
  // Step 2: Syntax analysis
  console.log(chalk.blue('🔍 Step 2: Syntax Analysis...'));
  simpleParser.input = lexingResult.tokens;
  const cst = simpleParser.erpDocument();
  
  if (simpleParser.errors.length > 0) {
    console.error(chalk.red('❌ Parsing errors:'));
    simpleParser.errors.forEach(error => {
      console.error(chalk.red(`  ${error.message}`));
    });
    process.exit(1);
  }
  
  console.log(chalk.green('✅ Parsing successful! Generated CST\n'));
  
  // Step 3: AST building
  console.log(chalk.blue('🔍 Step 3: AST Building...'));
  const ast = astBuilder.buildDocument(cst);
  
  console.log(chalk.green('✅ AST building successful!\n'));
  
  // Step 4: Display results
  console.log(chalk.blue('📊 Parsing Results:'));
  console.log(chalk.gray('---'));
  
  console.log(chalk.yellow(`Document: ${ast.name} v${ast.version}`));
  console.log(chalk.yellow(`Packs: ${ast.packs.length}`));
  console.log(chalk.yellow(`Entities: ${ast.entities.length}`));
  console.log(chalk.yellow(`Actions: ${ast.actions.length}`));
  console.log(chalk.yellow(`Roles: ${ast.roles.length}`));
  
  // Show entities
  if (ast.entities.length > 0) {
    console.log(chalk.blue('\n📝 Entities:'));
    ast.entities.forEach((entity, index) => {
      console.log(chalk.cyan(`  ${index + 1}. ${entity.name}`));
      if (entity.doc) {
        console.log(chalk.gray(`     Doc: ${entity.doc}`));
      }
      entity.fields.forEach(field => {
        console.log(chalk.gray(`     ${field.name}: ${field.fieldType}`));
      });
    });
  }
  
  // Show actions
  if (ast.actions.length > 0) {
    console.log(chalk.blue('\n⚡ Actions:'));
    ast.actions.forEach((action, index) => {
      console.log(chalk.cyan(`  ${index + 1}. ${action.name}`));
      action.statements.forEach(stmt => {
        console.log(chalk.gray(`     ${stmt.type}: ${stmt.target}`));
      });
    });
  }
  
  // Show roles
  if (ast.roles.length > 0) {
    console.log(chalk.blue('\n🔐 Roles:'));
    ast.roles.forEach((role, index) => {
      console.log(chalk.cyan(`  ${index + 1}. ${role.name} grants ${role.permission} on ${role.target}`));
    });
  }
  
  // Show full AST as JSON
  console.log(chalk.blue('\n🌳 Complete AST:'));
  console.log(chalk.gray('---'));
  console.log(JSON.stringify(ast, null, 2));
  console.log(chalk.gray('---'));
  
  console.log(chalk.green('\n✨ Full parsing pipeline completed successfully!'));
  
  // Show next steps
  console.log(chalk.blue('\n🎯 Next Steps:'));
  console.log('  1. ✅ Lexer → Tokens');
  console.log('  2. ✅ Parser → CST');
  console.log('  3. ✅ AST Builder → AST');
  console.log('  4. ⏳ CIR Converter → Normalized IR');
  console.log('  5. ⏳ Code Generators → SQL/TypeScript/React');
  
} catch (error) {
  console.error(chalk.red('❌ Parsing failed:'));
  console.error(chalk.red(error instanceof Error ? error.message : String(error)));
  process.exit(1);
} 