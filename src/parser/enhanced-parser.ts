import { CstParser, IToken } from 'chevrotain';
import { allTokens } from './lexer.js';
import * as tokens from './lexer.js';

export class EnhancedERPParser extends CstParser {
  constructor() {
    super(allTokens, {
      recoveryEnabled: true,
      nodeLocationTracking: 'full'
    });
    this.performSelfAnalysis();
  }

  // Entry point - полная поддержка DSL
  public erpDocument = this.RULE('erpDocument', () => {
    this.CONSUME(tokens.Erp);
    this.OR([
      { ALT: () => this.CONSUME(tokens.QualifiedIdentifier, { LABEL: 'name' }) },
      { ALT: () => this.CONSUME(tokens.Identifier, { LABEL: 'name' }) }
    ]);
    this.CONSUME(tokens.NumberLiteral, { LABEL: 'version' });
    
    this.MANY(() => {
      this.OR2([
        { ALT: () => this.SUBRULE(this.usePackDeclaration) },
        { ALT: () => this.SUBRULE(this.moduleDeclaration) },
        { ALT: () => this.SUBRULE(this.entityDeclaration) },
        { ALT: () => this.SUBRULE(this.actionDeclaration) },
        { ALT: () => this.SUBRULE(this.workflowDeclaration) },
        { ALT: () => this.SUBRULE(this.formDeclaration) },
        { ALT: () => this.SUBRULE(this.listDeclaration) },
        { ALT: () => this.SUBRULE(this.roleDeclaration) },
        { ALT: () => this.SUBRULE(this.policyDeclaration) },
        { ALT: () => this.SUBRULE(this.onDeclaration) }
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
    this.OR([
      { ALT: () => this.CONSUME(tokens.QualifiedIdentifier, { LABEL: 'name' }) },
      { ALT: () => this.CONSUME(tokens.Identifier, { LABEL: 'name' }) }
    ]);
    this.CONSUME(tokens.LCurly);
    
    this.MANY(() => {
      this.OR2([
        { ALT: () => this.SUBRULE(this.docAttribute) },
        { ALT: () => this.SUBRULE(this.includeDeclaration) },
        { ALT: () => this.SUBRULE(this.entityDeclaration) },
        { ALT: () => this.SUBRULE(this.actionDeclaration) },
        { ALT: () => this.SUBRULE(this.workflowDeclaration) },
        { ALT: () => this.SUBRULE(this.formDeclaration) },
        { ALT: () => this.SUBRULE(this.roleDeclaration) }
      ]);
    });
    
    this.CONSUME(tokens.RCurly);
  });

  // Include declaration
  public includeDeclaration = this.RULE('includeDeclaration', () => {
    this.CONSUME(tokens.Include);
    this.CONSUME(tokens.StringLiteral, { LABEL: 'path' });
  });

  // Enhanced entity declaration with full support
  public entityDeclaration = this.RULE('entityDeclaration', () => {
    this.CONSUME(tokens.Entity);
    this.OR([
      { ALT: () => this.CONSUME(tokens.QualifiedIdentifier, { LABEL: 'name' }) },
      { ALT: () => this.CONSUME(tokens.Identifier, { LABEL: 'name' }) }
    ]);
    this.CONSUME(tokens.LCurly);
    
    this.MANY(() => {
      this.OR2([
        { ALT: () => this.SUBRULE(this.docAttribute) },
        { ALT: () => this.SUBRULE(this.pkAttribute) },
        { ALT: () => this.SUBRULE(this.memberDeclaration) }
      ]);
    });
    
    this.CONSUME(tokens.RCurly);
  });

  // Doc attribute
  public docAttribute = this.RULE('docAttribute', () => {
    this.CONSUME(tokens.Doc);
    this.CONSUME(tokens.Equals);
    this.CONSUME(tokens.StringLiteral, { LABEL: 'value' });
  });

  // Primary key attribute
  public pkAttribute = this.RULE('pkAttribute', () => {
    this.CONSUME(tokens.Pk);
    this.CONSUME(tokens.Equals);
    this.OR([
      { ALT: () => this.CONSUME(tokens.Identifier, { LABEL: 'field' }) },
      { ALT: () => this.CONSUME(tokens.QualifiedIdentifier, { LABEL: 'field' }) }
    ]);
  });

  // Member declaration (field, relation, or audit field)
  public memberDeclaration = this.RULE('memberDeclaration', () => {
    this.OR([
      { ALT: () => this.CONSUME(tokens.QualifiedIdentifier, { LABEL: 'name' }) },
      { ALT: () => this.CONSUME(tokens.Identifier, { LABEL: 'name' }) }
    ]);
    this.CONSUME(tokens.Colon);
    this.SUBRULE(this.memberType);
    
    // Optional modifiers/constraints
    this.OPTION(() => {
      this.SUBRULE(this.memberModifiers);
    });
  });

  // Member type (can be field type, relation type, or audit type)
  public memberType = this.RULE('memberType', () => {
    this.OR([
      { ALT: () => this.SUBRULE(this.fieldType) },
      { ALT: () => this.SUBRULE(this.relationType) }
    ]);
    
    // Optional nullable modifier
    this.OPTION(() => {
      this.CONSUME(tokens.Question);
    });
  });

  // Relation type (Entity with cardinality)
  public relationType = this.RULE('relationType', () => {
    this.OR([
      { ALT: () => this.CONSUME(tokens.QualifiedIdentifier, { LABEL: 'targetEntity' }) },
      { ALT: () => this.CONSUME(tokens.Identifier, { LABEL: 'targetEntity' }) }
    ]);
    
    // Cardinality notation
    this.OR2([
      { ALT: () => this.CONSUME(tokens.LParen) && this.CONSUME(tokens.NumberLiteral) && this.CONSUME(tokens.RParen) }, // (1)
      { ALT: () => this.CONSUME(tokens.Star) }, // *
      { ALT: () => this.CONSUME(tokens.LBracket) && this.CONSUME(tokens.RBracket) } // []
    ]);
  });

  // Member modifiers (combines field and relation modifiers)
  public memberModifiers = this.RULE('memberModifiers', () => {
    this.CONSUME(tokens.LParen);
    this.SUBRULE(this.modifierList);
    this.CONSUME(tokens.RParen);
  });

  // Enhanced field declaration with modifiers and constraints
  public fieldDeclaration = this.RULE('fieldDeclaration', () => {
    this.OR([
      { ALT: () => this.CONSUME(tokens.QualifiedIdentifier, { LABEL: 'name' }) },
      { ALT: () => this.CONSUME(tokens.Identifier, { LABEL: 'name' }) }
    ]);
    this.CONSUME(tokens.Colon);
    this.SUBRULE(this.fieldType);
    
    // Optional field modifiers and constraints
    this.OPTION(() => {
      this.SUBRULE(this.fieldModifiers);
    });
  });

  // Enhanced field types with parameters
  public fieldType = this.RULE('fieldType', () => {
    this.OR([
      { ALT: () => this.SUBRULE(this.basicType) },
      { ALT: () => this.SUBRULE(this.enumType) },
      { ALT: () => this.SUBRULE(this.codeType) },
      { ALT: () => this.SUBRULE(this.customType) }
    ]);
    
    // Optional nullable modifier
    this.OPTION(() => {
      this.CONSUME(tokens.Question);
    });
  });

  // Basic types with optional parameters
  public basicType = this.RULE('basicType', () => {
    this.OR([
      { ALT: () => this.CONSUME(tokens.Text) },
      { ALT: () => this.CONSUME(tokens.Email) },
      { ALT: () => this.CONSUME(tokens.Phone) },
      { ALT: () => this.CONSUME(tokens.Int) },
      { ALT: () => this.CONSUME(tokens.Decimal) },
      { ALT: () => this.CONSUME(tokens.Bool) },
      { ALT: () => this.CONSUME(tokens.Date) },
      { ALT: () => this.CONSUME(tokens.DateTime) },
      { ALT: () => this.CONSUME(tokens.Money) },
      { ALT: () => this.CONSUME(tokens.Json) },
      { ALT: () => this.CONSUME(tokens.Address) }
    ]);
    
    // Optional type parameters
    this.OPTION(() => {
      this.CONSUME(tokens.LParen);
      this.SUBRULE(this.typeParameters);
      this.CONSUME(tokens.RParen);
    });
  });

  // Enum type with values
  public enumType = this.RULE('enumType', () => {
    this.CONSUME(tokens.Enum);
    this.OPTION(() => {
      this.CONSUME(tokens.LBracket);
      this.SUBRULE(this.enumValues);
      this.CONSUME(tokens.RBracket);
    });
    
    // Optional default value
    this.OPTION2(() => {
      this.CONSUME(tokens.Equals);
      this.OR([
        { ALT: () => this.CONSUME(tokens.Identifier, { LABEL: 'default' }) },
        { ALT: () => this.CONSUME(tokens.StringLiteral, { LABEL: 'default' }) }
      ]);
    });
  });

  // Code type with auto-generation pattern
  public codeType = this.RULE('codeType', () => {
    this.CONSUME(tokens.Code);
    this.OPTION(() => {
      this.CONSUME(tokens.LParen);
      this.SUBRULE(this.codeParameters);
      this.CONSUME(tokens.RParen);
    });
  });

  // Custom entity type (relation reference)
  public customType = this.RULE('customType', () => {
    this.OR([
      { ALT: () => this.CONSUME(tokens.QualifiedIdentifier, { LABEL: 'typeName' }) },
      { ALT: () => this.CONSUME(tokens.Identifier, { LABEL: 'typeName' }) }
    ]);
    
    // Optional array notation
    this.OPTION(() => {
      this.OR2([
        { ALT: () => this.CONSUME(tokens.LBracket) && this.CONSUME(tokens.RBracket) }, // []
        { ALT: () => this.CONSUME(tokens.Star) } // *
      ]);
    });
  });

  // Type parameters (min..max, precision, etc.)
  public typeParameters = this.RULE('typeParameters', () => {
    this.SUBRULE(this.typeParameter);
    this.MANY(() => {
      this.CONSUME(tokens.Comma);
      this.SUBRULE2(this.typeParameter);
    });
  });

  public typeParameter = this.RULE('typeParameter', () => {
    this.OR([
      { ALT: () => this.SUBRULE(this.rangeParameter) },
      { ALT: () => this.SUBRULE(this.namedParameter) },
      { ALT: () => this.SUBRULE(this.simpleParameter) }
    ]);
  });

  // Range parameter (1..100)
  public rangeParameter = this.RULE('rangeParameter', () => {
    this.CONSUME(tokens.NumberLiteral, { LABEL: 'min' });
    this.CONSUME(tokens.Range);
    this.CONSUME2(tokens.NumberLiteral, { LABEL: 'max' });
  });

  // Named parameter (max=100, auto_seq="ORD-{YYYY}-{####}")
  public namedParameter = this.RULE('namedParameter', () => {
    this.OR([
      { ALT: () => this.CONSUME(tokens.Identifier, { LABEL: 'name' }) },
      { ALT: () => this.CONSUME(tokens.QualifiedIdentifier, { LABEL: 'name' }) }
    ]);
    this.CONSUME(tokens.Equals);
    this.OR2([
      { ALT: () => this.CONSUME(tokens.NumberLiteral, { LABEL: 'value' }) },
      { ALT: () => this.CONSUME(tokens.StringLiteral, { LABEL: 'value' }) },
      { ALT: () => this.CONSUME2(tokens.Identifier, { LABEL: 'value' }) },
      { ALT: () => this.CONSUME(tokens.BooleanLiteral, { LABEL: 'value' }) }
    ]);
  });

  // Simple parameter (just a value)
  public simpleParameter = this.RULE('simpleParameter', () => {
    this.OR([
      { ALT: () => this.CONSUME(tokens.NumberLiteral) },
      { ALT: () => this.CONSUME(tokens.StringLiteral) },
      { ALT: () => this.CONSUME(tokens.Identifier) },
      { ALT: () => this.CONSUME(tokens.BooleanLiteral) }
    ]);
  });

  // Enum values list
  public enumValues = this.RULE('enumValues', () => {
    this.SUBRULE(this.enumValue);
    this.MANY(() => {
      this.CONSUME(tokens.Comma);
      this.SUBRULE2(this.enumValue);
    });
  });

  public enumValue = this.RULE('enumValue', () => {
    this.OR([
      { ALT: () => this.CONSUME(tokens.Identifier) },
      { ALT: () => this.CONSUME(tokens.StringLiteral) }
    ]);
  });

  // Code generation parameters
  public codeParameters = this.RULE('codeParameters', () => {
    this.SUBRULE(this.namedParameter);
    this.MANY(() => {
      this.CONSUME(tokens.Comma);
      this.SUBRULE2(this.namedParameter);
    });
  });

  // Field modifiers (required, unique, i18n, calc, etc.)
  public fieldModifiers = this.RULE('fieldModifiers', () => {
    this.CONSUME(tokens.LParen);
    this.SUBRULE(this.modifierList);
    this.CONSUME(tokens.RParen);
  });

  public modifierList = this.RULE('modifierList', () => {
    this.SUBRULE(this.fieldModifier);
    this.MANY(() => {
      this.CONSUME(tokens.Comma);
      this.SUBRULE2(this.fieldModifier);
    });
  });

  public fieldModifier = this.RULE('fieldModifier', () => {
    this.OR([
      { ALT: () => this.SUBRULE(this.namedModifier) },
      { ALT: () => this.SUBRULE(this.flagModifier) }
    ]);
  });

  // Named modifier (max=100, calc=sum(lines.amount))
  public namedModifier = this.RULE('namedModifier', () => {
    this.OR([
      { ALT: () => this.CONSUME(tokens.Identifier, { LABEL: 'name' }) },
      { ALT: () => this.CONSUME(tokens.QualifiedIdentifier, { LABEL: 'name' }) }
    ]);
    this.CONSUME(tokens.Equals);
    this.SUBRULE(this.modifierValue);
  });

  // Flag modifier (required, unique, i18n)
  public flagModifier = this.RULE('flagModifier', () => {
    this.OR([
      { ALT: () => this.CONSUME(tokens.Identifier) },
      { ALT: () => this.CONSUME(tokens.QualifiedIdentifier) }
    ]);
  });

  // Modifier value (can be expression for calc fields)
  public modifierValue = this.RULE('modifierValue', () => {
    this.OR([
      { ALT: () => this.CONSUME(tokens.NumberLiteral) },
      { ALT: () => this.CONSUME(tokens.StringLiteral) },
      { ALT: () => this.CONSUME(tokens.BooleanLiteral) },
      { ALT: () => this.SUBRULE(this.expression) }
    ]);
  });

  // Simple expression for calculated fields
  public expression = this.RULE('expression', () => {
    this.OR([
      { ALT: () => this.SUBRULE(this.functionCall) },
      { ALT: () => this.SUBRULE(this.fieldReference) },
      { ALT: () => this.SUBRULE(this.arithmeticExpression) }
    ]);
  });

  public functionCall = this.RULE('functionCall', () => {
    this.CONSUME(tokens.Identifier, { LABEL: 'function' });
    this.CONSUME(tokens.LParen);
    this.OPTION(() => {
      this.SUBRULE(this.argumentList);
    });
    this.CONSUME(tokens.RParen);
  });

  public fieldReference = this.RULE('fieldReference', () => {
    this.CONSUME(tokens.QualifiedIdentifier);
  });

  public arithmeticExpression = this.RULE('arithmeticExpression', () => {
    this.SUBRULE(this.term);
    this.MANY(() => {
      this.OR([
        { ALT: () => this.CONSUME(tokens.Plus) },
        { ALT: () => this.CONSUME(tokens.Minus) }
      ]);
      this.SUBRULE2(this.term);
    });
  });

  public term = this.RULE('term', () => {
    this.SUBRULE(this.factor);
    this.MANY(() => {
      this.CONSUME(tokens.Star);
      this.SUBRULE2(this.factor);
    });
  });

  public factor = this.RULE('factor', () => {
    this.OR([
      { ALT: () => this.CONSUME(tokens.NumberLiteral) },
      { ALT: () => this.SUBRULE(this.fieldReference) },
      { ALT: () => this.CONSUME(tokens.LParen) && this.SUBRULE(this.arithmeticExpression) && this.CONSUME(tokens.RParen) }
    ]);
  });

  public argumentList = this.RULE('argumentList', () => {
    this.SUBRULE(this.expression);
    this.MANY(() => {
      this.CONSUME(tokens.Comma);
      this.SUBRULE2(this.expression);
    });
  });

  // Relation declaration (one-to-many, many-to-one, etc.)
  public relationDeclaration = this.RULE('relationDeclaration', () => {
    this.OR([
      { ALT: () => this.CONSUME(tokens.QualifiedIdentifier, { LABEL: 'name' }) },
      { ALT: () => this.CONSUME(tokens.Identifier, { LABEL: 'name' }) }
    ]);
    this.CONSUME(tokens.Colon);
    
    this.OR2([
      { ALT: () => this.CONSUME2(tokens.QualifiedIdentifier, { LABEL: 'targetEntity' }) },
      { ALT: () => this.CONSUME2(tokens.Identifier, { LABEL: 'targetEntity' }) }
    ]);
    
    // Cardinality notation
    this.OR3([
      { ALT: () => this.CONSUME(tokens.LParen) && this.CONSUME(tokens.NumberLiteral) && this.CONSUME(tokens.RParen) }, // (1)
      { ALT: () => this.CONSUME(tokens.Star) }, // *
      { ALT: () => this.CONSUME(tokens.Question) }, // ?
      { ALT: () => this.CONSUME(tokens.LBracket) && this.CONSUME(tokens.RBracket) } // []
    ]);
    
    // Optional relation modifiers
    this.OPTION(() => {
      this.SUBRULE(this.relationModifiers);
    });
  });

  // Relation modifiers (backref, cascade, etc.)
  public relationModifiers = this.RULE('relationModifiers', () => {
    this.CONSUME(tokens.LParen);
    this.SUBRULE(this.relationModifierList);
    this.CONSUME(tokens.RParen);
  });

  public relationModifierList = this.RULE('relationModifierList', () => {
    this.SUBRULE(this.relationModifier);
    this.MANY(() => {
      this.CONSUME(tokens.Comma);
      this.SUBRULE2(this.relationModifier);
    });
  });

  public relationModifier = this.RULE('relationModifier', () => {
    this.OR([
      { ALT: () => this.SUBRULE(this.namedRelationModifier) },
      { ALT: () => this.SUBRULE(this.flagRelationModifier) }
    ]);
  });

  public namedRelationModifier = this.RULE('namedRelationModifier', () => {
    this.CONSUME(tokens.Identifier, { LABEL: 'name' });
    this.CONSUME(tokens.Equals);
    this.OR([
      { ALT: () => this.CONSUME2(tokens.Identifier, { LABEL: 'value' }) },
      { ALT: () => this.CONSUME(tokens.StringLiteral, { LABEL: 'value' }) }
    ]);
  });

  public flagRelationModifier = this.RULE('flagRelationModifier', () => {
    this.CONSUME(tokens.Identifier);
  });

  // Audit fields (created_at, updated_at, etc.)
  public auditFields = this.RULE('auditFields', () => {
    this.OR([
      { ALT: () => this.CONSUME(tokens.QualifiedIdentifier, { LABEL: 'name' }) },
      { ALT: () => this.CONSUME(tokens.Identifier, { LABEL: 'name' }) }
    ]);
    this.CONSUME(tokens.Colon);
    this.CONSUME(tokens.DateTime);
    this.CONSUME(tokens.LParen);
    this.OR2([
      { ALT: () => this.CONSUME2(tokens.QualifiedIdentifier, { LABEL: 'autoType' }) },
      { ALT: () => this.CONSUME2(tokens.Identifier, { LABEL: 'autoType' }) }
    ]);
    this.CONSUME(tokens.RParen);
  });

  // Action declaration with conditions and body
  public actionDeclaration = this.RULE('actionDeclaration', () => {
    this.CONSUME(tokens.Action);
    this.OR([
      { ALT: () => this.CONSUME(tokens.QualifiedIdentifier, { LABEL: 'name' }) },
      { ALT: () => this.CONSUME(tokens.Identifier, { LABEL: 'name' }) }
    ]);
    
    // Optional parameters
    this.OPTION(() => {
      this.CONSUME(tokens.LParen);
      this.OPTION2(() => {
        this.SUBRULE(this.parameterList);
      });
      this.CONSUME(tokens.RParen);
    });
    
    // Optional condition
    this.OPTION3(() => {
      this.CONSUME(tokens.When);
      this.SUBRULE(this.condition);
    });
    
    this.CONSUME(tokens.LCurly);
    this.MANY(() => {
      this.SUBRULE(this.actionStatement);
    });
    this.CONSUME(tokens.RCurly);
  });

  // Parameter list for actions
  public parameterList = this.RULE('parameterList', () => {
    this.SUBRULE(this.parameter);
    this.MANY(() => {
      this.CONSUME(tokens.Comma);
      this.SUBRULE2(this.parameter);
    });
  });

  public parameter = this.RULE('parameter', () => {
    this.OR([
      { ALT: () => this.CONSUME(tokens.Identifier, { LABEL: 'name' }) },
      { ALT: () => this.CONSUME(tokens.QualifiedIdentifier, { LABEL: 'name' }) }
    ]);
    this.CONSUME(tokens.Colon);
    this.OR2([
      { ALT: () => this.CONSUME2(tokens.Identifier, { LABEL: 'type' }) },
      { ALT: () => this.CONSUME2(tokens.QualifiedIdentifier, { LABEL: 'type' }) }
    ]);
  });

  // Condition expression
  public condition = this.RULE('condition', () => {
    this.SUBRULE(this.comparisonExpression);
  });

  public comparisonExpression = this.RULE('comparisonExpression', () => {
    this.SUBRULE(this.fieldReference);
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
      { ALT: () => this.SUBRULE2(this.fieldReference) }
    ]);
  });

  // Action statements
  public actionStatement = this.RULE('actionStatement', () => {
    this.OR([
      { ALT: () => this.SUBRULE(this.assignmentStatement) },
      { ALT: () => this.SUBRULE(this.emitStatement) },
      { ALT: () => this.SUBRULE(this.callStatement) },
      { ALT: () => this.SUBRULE(this.transitionStatement) }
    ]);
  });

  // Assignment statement (field = value)
  public assignmentStatement = this.RULE('assignmentStatement', () => {
    this.SUBRULE(this.fieldReference);
    this.CONSUME(tokens.Equals);
    this.SUBRULE(this.expression);
  });

  // Transition statement (status -> newStatus)
  public transitionStatement = this.RULE('transitionStatement', () => {
    this.SUBRULE(this.fieldReference);
    this.CONSUME(tokens.Arrow);
    this.OR([
      { ALT: () => this.CONSUME(tokens.StringLiteral) },
      { ALT: () => this.CONSUME(tokens.Identifier) }
    ]);
  });

  // Emit statement
  public emitStatement = this.RULE('emitStatement', () => {
    this.CONSUME(tokens.Emit);
    this.OR([
      { ALT: () => this.CONSUME(tokens.QualifiedIdentifier, { LABEL: 'event' }) },
      { ALT: () => this.CONSUME(tokens.Identifier, { LABEL: 'event' }) }
    ]);
    
    // Optional event parameters
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
    this.OR([
      { ALT: () => this.CONSUME(tokens.QualifiedIdentifier, { LABEL: 'target' }) },
      { ALT: () => this.CONSUME(tokens.Identifier, { LABEL: 'target' }) }
    ]);
    
    // Optional call parameters
    this.OPTION(() => {
      this.CONSUME(tokens.LParen);
      this.OPTION2(() => {
        this.SUBRULE(this.argumentList);
      });
      this.CONSUME(tokens.RParen);
    });
  });

  // Workflow declaration
  public workflowDeclaration = this.RULE('workflowDeclaration', () => {
    this.CONSUME(tokens.Workflow);
    this.OR([
      { ALT: () => this.CONSUME(tokens.QualifiedIdentifier, { LABEL: 'name' }) },
      { ALT: () => this.CONSUME(tokens.Identifier, { LABEL: 'name' }) }
    ]);
    this.CONSUME(tokens.For);
    this.OR2([
      { ALT: () => this.CONSUME2(tokens.QualifiedIdentifier, { LABEL: 'entity' }) },
      { ALT: () => this.CONSUME2(tokens.Identifier, { LABEL: 'entity' }) }
    ]);
    
    // Optional initial state
    this.OPTION(() => {
      this.CONSUME(tokens.Initial, { LABEL: 'initial' });
      this.CONSUME(tokens.Equals);
      this.OR3([
        { ALT: () => this.CONSUME3(tokens.Identifier, { LABEL: 'initialState' }) },
        { ALT: () => this.CONSUME(tokens.StringLiteral, { LABEL: 'initialState' }) }
      ]);
    });
    
    this.CONSUME(tokens.LCurly);
    this.MANY(() => {
      this.SUBRULE(this.transitionRule);
    });
    this.CONSUME(tokens.RCurly);
  });

  // Workflow transition rule
  public transitionRule = this.RULE('transitionRule', () => {
    // From state
    this.OR([
      { ALT: () => this.CONSUME(tokens.Identifier, { LABEL: 'fromState' }) },
      { ALT: () => this.CONSUME(tokens.StringLiteral, { LABEL: 'fromState' }) }
    ]);
    
    this.CONSUME(tokens.Arrow);
    
    // To state
    this.OR2([
      { ALT: () => this.CONSUME2(tokens.Identifier, { LABEL: 'toState' }) },
      { ALT: () => this.CONSUME2(tokens.StringLiteral, { LABEL: 'toState' }) }
    ]);
    
    // Optional trigger
    this.OPTION(() => {
      this.CONSUME(tokens.On);
      this.OR3([
        { ALT: () => this.CONSUME3(tokens.Identifier, { LABEL: 'trigger' }) },
        { ALT: () => this.CONSUME3(tokens.StringLiteral, { LABEL: 'trigger' }) }
      ]);
      
      // Optional trigger parameters
      this.OPTION2(() => {
        this.CONSUME(tokens.LParen);
        this.OPTION3(() => {
          this.SUBRULE(this.parameterList);
        });
        this.CONSUME(tokens.RParen);
      });
    });
  });

  // Form declaration
  public formDeclaration = this.RULE('formDeclaration', () => {
    this.CONSUME(tokens.Form);
    this.OR([
      { ALT: () => this.CONSUME(tokens.QualifiedIdentifier, { LABEL: 'name' }) },
      { ALT: () => this.CONSUME(tokens.Identifier, { LABEL: 'name' }) }
    ]);
    this.CONSUME(tokens.For);
    this.OR2([
      { ALT: () => this.CONSUME2(tokens.QualifiedIdentifier, { LABEL: 'entity' }) },
      { ALT: () => this.CONSUME2(tokens.Identifier, { LABEL: 'entity' }) }
    ]);
    
    // Optional layout
    this.OPTION(() => {
      this.CONSUME(tokens.Layout);
      this.CONSUME(tokens.Equals);
      this.OR3([
        { ALT: () => this.CONSUME3(tokens.Identifier, { LABEL: 'layout' }) },
        { ALT: () => this.CONSUME(tokens.StringLiteral, { LABEL: 'layout' }) }
      ]);
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
    
    // Optional collapsible
    this.OPTION(() => {
      this.CONSUME(tokens.Collapsible);
    });
    
    this.CONSUME(tokens.LCurly);
    this.SUBRULE(this.fieldList);
    this.CONSUME(tokens.RCurly);
  });

  // Field list in form
  public fieldList = this.RULE('fieldList', () => {
    this.OR([
      { ALT: () => this.CONSUME(tokens.Identifier) },
      { ALT: () => this.CONSUME(tokens.QualifiedIdentifier) }
    ]);
    this.MANY(() => {
      this.CONSUME(tokens.Comma);
      this.OR2([
        { ALT: () => this.CONSUME2(tokens.Identifier) },
        { ALT: () => this.CONSUME2(tokens.QualifiedIdentifier) }
      ]);
    });
  });

  // Role declaration
  public roleDeclaration = this.RULE('roleDeclaration', () => {
    this.CONSUME(tokens.Role);
    this.OR([
      { ALT: () => this.CONSUME(tokens.QualifiedIdentifier, { LABEL: 'name' }) },
      { ALT: () => this.CONSUME(tokens.Identifier, { LABEL: 'name' }) }
    ]);
    this.CONSUME(tokens.Grants);
    
    // Permissions list
    this.SUBRULE(this.permissionList);
    
    this.CONSUME(tokens.On);
    
    // Entity list
    this.SUBRULE(this.entityList);
    
    // Optional field exceptions
    this.OPTION(() => {
      this.CONSUME(tokens.Except);
      this.CONSUME(tokens.Fields);
      this.SUBRULE(this.fieldList);
    });
  });

  // Permission list (read, write, crud, all, etc.)
  public permissionList = this.RULE('permissionList', () => {
    this.OR([
      { ALT: () => this.CONSUME(tokens.Identifier) },
      { ALT: () => this.CONSUME(tokens.QualifiedIdentifier) },
      { ALT: () => this.CONSUME(tokens.Star) } // all permissions
    ]);
    this.MANY(() => {
      this.CONSUME(tokens.Comma);
      this.OR2([
        { ALT: () => this.CONSUME2(tokens.Identifier) },
        { ALT: () => this.CONSUME2(tokens.QualifiedIdentifier) }
      ]);
    });
  });

  // Entity list
  public entityList = this.RULE('entityList', () => {
    this.OR([
      { ALT: () => this.CONSUME(tokens.Identifier) },
      { ALT: () => this.CONSUME(tokens.QualifiedIdentifier) },
      { ALT: () => this.CONSUME(tokens.Star) } // all entities
    ]);
    this.MANY(() => {
      this.CONSUME(tokens.Comma);
      this.OR2([
        { ALT: () => this.CONSUME2(tokens.Identifier) },
        { ALT: () => this.CONSUME2(tokens.QualifiedIdentifier) }
      ]);
    });
  });

  // List declaration
  public listDeclaration = this.RULE('listDeclaration', () => {
    this.CONSUME(tokens.List);
    this.OR([
      { ALT: () => this.CONSUME(tokens.QualifiedIdentifier, { LABEL: 'name' }) },
      { ALT: () => this.CONSUME(tokens.Identifier, { LABEL: 'name' }) }
    ]);
    
    // Optional list attributes
    this.MANY(() => {
      this.OR2([
        { ALT: () => this.SUBRULE(this.listColumns) },
        { ALT: () => this.SUBRULE(this.listFilters) },
        { ALT: () => this.SUBRULE(this.listSort) },
        { ALT: () => this.SUBRULE(this.listPage) }
      ]);
    });
  });

  // List columns
  public listColumns = this.RULE('listColumns', () => {
    this.CONSUME(tokens.Columns);
    this.CONSUME(tokens.Equals);
    this.CONSUME(tokens.LCurly);
    this.SUBRULE(this.fieldList);
    this.CONSUME(tokens.RCurly);
  });

  // List filters
  public listFilters = this.RULE('listFilters', () => {
    this.CONSUME(tokens.Filters);
    this.CONSUME(tokens.Equals);
    this.CONSUME(tokens.LCurly);
    this.SUBRULE(this.fieldList);
    this.CONSUME(tokens.RCurly);
  });

  // List sort
  public listSort = this.RULE('listSort', () => {
    this.CONSUME(tokens.Sort);
    this.CONSUME(tokens.Equals);
    this.OR([
      { ALT: () => this.CONSUME(tokens.Identifier, { LABEL: 'field' }) },
      { ALT: () => this.CONSUME(tokens.QualifiedIdentifier, { LABEL: 'field' }) }
    ]);
    this.OR2([
      { ALT: () => this.CONSUME(tokens.Asc) },
      { ALT: () => this.CONSUME(tokens.Desc) }
    ]);
  });

  // List page size
  public listPage = this.RULE('listPage', () => {
    this.CONSUME(tokens.Page);
    this.CONSUME(tokens.Equals);
    this.CONSUME(tokens.NumberLiteral, { LABEL: 'pageSize' });
  });

  // Policy declaration
  public policyDeclaration = this.RULE('policyDeclaration', () => {
    this.CONSUME(tokens.Policy);
    this.OR([
      { ALT: () => this.CONSUME(tokens.QualifiedIdentifier, { LABEL: 'target' }) },
      { ALT: () => this.CONSUME(tokens.Identifier, { LABEL: 'target' }) }
    ]);
    this.CONSUME(tokens.Mask);
    this.CONSUME(tokens.Equals);
    this.CONSUME(tokens.StringLiteral, { LABEL: 'maskValue' });
    this.CONSUME(tokens.For);
    this.CONSUME(tokens.Role);
    this.OR2([
      { ALT: () => this.CONSUME2(tokens.QualifiedIdentifier, { LABEL: 'role' }) },
      { ALT: () => this.CONSUME2(tokens.Identifier, { LABEL: 'role' }) }
    ]);
  });

  // On declaration (event handler)
  public onDeclaration = this.RULE('onDeclaration', () => {
    this.CONSUME(tokens.On);
    this.OR([
      { ALT: () => this.CONSUME(tokens.QualifiedIdentifier, { LABEL: 'event' }) },
      { ALT: () => this.CONSUME(tokens.Identifier, { LABEL: 'event' }) }
    ]);
    this.CONSUME(tokens.Do);
    this.CONSUME(tokens.LCurly);
    this.MANY(() => {
      this.SUBRULE(this.actionStatement);
    });
    this.CONSUME(tokens.RCurly);
  });
}

// Create enhanced parser instance
export const enhancedParser = new EnhancedERPParser(); 