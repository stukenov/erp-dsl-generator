// AST Types for ERP DSL
export interface ASTNode {
  type: string;
  location?: SourceLocation;
}

export interface SourceLocation {
  start: { line: number; column: number };
  end: { line: number; column: number };
}

export interface ERPDocument extends ASTNode {
  type: 'ERPDocument';
  name: string;
  version: string;
  packs: UsePackDeclaration[];
  modules: ModuleDeclaration[];
  entities: EntityDeclaration[];
  actions: ActionDeclaration[];
  workflows: WorkflowDeclaration[];
  forms: FormDeclaration[];
  roles: RoleDeclaration[];
}

export interface UsePackDeclaration extends ASTNode {
  type: 'UsePackDeclaration';
  packName: string;
}

export interface ModuleDeclaration extends ASTNode {
  type: 'ModuleDeclaration';
  name: string;
  includes: string[];
  entities: EntityDeclaration[];
  actions: ActionDeclaration[];
}

export interface EntityDeclaration extends ASTNode {
  type: 'EntityDeclaration';
  name: string;
  doc?: string;
  pk?: string;
  fields: FieldDeclaration[];
  relations: RelationDeclaration[];
  attributes: EntityAttribute[];
}

export interface FieldDeclaration extends ASTNode {
  type: 'FieldDeclaration';
  name: string;
  fieldType: FieldType;
  modifiers: FieldModifier[];
}

export interface FieldType extends ASTNode {
  type: 'FieldType';
  name: string;
  parameters: FieldTypeParameter[];
  nullable?: boolean;
  array?: boolean;
}

export interface FieldTypeParameter extends ASTNode {
  type: 'FieldTypeParameter';
  name?: string;
  value: string | number | boolean | string[];
}

export interface FieldModifier extends ASTNode {
  type: 'FieldModifier';
  name: string;
  value?: string | number | boolean;
}

export interface RelationDeclaration extends ASTNode {
  type: 'RelationDeclaration';
  name: string;
  targetEntity: string;
  cardinality: 'one' | 'many' | 'optional';
  modifiers: RelationModifier[];
}

export interface RelationModifier extends ASTNode {
  type: 'RelationModifier';
  name: string;
  value?: string;
}

export interface EntityAttribute extends ASTNode {
  type: 'EntityAttribute';
  name: string;
  value: string;
}

export interface ActionDeclaration extends ASTNode {
  type: 'ActionDeclaration';
  name: string;
  parameters: ParameterDeclaration[];
  condition?: ConditionExpression;
  body: StatementNode[];
}

export interface ParameterDeclaration extends ASTNode {
  type: 'ParameterDeclaration';
  name: string;
  paramType: string;
  required?: boolean;
}

export interface ConditionExpression extends ASTNode {
  type: 'ConditionExpression';
  expression: string;
}

export interface StatementNode extends ASTNode {
  type: 'AssignmentStatement' | 'EmitStatement' | 'CallStatement' | 'TransitionStatement' | 'ExpressionStatement';
}

export interface AssignmentStatement extends StatementNode {
  type: 'AssignmentStatement';
  target: string;
  value: string;
}

export interface EmitStatement extends StatementNode {
  type: 'EmitStatement';
  event: string;
  parameters?: string[];
}

export interface CallStatement extends StatementNode {
  type: 'CallStatement';
  target: string;
  parameters?: string[];
}

export interface TransitionStatement extends StatementNode {
  type: 'TransitionStatement';
  field: string;
  toState: string;
}

export interface ExpressionStatement extends StatementNode {
  type: 'ExpressionStatement';
  expression: string;
}

// Workflow declarations
export interface WorkflowDeclaration extends ASTNode {
  type: 'WorkflowDeclaration';
  name: string;
  entityName: string;
  initialState?: string;
  transitions: TransitionRule[];
}

export interface TransitionRule extends ASTNode {
  type: 'TransitionRule';
  fromState: string;
  toState: string;
  trigger?: string;
  parameters?: ParameterDeclaration[];
  condition?: ConditionExpression;
}

export interface FormDeclaration extends ASTNode {
  type: 'FormDeclaration';
  name: string;
  entityName: string;
  layout?: string;
  groups: FormGroup[];
}

export interface FormGroup extends ASTNode {
  type: 'FormGroup';
  name: string;
  fields: string[];
  collapsible?: boolean;
  defaultExpanded?: boolean;
}

export interface FormGroupAttribute extends ASTNode {
  type: 'FormGroupAttribute';
  name: string;
  value: string | boolean;
}

export interface RoleDeclaration extends ASTNode {
  type: 'RoleDeclaration';
  name: string;
  permissions: string[];
  entities: string[];
  exceptFields?: string[];
}

export interface GrantSpec extends ASTNode {
  type: 'GrantSpec';
  permissions: string[];
  target: string;
  exceptions?: string[];
}

// Expression types for calculated fields
export interface Expression extends ASTNode {
  type: 'FunctionCall' | 'FieldReference' | 'ArithmeticExpression' | 'Literal';
}

export interface FunctionCall extends Expression {
  type: 'FunctionCall';
  functionName: string;
  arguments: Expression[];
}

export interface FieldReference extends Expression {
  type: 'FieldReference';
  path: string;
}

export interface ArithmeticExpression extends Expression {
  type: 'ArithmeticExpression';
  operator: '+' | '-' | '*' | '/' | '%';
  left: Expression;
  right: Expression;
}

export interface Literal extends Expression {
  type: 'Literal';
  value: string | number | boolean;
}

// Job declarations (for background jobs)
export interface JobDeclaration extends ASTNode {
  type: 'JobDeclaration';
  name: string;
  schedule?: string;
  doc?: string;
  body: StatementNode[];
}

// View declarations (for materialized views)
export interface ViewDeclaration extends ASTNode {
  type: 'ViewDeclaration';
  name: string;
  doc?: string;
  basedOn: string[];
  filters?: ConditionExpression[];
  aggregations?: AggregationSpec[];
}

export interface AggregationSpec extends ASTNode {
  type: 'AggregationSpec';
  function: 'sum' | 'count' | 'avg' | 'min' | 'max';
  field: string;
  alias?: string;
  groupBy?: string[];
} 