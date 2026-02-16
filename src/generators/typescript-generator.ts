import { CIRDocument, CIREntity, CIRField, CIRAction } from '../types/cir.js';

export class TypeScriptGenerator {
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
    for (const moduleName in cir.modules) {
      const module = cir.modules[moduleName];
      for (const entityName in module.entities) {
        const entity = module.entities[entityName];
        files.set(`src/services/${entityName}Service.ts`, this.generateService(entity, cir));
      }
    }
    
    // Generate routes
    for (const moduleName in cir.modules) {
      const module = cir.modules[moduleName];
      for (const entityName in module.entities) {
        const entity = module.entities[entityName];
        files.set(`src/routes/${entityName.toLowerCase()}.ts`, this.generateRoutes(entity, cir));
      }
    }
    
    // Generate main app
    files.set('src/app.ts', this.generateApp(cir));
    files.set('src/server.ts', this.generateServer(cir));
    
    // Generate database connection
    files.set('src/database/connection.ts', this.generateDatabaseConnection());
    
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
        'db:migrate': 'node dist/database/migrate.js'
      },
      dependencies: {
        fastify: '^4.24.3',
        '@fastify/cors': '^8.4.0',
        '@fastify/helmet': '^11.1.1',
        '@fastify/rate-limit': '^9.1.0',
        '@fastify/swagger': '^8.12.0',
        '@fastify/swagger-ui': '^2.1.0',
        pg: '^8.11.3',
        zod: '^3.22.4',
        uuid: '^9.0.1'
      },
      devDependencies: {
        '@types/node': '^20.10.0',
        '@types/pg': '^8.10.9',
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
    lines.push('  created_at: Date;');
    lines.push('  updated_at: Date;');
    lines.push('}');
    lines.push('');
    
    // Generate entity types
    for (const moduleName in cir.modules) {
      const module = cir.modules[moduleName];
      
      for (const entityName in module.entities) {
        const entity = module.entities[entityName];
        lines.push(`export interface ${entityName} extends BaseEntity {`);
        
        // Add fields
        for (const fieldName in entity.fields) {
          const field = entity.fields[fieldName];
          if (fieldName === 'id' || fieldName === 'created_at' || fieldName === 'updated_at') {
            continue; // Skip base fields
          }
          
          const tsType = this.mapFieldTypeToTypeScript(field);
          const optional = field.constraints.nullable ? '?' : '';
          lines.push(`  ${fieldName}${optional}: ${tsType};`);
        }
        
        // Add relations
        for (const relationName in entity.relations) {
          const relation = entity.relations[relationName];
          if (relation.type === 'manyToOne' || relation.type === 'oneToOne') {
            lines.push(`  ${relationName}?: ${relation.targetEntity};`);
            lines.push(`  ${relation.foreignKey || relationName + '_id'}?: string;`);
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
          
          const tsType = this.mapFieldTypeToTypeScript(field);
          const optional = field.constraints.nullable || field.constraints.default !== undefined ? '?' : '';
          lines.push(`  ${fieldName}${optional}: ${tsType};`);
        }
        
        for (const relationName in entity.relations) {
          const relation = entity.relations[relationName];
          if (relation.type === 'manyToOne' || relation.type === 'oneToOne') {
            lines.push(`  ${relation.foreignKey || relationName + '_id'}?: string;`);
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
    lines.push('import { Pool } from \'pg\';');
    lines.push('import { v4 as uuidv4 } from \'uuid\';');
    lines.push('import * as types from \'../types/index.js\';');
    lines.push('');
    
    // Generate base model class
    lines.push('export abstract class BaseModel {');
    lines.push('  constructor(protected pool: Pool) {}');
    lines.push('');
    lines.push('  protected async query(text: string, params?: any[]) {');
    lines.push('    const client = await this.pool.connect();');
    lines.push('    try {');
    lines.push('      const result = await client.query(text, params);');
    lines.push('      return result;');
    lines.push('    } finally {');
    lines.push('      client.release();');
    lines.push('    }');
    lines.push('  }');
    lines.push('}');
    lines.push('');
    
    // Generate model for each entity
    for (const moduleName in cir.modules) {
      const module = cir.modules[moduleName];
      
      for (const entityName in module.entities) {
        const entity = module.entities[entityName];
        const tableName = entity.tableName || this.toSnakeCase(entityName);
        
        lines.push(`export class ${entityName}Model extends BaseModel {`);
        lines.push(`  private tableName = '${tableName}';`);
        lines.push('');
        
        // Find all method
        lines.push(`  async findAll(): Promise<types.${entityName}[]> {`);
        lines.push(`    const result = await this.query(\`SELECT * FROM \${this.tableName} ORDER BY created_at DESC\`);`);
        lines.push(`    return result.rows;`);
        lines.push('  }');
        lines.push('');
        
        // Find by id method
        lines.push(`  async findById(id: string): Promise<types.${entityName} | null> {`);
        lines.push(`    const result = await this.query(\`SELECT * FROM \${this.tableName} WHERE id = $1\`, [id]);`);
        lines.push(`    return result.rows[0] || null;`);
        lines.push('  }');
        lines.push('');
        
        // Create method
        lines.push(`  async create(data: types.Create${entityName}): Promise<types.${entityName}> {`);
        lines.push('    const id = uuidv4();');
        lines.push('    const now = new Date();');
        
        const fields = ['id', 'created_at', 'updated_at'];
        const values = ['$1', '$2', '$3'];
        const params = ['id', 'now', 'now'];
        
        let paramIndex = 4;
        for (const fieldName in entity.fields) {
          if (fieldName === 'id' || fieldName === 'created_at' || fieldName === 'updated_at') {
            continue;
          }
          fields.push(fieldName);
          values.push(`$${paramIndex}`);
          params.push(`data.${fieldName}`);
          paramIndex++;
        }
        
        for (const relationName in entity.relations) {
          const relation = entity.relations[relationName];
          if (relation.type === 'manyToOne' || relation.type === 'oneToOne') {
            const fkField = relation.foreignKey || relationName + '_id';
            fields.push(fkField);
            values.push(`$${paramIndex}`);
            params.push(`data.${fkField}`);
            paramIndex++;
          }
        }
        
        lines.push(`    const result = await this.query(`);
        lines.push(`      \`INSERT INTO \${this.tableName} (${fields.join(', ')}) VALUES (${values.join(', ')}) RETURNING *\`,`);
        lines.push(`      [${params.join(', ')}]`);
        lines.push('    );');
        lines.push(`    return result.rows[0];`);
        lines.push('  }');
        lines.push('');
        
        // Update method
        lines.push(`  async update(id: string, data: types.Update${entityName}): Promise<types.${entityName} | null> {`);
        lines.push('    const updates: string[] = [];');
        lines.push('    const params: any[] = [];');
        lines.push('    let paramIndex = 1;');
        lines.push('');
        lines.push('    // Always update updated_at');
        lines.push('    updates.push(`updated_at = $${paramIndex}`);');
        lines.push('    params.push(new Date());');
        lines.push('    paramIndex++;');
        lines.push('');
        
        for (const fieldName in entity.fields) {
          if (fieldName === 'id' || fieldName === 'created_at' || fieldName === 'updated_at') {
            continue;
          }
          lines.push(`    if (data.${fieldName} !== undefined) {`);
          lines.push(`      updates.push(\`${fieldName} = $\${paramIndex}\`);`);
          lines.push(`      params.push(data.${fieldName});`);
          lines.push('      paramIndex++;');
          lines.push('    }');
        }
        
        lines.push('');
        lines.push('    if (updates.length === 1) return this.findById(id); // No changes');
        lines.push('');
        lines.push('    params.push(id);');
        lines.push(`    const result = await this.query(`);
        lines.push(`      \`UPDATE \${this.tableName} SET \${updates.join(', ')} WHERE id = $\${paramIndex} RETURNING *\`,`);
        lines.push('      params');
        lines.push('    );');
        lines.push(`    return result.rows[0] || null;`);
        lines.push('  }');
        lines.push('');
        
        // Delete method
        lines.push(`  async delete(id: string): Promise<boolean> {`);
        lines.push(`    const result = await this.query(\`DELETE FROM \${this.tableName} WHERE id = $1\`, [id]);`);
        lines.push(`    return result.rowCount > 0;`);
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
        
        // Create schema
        lines.push(`export const create${entityName}Schema = z.object({`);
        
        for (const fieldName in entity.fields) {
          const field = entity.fields[fieldName];
          if (fieldName === 'id' || fieldName === 'created_at' || fieldName === 'updated_at') {
            continue;
          }
          
          const zodType = this.mapFieldTypeToZod(field, fieldName);
          lines.push(`  ${fieldName}: ${zodType},`);
        }
        
        for (const relationName in entity.relations) {
          const relation = entity.relations[relationName];
          if (relation.type === 'manyToOne' || relation.type === 'oneToOne') {
            const fkField = relation.foreignKey || relationName + '_id';
            lines.push(`  ${fkField}: z.string().uuid().optional(),`);
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
    lines.push('import { Pool } from \'pg\';');
    lines.push(`import { ${entityName}Model } from '../models/index.js';`);
    lines.push(`import * as types from '../types/index.js';`);
    lines.push('');
    
    lines.push(`export class ${entityName}Service {`);
    lines.push('  private model: ' + entityName + 'Model;');
    lines.push('');
    lines.push('  constructor(pool: Pool) {');
    lines.push(`    this.model = new ${entityName}Model(pool);`);
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
    lines.push(`  const ${routeName}Service = new ${entityName}Service(fastify.pg);`);
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
    lines.push('      params: ' + `${routeName}ParamsSchema,`);
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
    lines.push('      body: ' + `create${entityName}Schema,`);
    lines.push('      response: {');
    lines.push('        201: { type: \'object\' },');
    lines.push('        400: { type: \'object\', properties: { message: { type: \'string\' } } }');
    lines.push('      }');
    lines.push('    }');
    lines.push('  }, async (request, reply) => {');
    lines.push('    const data = request.body as any;');
    lines.push(`    const ${routeName} = await ${routeName}Service.create(data);`);
    lines.push(`    return reply.code(201).send(${routeName});`);
    lines.push('  });');
    lines.push('');
    
    // PUT update
    lines.push(`  // PUT /${routeName}s/:id`);
    lines.push(`  fastify.put('/${routeName}s/:id', {`);
    lines.push('    schema: {');
    lines.push(`      description: 'Update ${routeName}',`);
    lines.push('      tags: [' + `'${entityName}'` + '],');
    lines.push('      params: ' + `${routeName}ParamsSchema,`);
    lines.push('      body: ' + `update${entityName}Schema,`);
    lines.push('      response: {');
    lines.push('        200: { type: \'object\' },');
    lines.push('        404: { type: \'object\', properties: { message: { type: \'string\' } } }');
    lines.push('      }');
    lines.push('    }');
    lines.push('  }, async (request, reply) => {');
    lines.push('    const { id } = request.params as { id: string };');
    lines.push('    const data = request.body as any;');
    lines.push(`    const ${routeName} = await ${routeName}Service.update(id, data);`);
    lines.push(`    if (!${routeName}) {`);
    lines.push(`      return reply.code(404).send({ message: '${entityName} not found' });`);
    lines.push('    }');
    lines.push(`    return ${routeName};`);
    lines.push('  });');
    lines.push('');
    
    // DELETE
    lines.push(`  // DELETE /${routeName}s/:id`);
    lines.push(`  fastify.delete('/${routeName}s/:id', {`);
    lines.push('    schema: {');
    lines.push(`      description: 'Delete ${routeName}',`);
    lines.push('      tags: [' + `'${entityName}'` + '],');
    lines.push('      params: ' + `${routeName}ParamsSchema,`);
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
    lines.push('import { Pool } from \'pg\';');
    lines.push('');
    
    // Import routes
    for (const moduleName in cir.modules) {
      const module = cir.modules[moduleName];
      for (const entityName in module.entities) {
        const routeName = entityName.toLowerCase();
        lines.push(`import { ${routeName}Routes } from './routes/${routeName}.js';`);
      }
    }
    
    lines.push('');
    lines.push('declare module \'fastify\' {');
    lines.push('  interface FastifyInstance {');
    lines.push('    pg: Pool;');
    lines.push('  }');
    lines.push('}');
    lines.push('');
    
    lines.push('export async function buildApp(pg: Pool) {');
    lines.push('  const fastify = Fastify({');
    lines.push('    logger: {');
    lines.push('      level: process.env.LOG_LEVEL || \'info\'');
    lines.push('    }');
    lines.push('  });');
    lines.push('');
    
    lines.push('  // Register PostgreSQL connection');
    lines.push('  fastify.decorate(\'pg\', pg);');
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
      for (const entityName in module.entities) {
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
    lines.push('import { createPool } from \'./database/connection.js\';');
    lines.push('');
    
    lines.push('async function start() {');
    lines.push('  try {');
    lines.push('    const pool = createPool();');
    lines.push('    const app = await buildApp(pool);');
    lines.push('');
    lines.push('    const port = Number(process.env.PORT) || 3000;');
    lines.push('    const host = process.env.HOST || \'0.0.0.0\';');
    lines.push('');
    lines.push('    await app.listen({ port, host });');
    lines.push('    console.log(`🚀 Server running at http://${host}:${port}`);');
    lines.push('    console.log(`📖 API docs at http://${host}:${port}/docs`);');
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
    lines.push('import { Pool } from \'pg\';');
    lines.push('');
    
    lines.push('export function createPool(): Pool {');
    lines.push('  return new Pool({');
    lines.push('    user: process.env.DB_USER || \'postgres\',');
    lines.push('    host: process.env.DB_HOST || \'localhost\',');
    lines.push('    database: process.env.DB_NAME || \'erp_db\',');
    lines.push('    password: process.env.DB_PASSWORD || \'password\',');
    lines.push('    port: Number(process.env.DB_PORT) || 5432,');
    lines.push('    max: 20,');
    lines.push('    idleTimeoutMillis: 30000,');
    lines.push('    connectionTimeoutMillis: 2000,');
    lines.push('  });');
    lines.push('}');
    
    return lines.join('\n');
  }
  
  private generateReadme(cir: CIRDocument): string {
    const lines: string[] = [];
    
    lines.push(`# ${cir.metadata.name} Backend API`);
    lines.push('');
    lines.push('Generated backend API using Fastify and PostgreSQL.');
    lines.push('');
    lines.push('## Features');
    lines.push('');
    lines.push('- 🚀 **Fastify** - Fast and low overhead web framework');
    lines.push('- 🐘 **PostgreSQL** - Robust database with full SQL support');
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
    lines.push('# Set environment variables');
    lines.push('cp .env.example .env');
    lines.push('');
    lines.push('# Run database migrations');
    lines.push('npm run db:migrate');
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
    lines.push('## Environment Variables');
    lines.push('');
    lines.push('```bash');
    lines.push('# Server');
    lines.push('PORT=3000');
    lines.push('HOST=0.0.0.0');
    lines.push('LOG_LEVEL=info');
    lines.push('');
    lines.push('# Database');
    lines.push('DB_HOST=localhost');
    lines.push('DB_PORT=5432');
    lines.push('DB_NAME=erp_db');
    lines.push('DB_USER=postgres');
    lines.push('DB_PASSWORD=password');
    lines.push('```');
    
    return lines.join('\n');
  }
  
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
        return 'Date';
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
        if (field.constraints.min) {
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
        zodType = 'z.date()';
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
    
    if (field.constraints.nullable) {
      zodType += '.optional()';
    }
    
    return zodType;
  }
  
  private toSnakeCase(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`).replace(/^_/, '');
  }
} 