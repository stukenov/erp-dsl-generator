import { CIRDocument, CIREntity, CIRField, CIRRelation } from '../types/cir.js';

export class SQLGenerator {
  public generateMigration(cir: CIRDocument): string {
    const lines: string[] = [];
    
    // Header
    lines.push('-- Generated migration for ' + cir.metadata.name);
    lines.push('-- Version: ' + cir.metadata.version);
    lines.push('-- Schema version: ' + cir.metadata.schemaVersion);
    lines.push('-- Generated at: ' + cir.metadata.generatedAt);
    lines.push('');
    
    // Create tables for each entity
    for (const moduleName in cir.modules) {
      const module = cir.modules[moduleName];
      
      lines.push(`-- Module: ${moduleName}`);
      lines.push('');
      
      for (const entityName in module.entities) {
        const entity = module.entities[entityName];
        lines.push(...this.generateCreateTable(entity));
        lines.push('');
      }
      
      // Create foreign key constraints
      for (const entityName in module.entities) {
        const entity = module.entities[entityName];
        const fkConstraints = this.generateForeignKeys(entity);
        if (fkConstraints.length > 0) {
          lines.push(...fkConstraints);
          lines.push('');
        }
      }
      
      // Create indexes
      for (const entityName in module.entities) {
        const entity = module.entities[entityName];
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
    const tableName = entity.tableName || this.toSnakeCase(entity.name);
    
    lines.push(`CREATE TABLE ${tableName} (`);
    
    const columns: string[] = [];
    
    // Add fields
    for (const fieldName in entity.fields) {
      const field = entity.fields[fieldName];
      columns.push('  ' + this.generateColumnDefinition(field));
    }
    
    // Add foreign key columns for relations
    for (const relationName in entity.relations) {
      const relation = entity.relations[relationName];
      if (relation.type === 'manyToOne' || relation.type === 'oneToOne') {
        const fkColumn = relation.foreignKey || `${relation.name}_id`;
        columns.push(`  ${fkColumn} UUID`);
      }
    }
    
    // Add primary key constraint
    if (entity.pk) {
      columns.push(`  PRIMARY KEY (${entity.pk})`);
    }
    
    lines.push(columns.join(',\n'));
    lines.push(');');
    
    // Add table comment
    if (entity.doc) {
      lines.push(`COMMENT ON TABLE ${tableName} IS '${entity.doc.replace(/'/g, "''")}'`);
    }
    
    // Add column comments
    for (const fieldName in entity.fields) {
      const field = entity.fields[fieldName];
      if (field.ui?.help) {
        lines.push(`COMMENT ON COLUMN ${tableName}.${field.name} IS '${field.ui.help.replace(/'/g, "''")}'`);
      }
    }
    
    return lines;
  }
  
  private generateColumnDefinition(field: CIRField): string {
    const parts: string[] = [];
    
    parts.push(field.name);
    parts.push(this.mapFieldTypeToSQL(field));
    
    if (!field.constraints.nullable) {
      parts.push('NOT NULL');
    }
    
    if (field.constraints.unique) {
      parts.push('UNIQUE');
    }
    
    if (field.constraints.default !== undefined) {
      parts.push(`DEFAULT ${this.formatDefaultValue(field.constraints.default, field.type.baseType)}`);
    }
    
    return parts.join(' ');
  }
  
  private mapFieldTypeToSQL(field: CIRField): string {
    const type = field.type;
    
    switch (type.baseType) {
      case 'uuid':
        return 'UUID';
      case 'string':
        if (type.subType === 'text') {
          return field.constraints.max ? `VARCHAR(${field.constraints.max})` : 'TEXT';
        }
        return 'VARCHAR(255)';
      case 'number':
        if (type.subType === 'integer') {
          return 'INTEGER';
        }
        if (type.subType === 'decimal') {
          return `DECIMAL(${type.precision || 12}, ${type.scale || 2})`;
        }
        return 'DECIMAL';
      case 'boolean':
        return 'BOOLEAN';
      case 'date':
        return 'DATE';
      case 'datetime':
        return 'TIMESTAMP WITH TIME ZONE';
      case 'json':
        return 'JSONB';
      case 'enum':
        // For simplicity, use VARCHAR with CHECK constraint
        return 'VARCHAR(50)';
      default:
        return 'TEXT';
    }
  }
  
  private formatDefaultValue(value: any, baseType: string): string {
    if (value === null) {
      return 'NULL';
    }
    
    switch (baseType) {
      case 'string':
        return `'${value.toString().replace(/'/g, "''")}'`;
      case 'boolean':
        return value ? 'TRUE' : 'FALSE';
      case 'number':
        return value.toString();
      case 'datetime':
        if (value === 'now') {
          return 'CURRENT_TIMESTAMP';
        }
        return `'${value}'`;
      default:
        return `'${value}'`;
    }
  }
  
  private generateForeignKeys(entity: CIREntity): string[] {
    const lines: string[] = [];
    const tableName = entity.tableName || this.toSnakeCase(entity.name);
    
    for (const relationName in entity.relations) {
      const relation = entity.relations[relationName];
      
      if (relation.type === 'manyToOne' || relation.type === 'oneToOne') {
        const fkColumn = relation.foreignKey || `${relation.name}_id`;
        const targetTable = this.toSnakeCase(relation.targetEntity);
        
        lines.push(
          `ALTER TABLE ${tableName} ADD CONSTRAINT fk_${tableName}_${relation.name} ` +
          `FOREIGN KEY (${fkColumn}) REFERENCES ${targetTable}(id)`
        );
      }
    }
    
    return lines;
  }
  
  private generateIndexes(entity: CIREntity): string[] {
    const lines: string[] = [];
    const tableName = entity.tableName || this.toSnakeCase(entity.name);
    
    // Create indexes for unique fields
    for (const fieldName in entity.fields) {
      const field = entity.fields[fieldName];
      if (field.constraints.unique && field.name !== entity.pk) {
        lines.push(`CREATE UNIQUE INDEX idx_${tableName}_${field.name} ON ${tableName}(${field.name});`);
      }
    }
    
    // Create indexes for foreign keys
    for (const relationName in entity.relations) {
      const relation = entity.relations[relationName];
      if (relation.type === 'manyToOne' || relation.type === 'oneToOne') {
        const fkColumn = relation.foreignKey || `${relation.name}_id`;
        lines.push(`CREATE INDEX idx_${tableName}_${fkColumn} ON ${tableName}(${fkColumn});`);
      }
    }
    
    return lines;
  }
  
  private toSnakeCase(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`).replace(/^_/, '');
  }
} 