// Canonical Intermediate Representation (CIR) Types
export interface CIRDocument {
  metadata: CIRMetadata;
  modules: Record<string, CIRModule>;
  conventionPacks: string[];
}

export interface CIRMetadata {
  name: string;
  version: string;
  schemaVersion: string;
  generatedAt: string;
  sourceFiles: string[];
}

export interface CIRModule {
  name: string;
  entities: Record<string, CIREntity>;
  actions: Record<string, CIRAction>;
  forms?: Record<string, CIRForm>;
  roles?: Record<string, CIRRole>;
}

export interface CIREntity {
  name: string;
  doc?: string;
  pk: string;
  tableName?: string;
  fields: Record<string, CIRField>;
  relations: Record<string, CIRRelation>;
  attributes: Record<string, any>;
  audit: CIRAuditConfig;
  permissions: CIRPermissions;
}

export interface CIRField {
  name: string;
  type: CIRFieldType;
  constraints: CIRFieldConstraints;
  semantics?: string;
  ui?: CIRFieldUI;
  permissions?: CIRFieldPermissions;
}

export interface CIRFieldType {
  baseType: 'string' | 'number' | 'boolean' | 'date' | 'datetime' | 'uuid' | 'json' | 'enum' | 'struct';
  subType?: string; // email, phone, money, etc.
  precision?: number;
  scale?: number;
  enumValues?: string[];
  structRef?: string;
}

export interface CIRFieldConstraints {
  required: boolean;
  unique: boolean;
  nullable: boolean;
  min?: number;
  max?: number;
  pattern?: string;
  default?: any;
  autoGenerate?: 'uuid' | 'sequence' | 'timestamp';
}

export interface CIRFieldUI {
  widget?: string;
  label?: string;
  placeholder?: string;
  help?: string;
  i18n?: boolean;
}

export interface CIRFieldPermissions {
  read: string[];
  write: string[];
  mask?: string;
}

export interface CIRRelation {
  name: string;
  targetEntity: string;
  type: 'oneToOne' | 'oneToMany' | 'manyToOne' | 'manyToMany';
  foreignKey?: string;
  backref?: string;
  cascade?: boolean;
  throughTable?: string;
}

export interface CIRAuditConfig {
  enabled: boolean;
  createdAtField?: string;
  updatedAtField?: string;
  createdByField?: string;
  updatedByField?: string;
}

export interface CIRPermissions {
  create: string[];
  read: string[];
  update: string[];
  delete: string[];
}

export interface CIRAction {
  name: string;
  parameters: Record<string, CIRActionParameter>;
  condition?: string;
  statements: CIRStatement[];
  permissions: string[];
}

export interface CIRActionParameter {
  name: string;
  type: string;
  required: boolean;
}

export interface CIRStatement {
  type: 'assignment' | 'emit' | 'call' | 'conditional';
  target?: string;
  value?: string;
  event?: string;
  function?: string;
  parameters?: Record<string, any>;
  condition?: string;
  thenStatements?: CIRStatement[];
  elseStatements?: CIRStatement[];
}

export interface CIRForm {
  name: string;
  entityName: string;
  layout: 'single' | '2col' | '3col' | 'tabs';
  groups: CIRFormGroup[];
  permissions: string[];
}

export interface CIRFormGroup {
  name: string;
  fields: string[];
  collapsible?: boolean;
  defaultExpanded?: boolean;
}

export interface CIRRole {
  name: string;
  grants: CIRGrant[];
  inherits?: string[];
}

export interface CIRGrant {
  permissions: ('create' | 'read' | 'update' | 'delete')[];
  entities: string[];
  fields?: string[];
  exceptions?: string[];
  condition?: string;
}

// Generation context
export interface GenerationContext {
  cir: CIRDocument;
  targetLanguage: 'typescript' | 'python' | 'sql';
  outputDir: string;
  conventionPacks: ConventionPack[];
  options: GenerationOptions;
}

export interface ConventionPack {
  name: string;
  version: string;
  types: Record<string, ConventionType>;
  rules: Record<string, ConventionRule>;
  templates: Record<string, string>;
}

export interface ConventionType {
  baseType: string;
  validation?: any;
  dbMapping?: any;
  uiWidget?: string;
}

export interface ConventionRule {
  name: string;
  applies: string[];
  transforms: any[];
}

export interface GenerationOptions {
  skipExisting?: boolean;
  generateTests?: boolean;
  generateDocs?: boolean;
  dbDialect?: 'postgresql' | 'mysql' | 'sqlite';
} 