#!/usr/bin/env node

import { erpLexer } from './parser/lexer.js';
import chalk from 'chalk';

// Простая демонстрация работы лексера
const sampleDSL = `
erp TestERP 0.1

use pack Base.v0

entity Customer {
  doc = "Customer entity"
  name: Text
  email: Email
  phone: Phone
}

entity Order {
  customer: Customer
  status: Enum
}

action CreateOrder {
  emit OrderCreated
}

role Admin grants read on Customer
`;

console.log(chalk.blue('🚀 ERP Core DSL Lexer Demo\n'));

console.log(chalk.gray('--- Sample DSL ---'));
console.log(sampleDSL);
console.log(chalk.gray('--- End Sample ---\n'));

console.log(chalk.blue('🔍 Tokenizing DSL...\n'));

try {
  const lexingResult = erpLexer.tokenize(sampleDSL);
  
  if (lexingResult.errors.length > 0) {
    console.error(chalk.red('❌ Lexing errors:'));
    lexingResult.errors.forEach(error => {
      console.error(chalk.red(`  Line ${error.line}:${error.column} - ${error.message}`));
    });
  } else {
    console.log(chalk.green('✅ Lexing successful!\n'));
    
    console.log(chalk.blue('📝 Generated Tokens:'));
    console.log(chalk.gray('---'));
    
    lexingResult.tokens.forEach((token, index) => {
      const position = `${token.startLine}:${token.startColumn}`;
      const tokenType = token.tokenType.name;
      const image = token.image;
      
      // Color-code different token types
      let coloredImage = image;
      if (tokenType.includes('Keyword') || ['Erp', 'Use', 'Pack', 'Entity', 'Action', 'Role'].includes(tokenType)) {
        coloredImage = chalk.magenta(image);
      } else if (['Text', 'Email', 'Phone', 'Enum'].includes(tokenType)) {
        coloredImage = chalk.cyan(image);
      } else if (tokenType === 'Identifier') {
        coloredImage = chalk.yellow(image);
      } else if (tokenType === 'StringLiteral') {
        coloredImage = chalk.green(image);
      } else if (['NumberLiteral', 'Decimal'].includes(tokenType)) {
        coloredImage = chalk.blue(image);
      }
      
      console.log(`${String(index).padStart(3)}: ${position.padStart(8)} ${tokenType.padEnd(20)} ${coloredImage}`);
    });
    
    console.log(chalk.gray('---'));
    console.log(chalk.green(`\n✨ Successfully tokenized ${lexingResult.tokens.length} tokens!`));
    
    // Token statistics
    const tokenStats = new Map<string, number>();
    lexingResult.tokens.forEach(token => {
      const type = token.tokenType.name;
      tokenStats.set(type, (tokenStats.get(type) || 0) + 1);
    });
    
    console.log(chalk.blue('\n📊 Token Statistics:'));
    [...tokenStats.entries()]
      .sort((a, b) => b[1] - a[1])
      .forEach(([type, count]) => {
        console.log(`  ${type.padEnd(20)}: ${count}`);
      });
  }
  
} catch (error) {
  console.error(chalk.red('❌ Tokenization failed:'));
  console.error(chalk.red(error instanceof Error ? error.message : String(error)));
}

console.log(chalk.blue('\n🎯 Next Steps:'));
console.log('  1. Fix parser grammar ambiguities');
console.log('  2. Complete AST builder');
console.log('  3. Implement CIR converter');
console.log('  4. Add code generators');
console.log('\n' + chalk.gray('This demonstrates the first step of our ERP DSL compiler pipeline.')); 