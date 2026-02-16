import { CstNode, CstChildrenDictionary, IToken } from 'chevrotain';
import * as AST from '../types/ast.js';

export class ERPASTBuilder {
  public buildDocument(cst: CstNode): AST.ERPDocument {
    const children = cst.children as CstChildrenDictionary;
    
    const name = (children.name[0] as IToken).image;
    const version = (children.version[0] as IToken).image;
    
    const packs: AST.UsePackDeclaration[] = [];
    const modules: AST.ModuleDeclaration[] = [];
    const entities: AST.EntityDeclaration[] = [];
    const actions: AST.ActionDeclaration[] = [];
    const forms: AST.FormDeclaration[] = [];
    const roles: AST.RoleDeclaration[] = [];
    
    // Process all child nodes
    if (children.usePackDeclaration) {
      children.usePackDeclaration.forEach((node: CstNode) => {
        packs.push(this.buildUsePackDeclaration(node));
      });
    }
    
    if (children.moduleDeclaration) {
      children.moduleDeclaration.forEach((node: CstNode) => {
        modules.push(this.buildModuleDeclaration(node));
      });
    }
    
    if (children.entityDeclaration) {
      children.entityDeclaration.forEach((node: CstNode) => {
        entities.push(this.buildEntityDeclaration(node));
      });
    }
    
    if (children.actionDeclaration) {
      children.actionDeclaration.forEach((node: CstNode) => {
        actions.push(this.buildActionDeclaration(node));
      });
    }
    
    if (children.formDeclaration) {
      children.formDeclaration.forEach((node: CstNode) => {
        forms.push(this.buildFormDeclaration(node));
      });
    }
    
    if (children.roleDeclaration) {
      children.roleDeclaration.forEach((node: CstNode) => {
        roles.push(this.buildRoleDeclaration(node));
      });
    }
    
    return {
      type: 'ERPDocument',
      name,
      version,
      packs,
      modules,
      entities,
      actions,
      forms,
      roles,
      location: this.extractLocation(cst)
    };
  }
  
  private buildUsePackDeclaration(cst: CstNode): AST.UsePackDeclaration {
    const children = cst.children as CstChildrenDictionary;
    const packName = (children.packName[0] as IToken).image;
    
    return {
      type: 'UsePackDeclaration',
      packName,
      location: this.extractLocation(cst)
    };
  }
  
  private buildModuleDeclaration(cst: CstNode): AST.ModuleDeclaration {
    const children = cst.children as CstChildrenDictionary;
    const name = (children.name[0] as IToken).image;
    
    const includes: string[] = [];
    const entities: AST.EntityDeclaration[] = [];
    const actions: AST.ActionDeclaration[] = [];
    
    if (children.includeStatement) {
      children.includeStatement.forEach((node: CstNode) => {
        includes.push(this.buildIncludeStatement(node));
      });
    }
    
    if (children.entityDeclaration) {
      children.entityDeclaration.forEach((node: CstNode) => {
        entities.push(this.buildEntityDeclaration(node));
      });
    }
    
    if (children.actionDeclaration) {
      children.actionDeclaration.forEach((node: CstNode) => {
        actions.push(this.buildActionDeclaration(node));
      });
    }
    
    return {
      type: 'ModuleDeclaration',
      name,
      includes,
      entities,
      actions,
      location: this.extractLocation(cst)
    };
  }
  
  private buildIncludeStatement(cst: CstNode): string {
    const children = cst.children as CstChildrenDictionary;
    const path = (children.path[0] as IToken).image;
    return path.slice(1, -1); // Remove quotes
  }
  
  private buildEntityDeclaration(cst: CstNode): AST.EntityDeclaration {
    const children = cst.children as CstChildrenDictionary;
    const name = (children.name[0] as IToken).image;
    
    let doc: string | undefined;
    let pk: string | undefined;
    const fields: AST.FieldDeclaration[] = [];
    const relations: AST.RelationDeclaration[] = [];
    const attributes: AST.EntityAttribute[] = [];
    
    if (children.entityAttribute) {
      children.entityAttribute.forEach((node: CstNode) => {
        const attr = this.buildEntityAttribute(node);
        if (attr.name === 'doc') {
          doc = attr.value;
        } else if (attr.name === 'pk') {
          pk = attr.value;
        }
        attributes.push(attr);
      });
    }
    
    if (children.fieldDeclaration) {
      children.fieldDeclaration.forEach((node: CstNode) => {
        fields.push(this.buildFieldDeclaration(node));
      });
    }
    
    if (children.relationDeclaration) {
      children.relationDeclaration.forEach((node: CstNode) => {
        relations.push(this.buildRelationDeclaration(node));
      });
    }
    
    return {
      type: 'EntityDeclaration',
      name,
      doc,
      pk,
      fields,
      relations,
      attributes,
      location: this.extractLocation(cst)
    };
  }
  
  private buildEntityAttribute(cst: CstNode): AST.EntityAttribute {
    const children = cst.children as CstChildrenDictionary;
    
    // Determine attribute name and value
    let name: string;
    let value: string;
    
    if (children.Doc) {
      name = 'doc';
      value = (children.value[0] as IToken).image.slice(1, -1); // Remove quotes
    } else if (children.Pk) {
      name = 'pk';
      value = (children.value[0] as IToken).image;
    } else {
      throw new Error('Unknown entity attribute type');
    }
    
    return {
      type: 'EntityAttribute',
      name,
      value,
      location: this.extractLocation(cst)
    };
  }
  
  private buildFieldDeclaration(cst: CstNode): AST.FieldDeclaration {
    const children = cst.children as CstChildrenDictionary;
    const name = (children.name[0] as IToken).image;
    const fieldType = this.buildFieldType(children.fieldType[0]);
    
    const modifiers: AST.FieldModifier[] = [];
    if (children.fieldModifiers) {
      modifiers.push(...this.buildFieldModifiers(children.fieldModifiers[0]));
    }
    
    return {
      type: 'FieldDeclaration',
      name,
      fieldType,
      modifiers,
      location: this.extractLocation(cst)
    };
  }
  
  private buildFieldType(cst: CstNode): AST.FieldType {
    const children = cst.children as CstChildrenDictionary;
    
    // Extract type name
    let typeName: string;
    const typeTokens = ['Text', 'Int', 'Decimal', 'Bool', 'Date', 'DateTime', 
                      'Money', 'Email', 'Phone', 'Code', 'Json', 'Tag', 'Address', 'Identifier'];
    
    for (const tokenType of typeTokens) {
      if (children[tokenType]) {
        typeName = (children[tokenType][0] as IToken).image;
        break;
      }
    }
    
    // Handle enum type specially
    if (children.enumType) {
      return this.buildEnumFieldType(children.enumType[0]);
    }
    
    typeName = typeName! || 'unknown';
    
    const parameters: AST.FieldTypeParameter[] = [];
    if (children.typeParameters) {
      parameters.push(...this.buildTypeParameters(children.typeParameters[0]));
    }
    
    return {
      type: 'FieldType',
      name: typeName,
      parameters,
      location: this.extractLocation(cst)
    };
  }
  
  private buildEnumFieldType(cst: CstNode): AST.FieldType {
    const children = cst.children as CstChildrenDictionary;
    const parameters: AST.FieldTypeParameter[] = [];
    
    // Extract enum values
    if (children.value) {
      const values = children.value.map((token: IToken) => token.image);
      parameters.push({
        type: 'FieldTypeParameter',
        name: 'values',
        value: values.join(','),
        location: this.extractLocation(cst)
      });
    }
    
    // Extract default value
    if (children.default) {
      parameters.push({
        type: 'FieldTypeParameter',
        name: 'default',
        value: (children.default[0] as IToken).image,
        location: this.extractLocation(cst)
      });
    }
    
    return {
      type: 'FieldType',
      name: 'Enum',
      parameters,
      location: this.extractLocation(cst)
    };
  }
  
  private buildTypeParameters(cst: CstNode): AST.FieldTypeParameter[] {
    const children = cst.children as CstChildrenDictionary;
    const parameters: AST.FieldTypeParameter[] = [];
    
    if (children.typeParameter) {
      children.typeParameter.forEach((node: CstNode) => {
        parameters.push(this.buildTypeParameter(node));
      });
    }
    
    return parameters;
  }
  
  private buildTypeParameter(cst: CstNode): AST.FieldTypeParameter {
    const children = cst.children as CstChildrenDictionary;
    
    // Handle different parameter types
    if (children.rangeParameter) {
      return this.buildRangeParameter(children.rangeParameter[0]);
    }
    
    if (children.namedParameter) {
      return this.buildNamedParameter(children.namedParameter[0]);
    }
    
    // Handle simple literals
    let value: string | number | boolean;
    if (children.NumberLiteral) {
      value = parseFloat((children.NumberLiteral[0] as IToken).image);
    } else if (children.StringLiteral) {
      value = (children.StringLiteral[0] as IToken).image.slice(1, -1);
    } else if (children.BooleanLiteral) {
      value = (children.BooleanLiteral[0] as IToken).image === 'true';
    } else if (children.Identifier) {
      value = (children.Identifier[0] as IToken).image;
    } else {
      value = 'unknown';
    }
    
    return {
      type: 'FieldTypeParameter',
      value,
      location: this.extractLocation(cst)
    };
  }
  
  private buildRangeParameter(cst: CstNode): AST.FieldTypeParameter {
    const children = cst.children as CstChildrenDictionary;
    const min = parseFloat((children.min[0] as IToken).image);
    const max = parseFloat((children.max[0] as IToken).image);
    
    return {
      type: 'FieldTypeParameter',
      name: 'range',
      value: `${min}..${max}`,
      location: this.extractLocation(cst)
    };
  }
  
  private buildNamedParameter(cst: CstNode): AST.FieldTypeParameter {
    const children = cst.children as CstChildrenDictionary;
    const name = (children.name[0] as IToken).image;
    
    let value: string | number | boolean;
    if (children.value) {
      const valueToken = children.value[0] as IToken;
      const valueImage = valueToken.image;
      
      // Try to parse as number
      if (!isNaN(Number(valueImage))) {
        value = parseFloat(valueImage);
      } else if (valueImage === 'true' || valueImage === 'false') {
        value = valueImage === 'true';
      } else if (valueImage.startsWith('"') && valueImage.endsWith('"')) {
        value = valueImage.slice(1, -1);
      } else {
        value = valueImage;
      }
    } else {
      value = 'unknown';
    }
    
    return {
      type: 'FieldTypeParameter',
      name,
      value,
      location: this.extractLocation(cst)
    };
  }
  
  private buildFieldModifiers(cst: CstNode): AST.FieldModifier[] {
    const children = cst.children as CstChildrenDictionary;
    const modifiers: AST.FieldModifier[] = [];
    
    if (children.fieldModifier) {
      children.fieldModifier.forEach((node: CstNode) => {
        modifiers.push(this.buildFieldModifier(node));
      });
    }
    
    return modifiers;
  }
  
  private buildFieldModifier(cst: CstNode): AST.FieldModifier {
    const children = cst.children as CstChildrenDictionary;
    
    if (children.namedParameter) {
      const namedParam = this.buildNamedParameter(children.namedParameter[0]);
      return {
        type: 'FieldModifier',
        name: namedParam.name!,
        value: namedParam.value,
        location: this.extractLocation(cst)
      };
    }
    
    // Simple modifier
    const name = (children.Identifier[0] as IToken).image;
    return {
      type: 'FieldModifier',
      name,
      location: this.extractLocation(cst)
    };
  }
  
  private buildRelationDeclaration(cst: CstNode): AST.RelationDeclaration {
    const children = cst.children as CstChildrenDictionary;
    const name = (children.name[0] as IToken).image;
    const targetEntity = (children.targetEntity[0] as IToken).image;
    
    // Determine cardinality from relationCardinality
    let cardinality: 'one' | 'many' | 'optional' = 'one';
    if (children.relationCardinality) {
      cardinality = this.buildRelationCardinality(children.relationCardinality[0]);
    }
    
    const modifiers: AST.RelationModifier[] = [];
    if (children.relationModifiers) {
      modifiers.push(...this.buildRelationModifiers(children.relationModifiers[0]));
    }
    
    return {
      type: 'RelationDeclaration',
      name,
      targetEntity,
      cardinality,
      modifiers,
      location: this.extractLocation(cst)
    };
  }
  
  private buildRelationCardinality(cst: CstNode): 'one' | 'many' | 'optional' {
    const children = cst.children as CstChildrenDictionary;
    
    if (children.Star) {
      return 'many';
    } else if (children.Question) {
      return 'optional';
    } else if (children.LBracket && children.RBracket) {
      return 'many';
    } else {
      return 'one';
    }
  }
  
  private buildRelationModifiers(cst: CstNode): AST.RelationModifier[] {
    const children = cst.children as CstChildrenDictionary;
    const modifiers: AST.RelationModifier[] = [];
    
    if (children.relationModifier) {
      children.relationModifier.forEach((node: CstNode) => {
        modifiers.push(this.buildRelationModifier(node));
      });
    }
    
    return modifiers;
  }
  
  private buildRelationModifier(cst: CstNode): AST.RelationModifier {
    const children = cst.children as CstChildrenDictionary;
    
    if (children.namedParameter) {
      const namedParam = this.buildNamedParameter(children.namedParameter[0]);
      return {
        type: 'RelationModifier',
        name: namedParam.name!,
        value: namedParam.value as string,
        location: this.extractLocation(cst)
      };
    }
    
    const name = (children.Identifier[0] as IToken).image;
    return {
      type: 'RelationModifier',
      name,
      location: this.extractLocation(cst)
    };
  }
  
  private buildActionDeclaration(cst: CstNode): AST.ActionDeclaration {
    const children = cst.children as CstChildrenDictionary;
    const name = (children.name[0] as IToken).image;
    
    const parameters: AST.ParameterDeclaration[] = [];
    if (children.parameterList) {
      parameters.push(...this.buildParameterList(children.parameterList[0]));
    }
    
    let condition: AST.ConditionExpression | undefined;
    if (children.conditionExpression) {
      condition = this.buildConditionExpression(children.conditionExpression[0]);
    }
    
    const body: AST.StatementNode[] = [];
    if (children.statement) {
      children.statement.forEach((node: CstNode) => {
        body.push(this.buildStatement(node));
      });
    }
    
    return {
      type: 'ActionDeclaration',
      name,
      parameters,
      condition,
      body,
      location: this.extractLocation(cst)
    };
  }
  
  private buildParameterList(cst: CstNode): AST.ParameterDeclaration[] {
    const children = cst.children as CstChildrenDictionary;
    const parameters: AST.ParameterDeclaration[] = [];
    
    if (children.parameter) {
      children.parameter.forEach((node: CstNode) => {
        parameters.push(this.buildParameter(node));
      });
    }
    
    return parameters;
  }
  
  private buildParameter(cst: CstNode): AST.ParameterDeclaration {
    const children = cst.children as CstChildrenDictionary;
    const name = (children.name[0] as IToken).image;
    const paramType = (children.type[0] as IToken).image;
    
    return {
      type: 'ParameterDeclaration',
      name,
      paramType,
      location: this.extractLocation(cst)
    };
  }
  
  private buildConditionExpression(cst: CstNode): AST.ConditionExpression {
    // Simplified condition expression - just capture the raw text for now
    const children = cst.children as CstChildrenDictionary;
    let expression = '';
    
    // Build a simple string representation
    const tokens = this.getAllTokens(cst);
    expression = tokens.map(token => token.image).join(' ');
    
    return {
      type: 'ConditionExpression',
      expression,
      location: this.extractLocation(cst)
    };
  }
  
  private buildStatement(cst: CstNode): AST.StatementNode {
    const children = cst.children as CstChildrenDictionary;
    
    if (children.assignmentStatement) {
      return this.buildAssignmentStatement(children.assignmentStatement[0]);
    } else if (children.emitStatement) {
      return this.buildEmitStatement(children.emitStatement[0]);
    } else if (children.callStatement) {
      return this.buildCallStatement(children.callStatement[0]);
    }
    
    throw new Error('Unknown statement type');
  }
  
  private buildAssignmentStatement(cst: CstNode): AST.AssignmentStatement {
    const children = cst.children as CstChildrenDictionary;
    
    let target = (children.target[0] as IToken).image;
    if (children.property) {
      target += '.' + (children.property[0] as IToken).image;
    }
    
    const value = (children.value[0] as IToken).image;
    
    return {
      type: 'AssignmentStatement',
      target,
      value,
      location: this.extractLocation(cst)
    };
  }
  
  private buildEmitStatement(cst: CstNode): AST.EmitStatement {
    const children = cst.children as CstChildrenDictionary;
    const event = (children.event[0] as IToken).image;
    
    const parameters: string[] = [];
    if (children.argumentList) {
      parameters.push(...this.buildArgumentList(children.argumentList[0]));
    }
    
    return {
      type: 'EmitStatement',
      event,
      parameters,
      location: this.extractLocation(cst)
    };
  }
  
  private buildCallStatement(cst: CstNode): AST.CallStatement {
    const children = cst.children as CstChildrenDictionary;
    
    let target = (children.target[0] as IToken).image;
    if (children.method) {
      target += '.' + (children.method[0] as IToken).image;
    }
    
    const parameters: string[] = [];
    if (children.argumentList) {
      parameters.push(...this.buildArgumentList(children.argumentList[0]));
    }
    
    return {
      type: 'CallStatement',
      target,
      parameters,
      location: this.extractLocation(cst)
    };
  }
  
  private buildArgumentList(cst: CstNode): string[] {
    const children = cst.children as CstChildrenDictionary;
    const args: string[] = [];
    
    if (children.argument) {
      children.argument.forEach((node: CstNode) => {
        args.push(this.buildArgument(node));
      });
    }
    
    return args;
  }
  
  private buildArgument(cst: CstNode): string {
    const children = cst.children as CstChildrenDictionary;
    
    let result = '';
    if (children.name) {
      result += (children.name[0] as IToken).image + '=';
    }
    
    if (children.value) {
      result += (children.value[0] as IToken).image;
    }
    
    return result;
  }
  
  private buildFormDeclaration(cst: CstNode): AST.FormDeclaration {
    const children = cst.children as CstChildrenDictionary;
    const name = (children.name[0] as IToken).image;
    const entityName = (children.entityName[0] as IToken).image;
    
    let layout: string | undefined;
    if (children.layout) {
      layout = (children.layout[0] as IToken).image;
    }
    
    const groups: AST.FormGroup[] = [];
    if (children.formGroup) {
      children.formGroup.forEach((node: CstNode) => {
        groups.push(this.buildFormGroup(node));
      });
    }
    
    return {
      type: 'FormDeclaration',
      name,
      entityName,
      layout,
      groups,
      location: this.extractLocation(cst)
    };
  }
  
  private buildFormGroup(cst: CstNode): AST.FormGroup {
    const children = cst.children as CstChildrenDictionary;
    const name = (children.name[0] as IToken).image.slice(1, -1); // Remove quotes
    
    const fields: string[] = [];
    if (children.fieldList) {
      fields.push(...this.buildFieldList(children.fieldList[0]));
    }
    
    const attributes: AST.FormGroupAttribute[] = [];
    if (children.Collapsible) {
      attributes.push({
        type: 'FormGroupAttribute',
        name: 'collapsible',
        value: true,
        location: this.extractLocation(cst)
      });
    }
    
    return {
      type: 'FormGroup',
      name,
      fields,
      attributes,
      location: this.extractLocation(cst)
    };
  }
  
  private buildFieldList(cst: CstNode): string[] {
    const children = cst.children as CstChildrenDictionary;
    const fields: string[] = [];
    
    if (children.field) {
      children.field.forEach((token: IToken) => {
        fields.push(token.image);
      });
    }
    
    return fields;
  }
  
  private buildRoleDeclaration(cst: CstNode): AST.RoleDeclaration {
    const children = cst.children as CstChildrenDictionary;
    const name = (children.name[0] as IToken).image;
    
    const grants: AST.GrantSpec[] = [];
    if (children.grantSpec) {
      grants.push(this.buildGrantSpec(children.grantSpec[0]));
    }
    
    return {
      type: 'RoleDeclaration',
      name,
      grants,
      location: this.extractLocation(cst)
    };
  }
  
  private buildGrantSpec(cst: CstNode): AST.GrantSpec {
    const children = cst.children as CstChildrenDictionary;
    
    let permissions: string[] = [];
    if (children.Star) {
      permissions = ['*'];
    } else if (children.permissionList) {
      permissions = this.buildPermissionList(children.permissionList[0]);
    }
    
    let target = '*';
    if (children.entityList) {
      const entities = this.buildEntityList(children.entityList[0]);
      target = entities.join(',');
    }
    
    let exceptions: string[] | undefined;
    if (children.fieldList) {
      exceptions = this.buildFieldList(children.fieldList[0]);
    }
    
    return {
      type: 'GrantSpec',
      permissions,
      target,
      exceptions,
      location: this.extractLocation(cst)
    };
  }
  
  private buildPermissionList(cst: CstNode): string[] {
    const children = cst.children as CstChildrenDictionary;
    const permissions: string[] = [];
    
    if (children.permission) {
      children.permission.forEach((token: IToken) => {
        permissions.push(token.image);
      });
    }
    
    return permissions;
  }
  
  private buildEntityList(cst: CstNode): string[] {
    const children = cst.children as CstChildrenDictionary;
    const entities: string[] = [];
    
    if (children.entity) {
      children.entity.forEach((token: IToken) => {
        entities.push(token.image);
      });
    }
    
    return entities;
  }
  
  private extractLocation(cst: CstNode): AST.SourceLocation | undefined {
    if (cst.location) {
      return {
        start: {
          line: cst.location.startLine || 0,
          column: cst.location.startColumn || 0
        },
        end: {
          line: cst.location.endLine || 0,
          column: cst.location.endColumn || 0
        }
      };
    }
    return undefined;
  }
  
  private getAllTokens(cst: CstNode): IToken[] {
    const tokens: IToken[] = [];
    
    function collectTokens(node: any) {
      if (node && typeof node === 'object') {
        if (node.image !== undefined && node.tokenType !== undefined) {
          // This is a token
          tokens.push(node as IToken);
        } else if (Array.isArray(node)) {
          node.forEach(collectTokens);
        } else if (node.children) {
          Object.values(node.children).forEach((child: any) => {
            if (Array.isArray(child)) {
              child.forEach(collectTokens);
            } else {
              collectTokens(child);
            }
          });
        }
      }
    }
    
    collectTokens(cst);
    return tokens.sort((a, b) => (a.startOffset || 0) - (b.startOffset || 0));
  }
} 