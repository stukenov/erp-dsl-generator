import { CstParser, ParserMethod, IToken } from 'chevrotain';
import { allTokens, erpLexer } from './lexer.js';
import * as tokens from './lexer.js';

export class ERPParser extends CstParser {
  constructor() {
    super(allTokens, {
      recoveryEnabled: true,
      nodeLocationTracking: 'full'
    });
    this.performSelfAnalysis();
  }

  // Entry point
  public erpDocument = this.RULE('erpDocument', () => {
    this.CONSUME(tokens.Erp);
    this.CONSUME(tokens.Identifier, { LABEL: 'name' });
    this.CONSUME(tokens.NumberLiteral, { LABEL: 'version' });
    
    this.MANY(() => {
      this.OR([
        { ALT: () => this.SUBRULE(this.usePackDeclaration) },
        { ALT: () => this.SUBRULE(this.moduleDeclaration) },
        { ALT: () => this.SUBRULE(this.entityDeclaration) },
        { ALT: () => this.SUBRULE(this.actionDeclaration) },
        { ALT: () => this.SUBRULE(this.formDeclaration) },
        { ALT: () => this.SUBRULE(this.roleDeclaration) }
      ]);
    });
  });

  // Use pack declaration
  public usePackDeclaration = this.RULE('usePackDeclaration', () => {
    this.CONSUME(tokens.Use);
    this.CONSUME(tokens.Pack);
    this.CONSUME(tokens.QualifiedIdentifier, { LABEL: 'packName' });
    
    // Поддержка нескольких пакетов через запятую
    this.MANY(() => {
      this.CONSUME(tokens.Comma);
      this.CONSUME2(tokens.QualifiedIdentifier, { LABEL: 'additionalPackName' });
    });
  });

  // Module declaration
  public moduleDeclaration = this.RULE('moduleDeclaration', () => {
    this.CONSUME(tokens.Module);
    this.CONSUME(tokens.Identifier, { LABEL: 'name' });
    this.CONSUME(tokens.LCurly);
    
    this.MANY(() => {
      this.OR([
        { ALT: () => this.SUBRULE(this.includeStatement) },
        { ALT: () => this.SUBRULE(this.entityDeclaration) },
        { ALT: () => this.SUBRULE(this.actionDeclaration) }
      ]);
    });
    
    this.CONSUME(tokens.RCurly);
  });

  // Include statement
  public includeStatement = this.RULE('includeStatement', () => {
    this.CONSUME(tokens.Include);
    this.CONSUME(tokens.StringLiteral, { LABEL: 'path' });
  });

  // Entity declaration
  public entityDeclaration = this.RULE('entityDeclaration', () => {
    this.CONSUME(tokens.Entity);
    this.CONSUME(tokens.Identifier, { LABEL: 'name' });
    this.CONSUME(tokens.LCurly);
    
    this.MANY(() => {
      this.OR([
        { ALT: () => this.SUBRULE(this.entityAttribute) },
        { ALT: () => this.SUBRULE(this.fieldDeclaration) },
        { ALT: () => this.SUBRULE(this.relationDeclaration) }
      ]);
    });
    
    this.CONSUME(tokens.RCurly);
  });

  // Entity attributes (doc, pk, etc.)
  public entityAttribute = this.RULE('entityAttribute', () => {
    this.OR([
      {
        ALT: () => {
          this.CONSUME(tokens.Doc);
          this.CONSUME(tokens.Equals);
          this.CONSUME(tokens.StringLiteral, { LABEL: 'value' });
        }
      },
      {
        ALT: () => {
          this.CONSUME2(tokens.Pk);
          this.CONSUME2(tokens.Equals);
          this.CONSUME(tokens.Identifier, { LABEL: 'value' });
        }
      }
    ]);
  });

  // Field declaration
  public fieldDeclaration = this.RULE('fieldDeclaration', () => {
    this.CONSUME(tokens.Identifier, { LABEL: 'name' });
    this.CONSUME(tokens.Colon);
    this.SUBRULE(this.fieldType);
    this.OPTION(() => {
      this.SUBRULE(this.fieldModifiers);
    });
  });

  // Field type
  public fieldType = this.RULE('fieldType', () => {
    this.OR([
      { ALT: () => this.CONSUME(tokens.Text) },
      { ALT: () => this.CONSUME(tokens.Int) },
      { ALT: () => this.CONSUME(tokens.Decimal) },
      { ALT: () => this.CONSUME(tokens.Bool) },
      { ALT: () => this.CONSUME(tokens.Date) },
      { ALT: () => this.CONSUME(tokens.DateTime) },
      { ALT: () => this.CONSUME(tokens.Money) },
      { ALT: () => this.CONSUME(tokens.Email) },
      { ALT: () => this.CONSUME(tokens.Phone) },
      { ALT: () => this.CONSUME(tokens.Code) },
      { ALT: () => this.CONSUME(tokens.Json) },
      { ALT: () => this.CONSUME(tokens.Tag) },
      { ALT: () => this.CONSUME(tokens.Address) },
      { ALT: () => this.SUBRULE(this.enumType) },
      { ALT: () => this.CONSUME(tokens.Identifier) } // Custom type
    ]);
    
    // Optional type parameters
    this.OPTION(() => {
      this.OR2([
        { ALT: () => this.SUBRULE(this.typeParameters) },
        { ALT: () => this.SUBRULE(this.typeModifiers) }
      ]);
    });
  });

  // Enum type
  public enumType = this.RULE('enumType', () => {
    this.CONSUME(tokens.Enum);
    this.CONSUME(tokens.LBracket);
    this.CONSUME(tokens.Identifier, { LABEL: 'value' });
    this.MANY(() => {
      this.CONSUME(tokens.Comma);
      this.CONSUME2(tokens.Identifier, { LABEL: 'value' });
    });
    this.CONSUME(tokens.RBracket);
    this.OPTION(() => {
      this.CONSUME(tokens.Equals);
      this.CONSUME3(tokens.Identifier, { LABEL: 'default' });
    });
  });

  // Type parameters (e.g., Text(1..100) or Decimal(12,3))
  public typeParameters = this.RULE('typeParameters', () => {
    this.CONSUME(tokens.LParen);
    this.SUBRULE(this.typeParameter);
    this.MANY(() => {
      this.CONSUME(tokens.Comma);
      this.SUBRULE2(this.typeParameter);
    });
    this.CONSUME(tokens.RParen);
  });

  // Single type parameter
  public typeParameter = this.RULE('typeParameter', () => {
    this.OR([
      { ALT: () => this.SUBRULE(this.rangeParameter) },
      { ALT: () => this.SUBRULE(this.namedParameter) },
      { ALT: () => this.CONSUME(tokens.NumberLiteral) },
      { ALT: () => this.CONSUME(tokens.StringLiteral) },
      { ALT: () => this.CONSUME(tokens.BooleanLiteral) },
      { ALT: () => this.CONSUME(tokens.Identifier) }
    ]);
  });

  // Range parameter (e.g., 1..100)
  public rangeParameter = this.RULE('rangeParameter', () => {
    this.CONSUME(tokens.NumberLiteral, { LABEL: 'min' });
    this.CONSUME(tokens.Range);
    this.CONSUME2(tokens.NumberLiteral, { LABEL: 'max' });
  });

  // Named parameter (e.g., max=100)
  public namedParameter = this.RULE('namedParameter', () => {
    this.CONSUME(tokens.Identifier, { LABEL: 'name' });
    this.CONSUME(tokens.Equals);
    this.OR([
      { ALT: () => this.CONSUME(tokens.NumberLiteral, { LABEL: 'value' }) },
      { ALT: () => this.CONSUME(tokens.StringLiteral, { LABEL: 'value' }) },
      { ALT: () => this.CONSUME(tokens.BooleanLiteral, { LABEL: 'value' }) },
      { ALT: () => this.CONSUME2(tokens.Identifier, { LABEL: 'value' }) }
    ]);
  });

  // Type modifiers (nullable, array)
  public typeModifiers = this.RULE('typeModifiers', () => {
    this.OR([
      { ALT: () => this.CONSUME(tokens.Question) }, // nullable
      { ALT: () => { this.CONSUME(tokens.LBracket); this.CONSUME(tokens.RBracket); } }, // array
      { ALT: () => this.CONSUME(tokens.Star) } // many relation
    ]);
  });

  // Field modifiers
  public fieldModifiers = this.RULE('fieldModifiers', () => {
    this.CONSUME(tokens.LParen);
    this.SUBRULE(this.fieldModifier);
    this.MANY(() => {
      this.CONSUME(tokens.Comma);
      this.SUBRULE2(this.fieldModifier);
    });
    this.CONSUME(tokens.RParen);
  });

  // Single field modifier
  public fieldModifier = this.RULE('fieldModifier', () => {
    this.OR([
      { ALT: () => this.CONSUME(tokens.Identifier) }, // simple modifier like 'required', 'unique'
      { ALT: () => this.SUBRULE(this.namedParameter) } // named modifier
    ]);
  });

  // Relation declaration
  public relationDeclaration = this.RULE('relationDeclaration', () => {
    this.CONSUME(tokens.Identifier, { LABEL: 'name' });
    this.CONSUME(tokens.Colon);
    this.CONSUME2(tokens.Identifier, { LABEL: 'targetEntity' });
    this.SUBRULE(this.relationCardinality);
    this.OPTION(() => {
      this.SUBRULE(this.relationModifiers);
    });
  });

  // Relation cardinality
  public relationCardinality = this.RULE('relationCardinality', () => {
    this.OR([
      { ALT: () => { this.CONSUME(tokens.LParen); this.CONSUME(tokens.NumberLiteral); this.CONSUME(tokens.RParen); } },
      { ALT: () => this.CONSUME(tokens.Star) },
      { ALT: () => this.CONSUME(tokens.Question) },
      { ALT: () => { this.CONSUME(tokens.LBracket); this.CONSUME(tokens.RBracket); } }
    ]);
  });

  // Relation modifiers
  public relationModifiers = this.RULE('relationModifiers', () => {
    this.CONSUME(tokens.LParen);
    this.SUBRULE(this.relationModifier);
    this.MANY(() => {
      this.CONSUME(tokens.Comma);
      this.SUBRULE2(this.relationModifier);
    });
    this.CONSUME(tokens.RParen);
  });

  // Single relation modifier
  public relationModifier = this.RULE('relationModifier', () => {
    this.OR([
      { ALT: () => this.CONSUME(tokens.Identifier) },
      { ALT: () => this.SUBRULE(this.namedParameter) }
    ]);
  });

  // Action declaration
  public actionDeclaration = this.RULE('actionDeclaration', () => {
    this.CONSUME(tokens.Action);
    this.CONSUME(tokens.Identifier, { LABEL: 'name' });
    this.CONSUME(tokens.LParen);
    this.OPTION(() => {
      this.SUBRULE(this.parameterList);
    });
    this.CONSUME(tokens.RParen);
    
    this.OPTION2(() => {
      this.CONSUME(tokens.When);
      this.SUBRULE(this.conditionExpression);
    });
    
    this.CONSUME(tokens.LCurly);
    this.MANY(() => {
      this.SUBRULE(this.statement);
    });
    this.CONSUME(tokens.RCurly);
  });

  // Parameter list
  public parameterList = this.RULE('parameterList', () => {
    this.SUBRULE(this.parameter);
    this.MANY(() => {
      this.CONSUME(tokens.Comma);
      this.SUBRULE2(this.parameter);
    });
  });

  // Parameter
  public parameter = this.RULE('parameter', () => {
    this.CONSUME(tokens.Identifier, { LABEL: 'name' });
    this.CONSUME(tokens.Colon);
    this.CONSUME2(tokens.Identifier, { LABEL: 'type' });
  });

  // Condition expression
  public conditionExpression = this.RULE('conditionExpression', () => {
    // Simplified expression parsing
    this.CONSUME(tokens.Identifier);
    this.OR([
      { ALT: () => this.CONSUME(tokens.EqualEqual) },
      { ALT: () => this.CONSUME(tokens.NotEqual) },
      { ALT: () => this.CONSUME(tokens.LessThan) },
      { ALT: () => this.CONSUME(tokens.GreaterThan) },
      { ALT: () => this.CONSUME(tokens.LessEqual) },
      { ALT: () => this.CONSUME(tokens.GreaterEqual) }
    ]);
    this.OR2([
      { ALT: () => this.CONSUME(tokens.StringLiteral) },
      { ALT: () => this.CONSUME(tokens.NumberLiteral) },
      { ALT: () => this.CONSUME(tokens.BooleanLiteral) },
      { ALT: () => this.CONSUME2(tokens.Identifier) }
    ]);
  });

  // Statement
  public statement = this.RULE('statement', () => {
    this.OR([
      { ALT: () => this.SUBRULE(this.assignmentStatement) },
      { ALT: () => this.SUBRULE(this.emitStatement) },
      { ALT: () => this.SUBRULE(this.callStatement) }
    ]);
  });

  // Assignment statement
  public assignmentStatement = this.RULE('assignmentStatement', () => {
    this.CONSUME(tokens.Identifier, { LABEL: 'target' });
    this.OPTION(() => {
      this.CONSUME(tokens.Dot);
      this.CONSUME2(tokens.Identifier, { LABEL: 'property' });
    });
    this.CONSUME(tokens.Equals);
    this.OR([
      { ALT: () => this.CONSUME(tokens.StringLiteral, { LABEL: 'value' }) },
      { ALT: () => this.CONSUME(tokens.NumberLiteral, { LABEL: 'value' }) },
      { ALT: () => this.CONSUME(tokens.BooleanLiteral, { LABEL: 'value' }) },
      { ALT: () => this.CONSUME3(tokens.Identifier, { LABEL: 'value' }) }
    ]);
  });

  // Emit statement
  public emitStatement = this.RULE('emitStatement', () => {
    this.CONSUME(tokens.Emit);
    this.CONSUME(tokens.Identifier, { LABEL: 'event' });
    this.OPTION(() => {
      this.CONSUME(tokens.LParen);
      this.OPTION2(() => {
        this.SUBRULE(this.argumentList);
      });
      this.CONSUME(tokens.RParen);
    });
  });

  // Call statement
  public callStatement = this.RULE('callStatement', () => {
    this.CONSUME(tokens.Call);
    this.CONSUME(tokens.Identifier, { LABEL: 'target' });
    this.OPTION(() => {
      this.CONSUME(tokens.Dot);
      this.CONSUME2(tokens.Identifier, { LABEL: 'method' });
    });
    this.CONSUME(tokens.LParen);
    this.OPTION2(() => {
      this.SUBRULE(this.argumentList);
    });
    this.CONSUME(tokens.RParen);
  });

  // Argument list
  public argumentList = this.RULE('argumentList', () => {
    this.SUBRULE(this.argument);
    this.MANY(() => {
      this.CONSUME(tokens.Comma);
      this.SUBRULE2(this.argument);
    });
  });

  // Argument
  public argument = this.RULE('argument', () => {
    this.OPTION(() => {
      this.CONSUME(tokens.Identifier, { LABEL: 'name' });
      this.CONSUME(tokens.Equals);
    });
    this.OR([
      { ALT: () => this.CONSUME(tokens.StringLiteral, { LABEL: 'value' }) },
      { ALT: () => this.CONSUME(tokens.NumberLiteral, { LABEL: 'value' }) },
      { ALT: () => this.CONSUME(tokens.BooleanLiteral, { LABEL: 'value' }) },
      { ALT: () => this.CONSUME2(tokens.Identifier, { LABEL: 'value' }) }
    ]);
  });

  // Form declaration
  public formDeclaration = this.RULE('formDeclaration', () => {
    this.CONSUME(tokens.Form);
    this.CONSUME(tokens.Identifier, { LABEL: 'name' });
    this.CONSUME(tokens.For);
    this.CONSUME2(tokens.Identifier, { LABEL: 'entityName' });
    
    this.OPTION(() => {
      this.CONSUME(tokens.Layout);
      this.CONSUME(tokens.Equals);
      this.CONSUME3(tokens.Identifier, { LABEL: 'layout' });
    });
    
    this.CONSUME(tokens.LCurly);
    this.MANY(() => {
      this.SUBRULE(this.formGroup);
    });
    this.CONSUME(tokens.RCurly);
  });

  // Form group
  public formGroup = this.RULE('formGroup', () => {
    this.CONSUME(tokens.Group);
    this.CONSUME(tokens.StringLiteral, { LABEL: 'name' });
    
    this.OPTION(() => {
      this.CONSUME(tokens.Collapsible);
    });
    
    this.CONSUME(tokens.LCurly);
    this.SUBRULE(this.fieldList);
    this.CONSUME(tokens.RCurly);
  });

  // Field list
  public fieldList = this.RULE('fieldList', () => {
    this.CONSUME(tokens.Identifier, { LABEL: 'field' });
    this.MANY(() => {
      this.CONSUME(tokens.Comma);
      this.CONSUME2(tokens.Identifier, { LABEL: 'field' });
    });
  });

  // Role declaration
  public roleDeclaration = this.RULE('roleDeclaration', () => {
    this.CONSUME(tokens.Role);
    this.CONSUME(tokens.Identifier, { LABEL: 'name' });
    this.CONSUME(tokens.Grants);
    this.SUBRULE(this.grantSpec);
  });

  // Grant specification
  public grantSpec = this.RULE('grantSpec', () => {
    this.OR([
      { ALT: () => this.CONSUME(tokens.Star) }, // grants *
      { ALT: () => this.SUBRULE(this.permissionList) }
    ]);
    this.CONSUME(tokens.On);
    this.OR2([
      { ALT: () => this.CONSUME2(tokens.Star) }, // on *
      { ALT: () => this.SUBRULE(this.entityList) }
    ]);
    
    this.OPTION(() => {
      this.CONSUME(tokens.Except);
      this.CONSUME(tokens.Fields);
      this.SUBRULE(this.fieldList);
    });
  });

  // Permission list
  public permissionList = this.RULE('permissionList', () => {
    this.CONSUME(tokens.Identifier, { LABEL: 'permission' });
    this.MANY(() => {
      this.OPTION(() => {
        this.CONSUME(tokens.Comma);
      });
      this.CONSUME2(tokens.Identifier, { LABEL: 'permission' });
    });
  });

  // Entity list
  public entityList = this.RULE('entityList', () => {
    this.CONSUME(tokens.Identifier, { LABEL: 'entity' });
    this.MANY(() => {
      this.CONSUME(tokens.Comma);
      this.CONSUME2(tokens.Identifier, { LABEL: 'entity' });
    });
  });
}

// Create parser instance
export const erpParser = new ERPParser(); 