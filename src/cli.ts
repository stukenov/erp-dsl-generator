#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { erpLexer } from './parser/lexer.js';
import { simpleParser } from './parser/simple-parser.js';
import { SimpleASTBuilder } from './parser/simple-ast-builder.js';
import { CIRConverter } from './cir/converter.js';
import { SQLGenerator } from './generators/sql-generator.js';
import { TypeScriptGenerator } from './generators/typescript-generator.js';

const program = new Command();

program
  .name('erp')
  .description('ERP Core - DSL-based code generator')
  .version('0.1.0');

// Build command
program
  .command('build')
  .description('Build ERP project from DSL files')
  .option('-i, --input <file>', 'Input DSL file', 'domain.erp')
  .option('-o, --output <dir>', 'Output directory', 'output')
  .option('--sql-only', 'Generate only SQL migration')
  .option('--backend-only', 'Generate only backend code')
  .action(async (options) => {
    try {
      console.log(chalk.blue('🚀 ERP Core - Building project...\n'));
      
      // Check if input file exists
      if (!existsSync(options.input)) {
        console.error(chalk.red(`❌ Input file not found: ${options.input}`));
        process.exit(1);
      }
      
      // Read DSL file
      console.log(chalk.blue('📖 Reading DSL file...'));
      const dslContent = readFileSync(options.input, 'utf8');
      console.log(chalk.green(`✅ Read ${options.input}`));
      
      // Parse DSL
      console.log(chalk.blue('🔍 Parsing DSL...'));
      const astBuilder = new SimpleASTBuilder();
      const lexingResult = erpLexer.tokenize(dslContent);
      
      if (lexingResult.errors.length > 0) {
        console.error(chalk.red('❌ Lexing errors:'));
        lexingResult.errors.forEach(err => console.error(chalk.red(`  ${err.message}`)));
        process.exit(1);
      }
      
      simpleParser.input = lexingResult.tokens;
      const cst = simpleParser.erpDocument();
      
      if (simpleParser.errors.length > 0) {
        console.error(chalk.red('❌ Parsing errors:'));
        simpleParser.errors.forEach(err => console.error(chalk.red(`  ${err.message}`)));
        process.exit(1);
      }
      
      const ast = astBuilder.buildDocument(cst);
      console.log(chalk.green('✅ DSL parsed successfully'));
      
      // Generate CIR
      console.log(chalk.blue('🔄 Generating CIR...'));
      const cirConverter = new CIRConverter();
      const cir = cirConverter.convert(ast);
      console.log(chalk.green('✅ CIR generated'));
      
      // Create output directory
      mkdirSync(options.output, { recursive: true });
      
      // Generate SQL migration
      if (!options.backendOnly) {
        console.log(chalk.blue('🗄️  Generating SQL migration...'));
        const sqlGenerator = new SQLGenerator();
        const sql = sqlGenerator.generateMigration(cir);
        
        const sqlPath = join(options.output, 'migration.sql');
        writeFileSync(sqlPath, sql);
        console.log(chalk.green(`✅ SQL migration saved to ${sqlPath}`));
      }
      
      // Generate TypeScript backend
      if (!options.sqlOnly) {
        console.log(chalk.blue('⚙️  Generating TypeScript backend...'));
        const tsGenerator = new TypeScriptGenerator();
        const backendFiles = tsGenerator.generateBackend(cir);
        
        const backendDir = join(options.output, 'backend');
        mkdirSync(backendDir, { recursive: true });
        
        // Create necessary subdirectories
        mkdirSync(join(backendDir, 'src'), { recursive: true });
        mkdirSync(join(backendDir, 'src/types'), { recursive: true });
        mkdirSync(join(backendDir, 'src/models'), { recursive: true });
        mkdirSync(join(backendDir, 'src/schemas'), { recursive: true });
        mkdirSync(join(backendDir, 'src/services'), { recursive: true });
        mkdirSync(join(backendDir, 'src/routes'), { recursive: true });
        mkdirSync(join(backendDir, 'src/database'), { recursive: true });
        
        // Write all generated files
        for (const [fileName, content] of backendFiles) {
          const filePath = join(backendDir, fileName);
          writeFileSync(filePath, content);
        }
        
        console.log(chalk.green(`✅ Backend generated in ${backendDir}`));
      }
      
      // Save CIR for debugging
      const cirPath = join(options.output, 'cir.json');
      writeFileSync(cirPath, JSON.stringify(cir, null, 2));
      
      console.log(chalk.green('\n🎉 Build completed successfully!'));
      
             // Show summary
       const mainModule = cir.modules['Main'];
       console.log(chalk.blue('\n📊 Project Summary:'));
       console.log(chalk.yellow(`  Project: ${cir.metadata.name} v${cir.metadata.version}`));
       console.log(chalk.yellow(`  Entities: ${Object.keys(mainModule.entities).length}`));
       console.log(chalk.yellow(`  Actions: ${Object.keys(mainModule.actions).length}`));
       console.log(chalk.yellow(`  Roles: ${Object.keys(mainModule.roles || {}).length}`));
      
      if (!options.sqlOnly) {
        console.log(chalk.blue('\n🎯 Next Steps:'));
        console.log(`  1. cd ${options.output}/backend`);
        console.log('  2. npm install');
        console.log('  3. Set up PostgreSQL database');
        console.log('  4. Run migration: psql -d your_db < ../migration.sql');
        console.log('  5. Create .env file with database credentials');
        console.log('  6. npm run dev');
        console.log('  7. Visit http://localhost:3000/docs for API documentation');
      }
      
    } catch (error) {
      console.error(chalk.red('❌ Build failed:'));
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    }
  });

// Init command
program
  .command('init')
  .description('Initialize new ERP project')
  .argument('<name>', 'Project name')
  .option('-d, --dir <directory>', 'Project directory')
  .action(async (name, options) => {
    try {
      const projectDir = options.dir || name.toLowerCase().replace(/\s+/g, '-');
      
      console.log(chalk.blue(`🚀 Initializing ERP project: ${name}`));
      
      // Create project directory
      mkdirSync(projectDir, { recursive: true });
      
      // Create sample DSL file
      const sampleDSL = `erp ${name} 1.0

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
      
      writeFileSync(join(projectDir, 'domain.erp'), sampleDSL);
      
      // Create erp.yaml config
      const config = {
        name: name,
        version: '1.0',
        description: `Generated ERP system for ${name}`,
        packs: ['Base.v1'],
        database: {
          type: 'postgresql',
          host: 'localhost',
          port: 5432,
          name: name.toLowerCase().replace(/\s+/g, '_') + '_db'
        }
      };
      
      writeFileSync(join(projectDir, 'erp.yaml'), JSON.stringify(config, null, 2));
      
      // Create .env.example
      const envExample = `# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=${config.database.name}
DB_USER=postgres
DB_PASSWORD=password

# Server Configuration
PORT=3000
HOST=0.0.0.0
LOG_LEVEL=info
`;
      
      writeFileSync(join(projectDir, '.env.example'), envExample);
      
      // Create README
      const readme = `# ${name}

Generated ERP system using ERP Core.

## Quick Start

\`\`\`bash
# Generate code
erp build

# Set up database
cp .env.example .env
# Edit .env with your database credentials

# Run migration
psql -d your_db < output/migration.sql

# Start backend
cd output/backend
npm install
npm run dev
\`\`\`

## API Documentation

Visit http://localhost:3000/docs when the server is running.
`;
      
      writeFileSync(join(projectDir, 'README.md'), readme);
      
      console.log(chalk.green(`✅ Project initialized in ${projectDir}`));
      console.log(chalk.blue('\n🎯 Next Steps:'));
      console.log(`  1. cd ${projectDir}`);
      console.log('  2. Edit domain.erp to define your business model');
      console.log('  3. erp build');
      console.log('  4. Follow the build instructions');
      
    } catch (error) {
      console.error(chalk.red('❌ Init failed:'));
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    }
  });

// Validate command
program
  .command('validate')
  .description('Validate DSL file syntax')
  .argument('<file>', 'DSL file to validate')
  .action(async (file) => {
    try {
      console.log(chalk.blue(`🔍 Validating ${file}...`));
      
      if (!existsSync(file)) {
        console.error(chalk.red(`❌ File not found: ${file}`));
        process.exit(1);
      }
      
      const dslContent = readFileSync(file, 'utf8');
      const lexingResult = erpLexer.tokenize(dslContent);
      
      if (lexingResult.errors.length > 0) {
        console.error(chalk.red('❌ Lexing errors:'));
        lexingResult.errors.forEach(err => console.error(chalk.red(`  ${err.message}`)));
        process.exit(1);
      }
      
      simpleParser.input = lexingResult.tokens;
      const cst = simpleParser.erpDocument();
      
      if (simpleParser.errors.length > 0) {
        console.error(chalk.red('❌ Parsing errors:'));
        simpleParser.errors.forEach(err => console.error(chalk.red(`  ${err.message}`)));
        process.exit(1);
      }
      
      const astBuilder = new SimpleASTBuilder();
      const ast = astBuilder.buildDocument(cst);
      
      console.log(chalk.green('✅ DSL file is valid'));
      
      // Show summary
      console.log(chalk.blue('\n�� File Summary:'));
      console.log(chalk.yellow(`  Project: ${ast.name} v${ast.version}`));
      console.log(chalk.yellow(`  Entities: ${ast.entities.length}`));
      console.log(chalk.yellow(`  Actions: ${ast.actions.length}`));
      console.log(chalk.yellow(`  Roles: ${ast.roles.length}`));
      
    } catch (error) {
      console.error(chalk.red('❌ Validation failed:'));
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    }
  });

// Info command
program
  .command('info')
  .description('Show project information')
  .option('-f, --file <file>', 'DSL file', 'domain.erp')
  .action(async (options) => {
    try {
      if (!existsSync(options.file)) {
        console.error(chalk.red(`❌ File not found: ${options.file}`));
        process.exit(1);
      }
      
      const dslContent = readFileSync(options.file, 'utf8');
      const lexingResult = erpLexer.tokenize(dslContent);
      
      if (lexingResult.errors.length > 0) {
        throw new Error('Lexing failed');
      }
      
      simpleParser.input = lexingResult.tokens;
      const cst = simpleParser.erpDocument();
      
      if (simpleParser.errors.length > 0) {
        throw new Error('Parsing failed');
      }
      
      const astBuilder = new SimpleASTBuilder();
      const ast = astBuilder.buildDocument(cst);
      
      console.log(chalk.blue('📋 Project Information\n'));
      
      console.log(chalk.yellow(`Name: ${ast.name}`));
      console.log(chalk.yellow(`Version: ${ast.version}`));
      console.log(chalk.yellow(`Packs: ${ast.packs.join(', ')}`));
      
      console.log(chalk.blue('\n📊 Statistics:'));
      console.log(`  Entities: ${ast.entities.length}`);
      console.log(`  Actions: ${ast.actions.length}`);
      console.log(`  Roles: ${ast.roles.length}`);
      
      if (ast.entities.length > 0) {
        console.log(chalk.blue('\n🏗️  Entities:'));
        ast.entities.forEach(entity => {
          console.log(`  ${entity.name} (${entity.fields.length} fields)`);
        });
      }
      
      if (ast.actions.length > 0) {
        console.log(chalk.blue('\n⚡ Actions:'));
        ast.actions.forEach(action => {
          console.log(`  ${action.name}`);
        });
      }
      
      if (ast.roles.length > 0) {
        console.log(chalk.blue('\n🔐 Roles:'));
        ast.roles.forEach(role => {
          console.log(`  ${role.name}: ${role.permission}`);
        });
      }
      
    } catch (error) {
      console.error(chalk.red('❌ Info failed:'));
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    }
  });

program.parse(); 