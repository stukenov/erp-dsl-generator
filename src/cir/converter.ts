import { SimpleDocument, SimpleEntity, SimpleField, SimpleAction, SimpleRole, SimpleModule } from '../parser/simple-ast-builder.js';
import { CIRDocument, CIREntity, CIRField, CIRAction, CIRRole } from '../types/cir.js';

export class CIRConverter {
  public convert(ast: SimpleDocument): CIRDocument {
    const cir: CIRDocument = {
      metadata: {
        name: ast.name,
        version: ast.version,
        schemaVersion: this.generateSchemaVersion(ast),
        generatedAt: new Date().toISOString(),
        sourceFiles: ['generated']
      },
      modules: {},
      conventionPacks: ast.packs
    };

    // Create a single module for all entities (simplified)
    const mainModule = {
      name: 'Main',
      entities: {} as Record<string, any>,
      actions: {} as Record<string, any>,
      forms: {} as Record<string, any>,
      roles: {} as Record<string, any>
    };

    // Convert entities from top-level
    for (const entity of ast.entities) {
      mainModule.entities[entity.name] = this.convertEntity(entity);
    }

    // Convert actions from top-level
    for (const action of ast.actions) {
      mainModule.actions[action.name] = this.convertAction(action);
    }

    // Convert roles from top-level
    for (const role of ast.roles) {
      mainModule.roles[role.name] = this.convertRole(role);
    }

    // Convert modules
    for (const module of ast.modules) {
      const cirModule = this.convertModule(module);
      cir.modules[module.name] = cirModule;
    }

    // Only add main module if it has content
    if (Object.keys(mainModule.entities).length > 0 || 
        Object.keys(mainModule.actions).length > 0 || 
        Object.keys(mainModule.roles).length > 0) {
      cir.modules['Main'] = mainModule;
    }

    return cir;
  }

  private convertEntity(entity: SimpleEntity): CIREntity {
    const cirEntity: CIREntity = {
      name: entity.name,
      doc: entity.doc,
      pk: 'id', // Default primary key
      tableName: this.toSnakeCase(entity.name),
      fields: {},
      relations: {},
      attributes: {},
      audit: {
        enabled: true,
        createdAtField: 'created_at',
        updatedAtField: 'updated_at'
      },
      permissions: {
        create: ['Admin'],
        read: ['Admin', 'User'],
        update: ['Admin'],
        delete: ['Admin']
      }
    };

    // Add default ID field
    cirEntity.fields['id'] = {
      name: 'id',
      type: {
        baseType: 'uuid',
        subType: 'uuid'
      },
      constraints: {
        required: true,
        unique: true,
        nullable: false,
        autoGenerate: 'uuid'
      }
    };

    // Convert fields
    for (const field of entity.fields) {
      const cirField = this.convertField(field);
      
      // Check if this is a relation (field type is another entity)
      if (this.isRelationType(field.fieldType)) {
        cirEntity.relations[field.name] = {
          name: field.name,
          targetEntity: field.fieldType,
          type: 'manyToOne',
          foreignKey: `${field.name}_id`
        };
      } else {
        cirEntity.fields[field.name] = cirField;
      }
    }

    // Add audit fields
    cirEntity.fields['created_at'] = {
      name: 'created_at',
      type: { baseType: 'datetime' },
      constraints: {
        required: true,
        nullable: false,
        unique: false,
        autoGenerate: 'timestamp'
      }
    };

    cirEntity.fields['updated_at'] = {
      name: 'updated_at',
      type: { baseType: 'datetime' },
      constraints: {
        required: true,
        nullable: false,
        unique: false,
        autoGenerate: 'timestamp'
      }
    };

    return cirEntity;
  }

  private convertField(field: SimpleField): CIRField {
    const cirField: CIRField = {
      name: field.name,
      type: this.convertFieldType(field.fieldType),
      constraints: this.getDefaultConstraints(field.fieldType)
    };

    return cirField;
  }

  private convertFieldType(fieldType: string): any {
    const typeMap: Record<string, any> = {
      'Text': { baseType: 'string', subType: 'text' },
      'Email': { baseType: 'string', subType: 'email' },
      'Phone': { baseType: 'string', subType: 'phone' },
      'Int': { baseType: 'number', subType: 'integer' },
      'Bool': { baseType: 'boolean' },
      'Date': { baseType: 'date' },
      'DateTime': { baseType: 'datetime' },
      'Money': { baseType: 'number', subType: 'decimal', precision: 12, scale: 2 },
      'Enum': { baseType: 'enum', enumValues: [] }
    };

    return typeMap[fieldType] || { baseType: 'string', subType: 'text' };
  }

  private getDefaultConstraints(fieldType: string): any {
    const constraintMap: Record<string, any> = {
      'Text': { required: false, nullable: true, unique: false, max: 255 },
      'Email': { required: false, nullable: true, unique: false, pattern: '^[^@]+@[^@]+\\.[^@]+$' },
      'Phone': { required: false, nullable: true, unique: false },
      'Int': { required: false, nullable: true, unique: false },
      'Bool': { required: false, nullable: true, unique: false, default: false },
      'Date': { required: false, nullable: true, unique: false },
      'DateTime': { required: false, nullable: true, unique: false },
      'Money': { required: false, nullable: true, unique: false, min: 0 },
      'Enum': { required: false, nullable: true, unique: false }
    };

    return constraintMap[fieldType] || { required: false, nullable: true, unique: false };
  }

  private convertAction(action: SimpleAction): CIRAction {
    const cirAction: CIRAction = {
      name: action.name,
      parameters: {},
      statements: [],
      permissions: ['Admin']
    };

    // Convert statements
    for (const statement of action.statements) {
      const cirStatement: any = {
        type: statement.type === 'EmitStatement' ? 'emit' : 'call',
        target: statement.target
      };

      if (statement.type === 'EmitStatement') {
        cirStatement.event = statement.target;
      } else {
        cirStatement.function = statement.target;
      }

      cirAction.statements.push(cirStatement);
    }

    return cirAction;
  }

  private convertRole(role: SimpleRole): CIRRole {
    const permissions: any[] = [];
    
    // Parse permission string
    const permissionMap: Record<string, string[]> = {
      'all': ['create', 'read', 'update', 'delete'],
      'read': ['read'],
      'write': ['create', 'update'],
      'admin': ['create', 'read', 'update', 'delete']
    };

    const perms = permissionMap[role.permission] || [role.permission];

    permissions.push({
      permissions: perms,
      entities: [role.target],
      fields: [],
      exceptions: []
    });

    return {
      name: role.name,
      grants: permissions,
      inherits: []
    };
  }

  private isRelationType(fieldType: string): boolean {
    // Check if field type is a known data type or a custom entity
    const knownTypes = ['Text', 'Email', 'Phone', 'Int', 'Bool', 'Date', 'DateTime', 'Money', 'Enum'];
    return !knownTypes.includes(fieldType);
  }

  private toSnakeCase(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`).replace(/^_/, '');
  }

  private convertModule(module: SimpleModule): any {
    const cirModule = {
      name: module.name,
      doc: module.doc,
      entities: {} as Record<string, any>,
      actions: {} as Record<string, any>,
      forms: {} as Record<string, any>,
      roles: {} as Record<string, any>
    };

    // Convert module entities
    for (const entity of module.entities) {
      cirModule.entities[entity.name] = this.convertEntity(entity);
    }

    // Convert module actions
    for (const action of module.actions) {
      cirModule.actions[action.name] = this.convertAction(action);
    }

    return cirModule;
  }

  private generateSchemaVersion(ast: SimpleDocument): string {
    // Simple hash based on content
    const content = JSON.stringify({
      entities: ast.entities.map(e => ({ name: e.name, fields: e.fields.length })),
      actions: ast.actions.map(a => ({ name: a.name })),
      modules: ast.modules.map(m => ({ name: m.name, entities: m.entities.length }))
    });
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }
} 