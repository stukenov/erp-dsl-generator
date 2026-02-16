import { erpLexer } from './lexer.js';
import { erpParser } from './parser.js';
import { ERPASTBuilder } from './ast-builder.js';
import * as AST from '../types/ast.js';

export interface ParseResult {
  success: boolean;
  ast?: AST.ERPDocument;
  errors: ParseError[];
}

export interface ParseError {
  message: string;
  line?: number;
  column?: number;
  type: 'lexical' | 'syntactic' | 'semantic';
}

export class ERPDSLParser {
  private astBuilder: ERPASTBuilder;

  constructor() {
    this.astBuilder = new ERPASTBuilder();
  }

  /**
   * Parse ERP DSL text and return AST
   */
  public parse(text: string): ParseResult {
    const errors: ParseError[] = [];

    try {
      // Tokenize
      const lexingResult = erpLexer.tokenize(text);
      
      if (lexingResult.errors.length > 0) {
        lexingResult.errors.forEach(error => {
          errors.push({
            message: error.message,
            line: error.line,
            column: error.column,
            type: 'lexical'
          });
        });
        
        if (errors.length > 0) {
          return { success: false, errors };
        }
      }

      // Parse
      erpParser.input = lexingResult.tokens;
      const cst = erpParser.erpDocument();

      if (erpParser.errors.length > 0) {
        erpParser.errors.forEach(error => {
          errors.push({
            message: error.message,
            line: error.token?.startLine,
            column: error.token?.startColumn,
            type: 'syntactic'
          });
        });
        
        if (errors.length > 0) {
          return { success: false, errors };
        }
      }

      // Build AST
      const ast = this.astBuilder.buildDocument(cst);

      return {
        success: true,
        ast,
        errors
      };

    } catch (error) {
      errors.push({
        message: error instanceof Error ? error.message : 'Unknown parsing error',
        type: 'syntactic'
      });

      return { success: false, errors };
    }
  }

  /**
   * Validate AST structure and semantics
   */
  public validate(ast: AST.ERPDocument): ParseError[] {
    const errors: ParseError[] = [];

    // Basic semantic validation
    this.validateEntityReferences(ast, errors);
    this.validateFieldTypes(ast, errors);
    this.validateUniqueNames(ast, errors);

    return errors;
  }

  private validateEntityReferences(ast: AST.ERPDocument, errors: ParseError[]) {
    const entityNames = new Set<string>();
    
    // Collect all entity names
    ast.entities.forEach(entity => entityNames.add(entity.name));
    ast.modules.forEach(module => {
      module.entities.forEach(entity => entityNames.add(entity.name));
    });

    // Check relation references
    const validateRelations = (entities: AST.EntityDeclaration[]) => {
      entities.forEach(entity => {
        entity.relations.forEach(relation => {
          if (!entityNames.has(relation.targetEntity)) {
            errors.push({
              message: `Entity '${relation.targetEntity}' referenced in relation '${relation.name}' of entity '${entity.name}' does not exist`,
              line: relation.location?.start.line,
              column: relation.location?.start.column,
              type: 'semantic'
            });
          }
        });
      });
    };

    validateRelations(ast.entities);
    ast.modules.forEach(module => validateRelations(module.entities));
  }

  private validateFieldTypes(ast: AST.ERPDocument, errors: ParseError[]) {
    const validBaseTypes = new Set(['Text', 'Int', 'Decimal', 'Bool', 'Date', 'DateTime', 
                                  'Money', 'Email', 'Phone', 'Code', 'Json', 'Enum', 
                                  'Tag', 'Address']);

    const validateFields = (entities: AST.EntityDeclaration[]) => {
      entities.forEach(entity => {
        entity.fields.forEach(field => {
          if (!validBaseTypes.has(field.fieldType.name)) {
            // Could be a custom type - for now just warn
            console.warn(`Unknown field type '${field.fieldType.name}' in field '${field.name}' of entity '${entity.name}'`);
          }
        });
      });
    };

    validateFields(ast.entities);
    ast.modules.forEach(module => validateFields(module.entities));
  }

  private validateUniqueNames(ast: AST.ERPDocument, errors: ParseError[]) {
    const entityNames = new Set<string>();
    const moduleNames = new Set<string>();

    // Check unique entity names
    const checkEntityNames = (entities: AST.EntityDeclaration[]) => {
      entities.forEach(entity => {
        if (entityNames.has(entity.name)) {
          errors.push({
            message: `Duplicate entity name '${entity.name}'`,
            line: entity.location?.start.line,
            column: entity.location?.start.column,
            type: 'semantic'
          });
        } else {
          entityNames.add(entity.name);
        }

        // Check unique field names within entity
        const fieldNames = new Set<string>();
        entity.fields.forEach(field => {
          if (fieldNames.has(field.name)) {
            errors.push({
              message: `Duplicate field name '${field.name}' in entity '${entity.name}'`,
              line: field.location?.start.line,
              column: field.location?.start.column,
              type: 'semantic'
            });
          } else {
            fieldNames.add(field.name);
          }
        });

        // Check relation names
        entity.relations.forEach(relation => {
          if (fieldNames.has(relation.name)) {
            errors.push({
              message: `Relation name '${relation.name}' conflicts with field name in entity '${entity.name}'`,
              line: relation.location?.start.line,
              column: relation.location?.start.column,
              type: 'semantic'
            });
          } else {
            fieldNames.add(relation.name);
          }
        });
      });
    };

    checkEntityNames(ast.entities);

    // Check unique module names
    ast.modules.forEach(module => {
      if (moduleNames.has(module.name)) {
        errors.push({
          message: `Duplicate module name '${module.name}'`,
          line: module.location?.start.line,
          column: module.location?.start.column,
          type: 'semantic'
        });
      } else {
        moduleNames.add(module.name);
      }

      checkEntityNames(module.entities);
    });
  }
}

// Export parser instance
export const parser = new ERPDSLParser();

// Re-export types
export * from '../types/ast.js'; 