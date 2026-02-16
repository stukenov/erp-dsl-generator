import { ICstVisitor, CstNode, IToken } from 'chevrotain';
import { simpleFolderParser } from './simple-folder-parser.js';
import { 
  ERPDocument, Entity, Field, Role, Module,
  FieldType, FieldModifier, Permission
} from '../types/ast.js';

const BaseCstVisitor = simpleFolderParser.getBaseCstVisitorConstructor();

export class SimpleFolderASTBuilder extends BaseCstVisitor implements ICstVisitor<any, any> {
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

    if (ctx.usePackDeclaration) {
      result.packs = ctx.usePackDeclaration.map((pack: any) => this.visit(pack));
    }
    
    if (ctx.moduleDeclaration) {
      result.modules = ctx.moduleDeclaration.map((module: any) => this.visit(module));
    }
    
    if (ctx.entityDeclaration) {
      result.entities = ctx.entityDeclaration.map((entity: any) => this.visit(entity));
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

    return module;
  }

  docDeclaration(ctx: any): string {
    const value = ctx.value?.[0]?.image || '';
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
    
    if (ctx.simpleEnum) {
      return { name: 'Enum', args: ['Unknown'] };
    }
    
    if (ctx.simpleCode) {
      return { name: 'Code', args: [] };
    }
    
    if (ctx.relationshipType) {
      return this.visit(ctx.relationshipType);
    }
    
    if (ctx.Identifier) {
      return { name: ctx.Identifier[0].image, args: [] };
    }

    return { name: 'Unknown', args: [] };
  }

  simpleEnum(ctx: any): FieldType {
    return { name: 'Enum', args: ['Unknown'] };
  }

  simpleCode(ctx: any): FieldType {
    return { name: 'Code', args: [] };
  }

  relationshipType(ctx: any): FieldType {
    const entityName = ctx.entityName[0].image;
    const args = [entityName];
    
    if (ctx.cardinality) {
      args.push(`cardinality=${ctx.cardinality[0].image}`);
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
    
    if (ctx.modifier) {
      result.modifiers = ctx.modifier.map((mod: IToken) => ({
        name: mod.image,
        value: true
      }));
    }
    
    if (ctx.defaultValue) {
      result.defaultValue = this.visit(ctx.defaultValue);
    }
    
    if (ctx.Question) {
      result.nullable = true;
    }
    
    return result;
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
    
    return null;
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
    if (ctx.allOrPermission && ctx.Star) {
      const perm = ctx.allOrPermission[0].image;
      if (perm === 'all' || perm === '*') {
        return [{ type: 'all', entities: ['*'], actions: ['*'] }];
      }
    }
    
    const permissionList = ctx.permissionList ? this.visit(ctx.permissionList) : ['read'];
    const entityList = ctx.entityList ? this.visit(ctx.entityList) : ['*'];
    
    return [{
      type: 'specific',
      entities: entityList,
      actions: permissionList
    }];
  }

  permissionList(ctx: any): string[] {
    return ctx.permission ? ctx.permission.map((p: IToken) => p.image) : ['read'];
  }

  entityList(ctx: any): string[] {
    return ctx.entity ? ctx.entity.map((e: IToken) => e.image) : ['*'];
  }
} 