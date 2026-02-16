import { CstParser, IToken } from 'chevrotain';
import { allTokens } from './lexer.js';
import * as tokens from './lexer.js';

export class FolderERPParser extends CstParser {
  constructor() {
    super(allTokens, {
      recoveryEnabled: true,
      nodeLocationTracking: 'full'
    });
    this.performSelfAnalysis();
  }

  // Entry point - поддерживает как полные документы, так и отдельные модули
  public erpDocument = this.RULE('erpDocument', () => {
    this.OR([
      { ALT: () => this.SUBRULE(this.fullDocument) },
      { ALT: () => this.SUBRULE(this.moduleOnly) },
      { ALT: () => this.SUBRULE(this.entitiesOnly) }
    ]);
  });

  // Полный документ с заголовком
  public fullDocument = this.RULE('fullDocument', () => {
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
        { ALT: () => this.SUBRULE(this.simpleAction) },
        { ALT: () => this.SUBRULE(this.roleDeclaration) }
      ]);
    });
  });

  // Только модуль (для файлов типа sales.erp)
  public moduleOnly = this.RULE('moduleOnly', () => {
    this.SUBRULE(this.moduleDeclaration);
    this.MANY(() => {
      this.SUBRULE(this.roleDeclaration);
    });
  });

  // Только сущности и роли (для простых файлов)
  public entitiesOnly = this.RULE('entitiesOnly', () => {
    this.MANY(() => {
      this.OR([
        { ALT: () => this.SUBRULE(this.usePackDeclaration) },
        { ALT: () => this.SUBRULE(this.entityDeclaration) },
        { ALT: () => this.SUBRULE(this.simpleAction) },
        { ALT: () => this.SUBRULE(this.roleDeclaration) }
      ]);
    });
  });

  // Модуль
  public moduleDeclaration = this.RULE('moduleDeclaration', () => {
    this.CONSUME(tokens.Module);
    this.CONSUME(tokens.Identifier, { LABEL: 'name' });
    this.CONSUME(tokens.LCurly);
    
    this.MANY(() => {
      this.OR([
        { ALT: () => this.SUBRULE(this.docDeclaration) },
        { ALT: () => this.SUBRULE(this.entityDeclaration) },
        { ALT: () => this.SUBRULE(this.simpleAction) },
        { ALT: () => this.SUBRULE(this.formDeclaration) }
      ]);
    });
    
    this.CONSUME(tokens.RCurly);
  });

  // Use pack declaration
  public usePackDeclaration = this.RULE('usePackDeclaration', () => {
    this.CONSUME(tokens.Use);
    this.CONSUME(tokens.Pack);
    this.CONSUME(tokens.QualifiedIdentifier, { LABEL: 'packName' });
  });

  // Doc declaration
  public docDeclaration = this.RULE('docDeclaration', () => {
    this.CONSUME(tokens.Doc);
    this.CONSUME(tokens.Equals);
    this.CONSUME(tokens.StringLiteral, { LABEL: 'value' });
  });

  // Сущность с поддержкой всех основных конструкций
  public entityDeclaration = this.RULE('entityDeclaration', () => {
    this.CONSUME(tokens.Entity);
    this.CONSUME(tokens.Identifier, { LABEL: 'name' });
    this.CONSUME(tokens.LCurly);
    
    this.MANY(() => {
      this.OR([
        { ALT: () => this.SUBRULE(this.docDeclaration) },
        { ALT: () => this.SUBRULE(this.pkDeclaration) },
        { ALT: () => this.SUBRULE(this.fieldDeclaration) }
      ]);
    });
    
    this.CONSUME(tokens.RCurly);
  });

  // PK declaration
  public pkDeclaration = this.RULE('pkDeclaration', () => {
    this.CONSUME(tokens.Pk);
    this.CONSUME(tokens.Equals);
    this.CONSUME(tokens.Identifier, { LABEL: 'value' });
  });

  // Field declaration с поддержкой модификаторов
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
      { ALT: () => this.CONSUME(tokens.Email) },
      { ALT: () => this.CONSUME(tokens.Phone) },
      { ALT: () => this.CONSUME(tokens.Int) },
      { ALT: () => this.CONSUME(tokens.Bool) },
      { ALT: () => this.CONSUME(tokens.Date) },
      { ALT: () => this.CONSUME(tokens.DateTime) },
      { ALT: () => this.CONSUME(tokens.Money) },
      { ALT: () => this.CONSUME(tokens.Decimal) },
      { ALT: () => this.SUBRULE(this.enumType) },
      { ALT: () => this.SUBRULE(this.codeType) },
      { ALT: () => this.SUBRULE(this.relationshipType) },
      { ALT: () => this.CONSUME(tokens.Identifier) }, // Custom types
      { ALT: () => this.CONSUME(tokens.QualifiedIdentifier) }
    ]);
  });

  // Enum type
  public enumType = this.RULE('enumType', () => {
    this.CONSUME(tokens.Enum);
    this.CONSUME(tokens.LBracket);
    this.CONSUME(tokens.Identifier, { LABEL: 'first' });
    this.MANY(() => {
      this.CONSUME(tokens.Comma);
      this.CONSUME2(tokens.Identifier, { LABEL: 'option' });
    });
    this.CONSUME(tokens.RBracket);
    this.OPTION(() => {
      this.CONSUME(tokens.Equals);
      this.CONSUME3(tokens.Identifier, { LABEL: 'default' });
    });
  });

  // Code type
  public codeType = this.RULE('codeType', () => {
    this.CONSUME(tokens.Code);
    this.OPTION(() => {
      this.CONSUME(tokens.LParen);
      this.MANY(() => {
        this.OR([
          { ALT: () => this.SUBRULE(this.codeModifier) },
          { ALT: () => {
            this.CONSUME(tokens.Comma);
            this.SUBRULE2(this.codeModifier);
          }}
        ]);
      });
      this.CONSUME(tokens.RParen);
    });
  });

  // Code modifier
  public codeModifier = this.RULE('codeModifier', () => {
    this.OR([
      { ALT: () => {
        this.CONSUME(tokens.Identifier, { LABEL: 'key' });
        this.CONSUME(tokens.Assign);
        this.CONSUME(tokens.StringLiteral, { LABEL: 'value' });
      }},
      { ALT: () => this.CONSUME2(tokens.Identifier, { LABEL: 'flag' }) }
    ]);
  });

  // Relationship type
  public relationshipType = this.RULE('relationshipType', () => {
    this.CONSUME(tokens.Identifier, { LABEL: 'entityName' });
    this.OR([
      { ALT: () => {
        this.CONSUME(tokens.LParen);
        this.CONSUME(tokens.NumberLiteral, { LABEL: 'cardinality' });
        this.OPTION(() => {
          this.CONSUME(tokens.Comma);
          this.MANY(() => {
            this.OR2([
              { ALT: () => this.CONSUME2(tokens.Identifier, { LABEL: 'modifier' }) },
              { ALT: () => {
                this.CONSUME3(tokens.Identifier, { LABEL: 'key' });
                this.CONSUME(tokens.Assign);
                this.CONSUME4(tokens.Identifier, { LABEL: 'value' });
              }}
            ]);
            this.OPTION2(() => this.CONSUME2(tokens.Comma));
          });
        });
        this.CONSUME(tokens.RParen);
      }},
      { ALT: () => this.CONSUME(tokens.Star) },
      { ALT: () => this.CONSUME(tokens.Question) }
    ]);
  });

  // Field modifiers
  public fieldModifiers = this.RULE('fieldModifiers', () => {
    this.OPTION(() => {
      this.CONSUME(tokens.LParen);
      this.MANY(() => {
        this.OR([
          { ALT: () => this.SUBRULE(this.fieldModifier) },
          { ALT: () => {
            this.CONSUME(tokens.Comma);
            this.SUBRULE2(this.fieldModifier);
          }}
        ]);
      });
      this.CONSUME(tokens.RParen);
    });
    this.OPTION2(() => {
      this.CONSUME(tokens.Assign);
      this.SUBRULE(this.defaultValue);
    });
    this.OPTION3(() => this.CONSUME(tokens.Question));
  });

  // Field modifier
  public fieldModifier = this.RULE('fieldModifier', () => {
    this.OR([
      { ALT: () => this.CONSUME(tokens.Identifier, { LABEL: 'flag' }) },
      { ALT: () => {
        this.CONSUME2(tokens.Identifier, { LABEL: 'key' });
        this.CONSUME(tokens.Assign);
        this.OR2([
          { ALT: () => this.CONSUME(tokens.NumberLiteral, { LABEL: 'numValue' }) },
          { ALT: () => this.CONSUME(tokens.StringLiteral, { LABEL: 'strValue' }) },
          { ALT: () => this.CONSUME3(tokens.Identifier, { LABEL: 'idValue' }) }
        ]);
      }}
    ]);
  });

  // Default value
  public defaultValue = this.RULE('defaultValue', () => {
    this.OR([
      { ALT: () => this.CONSUME(tokens.NumberLiteral) },
      { ALT: () => this.CONSUME(tokens.StringLiteral) },
      { ALT: () => this.CONSUME(tokens.Identifier) },
      { ALT: () => this.CONSUME(tokens.True) },
      { ALT: () => this.CONSUME(tokens.False) }
    ]);
  });

  // Simple action
  public simpleAction = this.RULE('simpleAction', () => {
    this.CONSUME(tokens.Action);
    this.CONSUME(tokens.Identifier, { LABEL: 'name' });
    this.CONSUME(tokens.LParen);
    this.OPTION(() => {
      this.SUBRULE(this.parameterList);
    });
    this.CONSUME(tokens.RParen);
    this.OPTION2(() => {
      this.CONSUME(tokens.When);
      this.SUBRULE(this.simpleExpression);
    });
    this.CONSUME(tokens.LCurly);
    this.MANY(() => {
      this.SUBRULE(this.actionStatement);
    });
    this.CONSUME(tokens.RCurly);
  });

  // Parameter list
  public parameterList = this.RULE('parameterList', () => {
    this.CONSUME(tokens.Identifier, { LABEL: 'paramName' });
    this.CONSUME(tokens.Colon);
    this.CONSUME2(tokens.Identifier, { LABEL: 'paramType' });
    this.MANY(() => {
      this.CONSUME(tokens.Comma);
      this.CONSUME3(tokens.Identifier, { LABEL: 'paramName' });
      this.CONSUME2(tokens.Colon);
      this.CONSUME4(tokens.Identifier, { LABEL: 'paramType' });
    });
  });

  // Simple expression
  public simpleExpression = this.RULE('simpleExpression', () => {
    this.CONSUME(tokens.Identifier, { LABEL: 'left' });
    this.CONSUME(tokens.Dot);
    this.CONSUME2(tokens.Identifier, { LABEL: 'property' });
    this.CONSUME(tokens.Equal);
    this.CONSUME(tokens.StringLiteral, { LABEL: 'value' });
  });

  // Action statement
  public actionStatement = this.RULE('actionStatement', () => {
    this.OR([
      { ALT: () => this.SUBRULE(this.assignment) },
      { ALT: () => this.SUBRULE(this.emitStatement) },
      { ALT: () => this.SUBRULE(this.callStatement) }
    ]);
  });

  // Assignment
  public assignment = this.RULE('assignment', () => {
    this.CONSUME(tokens.Identifier, { LABEL: 'target' });
    this.CONSUME(tokens.Dot);
    this.CONSUME2(tokens.Identifier, { LABEL: 'property' });
    this.CONSUME(tokens.Assign);
    this.SUBRULE(this.defaultValue);
  });

  // Emit statement
  public emitStatement = this.RULE('emitStatement', () => {
    this.CONSUME(tokens.Emit);
    this.CONSUME(tokens.Identifier, { LABEL: 'eventName' });
    this.CONSUME(tokens.LParen);
    this.OPTION(() => {
      this.CONSUME2(tokens.Identifier, { LABEL: 'param' });
      this.CONSUME(tokens.Dot);
      this.CONSUME3(tokens.Identifier, { LABEL: 'property' });
    });
    this.CONSUME(tokens.RParen);
  });

  // Call statement
  public callStatement = this.RULE('callStatement', () => {
    this.CONSUME(tokens.Call);
    this.CONSUME(tokens.Identifier, { LABEL: 'service' });
    this.CONSUME(tokens.Dot);
    this.CONSUME2(tokens.Identifier, { LABEL: 'method' });
    this.OPTION(() => {
      this.CONSUME(tokens.LParen);
      this.OPTION2(() => {
        this.CONSUME3(tokens.Identifier);
        this.MANY(() => {
          this.CONSUME(tokens.Comma);
          this.CONSUME4(tokens.Identifier);
        });
      });
      this.CONSUME(tokens.RParen);
    });
  });

  // Form declaration
  public formDeclaration = this.RULE('formDeclaration', () => {
    this.CONSUME(tokens.Form);
    this.CONSUME(tokens.Identifier, { LABEL: 'name' });
    this.CONSUME(tokens.For);
    this.CONSUME2(tokens.Identifier, { LABEL: 'entity' });
    this.OPTION(() => {
      this.CONSUME(tokens.Layout);
      this.CONSUME(tokens.Assign);
      this.CONSUME3(tokens.Identifier, { LABEL: 'layoutType' });
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
    this.CONSUME(tokens.StringLiteral, { LABEL: 'title' });
    this.OPTION(() => {
      this.CONSUME(tokens.Identifier, { LABEL: 'modifier' });
    });
    this.CONSUME(tokens.LCurly);
    this.MANY(() => {
      this.CONSUME2(tokens.Identifier, { LABEL: 'field' });
      this.OPTION2(() => this.CONSUME(tokens.Comma));
    });
    this.CONSUME(tokens.RCurly);
  });

  // Role declaration
  public roleDeclaration = this.RULE('roleDeclaration', () => {
    this.CONSUME(tokens.Role);
    this.CONSUME(tokens.Identifier, { LABEL: 'name' });
    this.CONSUME(tokens.Grants);
    this.SUBRULE(this.permissions);
  });

  // Permissions
  public permissions = this.RULE('permissions', () => {
    this.OR([
      { ALT: () => {
        this.CONSUME(tokens.All);
        this.CONSUME(tokens.On);
        this.CONSUME(tokens.Star);
      }},
      { ALT: () => {
        this.SUBRULE(this.permissionList);
        this.CONSUME2(tokens.On);
        this.SUBRULE(this.entityList);
        this.OPTION(() => {
          this.CONSUME(tokens.Except);
          this.CONSUME(tokens.Fields);
          this.SUBRULE2(this.entityList);
        });
      }}
    ]);
  });

  // Permission list
  public permissionList = this.RULE('permissionList', () => {
    this.OR([
      { ALT: () => this.CONSUME(tokens.Identifier, { LABEL: 'permission' }) },
      { ALT: () => this.CONSUME(tokens.Crud) },
      { ALT: () => this.CONSUME(tokens.Read) },
      { ALT: () => this.CONSUME(tokens.Create) },
      { ALT: () => this.CONSUME(tokens.Update) }
    ]);
    this.MANY(() => {
      this.CONSUME(tokens.Comma);
      this.OR2([
        { ALT: () => this.CONSUME2(tokens.Identifier, { LABEL: 'permission' }) },
        { ALT: () => this.CONSUME2(tokens.Read) },
        { ALT: () => this.CONSUME2(tokens.Create) },
        { ALT: () => this.CONSUME2(tokens.Update) }
      ]);
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

export const folderParser = new FolderERPParser(); 