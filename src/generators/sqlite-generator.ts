import { CIRDocument, CIREntity, CIRField, CIRRelation } from '../types/cir.js';

export class SQLiteGenerator {
  // Санитизация имен полей для валидных идентификаторов SQL
  private sanitizeFieldName(fieldName: string): string {
    if (!fieldName) return 'field';
    
    // Заменяем точки на подчеркивания и другие недопустимые символы
    return fieldName
      .replace(/\./g, '_')
      .replace(/[^a-zA-Z0-9_]/g, '_')
      .replace(/^[0-9]/, '_$&') // Добавляем подчеркивание если начинается с цифры
      .toLowerCase();
  }

  public generateMigration(cir: CIRDocument): string {
    const lines: string[] = [];
    
    lines.push('-- Generated SQLite migration');
    lines.push(`-- Project: ${cir.metadata.name} v${cir.metadata.version}`);
    lines.push(`-- Generated at: ${new Date().toISOString()}`);
    lines.push('');
    
    lines.push('PRAGMA foreign_keys = ON;');
    lines.push('');
    
    // Generate tables for each entity
    for (const moduleName in cir.modules) {
      const module = cir.modules[moduleName];
      
      // Пропускаем пустые модули
      if (!moduleName || !module.name) {
        continue;
      }
      
      lines.push(`-- Module: ${moduleName}`);
      lines.push('');
      
      for (const entityName in module.entities) {
        const entity = module.entities[entityName];
        
        // Пропускаем пустые сущности
        if (!entity.name || !entityName) {
          continue;
        }
        
        lines.push(...this.generateCreateTable(entity));
        lines.push('');
      }
    }
    
    // Generate indexes
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
        
        const indexes = this.generateIndexes(entity);
        if (indexes.length > 0) {
          lines.push(...indexes);
          lines.push('');
        }
      }
    }
    
    return lines.join('\n');
  }
  
  private generateCreateTable(entity: CIREntity): string[] {
    const lines: string[] = [];
    const rawTableName = entity.tableName || this.toSnakeCase(entity.name);
    const tableName = this.escapeSQLKeyword(rawTableName);
    
    lines.push(`-- Table: ${entity.name}`);
    if (entity.doc) {
      lines.push(`-- ${entity.doc}`);
    }
    lines.push(`CREATE TABLE IF NOT EXISTS ${tableName} (`);
    
    const columns: string[] = [];
    
    // Primary key
    columns.push('  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16))))');
    
    // Regular fields
    for (const fieldName in entity.fields) {
      const field = entity.fields[fieldName];
      if (fieldName === 'id') continue; // Skip id, already handled
      
      const sanitizedFieldName = this.sanitizeFieldName(fieldName);
      const columnDef = this.generateColumnDefinition(sanitizedFieldName, field);
      columns.push(`  ${columnDef}`);
    }
    
    // Foreign keys for relations
    for (const relationName in entity.relations) {
      const relation = entity.relations[relationName];
      if (relation.type === 'manyToOne' || relation.type === 'oneToOne') {
        const fkColumn = relation.foreignKey || relationName + '_id';
        const sanitizedFkColumn = this.sanitizeFieldName(fkColumn);
        columns.push(`  ${sanitizedFkColumn} TEXT`);
      }
    }
    
    // Audit fields (only if not already added)
    const hasCreatedAt = Object.keys(entity.fields).includes('created_at');
    const hasUpdatedAt = Object.keys(entity.fields).includes('updated_at');
    
    if (!hasCreatedAt) {
      columns.push('  created_at TEXT NOT NULL DEFAULT (datetime(\'now\'))');
    }
    if (!hasUpdatedAt) {
      columns.push('  updated_at TEXT NOT NULL DEFAULT (datetime(\'now\'))');
    }
    
    lines.push(columns.join(',\n'));
    lines.push(');');
    
    // Add foreign key constraints
    for (const relationName in entity.relations) {
      const relation = entity.relations[relationName];
      if (relation.type === 'manyToOne' || relation.type === 'oneToOne') {
        const fkColumn = relation.foreignKey || relationName + '_id';
        const sanitizedFkColumn = this.sanitizeFieldName(fkColumn);
        const targetTable = this.escapeSQLKeyword(this.toSnakeCase(relation.targetEntity));
        lines.push('');
        lines.push(`-- Foreign key: ${entity.name}.${sanitizedFkColumn} -> ${relation.targetEntity}.id`);
        lines.push(`CREATE INDEX idx_${rawTableName}_${sanitizedFkColumn} ON ${tableName}(${sanitizedFkColumn});`);
      }
    }
    
    // Add trigger for updated_at
    lines.push('');
    lines.push(`-- Trigger: Update ${rawTableName}.updated_at`);
    lines.push(`CREATE TRIGGER update_${rawTableName}_updated_at`);
    lines.push(`  AFTER UPDATE ON ${tableName}`);
    lines.push('  FOR EACH ROW');
    lines.push('BEGIN');
    lines.push('  UPDATE ' + tableName + ' SET updated_at = datetime(\'now\') WHERE id = NEW.id;');
    lines.push('END;');
    
    return lines;
  }
  
  private generateColumnDefinition(fieldName: string, field: CIRField): string {
    const sqlType = this.mapFieldTypeToSQLite(field);
    const constraints: string[] = [];
    
    // Nullable constraint
    if (!field.constraints.nullable) {
      constraints.push('NOT NULL');
    }
    
    // Default value
    if (field.constraints.default !== undefined) {
      if (typeof field.constraints.default === 'string') {
        constraints.push(`DEFAULT '${field.constraints.default}'`);
      } else if (typeof field.constraints.default === 'boolean') {
        constraints.push(`DEFAULT ${field.constraints.default ? 1 : 0}`);
      } else {
        constraints.push(`DEFAULT ${field.constraints.default}`);
      }
    }
    
    // Unique constraint
    if (field.constraints.unique) {
      constraints.push('UNIQUE');
    }
    
    // Check constraints
    if (field.constraints.min !== undefined || field.constraints.max !== undefined) {
      const checks: string[] = [];
      if (field.constraints.min !== undefined) {
        if (field.type.baseType === 'string') {
          checks.push(`length(${fieldName}) >= ${field.constraints.min}`);
        } else {
          checks.push(`${fieldName} >= ${field.constraints.min}`);
        }
      }
      if (field.constraints.max !== undefined) {
        if (field.type.baseType === 'string') {
          checks.push(`length(${fieldName}) <= ${field.constraints.max}`);
        } else {
          checks.push(`${fieldName} <= ${field.constraints.max}`);
        }
      }
      if (checks.length > 0) {
        constraints.push(`CHECK (${checks.join(' AND ')})`);
      }
    }
    
    return `${fieldName} ${sqlType} ${constraints.join(' ')}`.trim();
  }
  
  private mapFieldTypeToSQLite(field: CIRField): string {
    switch (field.type.baseType) {
      case 'string':
        return 'TEXT';
      case 'number':
        if (field.type.subType === 'integer') {
          return 'INTEGER';
        } else if (field.type.subType === 'decimal' || field.type.subType === 'money') {
          return 'REAL';
        }
        return 'REAL';
      case 'boolean':
        return 'INTEGER'; // SQLite doesn't have boolean, use INTEGER (0/1)
      case 'date':
      case 'datetime':
        return 'TEXT'; // Store as ISO string
      case 'uuid':
        return 'TEXT';
      case 'json':
        return 'TEXT'; // Store as JSON string
      case 'enum':
        return 'TEXT';
      default:
        return 'TEXT';
    }
  }
  
  private generateIndexes(entity: CIREntity): string[] {
    const lines: string[] = [];
    const rawTableName = entity.tableName || this.toSnakeCase(entity.name);
    const tableName = this.escapeSQLKeyword(rawTableName);
    
    // Index unique fields
    for (const fieldName in entity.fields) {
      const field = entity.fields[fieldName];
      if (field.constraints.unique && fieldName !== 'id') {
        const sanitizedFieldName = this.sanitizeFieldName(fieldName);
        lines.push(`CREATE UNIQUE INDEX idx_${rawTableName}_${sanitizedFieldName} ON ${tableName}(${sanitizedFieldName});`);
      }
    }
    
    // Index commonly queried fields
    const indexFields = ['email', 'name', 'code', 'status', 'created_at'];
    for (const fieldName of indexFields) {
      if (entity.fields[fieldName] && !entity.fields[fieldName].constraints.unique) {
        const sanitizedFieldName = this.sanitizeFieldName(fieldName);
        lines.push(`CREATE INDEX idx_${rawTableName}_${sanitizedFieldName} ON ${tableName}(${sanitizedFieldName});`);
      }
    }
    
    return lines;
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