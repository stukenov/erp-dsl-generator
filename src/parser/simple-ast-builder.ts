import { CstNode, CstChildrenDictionary, IToken } from 'chevrotain';

// Упрощенные типы AST
export interface SimpleDocument {
  type: 'Document';
  name: string;
  version: string;
  packs: string[];
  entities: SimpleEntity[];
  actions: SimpleAction[];
  roles: SimpleRole[];
  modules: SimpleModule[];
}

export interface SimpleModule {
  type: 'Module';
  name: string;
  doc?: string;
  entities: SimpleEntity[];
  actions: SimpleAction[];
}

export interface SimpleEntity {
  type: 'Entity';
  name: string;
  doc?: string;
  pk?: string;
  fields: SimpleField[];
}

export interface SimpleField {
  type: 'Field';
  name: string;
  fieldType: string;
}

export interface SimpleAction {
  type: 'Action';
  name: string;
  statements: SimpleStatement[];
}

export interface SimpleStatement {
  type: 'EmitStatement' | 'CallStatement';
  target: string;
}

export interface SimpleRole {
  type: 'Role';
  name: string;
  permission: string;
  target: string;
}

export class SimpleASTBuilder {
  public buildDocument(cst: CstNode): SimpleDocument {
    const children = cst.children as CstChildrenDictionary;
    
    // Проверяем тип документа
    if (children.fullDocument) {
      return this.buildFullDocument(children.fullDocument[0] as CstNode);
    } else if (children.moduleDocument) {
      return this.buildModuleDocument(children.moduleDocument[0] as CstNode);
    } else if (children.entitiesDocument) {
      return this.buildEntitiesDocument(children.entitiesDocument[0] as CstNode);
    }
    
    // Fallback для старого формата
    return this.buildLegacyDocument(cst);
  }

  private buildFullDocument(cst: CstNode): SimpleDocument {
    const children = cst.children as CstChildrenDictionary;
    
    const name = this.getTokenValue(children.name?.[0]);
    const version = this.getTokenValue(children.version?.[0]);
    
    const packs: string[] = [];
    const entities: SimpleEntity[] = [];
    const actions: SimpleAction[] = [];
    const roles: SimpleRole[] = [];
    const modules: SimpleModule[] = [];
    
    // Process use pack declarations
    if (children.usePackDeclaration) {
      for (const node of children.usePackDeclaration) {
        if (this.isCstNode(node)) {
          packs.push(this.buildUsePackDeclaration(node));
        }
      }
    }
    
    // Process entity declarations
    if (children.entityDeclaration) {
      for (const node of children.entityDeclaration) {
        if (this.isCstNode(node)) {
          entities.push(this.buildEntityDeclaration(node));
        }
      }
    }
    
    // Process action declarations
    if (children.simpleAction) {
      for (const node of children.simpleAction) {
        if (this.isCstNode(node)) {
          actions.push(this.buildSimpleAction(node));
        }
      }
    }
    
    // Process module declarations
    if (children.moduleDeclaration) {
      for (const node of children.moduleDeclaration) {
        if (this.isCstNode(node)) {
          modules.push(this.buildModuleDeclaration(node));
        }
      }
    }
    
    // Process entity declarations
    if (children.entityDeclaration) {
      for (const node of children.entityDeclaration) {
        if (this.isCstNode(node)) {
          entities.push(this.buildEntityDeclaration(node));
        }
      }
    }
    
    // Process action declarations
    if (children.simpleAction) {
      for (const node of children.simpleAction) {
        if (this.isCstNode(node)) {
          actions.push(this.buildSimpleAction(node));
        }
      }
    }
    
    // Process role declarations
    if (children.roleDeclaration) {
      for (const node of children.roleDeclaration) {
        if (this.isCstNode(node)) {
          roles.push(this.buildRoleDeclaration(node));
        }
      }
    }
    
    return {
      type: 'Document',
      name,
      version,
      packs,
      entities,
      actions,
      roles,
      modules
    };
  }

  private buildModuleDocument(cst: CstNode): SimpleDocument {
    const children = cst.children as CstChildrenDictionary;
    
    const module = this.buildModuleDeclaration(children.moduleDeclaration[0] as CstNode);
    const roles: SimpleRole[] = [];
    
    // Process role declarations
    if (children.roleDeclaration) {
      for (const node of children.roleDeclaration) {
        if (this.isCstNode(node)) {
          roles.push(this.buildRoleDeclaration(node));
        }
      }
    }
    
    return {
      type: 'Document',
      name: 'ModuleFile',
      version: '1.0',
      packs: [],
      entities: [],
      actions: [],
      roles,
      modules: [module]
    };
  }

  private buildEntitiesDocument(cst: CstNode): SimpleDocument {
    const children = cst.children as CstChildrenDictionary;
    
    const packs: string[] = [];
    const entities: SimpleEntity[] = [];
    const actions: SimpleAction[] = [];
    const roles: SimpleRole[] = [];
    
    // Process use pack declarations
    if (children.usePackDeclaration) {
      for (const node of children.usePackDeclaration) {
        if (this.isCstNode(node)) {
          packs.push(this.buildUsePackDeclaration(node));
        }
      }
    }
    
    // Process entity declarations
    if (children.entityDeclaration) {
      for (const node of children.entityDeclaration) {
        if (this.isCstNode(node)) {
          entities.push(this.buildEntityDeclaration(node));
        }
      }
    }
    
    // Process action declarations
    if (children.simpleAction) {
      for (const node of children.simpleAction) {
        if (this.isCstNode(node)) {
          actions.push(this.buildSimpleAction(node));
        }
      }
    }
    
    // Process role declarations
    if (children.roleDeclaration) {
      for (const node of children.roleDeclaration) {
        if (this.isCstNode(node)) {
          roles.push(this.buildRoleDeclaration(node));
        }
      }
    }
    
    return {
      type: 'Document',
      name: 'EntitiesFile',
      version: '1.0',
      packs,
      entities,
      actions,
      roles,
      modules: []
    };
  }

  private buildLegacyDocument(cst: CstNode): SimpleDocument {
    const children = cst.children as CstChildrenDictionary;
    
    const name = this.getTokenValue(children.name?.[0]);
    const version = this.getTokenValue(children.version?.[0]);
    
    const packs: string[] = [];
    const entities: SimpleEntity[] = [];
    const actions: SimpleAction[] = [];
    const roles: SimpleRole[] = [];
    
    // Process legacy format...
    return {
      type: 'Document',
      name,
      version,
      packs,
      entities,
      actions,
      roles,
      modules: []
    };
  }

  private buildModuleDeclaration(cst: CstNode): SimpleModule {
    const children = cst.children as CstChildrenDictionary;
    
    const name = this.getTokenValue(children.name?.[0]);
    let doc = '';
    const entities: SimpleEntity[] = [];
    const actions: SimpleAction[] = [];
    
    // Process doc declaration
    if (children.docDeclaration) {
      doc = this.buildDocDeclaration(children.docDeclaration[0] as CstNode);
    }
    
    // Process entity declarations
    if (children.entityDeclaration) {
      for (const node of children.entityDeclaration) {
        if (this.isCstNode(node)) {
          entities.push(this.buildEntityDeclaration(node));
        }
      }
    }
    
    // Process action declarations
    if (children.simpleAction) {
      for (const node of children.simpleAction) {
        if (this.isCstNode(node)) {
          actions.push(this.buildSimpleAction(node));
        }
      }
    }
    
    return {
      type: 'Module',
      name,
      doc,
      entities,
      actions
    };
  }

  private buildDocDeclaration(cst: CstNode): string {
    const children = cst.children as CstChildrenDictionary;
    const value = this.getTokenValue(children.value?.[0]);
    return value ? value.replace(/^["']|["']$/g, '') : '';
  }
  
  private buildUsePackDeclaration(cst: CstNode): string {
    const children = cst.children as CstChildrenDictionary;
    return this.getTokenValue(children.packName?.[0]);
  }
  
  private buildEntityDeclaration(cst: CstNode): SimpleEntity {
    const children = cst.children as CstChildrenDictionary;
    const name = this.getTokenValue(children.name?.[0]);
    
    let doc: string | undefined;
    let pk: string | undefined;
    const fields: SimpleField[] = [];
    
    // Process doc attribute
    if (children.docAttribute) {
      for (const node of children.docAttribute) {
        if (this.isCstNode(node)) {
          doc = this.buildDocAttribute(node);
        }
      }
    }
    
    // Process pk attribute
    if (children.pkAttribute) {
      for (const node of children.pkAttribute) {
        if (this.isCstNode(node)) {
          pk = this.buildPkAttribute(node);
        }
      }
    }
    
    // Process fields
    if (children.simpleField) {
      for (const node of children.simpleField) {
        if (this.isCstNode(node)) {
          fields.push(this.buildSimpleField(node));
        }
      }
    }
    
    return {
      type: 'Entity',
      name,
      doc,
      pk,
      fields
    };
  }
  
  private buildDocAttribute(cst: CstNode): string {
    const children = cst.children as CstChildrenDictionary;
    const value = this.getTokenValue(children.value?.[0]);
    // Remove quotes
    return value.slice(1, -1);
  }

  private buildPkAttribute(cst: CstNode): string {
    const children = cst.children as CstChildrenDictionary;
    return this.getTokenValue(children.value?.[0]);
  }
  
  private buildSimpleField(cst: CstNode): SimpleField {
    const children = cst.children as CstChildrenDictionary;
    const name = this.getTokenValue(children.name?.[0]);
    const fieldType = this.buildSimpleType(children.simpleType?.[0]);
    
    return {
      type: 'Field',
      name,
      fieldType
    };
  }
  
  private buildSimpleType(cst: any): string {
    if (!this.isCstNode(cst)) return 'unknown';
    
    const children = cst.children as CstChildrenDictionary;
    
    // Check each possible type token
    const typeTokens = ['Text', 'Email', 'Phone', 'Int', 'Bool', 'Date', 'DateTime', 'Money', 'Enum', 'QualifiedIdentifier', 'Identifier'];
    
    for (const tokenType of typeTokens) {
      if (children[tokenType]) {
        return this.getTokenValue(children[tokenType][0]);
      }
    }
    
    return 'unknown';
  }
  
  private buildSimpleAction(cst: CstNode): SimpleAction {
    const children = cst.children as CstChildrenDictionary;
    const name = this.getTokenValue(children.name?.[0]);
    
    const statements: SimpleStatement[] = [];
    
    if (children.simpleStatement) {
      for (const node of children.simpleStatement) {
        if (this.isCstNode(node)) {
          statements.push(this.buildSimpleStatement(node));
        }
      }
    }
    
    return {
      type: 'Action',
      name,
      statements
    };
  }
  
  private buildSimpleStatement(cst: CstNode): SimpleStatement {
    const children = cst.children as CstChildrenDictionary;
    
    if (children.emitStatement) {
      return this.buildEmitStatement(children.emitStatement[0] as CstNode);
    } else if (children.callStatement) {
      return this.buildCallStatement(children.callStatement[0] as CstNode);
    }
    
    return {
      type: 'EmitStatement',
      target: 'unknown'
    };
  }
  
  private buildEmitStatement(cst: CstNode): SimpleStatement {
    const children = cst.children as CstChildrenDictionary;
    const target = this.getTokenValue(children.event?.[0]);
    
    return {
      type: 'EmitStatement',
      target
    };
  }
  
  private buildCallStatement(cst: CstNode): SimpleStatement {
    const children = cst.children as CstChildrenDictionary;
    const target = this.getTokenValue(children.target?.[0]);
    
    return {
      type: 'CallStatement',
      target
    };
  }
  
  private buildRoleDeclaration(cst: CstNode): SimpleRole {
    const children = cst.children as CstChildrenDictionary;
    const name = this.getTokenValue(children.name?.[0]);
    const permission = this.getTokenValue(children.permission?.[0]);
    const target = this.getTokenValue(children.target?.[0]);
    
    return {
      type: 'Role',
      name,
      permission,
      target
    };
  }
  
  private getTokenValue(token: any): string {
    if (!token) return '';
    if (typeof token === 'object' && token.image) {
      return token.image;
    }
    return String(token);
  }
  
  private isCstNode(obj: any): obj is CstNode {
    return obj && typeof obj === 'object' && obj.name && obj.children;
  }
} 