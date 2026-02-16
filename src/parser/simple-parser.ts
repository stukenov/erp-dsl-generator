import { CstParser, IToken } from 'chevrotain';
import { allTokens } from './lexer.js';
import * as tokens from './lexer.js';

export class SimpleERPParser extends CstParser {
  constructor() {
    super(allTokens, {
      recoveryEnabled: true,
      nodeLocationTracking: 'full'
    });
    this.performSelfAnalysis();
  }

  // Entry point - поддерживает полные документы и модульные файлы
  public erpDocument = this.RULE('erpDocument', () => {
    this.OR([
      { ALT: () => this.SUBRULE(this.fullDocument) },
      { ALT: () => this.SUBRULE(this.moduleDocument) },
      { ALT: () => this.SUBRULE(this.entitiesDocument) }
    ]);
  });

  // Полный документ с заголовком erp
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

  // Документ с одним модулем (для файлов типа sales.erp)
  public moduleDocument = this.RULE('moduleDocument', () => {
    this.SUBRULE(this.moduleDeclaration);
    this.MANY(() => {
      this.SUBRULE(this.roleDeclaration);
    });
  });

  // Документ только с сущностями (для простых файлов)
  public entitiesDocument = this.RULE('entitiesDocument', () => {
    this.MANY(() => {
      this.OR([
        { ALT: () => this.SUBRULE(this.usePackDeclaration) },
        { ALT: () => this.SUBRULE(this.entityDeclaration) },
        { ALT: () => this.SUBRULE(this.simpleAction) },
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
        { ALT: () => this.SUBRULE(this.docDeclaration) },
        { ALT: () => this.SUBRULE(this.entityDeclaration) },
        { ALT: () => this.SUBRULE(this.simpleAction) }
      ]);
    });
    
    this.CONSUME(tokens.RCurly);
  });

  // Doc declaration (для модулей и сущностей)
  public docDeclaration = this.RULE('docDeclaration', () => {
    this.CONSUME(tokens.Doc);
    this.CONSUME(tokens.Equals);
    this.CONSUME(tokens.StringLiteral, { LABEL: 'value' });
  });

  // Упрощенная сущность - только базовые поля
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
        { ALT: () => this.SUBRULE(this.simpleField) }
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

  // PK attribute
  public pkAttribute = this.RULE('pkAttribute', () => {
    this.CONSUME(tokens.Pk);
    this.CONSUME(tokens.Equals);
    this.CONSUME(tokens.Identifier, { LABEL: 'value' });
  });

  // Упрощенное поле - только базовые типы
  public simpleField = this.RULE('simpleField', () => {
    this.OR([
      { ALT: () => this.CONSUME(tokens.QualifiedIdentifier, { LABEL: 'name' }) },
      { ALT: () => this.CONSUME(tokens.Identifier, { LABEL: 'name' }) }
    ]);
    this.CONSUME(tokens.Colon);
    this.SUBRULE(this.simpleType);
  });

  // Упрощенные типы
  public simpleType = this.RULE('simpleType', () => {
    this.OR([
      { ALT: () => this.CONSUME(tokens.Text) },
      { ALT: () => this.CONSUME(tokens.Email) },
      { ALT: () => this.CONSUME(tokens.Phone) },
      { ALT: () => this.CONSUME(tokens.Int) },
      { ALT: () => this.CONSUME(tokens.Bool) },
      { ALT: () => this.CONSUME(tokens.Date) },
      { ALT: () => this.CONSUME(tokens.DateTime) },
      { ALT: () => this.CONSUME(tokens.Money) },
      { ALT: () => this.CONSUME(tokens.Enum) },
      { ALT: () => this.CONSUME(tokens.QualifiedIdentifier) }, // Custom type or relation
      { ALT: () => this.CONSUME(tokens.Identifier) }
    ]);
  });

  // Упрощенное действие
  public simpleAction = this.RULE('simpleAction', () => {
    this.CONSUME(tokens.Action);
    this.OR([
      { ALT: () => this.CONSUME(tokens.QualifiedIdentifier, { LABEL: 'name' }) },
      { ALT: () => this.CONSUME(tokens.Identifier, { LABEL: 'name' }) }
    ]);
    this.CONSUME(tokens.LCurly);
    
    this.MANY(() => {
      this.SUBRULE(this.simpleStatement);
    });
    
    this.CONSUME(tokens.RCurly);
  });

  // Упрощенное выражение
  public simpleStatement = this.RULE('simpleStatement', () => {
    this.OR([
      { ALT: () => this.SUBRULE(this.emitStatement) },
      { ALT: () => this.SUBRULE(this.callStatement) }
    ]);
  });

  // Emit statement
  public emitStatement = this.RULE('emitStatement', () => {
    this.CONSUME(tokens.Emit);
    this.OR([
      { ALT: () => this.CONSUME(tokens.QualifiedIdentifier, { LABEL: 'event' }) },
      { ALT: () => this.CONSUME(tokens.Identifier, { LABEL: 'event' }) }
    ]);
  });

  // Call statement
  public callStatement = this.RULE('callStatement', () => {
    this.CONSUME(tokens.Call);
    this.OR([
      { ALT: () => this.CONSUME(tokens.QualifiedIdentifier, { LABEL: 'target' }) },
      { ALT: () => this.CONSUME(tokens.Identifier, { LABEL: 'target' }) }
    ]);
  });

  // Упрощенная роль
  public roleDeclaration = this.RULE('roleDeclaration', () => {
    this.CONSUME(tokens.Role);
    this.OR([
      { ALT: () => this.CONSUME(tokens.QualifiedIdentifier, { LABEL: 'name' }) },
      { ALT: () => this.CONSUME(tokens.Identifier, { LABEL: 'name' }) }
    ]);
    this.CONSUME(tokens.Grants);
    this.OR2([
      { ALT: () => this.CONSUME2(tokens.QualifiedIdentifier, { LABEL: 'permission' }) },
      { ALT: () => this.CONSUME2(tokens.Identifier, { LABEL: 'permission' }) }
    ]);
    this.CONSUME(tokens.On);
    this.OR3([
      { ALT: () => this.CONSUME3(tokens.QualifiedIdentifier, { LABEL: 'target' }) },
      { ALT: () => this.CONSUME3(tokens.Identifier, { LABEL: 'target' }) }
    ]);
  });
}

// Create parser instance
export const simpleParser = new SimpleERPParser(); 