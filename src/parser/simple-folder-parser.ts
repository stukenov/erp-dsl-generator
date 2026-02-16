import { CstParser, IToken } from 'chevrotain';
import { allTokens } from './lexer.js';
import * as tokens from './lexer.js';

export class SimpleFolderParser extends CstParser {
  constructor() {
    super(allTokens, {
      recoveryEnabled: true,
      nodeLocationTracking: 'full'
    });
    this.performSelfAnalysis();
  }

  // Entry point - поддерживает разные типы файлов
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
        { ALT: () => this.SUBRULE(this.entityDeclaration) }
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

  // Упрощенная сущность
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

  // Упрощенное поле
  public fieldDeclaration = this.RULE('fieldDeclaration', () => {
    this.CONSUME(tokens.Identifier, { LABEL: 'name' });
    this.CONSUME(tokens.Colon);
    this.SUBRULE(this.fieldType);
    this.OPTION(() => {
      this.SUBRULE(this.fieldModifiers);
    });
  });

  // Упрощенные типы полей
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
      { ALT: () => this.SUBRULE(this.simpleEnum) },
      { ALT: () => this.SUBRULE(this.simpleCode) },
      { ALT: () => this.SUBRULE(this.relationshipType) },
      { ALT: () => this.CONSUME(tokens.Identifier) }
    ]);
  });

  // Упрощенный enum
  public simpleEnum = this.RULE('simpleEnum', () => {
    this.CONSUME(tokens.Enum);
    // Пропускаем сложные конструкции, просто считаем что enum есть
  });

  // Упрощенный код
  public simpleCode = this.RULE('simpleCode', () => {
    this.CONSUME(tokens.Code);
    // Пропускаем модификаторы для простоты
  });

  // Упрощенные связи
  public relationshipType = this.RULE('relationshipType', () => {
    this.CONSUME(tokens.Identifier, { LABEL: 'entityName' });
    this.OPTION(() => {
      this.OR([
        { ALT: () => this.CONSUME(tokens.Star) },
        { ALT: () => this.CONSUME(tokens.Question) },
        { ALT: () => {
          this.CONSUME(tokens.LParen);
          this.CONSUME(tokens.NumberLiteral, { LABEL: 'cardinality' });
          this.CONSUME(tokens.RParen);
        }}
      ]);
    });
  });

  // Упрощенные модификаторы полей
  public fieldModifiers = this.RULE('fieldModifiers', () => {
    this.OPTION(() => {
      this.CONSUME(tokens.LParen);
      this.MANY(() => {
        this.CONSUME(tokens.Identifier, { LABEL: 'modifier' });
        this.OPTION2(() => this.CONSUME(tokens.Comma));
      });
      this.CONSUME(tokens.RParen);
    });
    this.OPTION2(() => {
      this.CONSUME(tokens.Equals);
      this.SUBRULE(this.defaultValue);
    });
    this.OPTION3(() => this.CONSUME(tokens.Question));
  });

  // Значения по умолчанию
  public defaultValue = this.RULE('defaultValue', () => {
    this.OR([
      { ALT: () => this.CONSUME(tokens.NumberLiteral) },
      { ALT: () => this.CONSUME(tokens.StringLiteral) },
      { ALT: () => this.CONSUME(tokens.Identifier) }
    ]);
  });

  // Упрощенные роли
  public roleDeclaration = this.RULE('roleDeclaration', () => {
    this.CONSUME(tokens.Role);
    this.CONSUME(tokens.Identifier, { LABEL: 'name' });
    this.CONSUME(tokens.Grants);
    this.SUBRULE(this.permissions);
  });

  // Упрощенные права
  public permissions = this.RULE('permissions', () => {
    this.OR([
      { ALT: () => {
        this.CONSUME(tokens.Identifier, { LABEL: 'allOrPermission' });
        this.CONSUME(tokens.On);
        this.CONSUME(tokens.Star);
      }},
      { ALT: () => {
        this.SUBRULE(this.permissionList);
        this.CONSUME2(tokens.On);
        this.SUBRULE(this.entityList);
      }}
    ]);
  });

  // Список прав
  public permissionList = this.RULE('permissionList', () => {
    this.CONSUME(tokens.Identifier, { LABEL: 'permission' });
    this.MANY(() => {
      this.CONSUME(tokens.Comma);
      this.CONSUME2(tokens.Identifier, { LABEL: 'permission' });
    });
  });

  // Список сущностей
  public entityList = this.RULE('entityList', () => {
    this.CONSUME(tokens.Identifier, { LABEL: 'entity' });
    this.MANY(() => {
      this.CONSUME(tokens.Comma);
      this.CONSUME2(tokens.Identifier, { LABEL: 'entity' });
    });
  });
}

export const simpleFolderParser = new SimpleFolderParser(); 