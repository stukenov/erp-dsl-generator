import { CIRDocument, CIREntity, CIRField, CIRAction } from '../types/cir.js';

export class SQLiteBackendGenerator {
  // Санитизация имен полей для валидных идентификаторов
  private sanitizeFieldName(fieldName: string): string {
    if (!fieldName) return 'field';
    
    // Заменяем точки на подчеркивания и другие недопустимые символы
    return fieldName
      .replace(/\./g, '_')
      .replace(/[^a-zA-Z0-9_]/g, '_')
      .replace(/^[0-9]/, '_$&') // Добавляем подчеркивание если начинается с цифры
      .toLowerCase();
  }

  // Безопасная итерация по модулям и сущностям, пропуская пустые
  private forEachEntity(cir: CIRDocument, callback: (entity: CIREntity, entityName: string, moduleName: string) => void) {
    for (const moduleName in cir.modules) {
      const module = cir.modules[moduleName];
      
      // Пропускаем пустые модули
      if (!moduleName || !module.name) {
        continue;
      }
      
      for (const entityName in module.entities) {
        const entity = module.entities[entityName];
        
        // Пропускаем пустые сущности
        if (!entity.name || !entityName) {
          continue;
        }
        
        callback(entity, entityName, moduleName);
      }
    }
  }

  public generateBackend(cir: CIRDocument): Map<string, string> {
    const files = new Map<string, string>();
    
    // Generate package.json
    files.set('package.json', this.generatePackageJson(cir));
    
    // Generate types
    files.set('src/types/index.ts', this.generateTypes(cir));
    
    // Generate database models
    files.set('src/models/index.ts', this.generateModels(cir));
    
    // Generate validation schemas
    files.set('src/schemas/index.ts', this.generateSchemas(cir));
    
    // Generate services
    this.forEachEntity(cir, (entity, entityName) => {
      files.set(`src/services/${entityName}Service.ts`, this.generateService(entity, cir));
    });
    
    // Generate routes
    this.forEachEntity(cir, (entity, entityName) => {
      files.set(`src/routes/${entityName.toLowerCase()}.ts`, this.generateRoutes(entity, cir));
    });
    
    // Generate main app
    files.set('src/app.ts', this.generateApp(cir));
    files.set('src/server.ts', this.generateServer(cir));
    
    // Generate database connection
    files.set('src/database/connection.ts', this.generateDatabaseConnection());
    files.set('src/database/init.ts', this.generateDatabaseInit(cir));
    
    // Generate environment files
    files.set('.env', this.generateEnv(cir));
    files.set('.env.example', this.generateEnvExample(cir));
    
    // Generate README
    files.set('README.md', this.generateReadme(cir));
    
    return files;
  }
  
  private generatePackageJson(cir: CIRDocument): string {
    const packageJson = {
      name: `${cir.metadata.name.toLowerCase()}-backend`,
      version: cir.metadata.version,
      description: `Generated backend API for ${cir.metadata.name}`,
      main: 'dist/server.js',
      type: 'module',
      scripts: {
        build: 'tsc',
        start: 'node dist/server.js',
        dev: 'tsx watch src/server.ts',
        'db:init': 'tsx src/database/init.ts',
        'db:reset': 'rm -f database.sqlite && npm run db:init'
      },
      dependencies: {
        fastify: '^4.24.3',
        '@fastify/cors': '^8.4.0',
        '@fastify/helmet': '^11.1.1',
        '@fastify/rate-limit': '^9.1.0',
        '@fastify/swagger': '^8.12.0',
        '@fastify/swagger-ui': '^2.1.0',
        sqlite3: '^5.1.6',
        zod: '^3.22.4',
        uuid: '^9.0.1'
      },
      devDependencies: {
        '@types/node': '^20.10.0',
        '@types/uuid': '^9.0.7',
        typescript: '^5.3.0',
        tsx: '^4.6.0'
      }
    };
    
    return JSON.stringify(packageJson, null, 2);
  }
  
  private generateTypes(cir: CIRDocument): string {
    const lines: string[] = [];
    
    lines.push('// Generated types');
    lines.push('export interface BaseEntity {');
    lines.push('  id: string;');
    lines.push('  created_at: string;');
    lines.push('  updated_at: string;');
    lines.push('}');
    lines.push('');
    
    // Generate entity types
    for (const moduleName in cir.modules) {
      const module = cir.modules[moduleName];
      
      for (const entityName in module.entities) {
        const entity = module.entities[entityName];
        
        // Skip empty entities
        if (!entityName || !entity.name || entityName.trim() === '') {
          continue;
        }
        lines.push(`export interface ${entityName} extends BaseEntity {`);
        
        // Add fields
        for (const fieldName in entity.fields) {
          const field = entity.fields[fieldName];
          if (fieldName === 'id' || fieldName === 'created_at' || fieldName === 'updated_at') {
            continue; // Skip base fields
          }
          
          const sanitizedFieldName = this.sanitizeFieldName(fieldName);
          const tsType = this.mapFieldTypeToTypeScript(field);
          const optional = field.constraints.nullable ? '?' : '';
          lines.push(`  ${sanitizedFieldName}${optional}: ${tsType};`);
        }
        
        // Add relations
        for (const relationName in entity.relations) {
          const relation = entity.relations[relationName];
          if (relation.type === 'manyToOne' || relation.type === 'oneToOne') {
            lines.push(`  ${relationName}?: ${relation.targetEntity};`);
            const fkField = relation.foreignKey || relationName + '_id';
            const sanitizedFkField = this.sanitizeFieldName(fkField);
            lines.push(`  ${sanitizedFkField}?: string;`);
          }
        }
        
        lines.push('}');
        lines.push('');
        
        // Generate create/update types
        lines.push(`export interface Create${entityName} {`);
        for (const fieldName in entity.fields) {
          const field = entity.fields[fieldName];
          if (fieldName === 'id' || fieldName === 'created_at' || fieldName === 'updated_at') {
            continue;
          }
          
          const sanitizedFieldName = this.sanitizeFieldName(fieldName);
          const tsType = this.mapFieldTypeToTypeScript(field);
          const optional = field.constraints.nullable || field.constraints.default !== undefined ? '?' : '';
          lines.push(`  ${sanitizedFieldName}${optional}: ${tsType};`);
        }
        
        for (const relationName in entity.relations) {
          const relation = entity.relations[relationName];
          if (relation.type === 'manyToOne' || relation.type === 'oneToOne') {
            const fkField = relation.foreignKey || relationName + '_id';
            const sanitizedFkField = this.sanitizeFieldName(fkField);
            lines.push(`  ${sanitizedFkField}?: string;`);
          }
        }
        
        lines.push('}');
        lines.push('');
        
        lines.push(`export interface Update${entityName} extends Partial<Create${entityName}> {}`);
        lines.push('');
      }
    }
    
    return lines.join('\n');
  }
  
  private generateModels(cir: CIRDocument): string {
    const lines: string[] = [];
    
    lines.push('// Generated database models');
    lines.push('import sqlite3 from \'sqlite3\';');
    lines.push('import { v4 as uuidv4 } from \'uuid\';');
    lines.push('import * as types from \'../types/index.js\';');
    lines.push('');
    
    // Generate base model class
    lines.push('export abstract class BaseModel {');
    lines.push('  constructor(protected db: sqlite3.Database) {}');
    lines.push('');
    lines.push('  protected query(sql: string, params: any[] = []): Promise<any[]> {');
    lines.push('    return new Promise((resolve, reject) => {');
    lines.push('      this.db.all(sql, params, (err, rows) => {');
    lines.push('        if (err) reject(err);');
    lines.push('        else resolve(rows);');
    lines.push('      });');
    lines.push('    });');
    lines.push('  }');
    lines.push('');
    lines.push('  protected get(sql: string, params: any[] = []): Promise<any> {');
    lines.push('    return new Promise((resolve, reject) => {');
    lines.push('      this.db.get(sql, params, (err, row) => {');
    lines.push('        if (err) reject(err);');
    lines.push('        else resolve(row);');
    lines.push('      });');
    lines.push('    });');
    lines.push('  }');
    lines.push('');
    lines.push('  protected run(sql: string, params: any[] = []): Promise<sqlite3.RunResult> {');
    lines.push('    return new Promise((resolve, reject) => {');
    lines.push('      this.db.run(sql, params, function(err) {');
    lines.push('        if (err) reject(err);');
    lines.push('        else resolve(this);');
    lines.push('      });');
    lines.push('    });');
    lines.push('  }');
    lines.push('}');
    lines.push('');
    
    // Generate model for each entity
    for (const moduleName in cir.modules) {
      const module = cir.modules[moduleName];
      
      for (const entityName in module.entities) {
        const entity = module.entities[entityName];
        
        // Skip empty entities
        if (!entityName || !entity.name || entityName.trim() === '') {
          continue;
        }
        const rawTableName = entity.tableName || this.toSnakeCase(entityName);
        const tableName = this.escapeSQLKeyword(rawTableName);
        
        lines.push(`export class ${entityName}Model extends BaseModel {`);
        lines.push(`  private tableName = '${tableName}';`);
        lines.push('');
        
        // Find all method
        lines.push(`  async findAll(): Promise<types.${entityName}[]> {`);
        lines.push(`    const rows = await this.query(\`SELECT * FROM \${this.tableName} ORDER BY created_at DESC\`);`);
        lines.push(`    return rows as types.${entityName}[];`);
        lines.push('  }');
        lines.push('');
        
        // Find by id method
        lines.push(`  async findById(id: string): Promise<types.${entityName} | null> {`);
        lines.push(`    const row = await this.get(\`SELECT * FROM \${this.tableName} WHERE id = ?\`, [id]);`);
        lines.push(`    return row as types.${entityName} | null;`);
        lines.push('  }');
        lines.push('');
        
        // Create method
        lines.push(`  async create(data: types.Create${entityName}): Promise<types.${entityName}> {`);
        lines.push('    const id = uuidv4();');
        lines.push('    const now = new Date().toISOString();');
        
        const fields = ['id', 'created_at', 'updated_at'];
        const placeholders = ['?', '?', '?'];
        const values = ['id', 'now', 'now'];
        
        for (const fieldName in entity.fields) {
          if (fieldName === 'id' || fieldName === 'created_at' || fieldName === 'updated_at') {
            continue;
          }
          const sanitizedFieldName = this.sanitizeFieldName(fieldName);
          fields.push(sanitizedFieldName);
          placeholders.push('?');
          values.push(`data.${sanitizedFieldName}`);
        }
        
        for (const relationName in entity.relations) {
          const relation = entity.relations[relationName];
          if (relation.type === 'manyToOne' || relation.type === 'oneToOne') {
            const fkField = relation.foreignKey || relationName + '_id';
            const sanitizedFkField = this.sanitizeFieldName(fkField);
            fields.push(sanitizedFkField);
            placeholders.push('?');
            values.push(`data.${sanitizedFkField}`);
          }
        }
        
        lines.push(`    await this.run(`);
        lines.push(`      \`INSERT INTO \${this.tableName} (${fields.join(', ')}) VALUES (${placeholders.join(', ')})\`,`);
        lines.push(`      [${values.join(', ')}]`);
        lines.push(`    );`);
        lines.push(`    return this.findById(id)!;`);
        lines.push('  }');
        lines.push('');
        
        // Update method
        lines.push(`  async update(id: string, data: types.Update${entityName}): Promise<types.${entityName} | null> {`);
        lines.push('    const updates: string[] = [];');
        lines.push('    const values: any[] = [];');
        lines.push('');
        lines.push('    // Always update updated_at');
        lines.push('    updates.push(`updated_at = ?`);');
        lines.push('    values.push(new Date().toISOString());');
        lines.push('');
        
        for (const fieldName in entity.fields) {
          if (fieldName === 'id' || fieldName === 'created_at' || fieldName === 'updated_at') {
            continue;
          }
          const sanitizedFieldName = this.sanitizeFieldName(fieldName);
          lines.push(`    if (data.${sanitizedFieldName} !== undefined) {`);
          lines.push(`      updates.push(\`${sanitizedFieldName} = ?\`);`);
          lines.push(`      values.push(data.${sanitizedFieldName});`);
          lines.push('    }');
        }
        
        lines.push('');
        lines.push('    if (updates.length === 1) return this.findById(id); // No changes');
        lines.push('');
        lines.push('    values.push(id);');
        lines.push(`    await this.run(`);
        lines.push(`      \`UPDATE \${this.tableName} SET \${updates.join(', ')} WHERE id = ?\`,`);
        lines.push('      values');
        lines.push('    );');
        lines.push(`    return this.findById(id);`);
        lines.push('  }');
        lines.push('');
        
        // Delete method
        lines.push(`  async delete(id: string): Promise<boolean> {`);
        lines.push(`    const result = await this.run(\`DELETE FROM \${this.tableName} WHERE id = ?\`, [id]);`);
        lines.push(`    return result.changes > 0;`);
        lines.push('  }');
        lines.push('}');
        lines.push('');
      }
    }
    
    return lines.join('\n');
  }
  
  private generateSchemas(cir: CIRDocument): string {
    const lines: string[] = [];
    
    lines.push('// Generated validation schemas');
    lines.push('import { z } from \'zod\';');
    lines.push('');
    
    // Generate schemas for each entity
    for (const moduleName in cir.modules) {
      const module = cir.modules[moduleName];
      
      for (const entityName in module.entities) {
        const entity = module.entities[entityName];
        
        // Skip empty entities
        if (!entityName || !entity.name || entityName.trim() === '') {
          continue;
        }
        
        // Create schema
        lines.push(`export const create${entityName}Schema = z.object({`);
        
        for (const fieldName in entity.fields) {
          const field = entity.fields[fieldName];
          if (fieldName === 'id' || fieldName === 'created_at' || fieldName === 'updated_at') {
            continue;
          }
          
          const sanitizedFieldName = this.sanitizeFieldName(fieldName);
          const zodType = this.mapFieldTypeToZod(field, sanitizedFieldName);
          lines.push(`  ${sanitizedFieldName}: ${zodType},`);
        }
        
        for (const relationName in entity.relations) {
          const relation = entity.relations[relationName];
          if (relation.type === 'manyToOne' || relation.type === 'oneToOne') {
            const fkField = relation.foreignKey || relationName + '_id';
            const sanitizedFkField = this.sanitizeFieldName(fkField);
            lines.push(`  ${sanitizedFkField}: z.string().uuid().optional(),`);
          }
        }
        
        lines.push('});');
        lines.push('');
        
        // Update schema
        lines.push(`export const update${entityName}Schema = create${entityName}Schema.partial();`);
        lines.push('');
        
        // Query params schema
        lines.push(`export const ${entityName.toLowerCase()}ParamsSchema = z.object({`);
        lines.push('  id: z.string().uuid(),');
        lines.push('});');
        lines.push('');
      }
    }
    
    return lines.join('\n');
  }
  
  private generateService(entity: CIREntity, cir: CIRDocument): string {
    const lines: string[] = [];
    const entityName = entity.name;
    
    lines.push(`// Generated service for ${entityName}`);
    lines.push('import sqlite3 from \'sqlite3\';');
    lines.push(`import { ${entityName}Model } from '../models/index.js';`);
    lines.push(`import * as types from '../types/index.js';`);
    lines.push('');
    
    lines.push(`export class ${entityName}Service {`);
    lines.push('  private model: ' + entityName + 'Model;');
    lines.push('');
    lines.push('  constructor(db: sqlite3.Database) {');
    lines.push(`    this.model = new ${entityName}Model(db);`);
    lines.push('  }');
    lines.push('');
    
    // Service methods
    lines.push(`  async getAll(): Promise<types.${entityName}[]> {`);
    lines.push('    return await this.model.findAll();');
    lines.push('  }');
    lines.push('');
    
    lines.push(`  async getById(id: string): Promise<types.${entityName} | null> {`);
    lines.push('    return await this.model.findById(id);');
    lines.push('  }');
    lines.push('');
    
    lines.push(`  async create(data: types.Create${entityName}): Promise<types.${entityName}> {`);
    lines.push('    // Add business logic here');
    lines.push('    return await this.model.create(data);');
    lines.push('  }');
    lines.push('');
    
    lines.push(`  async update(id: string, data: types.Update${entityName}): Promise<types.${entityName} | null> {`);
    lines.push('    // Add business logic here');
    lines.push('    return await this.model.update(id, data);');
    lines.push('  }');
    lines.push('');
    
    lines.push(`  async delete(id: string): Promise<boolean> {`);
    lines.push('    // Add business logic here');
    lines.push('    return await this.model.delete(id);');
    lines.push('  }');
    lines.push('}');
    
    return lines.join('\n');
  }
  
  private generateRoutes(entity: CIREntity, cir: CIRDocument): string {
    const lines: string[] = [];
    const entityName = entity.name;
    const routeName = entityName.toLowerCase();
    
    lines.push(`// Generated routes for ${entityName}`);
    lines.push('import { FastifyInstance } from \'fastify\';');
    lines.push(`import { ${entityName}Service } from '../services/${entityName}Service.js';`);
    lines.push(`import { create${entityName}Schema, update${entityName}Schema, ${routeName}ParamsSchema } from '../schemas/index.js';`);
    lines.push('');
    
    lines.push(`export async function ${routeName}Routes(fastify: FastifyInstance) {`);
    lines.push(`  const ${routeName}Service = new ${entityName}Service(fastify.db);`);
    lines.push('');
    
    // GET all
    lines.push(`  // GET /${routeName}s`);
    lines.push(`  fastify.get('/${routeName}s', {`);
    lines.push('    schema: {');
    lines.push(`      description: 'Get all ${routeName}s',`);
    lines.push('      tags: [' + `'${entityName}'` + '],');
    lines.push('      response: {');
    lines.push('        200: {');
    lines.push('          type: \'array\',');
    lines.push('          items: { type: \'object\' }');
    lines.push('        }');
    lines.push('      }');
    lines.push('    }');
    lines.push('  }, async (request, reply) => {');
    lines.push(`    const ${routeName}s = await ${routeName}Service.getAll();`);
    lines.push(`    return ${routeName}s;`);
    lines.push('  });');
    lines.push('');
    
    // GET by id
    lines.push(`  // GET /${routeName}s/:id`);
    lines.push(`  fastify.get('/${routeName}s/:id', {`);
    lines.push('    schema: {');
    lines.push(`      description: 'Get ${routeName} by ID',`);
    lines.push('      tags: [' + `'${entityName}'` + '],');
    lines.push('      params: {');
    lines.push('        type: \'object\',');
    lines.push('        properties: {');
    lines.push('          id: { type: \'string\' }');
    lines.push('        },');
    lines.push('        required: [\'id\']');
    lines.push('      },');
    lines.push('      response: {');
    lines.push('        200: { type: \'object\' },');
    lines.push('        404: { type: \'object\', properties: { message: { type: \'string\' } } }');
    lines.push('      }');
    lines.push('    }');
    lines.push('  }, async (request, reply) => {');
    lines.push('    const { id } = request.params as { id: string };');
    lines.push(`    const ${routeName} = await ${routeName}Service.getById(id);`);
    lines.push(`    if (!${routeName}) {`);
    lines.push(`      return reply.code(404).send({ message: '${entityName} not found' });`);
    lines.push('    }');
    lines.push(`    return ${routeName};`);
    lines.push('  });');
    lines.push('');
    
    // POST create
    lines.push(`  // POST /${routeName}s`);
    lines.push(`  fastify.post('/${routeName}s', {`);
    lines.push('    schema: {');
    lines.push(`      description: 'Create new ${routeName}',`);
    lines.push('      tags: [' + `'${entityName}'` + '],');
    lines.push('      body: { type: \'object\' },');
    lines.push('      response: {');
    lines.push('        201: { type: \'object\' },');
    lines.push('        400: { type: \'object\', properties: { message: { type: \'string\' } } }');
    lines.push('      }');
    lines.push('    }');
    lines.push('  }, async (request, reply) => {');
    lines.push('    try {');
    lines.push(`      const data = create${entityName}Schema.parse(request.body);`);
    lines.push(`      const ${routeName} = await ${routeName}Service.create(data);`);
    lines.push(`      return reply.code(201).send(${routeName});`);
    lines.push('    } catch (error) {');
    lines.push('      return reply.code(400).send({ message: \'Invalid input data\' });');
    lines.push('    }');
    lines.push('  });');
    lines.push('');
    
    // PUT update
    lines.push(`  // PUT /${routeName}s/:id`);
    lines.push(`  fastify.put('/${routeName}s/:id', {`);
    lines.push('    schema: {');
    lines.push(`      description: 'Update ${routeName}',`);
    lines.push('      tags: [' + `'${entityName}'` + '],');
    lines.push('      params: {');
    lines.push('        type: \'object\',');
    lines.push('        properties: {');
    lines.push('          id: { type: \'string\' }');
    lines.push('        },');
    lines.push('        required: [\'id\']');
    lines.push('      },');
    lines.push('      body: { type: \'object\' },');
    lines.push('      response: {');
    lines.push('        200: { type: \'object\' },');
    lines.push('        404: { type: \'object\', properties: { message: { type: \'string\' } } }');
    lines.push('      }');
    lines.push('    }');
    lines.push('  }, async (request, reply) => {');
    lines.push('    try {');
    lines.push('      const { id } = request.params as { id: string };');
    lines.push(`      const data = update${entityName}Schema.parse(request.body);`);
    lines.push(`      const ${routeName} = await ${routeName}Service.update(id, data);`);
    lines.push(`      if (!${routeName}) {`);
    lines.push(`        return reply.code(404).send({ message: '${entityName} not found' });`);
    lines.push('      }');
    lines.push(`      return ${routeName};`);
    lines.push('    } catch (error) {');
    lines.push('      return reply.code(400).send({ message: \'Invalid input data\' });');
    lines.push('    }');
    lines.push('  });');
    lines.push('');
    
    // DELETE
    lines.push(`  // DELETE /${routeName}s/:id`);
    lines.push(`  fastify.delete('/${routeName}s/:id', {`);
    lines.push('    schema: {');
    lines.push(`      description: 'Delete ${routeName}',`);
    lines.push('      tags: [' + `'${entityName}'` + '],');
    lines.push('      params: {');
    lines.push('        type: \'object\',');
    lines.push('        properties: {');
    lines.push('          id: { type: \'string\' }');
    lines.push('        },');
    lines.push('        required: [\'id\']');
    lines.push('      },');
    lines.push('      response: {');
    lines.push('        204: { type: \'null\' },');
    lines.push('        404: { type: \'object\', properties: { message: { type: \'string\' } } }');
    lines.push('      }');
    lines.push('    }');
    lines.push('  }, async (request, reply) => {');
    lines.push('    const { id } = request.params as { id: string };');
    lines.push(`    const deleted = await ${routeName}Service.delete(id);`);
    lines.push('    if (!deleted) {');
    lines.push(`      return reply.code(404).send({ message: '${entityName} not found' });`);
    lines.push('    }');
    lines.push('    return reply.code(204).send();');
    lines.push('  });');
    lines.push('}');
    
    return lines.join('\n');
  }
  
  private generateApp(cir: CIRDocument): string {
    const lines: string[] = [];
    
    lines.push('// Generated Fastify app');
    lines.push('import Fastify from \'fastify\';');
    lines.push('import cors from \'@fastify/cors\';');
    lines.push('import helmet from \'@fastify/helmet\';');
    lines.push('import rateLimit from \'@fastify/rate-limit\';');
    lines.push('import swagger from \'@fastify/swagger\';');
    lines.push('import swaggerUi from \'@fastify/swagger-ui\';');
    lines.push('import sqlite3 from \'sqlite3\';');
    lines.push('');
    
    // Import routes
    for (const moduleName in cir.modules) {
      const module = cir.modules[moduleName];
      
      // Пропускаем пустые модули
      if (!moduleName || !module.name) {
        continue;
      }
      
      for (const entityName in module.entities) {
        const entity = module.entities[entityName];
        
        // Пропускаем пустые сущности
        if (!entity.name || !entityName) {
          continue;
        }
        
        const routeName = entityName.toLowerCase();
        lines.push(`import { ${routeName}Routes } from './routes/${routeName}.js';`);
      }
    }
    
    lines.push('');
    lines.push('declare module \'fastify\' {');
    lines.push('  interface FastifyInstance {');
    lines.push('    db: sqlite3.Database;');
    lines.push('  }');
    lines.push('}');
    lines.push('');
    
    lines.push('export async function buildApp(db: sqlite3.Database) {');
    lines.push('  const fastify = Fastify({');
    lines.push('    logger: {');
    lines.push('      level: process.env.LOG_LEVEL || \'info\'');
    lines.push('    }');
    lines.push('  });');
    lines.push('');
    
    lines.push('  // Register SQLite database');
    lines.push('  fastify.decorate(\'db\', db);');
    lines.push('');
    
    lines.push('  // Register plugins');
    lines.push('  await fastify.register(helmet);');
    lines.push('  await fastify.register(cors);');
    lines.push('  await fastify.register(rateLimit, {');
    lines.push('    max: 100,');
    lines.push('    timeWindow: \'1 minute\'');
    lines.push('  });');
    lines.push('');
    
    lines.push('  // Register Swagger');
    lines.push('  await fastify.register(swagger, {');
    lines.push('    openapi: {');
    lines.push('      openapi: \'3.0.0\',');
    lines.push('      info: {');
    lines.push(`        title: '${cir.metadata.name} API',`);
    lines.push(`        description: 'Generated API for ${cir.metadata.name}',`);
    lines.push(`        version: '${cir.metadata.version}'`);
    lines.push('      },');
    lines.push('      servers: [');
    lines.push('        {');
    lines.push('          url: \'http://localhost:3000\',');
    lines.push('          description: \'Development server\'');
    lines.push('        }');
    lines.push('      ]');
    lines.push('    }');
    lines.push('  });');
    lines.push('');
    
    lines.push('  await fastify.register(swaggerUi, {');
    lines.push('    routePrefix: \'/docs\',');
    lines.push('    uiConfig: {');
    lines.push('      docExpansion: \'full\',');
    lines.push('      deepLinking: false');
    lines.push('    }');
    lines.push('  });');
    lines.push('');
    
    lines.push('  // Health check');
    lines.push('  fastify.get(\'/health\', async () => {');
    lines.push('    return { status: \'ok\', timestamp: new Date().toISOString() };');
    lines.push('  });');
    lines.push('');
    
    lines.push('  // Register routes');
    for (const moduleName in cir.modules) {
      const module = cir.modules[moduleName];
      
      // Пропускаем пустые модули
      if (!moduleName || !module.name) {
        continue;
      }
      
      for (const entityName in module.entities) {
        const entity = module.entities[entityName];
        
        // Пропускаем пустые сущности
        if (!entity.name || !entityName) {
          continue;
        }
        
        const routeName = entityName.toLowerCase();
        lines.push(`  await fastify.register(${routeName}Routes, { prefix: '/api' });`);
      }
    }
    
    lines.push('');
    lines.push('  return fastify;');
    lines.push('}');
    
    return lines.join('\n');
  }
  
  private generateServer(cir: CIRDocument): string {
    const lines: string[] = [];
    
    lines.push('// Generated server');
    lines.push('import { buildApp } from \'./app.js\';');
    lines.push('import { createDatabase } from \'./database/connection.js\';');
    lines.push('');
    
    lines.push('async function start() {');
    lines.push('  try {');
    lines.push('    const db = createDatabase();');
    lines.push('    const app = await buildApp(db);');
    lines.push('');
    lines.push('    const port = Number(process.env.PORT) || 3000;');
    lines.push('    const host = process.env.HOST || \'0.0.0.0\';');
    lines.push('');
    lines.push('    await app.listen({ port, host });');
    lines.push('    console.log(`🚀 Server running at http://${host}:${port}`);');
    lines.push('    console.log(`📖 API docs at http://${host}:${port}/docs`);');
    lines.push('    console.log(`🗄️  Database: ${process.env.DB_PATH || \'database.sqlite\'}`);');
    lines.push('  } catch (err) {');
    lines.push('    console.error(\'Error starting server:\', err);');
    lines.push('    process.exit(1);');
    lines.push('  }');
    lines.push('}');
    lines.push('');
    
    lines.push('start();');
    
    return lines.join('\n');
  }
  
  private generateDatabaseConnection(): string {
    const lines: string[] = [];
    
    lines.push('// Generated database connection');
    lines.push('import sqlite3 from \'sqlite3\';');
    lines.push('import { join } from \'path\';');
    lines.push('');
    
    lines.push('export function createDatabase(): sqlite3.Database {');
    lines.push('  const dbPath = process.env.DB_PATH || \'database.sqlite\';');
    lines.push('  const fullPath = join(process.cwd(), dbPath);');
    lines.push('');
    lines.push('  console.log(`📁 Database path: ${fullPath}`);');
    lines.push('');
    lines.push('  const db = new sqlite3.Database(fullPath);');
    lines.push('');
    lines.push('  // Enable foreign keys and optimizations synchronously');
    lines.push('  db.exec(`');
    lines.push('    PRAGMA foreign_keys = ON;');
    lines.push('    PRAGMA journal_mode = WAL;');
    lines.push('    PRAGMA synchronous = NORMAL;');
    lines.push('    PRAGMA cache_size = 1000000;');
    lines.push('    PRAGMA temp_store = memory;');
    lines.push('  `);');
    lines.push('');
    lines.push('  return db;');
    lines.push('}');
    
    return lines.join('\n');
  }
  
  private generateDatabaseInit(cir: CIRDocument): string {
    const lines: string[] = [];
    
    lines.push('// Database initialization script');
    lines.push('import { createDatabase } from \'./connection.js\';');
    lines.push('import { readFileSync } from \'fs\';');
    lines.push('import { join } from \'path\';');
    lines.push('');
    
    lines.push('function splitSQLStatements(sql: string): string[] {');
    lines.push('  const statements: string[] = [];');
    lines.push('  let current = \'\';');
    lines.push('  let inTrigger = false;');
    lines.push('  let depth = 0;');
    lines.push('  ');
    lines.push('  const lines = sql.split(\'\\n\');');
    lines.push('  ');
    lines.push('  for (const line of lines) {');
    lines.push('    const trimmedLine = line.trim().toLowerCase();');
    lines.push('    ');
    lines.push('    // Skip empty lines and comments at statement level');
    lines.push('    if (!trimmedLine || trimmedLine.startsWith(\'--\')) {');
    lines.push('      if (current.trim()) {');
    lines.push('        current += line + \'\\n\';');
    lines.push('      }');
    lines.push('      continue;');
    lines.push('    }');
    lines.push('    ');
    lines.push('    // Check for trigger start');
    lines.push('    if (trimmedLine.startsWith(\'create trigger\')) {');
    lines.push('      inTrigger = true;');
    lines.push('      depth = 0;');
    lines.push('    }');
    lines.push('    ');
    lines.push('    current += line + \'\\n\';');
    lines.push('    ');
    lines.push('    // Track BEGIN/END depth in triggers');
    lines.push('    if (inTrigger) {');
    lines.push('      if (trimmedLine === \'begin\') {');
    lines.push('        depth++;');
    lines.push('      } else if (trimmedLine === \'end;\') {');
    lines.push('        depth--;');
    lines.push('        if (depth === 0) {');
    lines.push('          inTrigger = false;');
    lines.push('          statements.push(current.trim());');
    lines.push('          current = \'\';');
    lines.push('          continue;');
    lines.push('        }');
    lines.push('      }');
    lines.push('    } else {');
    lines.push('      // If not in trigger and line ends with semicolon, it\'s a complete statement');
    lines.push('      if (line.trim().endsWith(\';\')) {');
    lines.push('        statements.push(current.trim());');
    lines.push('        current = \'\';');
    lines.push('      }');
    lines.push('    }');
    lines.push('  }');
    lines.push('  ');
    lines.push('  // Add any remaining content');
    lines.push('  if (current.trim()) {');
    lines.push('    statements.push(current.trim());');
    lines.push('  }');
    lines.push('  ');
    lines.push('  // Filter out empty statements and pure comments');
    lines.push('  return statements.filter(stmt => {');
    lines.push('    const trimmed = stmt.trim();');
    lines.push('    return trimmed && !trimmed.split(\'\\n\').every(line => ');
    lines.push('      !line.trim() || line.trim().startsWith(\'--\')');
    lines.push('    );');
    lines.push('  });');
    lines.push('}');
    lines.push('');
    
    lines.push('async function initDatabase() {');
    lines.push('  try {');
    lines.push('    console.log(\'🔄 Initializing database...\');');
    lines.push('');
    lines.push('    const db = createDatabase();');
    lines.push('');
    lines.push('    // Read and execute migration');
    lines.push('    const migrationPath = join(process.cwd(), \'migration.sql\');');
    lines.push('    const migration = readFileSync(migrationPath, \'utf8\');');
    lines.push('');
    lines.push('    // Execute migration statements one by one to handle existing tables gracefully');
    lines.push('    const statements = splitSQLStatements(migration);');
    lines.push('    ');
    lines.push('    console.log(`📝 Found ${statements.length} statements to execute`);');
    lines.push('    ');
    lines.push('    for (let i = 0; i < statements.length; i++) {');
    lines.push('      const statement = statements[i];');
    lines.push('      const trimmedStatement = statement.trim();');
    lines.push('      if (!trimmedStatement) continue;');
    lines.push('      ');
    lines.push('      console.log(`📝 Executing statement ${i + 1}: ${trimmedStatement.split(\'\\n\')[0]}...`);');
    lines.push('      ');
    lines.push('      try {');
    lines.push('        // Make db.run asynchronous and wait for completion');
    lines.push('        await new Promise<void>((resolve, reject) => {');
    lines.push('          db.run(trimmedStatement, function(err) {');
    lines.push('            if (err) {');
    lines.push('              reject(err);');
    lines.push('            } else {');
    lines.push('              resolve();');
    lines.push('            }');
    lines.push('          });');
    lines.push('        });');
    lines.push('        console.log(`✅ Statement ${i + 1} completed successfully`);');
    lines.push('      } catch (err: any) {');
    lines.push('        // Ignore "table already exists" errors');
    lines.push('        if (err.code === \'SQLITE_ERROR\' && err.message.includes(\'already exists\')) {');
    lines.push('          console.log(`⚠️  Skipping: ${trimmedStatement.split(\'\\n\')[0]}... (already exists)`);');
    lines.push('          continue;');
    lines.push('        }');
    lines.push('        console.error(`❌ Error executing statement ${i + 1}: ${trimmedStatement}`);');
    lines.push('        throw err;');
    lines.push('      }');
    lines.push('    }');
    lines.push('');
    lines.push('    console.log(\'✅ Database initialized successfully!\');');
    lines.push('    ');
    lines.push('    // Verify tables were created');
    lines.push('    await new Promise<void>((resolve, reject) => {');
    lines.push('      db.all("SELECT name FROM sqlite_master WHERE type=\'table\'", (err, rows) => {');
    lines.push('        if (err) {');
    lines.push('          reject(err);');
    lines.push('        } else {');
    lines.push('          console.log(\'📊 Tables created:\');');
    lines.push('          rows.forEach((row: any) => {');
    lines.push('            console.log(`  - ${row.name}`);');
    lines.push('          });');
    lines.push('          resolve();');
    lines.push('        }');
    lines.push('      });');
    lines.push('    });');
    lines.push('');
    lines.push('    // Close database connection');
    lines.push('    await new Promise<void>((resolve, reject) => {');
    lines.push('      db.close((err) => {');
    lines.push('        if (err) {');
    lines.push('          reject(err);');
    lines.push('        } else {');
    lines.push('          resolve();');
    lines.push('        }');
    lines.push('      });');
    lines.push('    });');
    lines.push('    ');
    lines.push('  } catch (error) {');
    lines.push('    console.error(\'❌ Database initialization failed:\', error);');
    lines.push('    process.exit(1);');
    lines.push('  }');
    lines.push('}');
    lines.push('');
    
    lines.push('initDatabase();');
    
    return lines.join('\n');
  }
  
  private generateEnv(cir: CIRDocument): string {
    const lines: string[] = [];
    
    lines.push('# Database Configuration');
    lines.push('DB_PATH=database.sqlite');
    lines.push('');
    lines.push('# Server Configuration');
    lines.push('PORT=3000');
    lines.push('HOST=0.0.0.0');
    lines.push('LOG_LEVEL=info');
    lines.push('');
    lines.push('# Development');
    lines.push('NODE_ENV=development');
    
    return lines.join('\n');
  }
  
  private generateEnvExample(cir: CIRDocument): string {
    const lines: string[] = [];
    
    lines.push('# Database Configuration');
    lines.push('DB_PATH=database.sqlite');
    lines.push('');
    lines.push('# Server Configuration');
    lines.push('PORT=3000');
    lines.push('HOST=0.0.0.0');
    lines.push('LOG_LEVEL=info');
    lines.push('');
    lines.push('# Development');
    lines.push('NODE_ENV=development');
    
    return lines.join('\n');
  }
  
  private generateReadme(cir: CIRDocument): string {
    const lines: string[] = [];
    
    lines.push(`# ${cir.metadata.name} Backend API`);
    lines.push('');
    lines.push('Generated backend API using Fastify and SQLite.');
    lines.push('');
    lines.push('## Features');
    lines.push('');
    lines.push('- 🚀 **Fastify** - Fast and low overhead web framework');
    lines.push('- 🗄️ **SQLite** - Lightweight, serverless database');
    lines.push('- 📖 **Swagger/OpenAPI** - Interactive API documentation');
    lines.push('- 🔒 **Security** - Helmet, CORS, Rate limiting');
    lines.push('- ✅ **Validation** - Zod schema validation');
    lines.push('- 🏗️ **TypeScript** - Full type safety');
    lines.push('');
    lines.push('## Quick Start');
    lines.push('');
    lines.push('```bash');
    lines.push('# Install dependencies');
    lines.push('npm install');
    lines.push('');
    lines.push('# Initialize database');
    lines.push('npm run db:init');
    lines.push('');
    lines.push('# Start development server');
    lines.push('npm run dev');
    lines.push('```');
    lines.push('');
    lines.push('## API Endpoints');
    lines.push('');
    
    for (const moduleName in cir.modules) {
      const module = cir.modules[moduleName];
      for (const entityName in module.entities) {
        const routeName = entityName.toLowerCase();
        lines.push(`### ${entityName}`);
        lines.push('');
        lines.push(`- \`GET /api/${routeName}s\` - Get all ${routeName}s`);
        lines.push(`- \`GET /api/${routeName}s/:id\` - Get ${routeName} by ID`);
        lines.push(`- \`POST /api/${routeName}s\` - Create new ${routeName}`);
        lines.push(`- \`PUT /api/${routeName}s/:id\` - Update ${routeName}`);
        lines.push(`- \`DELETE /api/${routeName}s/:id\` - Delete ${routeName}`);
        lines.push('');
      }
    }
    
    lines.push('## Documentation');
    lines.push('');
    lines.push('API documentation is available at `/docs` when the server is running.');
    lines.push('');
    lines.push('## Database');
    lines.push('');
    lines.push('The application uses SQLite for data storage. The database file is created automatically.');
    lines.push('');
    lines.push('### Reset Database');
    lines.push('');
    lines.push('```bash');
    lines.push('npm run db:reset');
    lines.push('```');
    
    return lines.join('\n');
  }
  
  // Helper methods
  private mapFieldTypeToTypeScript(field: CIRField): string {
    switch (field.type.baseType) {
      case 'string':
        return 'string';
      case 'number':
        return 'number';
      case 'boolean':
        return 'boolean';
      case 'date':
      case 'datetime':
        return 'string';
      case 'uuid':
        return 'string';
      case 'json':
        return 'any';
      case 'enum':
        return 'string';
      default:
        return 'string';
    }
  }
  
  private mapFieldTypeToZod(field: CIRField, fieldName: string): string {
    let zodType = '';
    
    switch (field.type.baseType) {
      case 'string':
        zodType = 'z.string()';
        
        // Add required validation with descriptive message
        if (!field.constraints.nullable && field.constraints.default === undefined) {
          const fieldLabel = this.formatFieldLabel(fieldName);
          zodType += `.min(1, '${fieldLabel} is required')`;
        }
        
        if (field.constraints.min && field.constraints.min > 1) {
          zodType += `.min(${field.constraints.min})`;
        }
        if (field.constraints.max) {
          zodType += `.max(${field.constraints.max})`;
        }
        if (field.type.subType === 'email') {
          zodType += '.email()';
        }
        break;
      case 'number':
        zodType = 'z.number()';
        if (field.constraints.min !== undefined) {
          zodType += `.min(${field.constraints.min})`;
        }
        if (field.constraints.max !== undefined) {
          zodType += `.max(${field.constraints.max})`;
        }
        break;
      case 'boolean':
        zodType = 'z.boolean()';
        break;
      case 'date':
      case 'datetime':
        // Accept simple date format for frontend compatibility
        zodType = 'z.string()';
        break;
      case 'uuid':
        zodType = 'z.string().uuid()';
        break;
      case 'json':
        zodType = 'z.any()';
        break;
      case 'enum':
        zodType = 'z.string()';
        break;
      default:
        zodType = 'z.string()';
    }
    
    // Make optional if nullable or has default value
    if (field.constraints.nullable || field.constraints.default !== undefined) {
      zodType += '.optional()';
    }
    
    return zodType;
  }

  private formatFieldLabel(fieldName: string): string {
    return fieldName
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }
  
  private toSnakeCase(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`).replace(/^_/, '');
  }
  
  private escapeSQLKeyword(name: string): string {
    // List of SQLite reserved keywords that need to be escaped
    const reservedKeywords = [
      'order', 'group', 'table', 'column', 'index', 'trigger', 'view',
      'select', 'insert', 'update', 'delete', 'create', 'drop', 'alter',
      'join', 'union', 'where', 'having', 'limit', 'offset', 'distinct',
      'as', 'on', 'in', 'exists', 'between', 'like', 'and', 'or', 'not',
      'null', 'is', 'case', 'when', 'then', 'else', 'end', 'if', 'for',
      'while', 'begin', 'commit', 'rollback', 'transaction', 'database',
      'schema', 'primary', 'foreign', 'key', 'unique', 'check', 'default',
      'constraint', 'references', 'cascade', 'restrict', 'set', 'action',
      'deferred', 'immediate', 'initially', 'deferrable', 'match', 'partial',
      'full', 'simple', 'cross', 'natural', 'inner', 'left', 'right', 'outer',
      'using', 'values', 'into', 'from', 'by', 'desc', 'asc', 'all', 'any',
      'some', 'row', 'rows', 'range', 'current', 'following', 'preceding',
      'unbounded', 'partition', 'over', 'window', 'with', 'recursive',
      'temp', 'temporary', 'if', 'exists', 'not', 'unique', 'collate',
      'binary', 'nocase', 'rtrim', 'abs', 'changes', 'char', 'coalesce',
      'glob', 'hex', 'ifnull', 'instr', 'last_insert_rowid', 'length',
      'like', 'likelihood', 'likely', 'load_extension', 'lower', 'ltrim',
      'max', 'min', 'nullif', 'printf', 'quote', 'random', 'randomblob',
      'replace', 'round', 'rtrim', 'soundex', 'sqlite_compileoption_get',
      'sqlite_compileoption_used', 'sqlite_source_id', 'sqlite_version',
      'substr', 'substring', 'total_changes', 'trim', 'typeof', 'unicode',
      'unlikely', 'upper', 'zeroblob'
    ];
    
    if (reservedKeywords.includes(name.toLowerCase())) {
      return `"${name}"`;
    }
    
    return name;
  }
} 