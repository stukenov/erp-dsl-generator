import { ICstVisitor, CstNode, IToken } from 'chevrotain';
import { folderParser } from './folder-parser.js';
import { 
  ERPDocument, Entity, Field, Action, Role, Module, Form,
  FieldType, FieldModifier, ActionStatement, Permission
} from '../types/ast.js';

const BaseCstVisitor = folderParser.getBaseCstVisitorConstructor();

export class FolderASTBuilder extends BaseCstVisitor implements ICstVisitor<any, any> {
  constructor() {
    super();
    this.validateVisitor();
  }

  buildDocument(cst: CstNode): ERPDocument {
    return this.visit(cst);
  }

  erpDocument(ctx: any): ERPDocument {
    if (ctx.fullDocument) {
      return this.visit(ctx.fullDocument);
    } else if (ctx.moduleOnly) {
      const moduleResult = this.visit(ctx.moduleOnly);
      return {
        name: 'ModuleFile',
        version: '1.0',
        packs: [],
        entities: [],
        actions: [],
        roles: moduleResult.roles || [],
        forms: [],
        modules: [moduleResult.module]
      };
    } else if (ctx.entitiesOnly) {
      return this.visit(ctx.entitiesOnly);
    }
    
    // Fallback
    return {
      name: 'Unknown',
      version: '1.0',
      packs: [],
      entities: [],
      actions: [],
      roles: [],
      forms: [],
      modules: []
    };
  }

  fullDocument(ctx: any): ERPDocument {
    const name = ctx.name?.[0]?.image || 'Unknown';
    const version = ctx.version?.[0]?.image || '1.0';
    
    const result: ERPDocument = {
      name,
      version,
      packs: [],
      entities: [],
      actions: [],
      roles: [],
      forms: [],
      modules: []
    };

    // Process all children
    if (ctx.usePackDeclaration) {
      result.packs = ctx.usePackDeclaration.map((pack: any) => this.visit(pack));
    }
    
    if (ctx.moduleDeclaration) {
      result.modules = ctx.moduleDeclaration.map((module: any) => this.visit(module));
    }
    
    if (ctx.entityDeclaration) {
      result.entities = ctx.entityDeclaration.map((entity: any) => this.visit(entity));
    }
    
    if (ctx.simpleAction) {
      result.actions = ctx.simpleAction.map((action: any) => this.visit(action));
    }
    
    if (ctx.roleDeclaration) {
      result.roles = ctx.roleDeclaration.map((role: any) => this.visit(role));
    }

    return result;
  }

  moduleOnly(ctx: any): { module: Module, roles: Role[] } {
    const module = this.visit(ctx.moduleDeclaration);
    const roles = ctx.roleDeclaration ? ctx.roleDeclaration.map((role: any) => this.visit(role)) : [];
    
    return { module, roles };
  }

  entitiesOnly(ctx: any): ERPDocument {
    const result: ERPDocument = {
      name: 'EntitiesFile',
      version: '1.0',
      packs: [],
      entities: [],
      actions: [],
      roles: [],
      forms: [],
      modules: []
    };

    if (ctx.usePackDeclaration) {
      result.packs = ctx.usePackDeclaration.map((pack: any) => this.visit(pack));
    }
    
    if (ctx.entityDeclaration) {
      result.entities = ctx.entityDeclaration.map((entity: any) => this.visit(entity));
    }
    
    if (ctx.simpleAction) {
      result.actions = ctx.simpleAction.map((action: any) => this.visit(action));
    }
    
    if (ctx.roleDeclaration) {
      result.roles = ctx.roleDeclaration.map((role: any) => this.visit(role));
    }

    return result;
  }

  usePackDeclaration(ctx: any): string {
    return ctx.packName?.[0]?.image || '';
  }

  moduleDeclaration(ctx: any): Module {
    const name = ctx.name?.[0]?.image || 'Unknown';
    let doc = '';
    
    const module: Module = {
      name,
      doc,
      entities: [],
      actions: [],
      forms: []
    };

    // Process module contents
    if (ctx.docDeclaration) {
      const docDecl = ctx.docDeclaration[0];
      if (docDecl) {
        const docResult = this.visit(docDecl);
        module.doc = docResult;
      }
    }
    
    if (ctx.entityDeclaration) {
      module.entities = ctx.entityDeclaration.map((entity: any) => this.visit(entity));
    }
    
    if (ctx.simpleAction) {
      module.actions = ctx.simpleAction.map((action: any) => this.visit(action));
    }
    
    if (ctx.formDeclaration) {
      module.forms = ctx.formDeclaration.map((form: any) => this.visit(form));
    }

    return module;
  }

  docDeclaration(ctx: any): string {
    const value = ctx.value?.[0]?.image || '';
    // Remove quotes
    return value.replace(/^["']|["']$/g, '');
  }

  entityDeclaration(ctx: any): Entity {
    const name = ctx.name?.[0]?.image || 'Unknown';
    
    const entity: Entity = {
      name,
      doc: '',
      pk: 'id',
      fields: []
    };

    // Process entity contents
    if (ctx.docDeclaration) {
      const docDecl = ctx.docDeclaration[0];
      if (docDecl) {
        entity.doc = this.visit(docDecl);
      }
    }
    
    if (ctx.pkDeclaration) {
      const pkDecl = ctx.pkDeclaration[0];
      if (pkDecl) {
        entity.pk = this.visit(pkDecl);
      }
    }
    
    if (ctx.fieldDeclaration) {
      entity.fields = ctx.fieldDeclaration.map((field: any) => this.visit(field));
    }

    return entity;
  }

  pkDeclaration(ctx: any): string {
    return ctx.value?.[0]?.image || 'id';
  }

  fieldDeclaration(ctx: any): Field {
    const name = ctx.name?.[0]?.image || 'unknown';
    const type = this.visit(ctx.fieldType);
    
    const field: Field = {
      name,
      type,
      modifiers: [],
      nullable: false,
      defaultValue: null
    };

    if (ctx.fieldModifiers) {
      const modifiers = this.visit(ctx.fieldModifiers);
      field.modifiers = modifiers.modifiers || [];
      field.nullable = modifiers.nullable || false;
      field.defaultValue = modifiers.defaultValue || null;
    }

    return field;
  }

  fieldType(ctx: any): FieldType {
    if (ctx.Text) return { name: 'Text', args: [] };
    if (ctx.Email) return { name: 'Email', args: [] };
    if (ctx.Phone) return { name: 'Phone', args: [] };
    if (ctx.Int) return { name: 'Int', args: [] };
    if (ctx.Bool) return { name: 'Bool', args: [] };
    if (ctx.Date) return { name: 'Date', args: [] };
    if (ctx.DateTime) return { name: 'DateTime', args: [] };
    if (ctx.Money) return { name: 'Money', args: [] };
    if (ctx.Decimal) return { name: 'Decimal', args: [] };
    
    if (ctx.enumType) {
      return this.visit(ctx.enumType);
    }
    
    if (ctx.codeType) {
      return this.visit(ctx.codeType);
    }
    
    if (ctx.relationshipType) {
      return this.visit(ctx.relationshipType);
    }
    
    if (ctx.Identifier) {
      return { name: ctx.Identifier[0].image, args: [] };
    }
    
    if (ctx.QualifiedIdentifier) {
      return { name: ctx.QualifiedIdentifier[0].image, args: [] };
    }

    return { name: 'Unknown', args: [] };
  }

  enumType(ctx: any): FieldType {
    const options = [ctx.first[0].image];
    if (ctx.option) {
      options.push(...ctx.option.map((opt: IToken) => opt.image));
    }
    
    const args = [options.join(',')];
    if (ctx.default) {
      args.push(`default=${ctx.default[0].image}`);
    }
    
    return { name: 'Enum', args };
  }

  codeType(ctx: any): FieldType {
    const args: string[] = [];
    
    if (ctx.codeModifier) {
      const modifiers = ctx.codeModifier.map((mod: any) => this.visit(mod));
      args.push(...modifiers);
    }
    
    return { name: 'Code', args };
  }

  codeModifier(ctx: any): string {
    if (ctx.key && ctx.value) {
      const key = ctx.key[0].image;
      const value = ctx.value[0].image.replace(/^["']|["']$/g, '');
      return `${key}=${value}`;
    }
    
    if (ctx.flag) {
      return ctx.flag[0].image;
    }
    
    return '';
  }

  relationshipType(ctx: any): FieldType {
    const entityName = ctx.entityName[0].image;
    const args = [entityName];
    
    if (ctx.cardinality) {
      args.push(`cardinality=${ctx.cardinality[0].image}`);
    }
    
    if (ctx.modifier) {
      args.push(...ctx.modifier.map((mod: IToken) => mod.image));
    }
    
    if (ctx.Star) {
      args.push('many');
    }
    
    if (ctx.Question) {
      args.push('optional');
    }
    
    return { name: 'Relationship', args };
  }

  fieldModifiers(ctx: any): { modifiers: FieldModifier[], nullable: boolean, defaultValue: any } {
    const result = {
      modifiers: [] as FieldModifier[],
      nullable: false,
      defaultValue: null
    };
    
    if (ctx.fieldModifier) {
      result.modifiers = ctx.fieldModifier.map((mod: any) => this.visit(mod));
    }
    
    if (ctx.defaultValue) {
      result.defaultValue = this.visit(ctx.defaultValue);
    }
    
    if (ctx.Question) {
      result.nullable = true;
    }
    
    return result;
  }

  fieldModifier(ctx: any): FieldModifier {
    if (ctx.flag) {
      return { name: ctx.flag[0].image, value: true };
    }
    
    if (ctx.key) {
      const key = ctx.key[0].image;
      let value: any = true;
      
      if (ctx.numValue) {
        value = parseInt(ctx.numValue[0].image);
      } else if (ctx.strValue) {
        value = ctx.strValue[0].image.replace(/^["']|["']$/g, '');
      } else if (ctx.idValue) {
        value = ctx.idValue[0].image;
      }
      
      return { name: key, value };
    }
    
    return { name: 'unknown', value: true };
  }

  defaultValue(ctx: any): any {
    if (ctx.NumberLiteral) {
      const num = ctx.NumberLiteral[0].image;
      return num.includes('.') ? parseFloat(num) : parseInt(num);
    }
    
    if (ctx.StringLiteral) {
      return ctx.StringLiteral[0].image.replace(/^["']|["']$/g, '');
    }
    
    if (ctx.Identifier) {
      return ctx.Identifier[0].image;
    }
    
    if (ctx.True) return true;
    if (ctx.False) return false;
    
    return null;
  }

  simpleAction(ctx: any): Action {
    const name = ctx.name?.[0]?.image || 'unknown';
    
    const action: Action = {
      name,
      parameters: [],
      condition: null,
      statements: []
    };

    if (ctx.parameterList) {
      action.parameters = this.visit(ctx.parameterList);
    }
    
    if (ctx.simpleExpression) {
      action.condition = this.visit(ctx.simpleExpression);
    }
    
    if (ctx.actionStatement) {
      action.statements = ctx.actionStatement.map((stmt: any) => this.visit(stmt));
    }

    return action;
  }

  parameterList(ctx: any): Array<{name: string, type: string}> {
    const params = [];
    
    if (ctx.paramName && ctx.paramType) {
      for (let i = 0; i < ctx.paramName.length; i++) {
        params.push({
          name: ctx.paramName[i].image,
          type: ctx.paramType[i].image
        });
      }
    }
    
    return params;
  }

  simpleExpression(ctx: any): string {
    const left = ctx.left?.[0]?.image || '';
    const property = ctx.property?.[0]?.image || '';
    const value = ctx.value?.[0]?.image?.replace(/^["']|["']$/g, '') || '';
    
    return `${left}.${property} == "${value}"`;
  }

  actionStatement(ctx: any): ActionStatement {
    if (ctx.assignment) {
      return this.visit(ctx.assignment);
    }
    
    if (ctx.emitStatement) {
      return this.visit(ctx.emitStatement);
    }
    
    if (ctx.callStatement) {
      return this.visit(ctx.callStatement);
    }
    
    return { type: 'unknown', content: '' };
  }

  assignment(ctx: any): ActionStatement {
    const target = ctx.target?.[0]?.image || '';
    const property = ctx.property?.[0]?.image || '';
    const value = this.visit(ctx.defaultValue);
    
    return {
      type: 'assignment',
      content: `${target}.${property} = ${JSON.stringify(value)}`
    };
  }

  emitStatement(ctx: any): ActionStatement {
    const eventName = ctx.eventName?.[0]?.image || '';
    let param = '';
    
    if (ctx.param && ctx.property) {
      param = `${ctx.param[0].image}.${ctx.property[0].image}`;
    }
    
    return {
      type: 'emit',
      content: `emit ${eventName}(${param})`
    };
  }

  callStatement(ctx: any): ActionStatement {
    const service = ctx.service?.[0]?.image || '';
    const method = ctx.method?.[0]?.image || '';
    
    return {
      type: 'call',
      content: `call ${service}.${method}`
    };
  }

  formDeclaration(ctx: any): Form {
    const name = ctx.name?.[0]?.image || 'unknown';
    const entity = ctx.entity?.[0]?.image || 'unknown';
    const layout = ctx.layoutType?.[0]?.image || 'default';
    
    const form: Form = {
      name,
      entity,
      layout,
      groups: []
    };

    if (ctx.formGroup) {
      form.groups = ctx.formGroup.map((group: any) => this.visit(group));
    }

    return form;
  }

  formGroup(ctx: any): { title: string, fields: string[], modifier?: string } {
    const title = ctx.title?.[0]?.image?.replace(/^["']|["']$/g, '') || '';
    const modifier = ctx.modifier?.[0]?.image;
    const fields = ctx.field ? ctx.field.map((f: IToken) => f.image) : [];
    
    const group: any = { title, fields };
    if (modifier) {
      group.modifier = modifier;
    }
    
    return group;
  }

  roleDeclaration(ctx: any): Role {
    const name = ctx.name?.[0]?.image || 'unknown';
    const permissions = this.visit(ctx.permissions);
    
    return {
      name,
      permissions
    };
  }

  permissions(ctx: any): Permission[] {
    if (ctx.All && ctx.Star) {
      return [{ type: 'all', entities: ['*'], actions: ['*'] }];
    }
    
    const permissionList = this.visit(ctx.permissionList);
    const entityList = this.visit(ctx.entityList);
    
    return [{
      type: 'specific',
      entities: entityList,
      actions: permissionList
    }];
  }

  permissionList(ctx: any): string[] {
    const permissions = [];
    
    if (ctx.permission) {
      permissions.push(...ctx.permission.map((p: IToken) => p.image));
    }
    
    if (ctx.Crud) permissions.push('crud');
    if (ctx.Read) permissions.push('read');
    if (ctx.Create) permissions.push('create');
    if (ctx.Update) permissions.push('update');
    
    return permissions;
  }

  entityList(ctx: any): string[] {
    return ctx.entity ? ctx.entity.map((e: IToken) => e.image) : [];
  }
} 