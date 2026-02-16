import { CstNode, IToken } from 'chevrotain';
import * as AST from '../types/ast.js';

export class EnhancedASTBuilder {
  
  public buildDocument(cstNode: CstNode): AST.ERPDocument {
    const name = this.getTokenValue(cstNode, 'name');
    const version = this.getTokenValue(cstNode, 'version');
    
    const packs: AST.UsePackDeclaration[] = [];
    const modules: AST.ModuleDeclaration[] = [];
    const entities: AST.EntityDeclaration[] = [];
    const actions: AST.ActionDeclaration[] = [];
    const forms: AST.FormDeclaration[] = [];
    const roles: AST.RoleDeclaration[] = [];
    
    // Process child nodes
    if (cstNode.children.usePackDeclaration) {
      for (const packNode of cstNode.children.usePackDeclaration) {
        packs.push(this.buildUsePackDeclaration(packNode));
      }
    }
    
    if (cstNode.children.moduleDeclaration) {
      for (const moduleNode of cstNode.children.moduleDeclaration) {
        modules.push(this.buildModuleDeclaration(moduleNode));
      }
    }
    
    if (cstNode.children.entityDeclaration) {
      for (const entityNode of cstNode.children.entityDeclaration) {
        entities.push(this.buildEntityDeclaration(entityNode));
      }
    }
    
    if (cstNode.children.actionDeclaration) {
      for (const actionNode of cstNode.children.actionDeclaration) {
        actions.push(this.buildActionDeclaration(actionNode));
      }
    }
    
    if (cstNode.children.formDeclaration) {
      for (const formNode of cstNode.children.formDeclaration) {
        forms.push(this.buildFormDeclaration(formNode));
      }
    }
    
    if (cstNode.children.roleDeclaration) {
      for (const roleNode of cstNode.children.roleDeclaration) {
        roles.push(this.buildRoleDeclaration(roleNode));
      }
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
      roles
    };
  }
  
  public buildUsePackDeclaration(cstNode: CstNode): AST.UsePackDeclaration {
    const packName = this.getTokenValue(cstNode, 'packName');
    return {
      type: 'UsePackDeclaration',
      packName
    };
  }
  
  public buildModuleDeclaration(cstNode: CstNode): AST.ModuleDeclaration {
    const name = this.getTokenValue(cstNode, 'name');
    
    const includes: string[] = [];
    const entities: AST.EntityDeclaration[] = [];
    const actions: AST.ActionDeclaration[] = [];
    
    if (cstNode.children.includeDeclaration) {
      for (const includeNode of cstNode.children.includeDeclaration) {
        includes.push(this.buildIncludeDeclaration(includeNode));
      }
    }
    
    if (cstNode.children.entityDeclaration) {
      for (const entityNode of cstNode.children.entityDeclaration) {
        entities.push(this.buildEntityDeclaration(entityNode));
      }
    }
    
    if (cstNode.children.actionDeclaration) {
      for (const actionNode of cstNode.children.actionDeclaration) {
        actions.push(this.buildActionDeclaration(actionNode));
      }
    }
    
    return {
      type: 'ModuleDeclaration',
      name,
      includes,
      entities,
      actions
    };
  }
  
  public buildIncludeDeclaration(cstNode: CstNode): string {
    const path = this.getTokenValue(cstNode, 'path');
    return path.replace(/"/g, ''); // Remove quotes
  }
  
  public buildEntityDeclaration(cstNode: CstNode): AST.EntityDeclaration {
    const name = this.getTokenValue(cstNode, 'name');
    
    let doc: string | undefined;
    let pk: string | undefined;
    const fields: AST.FieldDeclaration[] = [];
    const relations: AST.RelationDeclaration[] = [];
    const attributes: AST.EntityAttribute[] = [];
    
    // Process entity body
    if (cstNode.children.docAttribute) {
      doc = this.buildDocAttribute(cstNode.children.docAttribute[0]);
    }
    
    if (cstNode.children.pkAttribute) {
      pk = this.buildPkAttribute(cstNode.children.pkAttribute[0]);
    }
    
    if (cstNode.children.fieldDeclaration) {
      for (const fieldNode of cstNode.children.fieldDeclaration) {
        fields.push(this.buildFieldDeclaration(fieldNode));
      }
    }
    
    if (cstNode.children.relationDeclaration) {
      for (const relationNode of cstNode.children.relationDeclaration) {
        relations.push(this.buildRelationDeclaration(relationNode));
      }
    }
    
    if (cstNode.children.auditFields) {
      for (const auditNode of cstNode.children.auditFields) {
        fields.push(this.buildAuditField(auditNode));
      }
    }
    
    return {
      type: 'EntityDeclaration',
      name,
      doc,
      pk,
      fields,
      relations,
      attributes
    };
  }
  
  public buildDocAttribute(cstNode: CstNode): string {
    const value = this.getTokenValue(cstNode, 'value');
    return value.replace(/"/g, ''); // Remove quotes
  }
  
  public buildPkAttribute(cstNode: CstNode): string {
    return this.getTokenValue(cstNode, 'field');
  }
  
  public buildFieldDeclaration(cstNode: CstNode): AST.FieldDeclaration {
    const name = this.getTokenValue(cstNode, 'name');
    const fieldType = this.buildFieldType(cstNode.children.fieldType[0]);
    
    const modifiers: AST.FieldModifier[] = [];
    if (cstNode.children.fieldModifiers) {
      modifiers.push(...this.buildFieldModifiers(cstNode.children.fieldModifiers[0]));
    }
    
    return {
      type: 'FieldDeclaration',
      name,
      fieldType,
      modifiers
    };
  }
  
  public buildFieldType(cstNode: CstNode): AST.FieldType {
    let typeName = '';
    const parameters: AST.FieldTypeParameter[] = [];
    
    // Determine the field type
    if (cstNode.children.basicType) {
      typeName = this.buildBasicType(cstNode.children.basicType[0]);
    } else if (cstNode.children.enumType) {
      const enumInfo = this.buildEnumType(cstNode.children.enumType[0]);
      typeName = enumInfo.name;
      parameters.push(...enumInfo.parameters);
    } else if (cstNode.children.codeType) {
      const codeInfo = this.buildCodeType(cstNode.children.codeType[0]);
      typeName = codeInfo.name;
      parameters.push(...codeInfo.parameters);
    } else if (cstNode.children.customType) {
      typeName = this.buildCustomType(cstNode.children.customType[0]);
    }
    
    // Check for nullable modifier
    if (cstNode.children.Question) {
      parameters.push({
        type: 'FieldTypeParameter',
        name: 'nullable',
        value: true
      });
    }
    
    return {
      type: 'FieldType',
      name: typeName,
      parameters
    };
  }
  
  public buildBasicType(cstNode: CstNode): string {
    // Find the actual type token
    const typeTokens = [
      'Text', 'Email', 'Phone', 'Int', 'Decimal', 'Bool', 
      'Date', 'DateTime', 'Money', 'Json', 'Address'
    ];
    
    for (const tokenType of typeTokens) {
      if (cstNode.children[tokenType]) {
        return tokenType;
      }
    }
    
    return 'Text'; // fallback
  }
  
  public buildEnumType(cstNode: CstNode): { name: string, parameters: AST.FieldTypeParameter[] } {
    const parameters: AST.FieldTypeParameter[] = [];
    
    // Extract enum values if present
    if (cstNode.children.enumValues) {
      const values = this.buildEnumValues(cstNode.children.enumValues[0]);
      parameters.push({
        type: 'FieldTypeParameter',
        name: 'values',
        value: values
      });
    }
    
    // Extract default value if present
    if (cstNode.children.default) {
      const defaultValue = this.getTokenValue(cstNode, 'default');
      parameters.push({
        type: 'FieldTypeParameter',
        name: 'default',
        value: defaultValue.replace(/"/g, '')
      });
    }
    
    return { name: 'Enum', parameters };
  }
  
  public buildCodeType(cstNode: CstNode): { name: string, parameters: AST.FieldTypeParameter[] } {
    const parameters: AST.FieldTypeParameter[] = [];
    
    if (cstNode.children.codeParameters) {
      parameters.push(...this.buildCodeParameters(cstNode.children.codeParameters[0]));
    }
    
    return { name: 'Code', parameters };
  }
  
  public buildCustomType(cstNode: CstNode): string {
    const typeName = this.getTokenValue(cstNode, 'typeName');
    
    // Check for array notation
    if (cstNode.children.LBracket || cstNode.children.Star) {
      return typeName + '[]'; // Indicate it's an array/many relation
    }
    
    return typeName;
  }
  
  public buildEnumValues(cstNode: CstNode): string[] {
    const values: string[] = [];
    
    if (cstNode.children.enumValue) {
      for (const valueNode of cstNode.children.enumValue) {
        const value = this.getFirstToken(valueNode);
        values.push(value.replace(/"/g, '')); // Remove quotes if string literal
      }
    }
    
    return values;
  }
  
  public buildCodeParameters(cstNode: CstNode): AST.FieldTypeParameter[] {
    const parameters: AST.FieldTypeParameter[] = [];
    
    if (cstNode.children.namedParameter) {
      for (const paramNode of cstNode.children.namedParameter) {
        parameters.push(this.buildNamedParameter(paramNode));
      }
    }
    
    return parameters;
  }
  
  public buildNamedParameter(cstNode: CstNode): AST.FieldTypeParameter {
    const name = this.getTokenValue(cstNode, 'name');
    const value = this.getTokenValue(cstNode, 'value');
    
    // Parse value appropriately
    let parsedValue: any = value;
    if (value.startsWith('"') && value.endsWith('"')) {
      parsedValue = value.slice(1, -1); // Remove quotes
    } else if (value === 'true' || value === 'false') {
      parsedValue = value === 'true';
    } else if (!isNaN(Number(value))) {
      parsedValue = Number(value);
    }
    
    return {
      type: 'FieldTypeParameter',
      name,
      value: parsedValue
    };
  }
  
  public buildFieldModifiers(cstNode: CstNode): AST.FieldModifier[] {
    const modifiers: AST.FieldModifier[] = [];
    
    if (cstNode.children.modifierList) {
      const modifierList = cstNode.children.modifierList[0];
      
      if (modifierList.children.fieldModifier) {
        for (const modifierNode of modifierList.children.fieldModifier) {
          modifiers.push(this.buildFieldModifier(modifierNode));
        }
      }
    }
    
    return modifiers;
  }
  
  public buildFieldModifier(cstNode: CstNode): AST.FieldModifier {
    let name = '';
    let value: any = undefined;
    
    if (cstNode.children.namedModifier) {
      const namedMod = cstNode.children.namedModifier[0];
      name = this.getTokenValue(namedMod, 'name');
      value = this.buildModifierValue(namedMod.children.modifierValue[0]);
    } else if (cstNode.children.flagModifier) {
      const flagMod = cstNode.children.flagModifier[0];
      name = this.getFirstToken(flagMod);
      value = true;
    }
    
    return {
      type: 'FieldModifier',
      name,
      value
    };
  }
  
  public buildModifierValue(cstNode: CstNode): any {
    // Check for different value types
    if (cstNode.children.NumberLiteral) {
      return Number(cstNode.children.NumberLiteral[0].image);
    } else if (cstNode.children.StringLiteral) {
      const str = cstNode.children.StringLiteral[0].image;
      return str.slice(1, -1); // Remove quotes
    } else if (cstNode.children.BooleanLiteral) {
      return cstNode.children.BooleanLiteral[0].image === 'true';
    } else if (cstNode.children.expression) {
      return this.buildExpression(cstNode.children.expression[0]);
    }
    
    return undefined;
  }
  
  public buildExpression(cstNode: CstNode): string {
    // For now, just return the raw expression as string
    // TODO: Build proper expression AST
    return this.extractTextFromNode(cstNode);
  }
  
  public buildRelationDeclaration(cstNode: CstNode): AST.RelationDeclaration {
    const name = this.getTokenValue(cstNode, 'name');
    const targetEntity = this.getTokenValue(cstNode, 'targetEntity');
    
    // Determine cardinality
    let cardinality: 'one' | 'many' | 'optional' = 'one';
    if (cstNode.children.Star) {
      cardinality = 'many';
    } else if (cstNode.children.Question || (cstNode.children.LBracket && cstNode.children.RBracket)) {
      cardinality = 'optional';
    } else if (cstNode.children.LParen && cstNode.children.NumberLiteral && cstNode.children.RParen) {
      cardinality = 'one'; // (1) notation
    }
    
    const modifiers: AST.RelationModifier[] = [];
    if (cstNode.children.relationModifiers) {
      modifiers.push(...this.buildRelationModifiers(cstNode.children.relationModifiers[0]));
    }
    
    return {
      type: 'RelationDeclaration',
      name,
      targetEntity,
      cardinality,
      modifiers
    };
  }
  
  public buildRelationModifiers(cstNode: CstNode): AST.RelationModifier[] {
    const modifiers: AST.RelationModifier[] = [];
    
    if (cstNode.children.relationModifierList) {
      const modifierList = cstNode.children.relationModifierList[0];
      
      if (modifierList.children.relationModifier) {
        for (const modifierNode of modifierList.children.relationModifier) {
          modifiers.push(this.buildRelationModifier(modifierNode));
        }
      }
    }
    
    return modifiers;
  }
  
  public buildRelationModifier(cstNode: CstNode): AST.RelationModifier {
    let name = '';
    let value: string | undefined = undefined;
    
    if (cstNode.children.namedRelationModifier) {
      const namedMod = cstNode.children.namedRelationModifier[0];
      name = this.getTokenValue(namedMod, 'name');
      value = this.getTokenValue(namedMod, 'value');
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1); // Remove quotes
      }
    } else if (cstNode.children.flagRelationModifier) {
      const flagMod = cstNode.children.flagRelationModifier[0];
      name = this.getFirstToken(flagMod);
    }
    
    return {
      type: 'RelationModifier',
      name,
      value
    };
  }
  
  public buildAuditField(cstNode: CstNode): AST.FieldDeclaration {
    const name = this.getTokenValue(cstNode, 'name');
    const autoType = this.getTokenValue(cstNode, 'autoType');
    
    return {
      type: 'FieldDeclaration',
      name,
      fieldType: {
        type: 'FieldType',
        name: 'DateTime',
        parameters: [
          {
            type: 'FieldTypeParameter',
            name: 'auto',
            value: autoType
          }
        ]
      },
      modifiers: []
    };
  }
  
  public buildActionDeclaration(cstNode: CstNode): AST.ActionDeclaration {
    const name = this.getTokenValue(cstNode, 'name');
    
    const parameters: AST.ParameterDeclaration[] = [];
    if (cstNode.children.parameterList) {
      parameters.push(...this.buildParameterList(cstNode.children.parameterList[0]));
    }
    
    let condition: AST.ConditionExpression | undefined;
    if (cstNode.children.condition) {
      condition = this.buildCondition(cstNode.children.condition[0]);
    }
    
    const body: AST.StatementNode[] = [];
    if (cstNode.children.actionStatement) {
      for (const stmtNode of cstNode.children.actionStatement) {
        body.push(this.buildActionStatement(stmtNode));
      }
    }
    
    return {
      type: 'ActionDeclaration',
      name,
      parameters,
      condition,
      body
    };
  }
  
  public buildParameterList(cstNode: CstNode): AST.ParameterDeclaration[] {
    const parameters: AST.ParameterDeclaration[] = [];
    
    if (cstNode.children.parameter) {
      for (const paramNode of cstNode.children.parameter) {
        parameters.push(this.buildParameter(paramNode));
      }
    }
    
    return parameters;
  }
  
  public buildParameter(cstNode: CstNode): AST.ParameterDeclaration {
    const name = this.getTokenValue(cstNode, 'name');
    const type = this.getTokenValue(cstNode, 'type');
    
    return {
      type: 'ParameterDeclaration',
      name,
      paramType: type,
      required: true // Default to required
    };
  }
  
  public buildCondition(cstNode: CstNode): AST.ConditionExpression {
    // Build condition from comparison expression
    return {
      type: 'ConditionExpression',
      expression: this.extractTextFromNode(cstNode)
    };
  }
  
  public buildActionStatement(cstNode: CstNode): AST.StatementNode {
    if (cstNode.children.assignmentStatement) {
      return this.buildAssignmentStatement(cstNode.children.assignmentStatement[0]);
    } else if (cstNode.children.emitStatement) {
      return this.buildEmitStatement(cstNode.children.emitStatement[0]);
    } else if (cstNode.children.callStatement) {
      return this.buildCallStatement(cstNode.children.callStatement[0]);
    } else if (cstNode.children.transitionStatement) {
      return this.buildTransitionStatement(cstNode.children.transitionStatement[0]);
    }
    
    // Fallback
    return {
      type: 'ExpressionStatement',
      expression: this.extractTextFromNode(cstNode)
    };
  }
  
  public buildAssignmentStatement(cstNode: CstNode): AST.AssignmentStatement {
    const target = this.buildFieldReference(cstNode.children.fieldReference[0]);
    const value = this.buildExpression(cstNode.children.expression[0]);
    
    return {
      type: 'AssignmentStatement',
      target,
      value
    };
  }
  
  public buildEmitStatement(cstNode: CstNode): AST.EmitStatement {
    const event = this.getTokenValue(cstNode, 'event');
    
    return {
      type: 'EmitStatement',
      event
    };
  }
  
  public buildCallStatement(cstNode: CstNode): AST.CallStatement {
    const target = this.getTokenValue(cstNode, 'target');
    
    return {
      type: 'CallStatement',
      target
    };
  }
  
  public buildTransitionStatement(cstNode: CstNode): AST.TransitionStatement {
    const field = this.buildFieldReference(cstNode.children.fieldReference[0]);
    const toState = this.getFirstTokenAfter(cstNode, 'Arrow');
    
    return {
      type: 'TransitionStatement',
      field,
      toState: toState.replace(/"/g, '') // Remove quotes
    };
  }
  
  public buildFieldReference(cstNode: CstNode): string {
    return this.getFirstToken(cstNode);
  }
  
  public buildFormDeclaration(cstNode: CstNode): AST.FormDeclaration {
    const name = this.getTokenValue(cstNode, 'name');
    const entityName = this.getTokenValue(cstNode, 'entity');
    const layout = this.getTokenValue(cstNode, 'layout') || 'single';
    
    const groups: AST.FormGroup[] = [];
    if (cstNode.children.formGroup) {
      for (const groupNode of cstNode.children.formGroup) {
        groups.push(this.buildFormGroup(groupNode));
      }
    }
    
    return {
      type: 'FormDeclaration',
      name,
      entityName,
      layout: layout.replace(/"/g, ''),
      groups
    };
  }
  
  public buildFormGroup(cstNode: CstNode): AST.FormGroup {
    const name = this.getTokenValue(cstNode, 'name').replace(/"/g, '');
    const collapsible = !!cstNode.children.Collapsible;
    
    const fields: string[] = [];
    if (cstNode.children.fieldList) {
      fields.push(...this.buildFieldList(cstNode.children.fieldList[0]));
    }
    
    return {
      type: 'FormGroup',
      name,
      fields,
      collapsible
    };
  }
  
  public buildFieldList(cstNode: CstNode): string[] {
    const fields: string[] = [];
    
    // Collect all identifier tokens
    if (cstNode.children.Identifier) {
      for (const token of cstNode.children.Identifier) {
        fields.push(token.image);
      }
    }
    if (cstNode.children.QualifiedIdentifier) {
      for (const token of cstNode.children.QualifiedIdentifier) {
        fields.push(token.image);
      }
    }
    
    return fields;
  }
  
  public buildRoleDeclaration(cstNode: CstNode): AST.RoleDeclaration {
    const name = this.getTokenValue(cstNode, 'name');
    
    const permissions: string[] = [];
    if (cstNode.children.permissionList) {
      permissions.push(...this.buildPermissionList(cstNode.children.permissionList[0]));
    }
    
    const entities: string[] = [];
    if (cstNode.children.entityList) {
      entities.push(...this.buildEntityList(cstNode.children.entityList[0]));
    }
    
    const exceptFields: string[] = [];
    if (cstNode.children.fieldList) {
      exceptFields.push(...this.buildFieldList(cstNode.children.fieldList[0]));
    }
    
    return {
      type: 'RoleDeclaration',
      name,
      permissions,
      entities,
      exceptFields
    };
  }
  
  public buildPermissionList(cstNode: CstNode): string[] {
    const permissions: string[] = [];
    
    if (cstNode.children.Star) {
      permissions.push('*');
    }
    
    if (cstNode.children.Identifier) {
      for (const token of cstNode.children.Identifier) {
        permissions.push(token.image);
      }
    }
    if (cstNode.children.QualifiedIdentifier) {
      for (const token of cstNode.children.QualifiedIdentifier) {
        permissions.push(token.image);
      }
    }
    
    return permissions;
  }
  
  public buildEntityList(cstNode: CstNode): string[] {
    const entities: string[] = [];
    
    if (cstNode.children.Star) {
      entities.push('*');
    }
    
    if (cstNode.children.Identifier) {
      for (const token of cstNode.children.Identifier) {
        entities.push(token.image);
      }
    }
    if (cstNode.children.QualifiedIdentifier) {
      for (const token of cstNode.children.QualifiedIdentifier) {
        entities.push(token.image);
      }
    }
    
    return entities;
  }
  
  // Helper methods
  private getTokenValue(cstNode: CstNode, label: string): string {
    const tokens = cstNode.children[label] as IToken[];
    return tokens?.[0]?.image || '';
  }
  
  private getFirstToken(cstNode: CstNode): string {
    // Find the first token in the CST node
    for (const key in cstNode.children) {
      const children = cstNode.children[key];
      if (Array.isArray(children) && children.length > 0) {
        const first = children[0];
        if ('image' in first) {
          return (first as IToken).image;
        }
      }
    }
    return '';
  }
  
  private getFirstTokenAfter(cstNode: CstNode, afterKey: string): string {
    const keys = Object.keys(cstNode.children);
    const afterIndex = keys.indexOf(afterKey);
    
    if (afterIndex >= 0 && afterIndex < keys.length - 1) {
      const nextKey = keys[afterIndex + 1];
      const children = cstNode.children[nextKey];
      if (Array.isArray(children) && children.length > 0) {
        const first = children[0];
        if ('image' in first) {
          return (first as IToken).image;
        }
      }
    }
    
    return '';
  }
  
  private extractTextFromNode(cstNode: CstNode): string {
    // Extract all text from a CST node (useful for expressions)
    let text = '';
    
    function traverse(node: any) {
      if ('image' in node) {
        text += node.image + ' ';
      } else if (node.children) {
        for (const key in node.children) {
          const children = node.children[key];
          if (Array.isArray(children)) {
            for (const child of children) {
              traverse(child);
            }
          }
        }
      }
    }
    
    traverse(cstNode);
    return text.trim();
  }
} 