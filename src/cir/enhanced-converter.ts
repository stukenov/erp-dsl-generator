import * as AST from '../types/ast.js';
import * as CIR from '../types/cir.js';

export class EnhancedCIRConverter {
  public convert(ast: AST.ERPDocument): CIR.CIRDocument {
    const cir: CIR.CIRDocument = {
      metadata: {
        name: ast.name,
        version: ast.version,
        schemaVersion: this.generateSchemaVersion(ast),
        generatedAt: new Date().toISOString(),
        sourceFiles: ['generated']
      },
      modules: {},
      conventionPacks: ast.packs.map(pack => pack.packName)
    };

    // Process modules or create default module
    if (ast.modules.length > 0) {
      for (const module of ast.modules) {
        cir.modules[module.name] = this.convertModule(module);
      }
    } else {
      // Create a default module for entities not in modules
      const mainModule = this.createMainModule(ast);
      cir.modules['Main'] = mainModule;
    }

    return cir;
  }

  private createMainModule(ast: AST.ERPDocument): CIR.CIRModule {
    const module: CIR.CIRModule = {
      name: 'Main',
      entities: {},
      actions: {},
      forms: {},
      roles: {}
    };

    // Convert top-level entities
    for (const entity of ast.entities) {
      module.entities[entity.name] = this.convertEntity(entity);
    }

    // Convert top-level actions
    for (const action of ast.actions) {
      module.actions[action.name] = this.convertAction(action);
    }

    // Convert top-level forms
    for (const form of ast.forms) {
      module.forms[form.name] = this.convertForm(form);
    }

    // Convert top-level roles
    for (const role of ast.roles) {
      module.roles[role.name] = this.convertRole(role);
    }

    return module;
  }

  private convertModule(module: AST.ModuleDeclaration): CIR.CIRModule {
    const cirModule: CIR.CIRModule = {
      name: module.name,
      entities: {},
      actions: {},
      forms: {},
      roles: {}
    };

    // Convert entities
    for (const entity of module.entities) {
      cirModule.entities[entity.name] = this.convertEntity(entity);
    }

    // Convert actions
    for (const action of module.actions) {
      cirModule.actions[action.name] = this.convertAction(action);
    }

    return cirModule;
  }

  private convertEntity(entity: AST.EntityDeclaration): CIR.CIREntity {
    const cirEntity: CIR.CIREntity = {
      name: entity.name,
      doc: entity.doc,
      pk: entity.pk || 'id',
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

    // Add default ID field if not explicitly defined
    const hasIdField = entity.fields.some(f => f.name === 'id');
    if (!hasIdField) {
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
    }

    // Convert fields
    for (const field of entity.fields) {
      const cirField = this.convertField(field);
      cirEntity.fields[field.name] = cirField;
    }

    // Convert relations
    for (const relation of entity.relations) {
      cirEntity.relations[relation.name] = this.convertRelation(relation);
    }

    // Add audit fields if not present
    this.addAuditFields(cirEntity, entity.fields);

    return cirEntity;
  }

  private convertField(field: AST.FieldDeclaration): CIR.CIRField {
    const cirField: CIR.CIRField = {
      name: field.name,
      type: this.convertFieldType(field.fieldType),
      constraints: this.convertFieldConstraints(field.fieldType, field.modifiers)
    };

    // Add field UI info from modifiers
    const uiInfo = this.extractUIInfo(field.modifiers);
    if (Object.keys(uiInfo).length > 0) {
      cirField.ui = uiInfo;
    }

    // Add field permissions from modifiers
    const permissions = this.extractFieldPermissions(field.modifiers);
    if (permissions) {
      cirField.permissions = permissions;
    }

    return cirField;
  }

  private convertFieldType(fieldType: AST.FieldType): CIR.CIRFieldType {
    const cirType: CIR.CIRFieldType = {
      baseType: this.mapBaseType(fieldType.name),
      subType: this.mapSubType(fieldType.name)
    };

    // Process type parameters
    for (const param of fieldType.parameters) {
      this.applyTypeParameter(cirType, param);
    }

    // Handle nullable
    if (fieldType.nullable) {
      // Will be handled in constraints
    }

    // Handle array types
    if (fieldType.array) {
      cirType.baseType = 'json'; // Store arrays as JSON for now
      cirType.subType = 'array';
    }

    return cirType;
  }

  private mapBaseType(typeName: string): CIR.CIRFieldType['baseType'] {
    const typeMap: Record<string, CIR.CIRFieldType['baseType']> = {
      'Text': 'string',
      'Email': 'string',
      'Phone': 'string',
      'Code': 'string',
      'Int': 'number',
      'Decimal': 'number',
      'Bool': 'boolean',
      'Date': 'date',
      'DateTime': 'datetime',
      'Money': 'number',
      'Json': 'json',
      'Enum': 'enum',
      'Address': 'struct'
    };

    return typeMap[typeName] || 'string';
  }

  private mapSubType(typeName: string): string | undefined {
    const subTypeMap: Record<string, string> = {
      'Text': 'text',
      'Email': 'email',
      'Phone': 'phone',
      'Code': 'code',
      'Int': 'integer',
      'Decimal': 'decimal',
      'Money': 'money',
      'Address': 'address'
    };

    return subTypeMap[typeName];
  }

  private applyTypeParameter(cirType: CIR.CIRFieldType, param: AST.FieldTypeParameter): void {
    if (!param.name) return;

    switch (param.name) {
      case 'precision':
        cirType.precision = param.value as number;
        break;
      case 'scale':
        cirType.scale = param.value as number;
        break;
      case 'values':
        cirType.enumValues = param.value as string[];
        break;
      case 'auto_seq':
        // Handle auto sequence patterns
        break;
    }
  }

  private convertFieldConstraints(fieldType: AST.FieldType, modifiers: AST.FieldModifier[]): CIR.CIRFieldConstraints {
    const constraints: CIR.CIRFieldConstraints = {
      required: false,
      unique: false,
      nullable: fieldType.nullable || false
    };

    // Apply modifiers
    for (const modifier of modifiers) {
      this.applyFieldModifier(constraints, modifier);
    }

    // Apply default constraints based on type
    this.applyDefaultConstraints(constraints, fieldType.name);

    return constraints;
  }

  private applyFieldModifier(constraints: CIR.CIRFieldConstraints, modifier: AST.FieldModifier): void {
    switch (modifier.name) {
      case 'required':
        constraints.required = true;
        constraints.nullable = false;
        break;
      case 'unique':
        constraints.unique = true;
        break;
      case 'min':
        constraints.min = modifier.value as number;
        break;
      case 'max':
        constraints.max = modifier.value as number;
        break;
      case 'pattern':
        constraints.pattern = modifier.value as string;
        break;
      case 'default':
        constraints.default = modifier.value;
        break;
      case 'auto_create':
      case 'auto_update':
        constraints.autoGenerate = modifier.name.replace('auto_', '') as any;
        break;
      case 'calc':
        // Mark as calculated field
        constraints.default = `calc:${modifier.value}`;
        break;
    }
  }

  private applyDefaultConstraints(constraints: CIR.CIRFieldConstraints, typeName: string): void {
    switch (typeName) {
      case 'Email':
        constraints.pattern = constraints.pattern || '^[^@]+@[^@]+\\.[^@]+$';
        break;
      case 'Phone':
        constraints.pattern = constraints.pattern || '^[+]?[0-9\\s\\-\\(\\)]+$';
        break;
      case 'Text':
        constraints.max = constraints.max || 255;
        break;
      case 'Money':
        constraints.min = constraints.min || 0;
        break;
      case 'Bool':
        constraints.default = constraints.default !== undefined ? constraints.default : false;
        break;
    }
  }

  private extractUIInfo(modifiers: AST.FieldModifier[]): CIR.CIRFieldUI {
    const ui: CIR.CIRFieldUI = {};

    for (const modifier of modifiers) {
      switch (modifier.name) {
        case 'label':
          ui.label = modifier.value as string;
          break;
        case 'placeholder':
          ui.placeholder = modifier.value as string;
          break;
        case 'help':
          ui.help = modifier.value as string;
          break;
        case 'widget':
          ui.widget = modifier.value as string;
          break;
        case 'i18n':
          ui.i18n = true;
          break;
      }
    }

    return ui;
  }

  private extractFieldPermissions(modifiers: AST.FieldModifier[]): CIR.CIRFieldPermissions | undefined {
    const permissions: CIR.CIRFieldPermissions = {
      read: [],
      write: []
    };

    let hasPermissions = false;

    for (const modifier of modifiers) {
      switch (modifier.name) {
        case 'read_roles':
          permissions.read = (modifier.value as string).split(',').map(s => s.trim());
          hasPermissions = true;
          break;
        case 'write_roles':
          permissions.write = (modifier.value as string).split(',').map(s => s.trim());
          hasPermissions = true;
          break;
        case 'mask':
          permissions.mask = modifier.value as string;
          hasPermissions = true;
          break;
      }
    }

    return hasPermissions ? permissions : undefined;
  }

  private convertRelation(relation: AST.RelationDeclaration): CIR.CIRRelation {
    const cirRelation: CIR.CIRRelation = {
      name: relation.name,
      targetEntity: relation.targetEntity,
      type: this.mapRelationType(relation.cardinality)
    };

    // Apply relation modifiers
    for (const modifier of relation.modifiers) {
      this.applyRelationModifier(cirRelation, modifier);
    }

    // Set default foreign key if not specified
    if (!cirRelation.foreignKey && cirRelation.type !== 'manyToMany') {
      if (cirRelation.type === 'manyToOne' || cirRelation.type === 'oneToOne') {
        cirRelation.foreignKey = `${relation.name}_id`;
      }
    }

    return cirRelation;
  }

  private mapRelationType(cardinality: AST.RelationDeclaration['cardinality']): CIR.CIRRelation['type'] {
    switch (cardinality) {
      case 'one':
        return 'manyToOne';
      case 'many':
        return 'oneToMany';
      case 'optional':
        return 'oneToOne';
      default:
        return 'manyToOne';
    }
  }

  private applyRelationModifier(relation: CIR.CIRRelation, modifier: AST.RelationModifier): void {
    switch (modifier.name) {
      case 'backref':
        relation.backref = modifier.value;
        break;
      case 'cascade':
        relation.cascade = true;
        break;
      case 'through':
        relation.throughTable = modifier.value;
        relation.type = 'manyToMany';
        break;
      case 'foreign_key':
        relation.foreignKey = modifier.value;
        break;
    }
  }

  private addAuditFields(entity: CIR.CIREntity, fields: AST.FieldDeclaration[]): void {
    const fieldNames = fields.map(f => f.name);
    
    if (!fieldNames.includes('created_at')) {
      entity.fields['created_at'] = {
        name: 'created_at',
        type: { baseType: 'datetime' },
        constraints: {
          required: true,
          nullable: false,
          unique: false,
          autoGenerate: 'timestamp'
        }
      };
    }

    if (!fieldNames.includes('updated_at')) {
      entity.fields['updated_at'] = {
        name: 'updated_at',
        type: { baseType: 'datetime' },
        constraints: {
          required: true,
          nullable: false,
          unique: false,
          autoGenerate: 'timestamp'
        }
      };
    }
  }

  private convertAction(action: AST.ActionDeclaration): CIR.CIRAction {
    const cirAction: CIR.CIRAction = {
      name: action.name,
      parameters: {},
      statements: [],
      permissions: ['Admin']
    };

    // Convert parameters
    for (const param of action.parameters) {
      cirAction.parameters[param.name] = {
        name: param.name,
        type: param.paramType,
        required: param.required !== false
      };
    }

    // Convert condition
    if (action.condition) {
      cirAction.condition = action.condition.expression;
    }

    // Convert statements
    for (const statement of action.body) {
      const cirStatement = this.convertStatement(statement);
      if (cirStatement) {
        cirAction.statements.push(cirStatement);
      }
    }

    return cirAction;
  }

  private convertStatement(statement: AST.StatementNode): CIR.CIRStatement | null {
    switch (statement.type) {
      case 'AssignmentStatement':
        return {
          type: 'assignment',
          target: statement.target,
          value: statement.value
        };
      case 'EmitStatement':
        return {
          type: 'emit',
          event: statement.event,
          parameters: statement.parameters ? this.parseParameters(statement.parameters) : {}
        };
      case 'CallStatement':
        return {
          type: 'call',
          function: statement.target,
          parameters: statement.parameters ? this.parseParameters(statement.parameters) : {}
        };
      case 'TransitionStatement':
        return {
          type: 'assignment',
          target: statement.field,
          value: statement.toState
        };
      default:
        return null;
    }
  }

  private parseParameters(params: string[]): Record<string, any> {
    const result: Record<string, any> = {};
    // Simple parameter parsing - can be enhanced
    for (let i = 0; i < params.length; i++) {
      result[`param${i}`] = params[i];
    }
    return result;
  }

  private convertForm(form: AST.FormDeclaration): CIR.CIRForm {
    const cirForm: CIR.CIRForm = {
      name: form.name,
      entityName: form.entityName,
      layout: (form.layout as any) || 'single',
      groups: [],
      permissions: ['Admin', 'User']
    };

    // Convert form groups
    for (const group of form.groups) {
      cirForm.groups.push({
        name: group.name,
        fields: group.fields,
        collapsible: group.collapsible,
        defaultExpanded: !group.collapsible
      });
    }

    return cirForm;
  }

  private convertRole(role: AST.RoleDeclaration): CIR.CIRRole {
    const grants: CIR.CIRGrant[] = [];

    // Parse permissions and entities
    const permissions = role.permissions.includes('*') 
      ? ['create', 'read', 'update', 'delete'] as const
      : role.permissions as any;

    const entities = role.entities.includes('*') ? ['*'] : role.entities;

    grants.push({
      permissions,
      entities,
      fields: [],
      exceptions: role.exceptFields || []
    });

    return {
      name: role.name,
      grants,
      inherits: []
    };
  }

  private toSnakeCase(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`).replace(/^_/, '');
  }

  private generateSchemaVersion(ast: AST.ERPDocument): string {
    // Generate hash based on AST content
    const content = JSON.stringify(ast);
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }
} 