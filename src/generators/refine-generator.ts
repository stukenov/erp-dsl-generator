import { CIRDocument, CIREntity, CIRField, CIRAction } from '../types/cir.js';

export class RefineGenerator {
  // Санитизация имен полей для валидных идентификаторов
  private sanitizeFieldName(fieldName: string): string {
    if (!fieldName) return 'field';
    
    // Заменяем точки на подчеркивания и другие недопустимые символы
    return fieldName
      .replace(/\./g, '_')
      .replace(/[^a-zA-Z0-9_]/g, '_')
      .replace(/^[0-9]/, '_$&') // Добавляем подчеркивание если начинается с цифры
      .toLowerCase();
  }

  public generateFrontend(cir: CIRDocument): Map<string, string> {
    const files = new Map<string, string>();
    
    // Generate package.json
    files.set('package.json', this.generatePackageJson(cir));
    
    // Generate main app files
    files.set('src/App.tsx', this.generateApp(cir));
    files.set('src/main.tsx', this.generateMain());
    files.set('index.html', this.generateIndexHtml(cir));
    
    // Generate types
    files.set('src/types/index.ts', this.generateTypes(cir));
    
    // Generate API client
    files.set('src/providers/dataProvider.ts', this.generateDataProvider(cir));
    files.set('src/providers/authProvider.ts', this.generateAuthProvider());
    
    // Generate pages for each entity
    for (const moduleName in cir.modules) {
      const module = cir.modules[moduleName];
      for (const entityName in module.entities) {
        const entity = module.entities[entityName];
        
        // Skip empty entities
        if (!entityName || !entity.name || entityName.trim() === '') {
          continue;
        }
        
        // List page
        files.set(`src/pages/${entityName.toLowerCase()}/list.tsx`, this.generateListPage(entity, cir));
        
        // Create page  
        files.set(`src/pages/${entityName.toLowerCase()}/create.tsx`, this.generateCreatePage(entity, cir));
        
        // Edit page
        files.set(`src/pages/${entityName.toLowerCase()}/edit.tsx`, this.generateEditPage(entity, cir));
        
        // Show page
        files.set(`src/pages/${entityName.toLowerCase()}/show.tsx`, this.generateShowPage(entity, cir));
        
        // Index file for easy imports
        files.set(`src/pages/${entityName.toLowerCase()}/index.ts`, this.generatePageIndex(entity));
      }
    }
    
    // Generate components
    files.set('src/components/layout/Header.tsx', this.generateHeader(cir));
    files.set('src/components/layout/Sider.tsx', this.generateSider(cir));
    files.set('src/components/layout/Title.tsx', this.generateTitle(cir));
    
    // Generate utility files
    files.set('src/utils/constants.ts', this.generateConstants(cir));
    files.set('src/utils/formatters.ts', this.generateFormatters());
    
    // Generate config files
    files.set('vite.config.ts', this.generateViteConfig());
    files.set('tsconfig.json', this.generateTsConfig());
    files.set('tsconfig.node.json', this.generateTsConfigNode());
    
    // Generate README
    files.set('README.md', this.generateReadme(cir));
    
    return files;
  }

  private generatePackageJson(cir: CIRDocument): string {
    const packageJson = {
      name: `${cir.metadata.name.toLowerCase()}-admin`,
      version: cir.metadata.version,
      description: `Admin panel for ${cir.metadata.name} built with Refine`,
      type: 'module',
      scripts: {
        dev: 'vite',
        build: 'tsc && vite build',
        preview: 'vite preview',
        lint: 'eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0'
      },
      dependencies: {
        '@refinedev/core': '^4.47.1',
        '@refinedev/antd': '^5.37.4',
        '@refinedev/simple-rest': '^4.5.4',
        '@refinedev/react-router-v6': '^4.5.5',
        '@refinedev/cli': '^2.16.21',
        '@refinedev/devtools': '^1.1.32',
        '@refinedev/kbar': '^1.3.6',
        'react': '^18.2.0',
        'react-dom': '^18.2.0',
        'react-router-dom': '^6.20.0',
        'antd': '^5.12.8',
        '@ant-design/icons': '^5.2.6',
        'dayjs': '^1.11.10',
        'axios': '^1.6.0'
      },
      devDependencies: {
        '@types/react': '^18.2.37',
        '@types/react-dom': '^18.2.15',
        '@typescript-eslint/eslint-plugin': '^6.10.0',
        '@typescript-eslint/parser': '^6.10.0',
        '@vitejs/plugin-react': '^4.1.1',
        'eslint': '^8.53.0',
        'eslint-plugin-react-hooks': '^4.6.0',
        'eslint-plugin-react-refresh': '^0.4.4',
        'typescript': '^5.2.2',
        'vite': '^4.5.0'
      }
    };
    
    return JSON.stringify(packageJson, null, 2);
  }

  private generateApp(cir: CIRDocument): string {
    const lines: string[] = [];
    
    lines.push('import React from "react";');
    lines.push('import { Refine } from "@refinedev/core";');
    lines.push('import { DevtoolsPanel, DevtoolsProvider } from "@refinedev/devtools";');
    lines.push('import { RefineKbar, RefineKbarProvider } from "@refinedev/kbar";');
    lines.push('import {');
    lines.push('  AuthPage,');
    lines.push('  ErrorComponent,');
    lines.push('  ThemedLayoutV2,');
    lines.push('  ThemedSiderV2,');
    lines.push('  useNotificationProvider,');
    lines.push('} from "@refinedev/antd";');
    lines.push('import "@refinedev/antd/dist/reset.css";');
    lines.push('import routerBindings, {');
    lines.push('  DocumentTitleHandler,');
    lines.push('  NavigateToResource,');
    lines.push('  UnsavedChangesNotifier,');
    lines.push('} from "@refinedev/react-router-v6";');
    lines.push('import dataProvider from "./providers/dataProvider";');
    lines.push('import authProvider from "./providers/authProvider";');
    lines.push('import { BrowserRouter, Route, Routes, Outlet } from "react-router-dom";');
    lines.push('import { ConfigProvider, App as AntdApp } from "antd";');
    lines.push('import ruRU from "antd/locale/ru_RU";');
    lines.push('');

    // Import pages
    for (const moduleName in cir.modules) {
      const module = cir.modules[moduleName];
      for (const entityName in module.entities) {
        const entity = module.entities[entityName];
        
        // Skip empty entities
        if (!entityName || !entity.name || entityName.trim() === '') {
          continue;
        }
        const lowerName = entityName.toLowerCase();
        lines.push(`import {`);
        lines.push(`  ${entityName}List,`);
        lines.push(`  ${entityName}Create,`);
        lines.push(`  ${entityName}Edit,`);
        lines.push(`  ${entityName}Show,`);
        lines.push(`} from "./pages/${lowerName}";`);
      }
    }

    lines.push('');
    lines.push('import { Header } from "./components/layout/Header";');
    lines.push('import { Title } from "./components/layout/Title";');
    lines.push('');

    lines.push('function App() {');
    lines.push('  return (');
    lines.push('    <BrowserRouter>');
    lines.push('      <ConfigProvider locale={ruRU}>');
    lines.push('        <RefineKbarProvider>');
    lines.push('          <AntdApp>');
    lines.push('            <DevtoolsProvider>');
    lines.push('              <Refine');
    lines.push('                dataProvider={dataProvider}');
    lines.push('                authProvider={authProvider}');
    lines.push('                notificationProvider={useNotificationProvider}');
    lines.push('                routerProvider={routerBindings}');
    lines.push('                resources={[');

    // Generate resources for each entity
    for (const moduleName in cir.modules) {
      const module = cir.modules[moduleName];
      for (const entityName in module.entities) {
        const entity = module.entities[entityName];
        
        // Skip empty entities
        if (!entityName || !entity.name || entityName.trim() === '') {
          continue;
        }
        const lowerName = entityName.toLowerCase();
        const pluralName = lowerName + 's';
        lines.push('                  {');
        lines.push(`                    name: "${pluralName}",`);
        lines.push(`                    list: "/${pluralName}",`);
        lines.push(`                    create: "/${pluralName}/create",`);
        lines.push(`                    edit: "/${pluralName}/edit/:id",`);
        lines.push(`                    show: "/${pluralName}/show/:id",`);
        lines.push(`                    meta: {`);
        lines.push(`                      canDelete: true,`);
        lines.push(`                      label: "${this.getEntityDisplayName(entityName)}",`);
        lines.push('                    },');
        lines.push('                  },');
      }
    }

    lines.push('                ]}');
    lines.push('                options={{');
    lines.push('                  syncWithLocation: true,');
    lines.push('                  warnWhenUnsavedChanges: true,');
    lines.push('                  useNewQueryKeys: true,');
    lines.push('                  projectId: "generated-app",');
    lines.push('                }}');
    lines.push('              >');
    lines.push('                <Routes>');
    lines.push('                  <Route');
    lines.push('                    element={');
    lines.push('                      <ThemedLayoutV2');
    lines.push('                        Header={() => <Header sticky />}');
    lines.push('                        Sider={(props) => <ThemedSiderV2 {...props} fixed />}');
    lines.push('                        Title={Title}');
    lines.push('                      >');
    lines.push('                        <Outlet />');
    lines.push('                      </ThemedLayoutV2>');
    lines.push('                    }');
    lines.push('                  >');
    lines.push('                    <Route');
    lines.push('                      index');
    lines.push('                      element={<NavigateToResource resource="' + Object.keys(cir.modules)[0]?.toLowerCase() + 's" />}');
    lines.push('                    />');

    // Generate routes for each entity
    for (const moduleName in cir.modules) {
      const module = cir.modules[moduleName];
      for (const entityName in module.entities) {
        const entity = module.entities[entityName];
        
        // Skip empty entities
        if (!entityName || !entity.name || entityName.trim() === '') {
          continue;
        }
        const lowerName = entityName.toLowerCase();
        const pluralName = lowerName + 's';
        lines.push(`                    <Route path="/${pluralName}">`);
        lines.push(`                      <Route index element={<${entityName}List />} />`);
        lines.push(`                      <Route path="create" element={<${entityName}Create />} />`);
        lines.push(`                      <Route path="edit/:id" element={<${entityName}Edit />} />`);
        lines.push(`                      <Route path="show/:id" element={<${entityName}Show />} />`);
        lines.push('                    </Route>');
      }
    }

    lines.push('                    <Route path="*" element={<ErrorComponent />} />');
    lines.push('                  </Route>');
    lines.push('                  <Route');
    lines.push('                    path="/login"');
    lines.push('                    element={');
    lines.push('                      <AuthPage');
    lines.push('                        type="login"');
    lines.push(`                        title="${cir.metadata.name}"`);
    lines.push('                        formProps={{');
    lines.push('                          initialValues: {');
    lines.push('                            email: "demo@example.com",');
    lines.push('                            password: "demo",');
    lines.push('                          },');
    lines.push('                        }}');
    lines.push('                      />');
    lines.push('                    }');
    lines.push('                  />');
    lines.push('                </Routes>');
    lines.push('');
    lines.push('                <RefineKbar />');
    lines.push('                <UnsavedChangesNotifier />');
    lines.push('                <DocumentTitleHandler />');
    lines.push('              </Refine>');
    lines.push('              <DevtoolsPanel />');
    lines.push('            </DevtoolsProvider>');
    lines.push('          </AntdApp>');
    lines.push('        </RefineKbarProvider>');
    lines.push('      </ConfigProvider>');
    lines.push('    </BrowserRouter>');
    lines.push('  );');
    lines.push('}');
    lines.push('');
    lines.push('export default App;');

    return lines.join('\n');
  }

  private generateMain(): string {
    const lines: string[] = [];
    
    lines.push('import React from "react";');
    lines.push('import { createRoot } from "react-dom/client";');
    lines.push('import App from "./App";');
    lines.push('');
    lines.push('const container = document.getElementById("root") as HTMLElement;');
    lines.push('const root = createRoot(container);');
    lines.push('');
    lines.push('root.render(');
    lines.push('  <React.StrictMode>');
    lines.push('    <App />');
    lines.push('  </React.StrictMode>');
    lines.push(');');
    
    return lines.join('\n');
  }

  private generateIndexHtml(cir: CIRDocument): string {
    const lines: string[] = [];
    
    lines.push('<!DOCTYPE html>');
    lines.push('<html lang="ru">');
    lines.push('<head>');
    lines.push('  <meta charset="UTF-8" />');
    lines.push('  <link rel="icon" type="image/svg+xml" href="/vite.svg" />');
    lines.push('  <meta name="viewport" content="width=device-width, initial-scale=1.0" />');
    lines.push(`  <title>${cir.metadata.name} - Панель управления</title>`);
    lines.push('</head>');
    lines.push('<body>');
    lines.push('  <div id="root"></div>');
    lines.push('  <script type="module" src="/src/main.tsx"></script>');
    lines.push('</body>');
    lines.push('</html>');
    
    return lines.join('\n');
  }

  private generateTypes(cir: CIRDocument): string {
    const lines: string[] = [];
    
    lines.push('// Generated types for API');
    lines.push('export interface BaseEntity {');
    lines.push('  id: string;');
    lines.push('  created_at: string;');
    lines.push('  updated_at: string;');
    lines.push('}');
    lines.push('');
    
    // Generate entity types
    for (const moduleName in cir.modules) {
      const module = cir.modules[moduleName];
      
      for (const entityName in module.entities) {
        const entity = module.entities[entityName];
        
        // Skip empty entities
        if (!entityName || !entity.name || entityName.trim() === '') {
          continue;
        }
        lines.push(`export interface ${entityName} extends BaseEntity {`);
        
        // Add fields
        for (const fieldName in entity.fields) {
          const field = entity.fields[fieldName];
          if (fieldName === 'id' || fieldName === 'created_at' || fieldName === 'updated_at') {
            continue; // Skip base fields
          }
          
          const sanitizedFieldName = this.sanitizeFieldName(fieldName);
          const tsType = this.mapFieldTypeToTypeScript(field);
          const optional = field.constraints.nullable ? '?' : '';
          lines.push(`  ${sanitizedFieldName}${optional}: ${tsType};`);
        }
        
        // Add relations
        for (const relationName in entity.relations) {
          const relation = entity.relations[relationName];
          if (relation.type === 'manyToOne' || relation.type === 'oneToOne') {
            lines.push(`  ${relationName}?: ${relation.targetEntity};`);
            lines.push(`  ${relation.foreignKey || relationName + '_id'}?: string;`);
          }
        }
        
        lines.push('}');
        lines.push('');
        
        // Generate create/update types
        lines.push(`export interface Create${entityName}Request {`);
        for (const fieldName in entity.fields) {
          const field = entity.fields[fieldName];
          if (fieldName === 'id' || fieldName === 'created_at' || fieldName === 'updated_at') {
            continue;
          }
          
          const sanitizedFieldName = this.sanitizeFieldName(fieldName);
          const tsType = this.mapFieldTypeToTypeScript(field);
          const optional = field.constraints.nullable || field.constraints.default !== undefined ? '?' : '';
          lines.push(`  ${sanitizedFieldName}${optional}: ${tsType};`);
        }
        
        for (const relationName in entity.relations) {
          const relation = entity.relations[relationName];
          if (relation.type === 'manyToOne' || relation.type === 'oneToOne') {
            lines.push(`  ${relation.foreignKey || relationName + '_id'}?: string;`);
          }
        }
        
        lines.push('}');
        lines.push('');
        
        lines.push(`export interface Update${entityName}Request extends Partial<Create${entityName}Request> {}`);
        lines.push('');
      }
    }
    
    return lines.join('\n');
  }

  private generateDataProvider(cir: CIRDocument): string {
    const lines: string[] = [];
    
    lines.push('import { DataProvider } from "@refinedev/core";');
    lines.push('import dataProvider from "@refinedev/simple-rest";');
    lines.push('');
    lines.push('const API_URL = "http://localhost:3000/api";');
    lines.push('');
    lines.push('const customDataProvider: DataProvider = dataProvider(API_URL);');
    lines.push('');
    lines.push('export default customDataProvider;');
    
    return lines.join('\n');
  }

  private generateAuthProvider(): string {
    const lines: string[] = [];
    
    lines.push('import { AuthBindings } from "@refinedev/core";');
    lines.push('');
    lines.push('const authProvider: AuthBindings = {');
    lines.push('  login: async ({ email, password }) => {');
    lines.push('    // Demo login - replace with real authentication');
    lines.push('    if (email === "demo@example.com" && password === "demo") {');
    lines.push('      localStorage.setItem("auth-token", "demo-token");');
    lines.push('      localStorage.setItem("user", JSON.stringify({ email, name: "Demo User" }));');
    lines.push('      return {');
    lines.push('        success: true,');
    lines.push('        redirectTo: "/",');
    lines.push('      };');
    lines.push('    }');
    lines.push('');
    lines.push('    return {');
    lines.push('      success: false,');
    lines.push('      error: {');
    lines.push('        name: "LoginError",');
    lines.push('        message: "Неверный email или пароль",');
    lines.push('      },');
    lines.push('    };');
    lines.push('  },');
    lines.push('');
    lines.push('  logout: async () => {');
    lines.push('    localStorage.removeItem("auth-token");');
    lines.push('    localStorage.removeItem("user");');
    lines.push('    return {');
    lines.push('      success: true,');
    lines.push('      redirectTo: "/login",');
    lines.push('    };');
    lines.push('  },');
    lines.push('');
    lines.push('  check: async () => {');
    lines.push('    const token = localStorage.getItem("auth-token");');
    lines.push('    if (token) {');
    lines.push('      return {');
    lines.push('        authenticated: true,');
    lines.push('      };');
    lines.push('    }');
    lines.push('');
    lines.push('    return {');
    lines.push('      authenticated: false,');
    lines.push('      redirectTo: "/login",');
    lines.push('    };');
    lines.push('  },');
    lines.push('');
    lines.push('  getPermissions: async () => null,');
    lines.push('');
    lines.push('  getIdentity: async () => {');
    lines.push('    const user = localStorage.getItem("user");');
    lines.push('    if (user) {');
    lines.push('      return JSON.parse(user);');
    lines.push('    }');
    lines.push('    return null;');
    lines.push('  },');
    lines.push('');
    lines.push('  onError: async (error) => {');
    lines.push('    console.error(error);');
    lines.push('    return { error };');
    lines.push('  },');
    lines.push('};');
    lines.push('');
    lines.push('export default authProvider;');
    
    return lines.join('\n');
  }

  private generateListPage(entity: CIREntity, cir: CIRDocument): string {
    const lines: string[] = [];
    const entityName = entity.name;
    const lowerName = entityName.toLowerCase();
    const pluralName = lowerName + 's';
    
    lines.push('import React from "react";');
    lines.push('import {');
    lines.push('  List,');
    lines.push('  useTable,');
    lines.push('  EditButton,');
    lines.push('  ShowButton,');
    lines.push('  DeleteButton,');
    lines.push('  CreateButton,');
    lines.push('} from "@refinedev/antd";');
    lines.push('import { Table, Space, Typography } from "antd";');
    lines.push(`import type { ${entityName} } from "../../types";`);
    lines.push('import { formatDate, formatCurrency } from "../../utils/formatters";');
    lines.push('');
    lines.push('const { Title } = Typography;');
    lines.push('');
    
    lines.push(`export const ${entityName}List = () => {`);
    lines.push('  const { tableProps } = useTable<' + entityName + '>({');
    lines.push(`    resource: "${pluralName}",`);
    lines.push('    syncWithLocation: true,');
    lines.push('  });');
    lines.push('');
    
    lines.push('  return (');
    lines.push('    <List>');
    lines.push('      <Table {...tableProps} rowKey="id">');
    
    // Generate columns for display fields
    const displayFields = this.getDisplayFields(entity);
    displayFields.forEach(fieldName => {
      const field = entity.fields[fieldName];
      lines.push('        <Table.Column');
      lines.push(`          dataIndex="${fieldName}"`);
      lines.push(`          title="${this.formatFieldLabel(fieldName)}"`);
      
      if (field.type.baseType === 'date' || field.type.baseType === 'datetime') {
        lines.push('          render={(value) => formatDate(value)}');
      } else if (field.type.baseType === 'number' && field.type.subType === 'money') {
        lines.push('          render={(value) => formatCurrency(value)}');
      } else if (field.type.baseType === 'boolean') {
        lines.push('          render={(value) => value ? "Да" : "Нет"}');
      }
      
      lines.push('        />');
    });
    
    lines.push('        <Table.Column');
    lines.push('          dataIndex="created_at"');
    lines.push('          title="Создано"');
    lines.push('          render={(value) => formatDate(value)}');
    lines.push('        />');
    lines.push('        <Table.Column');
    lines.push('          title="Действия"');
    lines.push('          dataIndex="actions"');
    lines.push('          render={(_, record) => (');
    lines.push('            <Space>');
    lines.push(`              <EditButton hideText size="small" recordItemId={record.id} />`);
    lines.push(`              <ShowButton hideText size="small" recordItemId={record.id} />`);
    lines.push(`              <DeleteButton hideText size="small" recordItemId={record.id} />`);
    lines.push('            </Space>');
    lines.push('          )}');
    lines.push('        />');
    lines.push('      </Table>');
    lines.push('    </List>');
    lines.push('  );');
    lines.push('};');
    
    return lines.join('\n');
  }

  private generateCreatePage(entity: CIREntity, cir: CIRDocument): string {
    const lines: string[] = [];
    const entityName = entity.name;
    const lowerName = entityName.toLowerCase();
    const pluralName = lowerName + 's';
    
    lines.push('import React from "react";');
    lines.push('import { Create, useForm } from "@refinedev/antd";');
    lines.push('import { Form, Input, InputNumber, Switch, Select, DatePicker } from "antd";');
    lines.push(`import type { Create${entityName}Request } from "../../types";`);
    lines.push('');
    
    lines.push(`export const ${entityName}Create = () => {`);
    lines.push('  const { formProps, saveButtonProps } = useForm<' + `Create${entityName}Request` + '>({');
    lines.push(`    resource: "${pluralName}",`);
    lines.push('  });');
    lines.push('');
    
    lines.push('  return (');
    lines.push('    <Create saveButtonProps={saveButtonProps}>');
    lines.push('      <Form {...formProps} layout="vertical">');
    
    // Generate form fields
    for (const fieldName in entity.fields) {
      const field = entity.fields[fieldName];
      if (fieldName === 'id' || fieldName === 'created_at' || fieldName === 'updated_at') {
        continue;
      }
      
      const isRequired = !field.constraints.nullable && field.constraints.default === undefined;
      const fieldLabel = this.formatFieldLabel(fieldName);
      
      lines.push('        <Form.Item');
      lines.push(`          label="${fieldLabel}"`);
      lines.push(`          name="${fieldName}"`);
      if (isRequired) {
        lines.push('          rules={[{ required: true, message: "Это поле обязательно" }]}');
      }
      lines.push('        >');
      
      // Generate appropriate input based on field type
      if (field.type.baseType === 'boolean') {
        lines.push('          <Switch />');
      } else if (field.type.baseType === 'number') {
        lines.push('          <InputNumber style={{ width: "100%" }} />');
      } else if (field.type.baseType === 'date') {
        lines.push('          <DatePicker style={{ width: "100%" }} />');
      } else if (field.type.baseType === 'datetime') {
        lines.push('          <DatePicker showTime style={{ width: "100%" }} />');
      } else if (this.isEnumField(field, fieldName)) {
        const options = this.getEnumOptions(field, fieldName);
        lines.push('          <Select placeholder="Выберите значение">');
        options.forEach(option => {
          lines.push(`            <Select.Option value="${option.value}">${option.label}</Select.Option>`);
        });
        lines.push('          </Select>');
      } else if (this.isLongTextField(field, fieldName)) {
        lines.push('          <Input.TextArea rows={4} />');
      } else {
        lines.push('          <Input />');
      }
      
      lines.push('        </Form.Item>');
    }
    
    lines.push('      </Form>');
    lines.push('    </Create>');
    lines.push('  );');
    lines.push('};');
    
    return lines.join('\n');
  }

  private generateEditPage(entity: CIREntity, cir: CIRDocument): string {
    const lines: string[] = [];
    const entityName = entity.name;
    const lowerName = entityName.toLowerCase();
    const pluralName = lowerName + 's';
    
    lines.push('import React from "react";');
    lines.push('import { Edit, useForm } from "@refinedev/antd";');
    lines.push('import { Form, Input, InputNumber, Switch, Select, DatePicker } from "antd";');
    lines.push(`import type { ${entityName}, Update${entityName}Request } from "../../types";`);
    lines.push('import dayjs from "dayjs";');
    lines.push('');
    
    lines.push(`export const ${entityName}Edit = () => {`);
    lines.push('  const { formProps, saveButtonProps, queryResult } = useForm<' + entityName + ', any, Update' + entityName + 'Request>({');
    lines.push(`    resource: "${pluralName}",`);
    lines.push('  });');
    lines.push('');
    
    lines.push('  const record = queryResult?.data?.data;');
    lines.push('');
    
    lines.push('  return (');
    lines.push('    <Edit saveButtonProps={saveButtonProps}>');
    lines.push('      <Form {...formProps} layout="vertical">');
    
    // Generate form fields similar to create, but with initial values
    for (const fieldName in entity.fields) {
      const field = entity.fields[fieldName];
      if (fieldName === 'id' || fieldName === 'created_at' || fieldName === 'updated_at') {
        continue;
      }
      
      const isRequired = !field.constraints.nullable && field.constraints.default === undefined;
      const fieldLabel = this.formatFieldLabel(fieldName);
      
      lines.push('        <Form.Item');
      lines.push(`          label="${fieldLabel}"`);
      lines.push(`          name="${fieldName}"`);
      if (isRequired) {
        lines.push('          rules={[{ required: true, message: "Это поле обязательно" }]}');
      }
      
      // Add initialValue for date fields
      if (field.type.baseType === 'date' || field.type.baseType === 'datetime') {
        lines.push(`          getValueProps={(value) => ({`);
        lines.push('            value: value ? dayjs(value) : undefined,');
        lines.push('          })}');
      }
      
      lines.push('        >');
      
      // Generate appropriate input based on field type (same as create)
      if (field.type.baseType === 'boolean') {
        lines.push('          <Switch />');
      } else if (field.type.baseType === 'number') {
        lines.push('          <InputNumber style={{ width: "100%" }} />');
      } else if (field.type.baseType === 'date') {
        lines.push('          <DatePicker style={{ width: "100%" }} />');
      } else if (field.type.baseType === 'datetime') {
        lines.push('          <DatePicker showTime style={{ width: "100%" }} />');
      } else if (this.isEnumField(field, fieldName)) {
        const options = this.getEnumOptions(field, fieldName);
        lines.push('          <Select placeholder="Выберите значение">');
        options.forEach(option => {
          lines.push(`            <Select.Option value="${option.value}">${option.label}</Select.Option>`);
        });
        lines.push('          </Select>');
      } else if (this.isLongTextField(field, fieldName)) {
        lines.push('          <Input.TextArea rows={4} />');
      } else {
        lines.push('          <Input />');
      }
      
      lines.push('        </Form.Item>');
    }
    
    lines.push('      </Form>');
    lines.push('    </Edit>');
    lines.push('  );');
    lines.push('};');
    
    return lines.join('\n');
  }

  private generateShowPage(entity: CIREntity, cir: CIRDocument): string {
    const lines: string[] = [];
    const entityName = entity.name;
    const lowerName = entityName.toLowerCase();
    const pluralName = lowerName + 's';
    
    lines.push('import React from "react";');
    lines.push('import {');
    lines.push('  Show,');
    lines.push('  TextField,');
    lines.push('  NumberField,');
    lines.push('  DateField,');
    lines.push('  BooleanField,');
    lines.push('} from "@refinedev/antd";');
    lines.push('import { Typography } from "antd";');
    lines.push(`import type { ${entityName} } from "../../types";`);
    lines.push('');
    lines.push('const { Title } = Typography;');
    lines.push('');
    
    lines.push(`export const ${entityName}Show = () => {`);
    lines.push('  return (');
    lines.push('    <Show>');
    
    // Generate display fields
    for (const fieldName in entity.fields) {
      const field = entity.fields[fieldName];
      if (fieldName === 'id') continue;
      
      const fieldLabel = this.formatFieldLabel(fieldName);
      
      lines.push(`      <Title level={5}>${fieldLabel}</Title>`);
      
      if (field.type.baseType === 'boolean') {
        lines.push(`      <BooleanField value={undefined} />`);
      } else if (field.type.baseType === 'number') {
        lines.push(`      <NumberField value={undefined} />`);
      } else if (field.type.baseType === 'date' || field.type.baseType === 'datetime') {
        lines.push(`      <DateField value={undefined} />`);
      } else {
        lines.push(`      <TextField value={undefined} />`);
      }
    }
    
    lines.push('    </Show>');
    lines.push('  );');
    lines.push('};');
    
    return lines.join('\n');
  }

  private generatePageIndex(entity: CIREntity): string {
    const entityName = entity.name;
    return `export { ${entityName}List } from "./list";
export { ${entityName}Create } from "./create";
export { ${entityName}Edit } from "./edit";
export { ${entityName}Show } from "./show";`;
  }

  private generateHeader(cir: CIRDocument): string {
    const lines: string[] = [];
    
    lines.push('import React from "react";');
    lines.push('import { useGetIdentity, useLogout } from "@refinedev/core";');
    lines.push('import { Layout, Avatar, Space, Dropdown, Typography } from "antd";');
    lines.push('import { UserOutlined, LogoutOutlined } from "@ant-design/icons";');
    lines.push('');
    lines.push('const { Header: AntdHeader } = Layout;');
    lines.push('const { Text } = Typography;');
    lines.push('');
    
    lines.push('export const Header: React.FC<{ sticky?: boolean }> = ({ sticky }) => {');
    lines.push('  const { mutate: logout } = useLogout();');
    lines.push('  const { data: user } = useGetIdentity<any>();');
    lines.push('');
    
    lines.push('  const handleLogout = () => {');
    lines.push('    logout();');
    lines.push('  };');
    lines.push('');
    
    lines.push('  const menuItems = [');
    lines.push('    {');
    lines.push('      key: "logout",');
    lines.push('      icon: <LogoutOutlined />,');
    lines.push('      label: "Выйти",');
    lines.push('      onClick: handleLogout,');
    lines.push('    },');
    lines.push('  ];');
    lines.push('');
    
    lines.push('  return (');
    lines.push('    <AntdHeader');
    lines.push('      style={{');
    lines.push('        display: "flex",');
    lines.push('        justifyContent: "space-between",');
    lines.push('        alignItems: "center",');
    lines.push('        padding: "0 24px",');
    lines.push('        position: sticky ? "sticky" : "static",');
    lines.push('        top: 0,');
    lines.push('        zIndex: 999,');
    lines.push('      }}');
    lines.push('    >');
    lines.push(`      <Text strong style={{ color: "white", fontSize: "18px" }}>`);
    lines.push(`        ${cir.metadata.name}`);
    lines.push('      </Text>');
    lines.push('      <Space>');
    lines.push('        <Text style={{ color: "white" }}>');
    lines.push('          {user?.name || user?.email || "Пользователь"}');
    lines.push('        </Text>');
    lines.push('        <Dropdown menu={{ items: menuItems }} placement="bottomRight">');
    lines.push('          <Avatar');
    lines.push('            size="small"');
    lines.push('            icon={<UserOutlined />}');
    lines.push('            style={{ cursor: "pointer" }}');
    lines.push('          />');
    lines.push('        </Dropdown>');
    lines.push('      </Space>');
    lines.push('    </AntdHeader>');
    lines.push('  );');
    lines.push('};');
    
    return lines.join('\n');
  }

  private generateSider(cir: CIRDocument): string {
    // Refine's ThemedSiderV2 handles the sidebar automatically based on resources
    // This file is optional since we use the default sider
    return `// Sider is handled automatically by Refine's ThemedSiderV2
export {};`;
  }

  private generateTitle(cir: CIRDocument): string {
    const lines: string[] = [];
    
    lines.push('import React from "react";');
    lines.push('import { TitleProps } from "@refinedev/core";');
    lines.push('import { Typography } from "antd";');
    lines.push('');
    lines.push('const { Title: AntdTitle } = Typography;');
    lines.push('');
    
    lines.push('export const Title: React.FC<TitleProps> = ({ collapsed }) => {');
    lines.push('  return (');
    lines.push('    <AntdTitle');
    lines.push('      level={4}');
    lines.push('      style={{');
    lines.push('        margin: 0,');
    lines.push('        padding: "12px 16px",');
    lines.push('        color: "white",');
    lines.push('        fontSize: collapsed ? "14px" : "16px",');
    lines.push('      }}');
    lines.push('    >');
    lines.push(`      {collapsed ? "${cir.metadata.name.charAt(0)}" : "${cir.metadata.name}"}`);
    lines.push('    </AntdTitle>');
    lines.push('  );');
    lines.push('};');
    
    return lines.join('\n');
  }

  private generateConstants(cir: CIRDocument): string {
    const lines: string[] = [];
    
    lines.push('// Application constants');
    lines.push(`export const APP_NAME = "${cir.metadata.name}";`);
    lines.push(`export const APP_VERSION = "${cir.metadata.version}";`);
    lines.push('');
    
    lines.push('// API Configuration');
    lines.push('export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";');
    lines.push('');
    
    lines.push('// Date formats');
    lines.push('export const DATE_FORMAT = "DD.MM.YYYY";');
    lines.push('export const DATETIME_FORMAT = "DD.MM.YYYY HH:mm";');
    lines.push('');
    
    lines.push('// Table pagination');
    lines.push('export const DEFAULT_PAGE_SIZE = 10;');
    lines.push('export const PAGE_SIZE_OPTIONS = ["10", "20", "50", "100"];');
    
    return lines.join('\n');
  }

  private generateFormatters(): string {
    const lines: string[] = [];
    
    lines.push('import dayjs from "dayjs";');
    lines.push('import "dayjs/locale/ru";');
    lines.push('import { DATE_FORMAT, DATETIME_FORMAT } from "./constants";');
    lines.push('');
    lines.push('dayjs.locale("ru");');
    lines.push('');
    
    lines.push('export const formatDate = (date: string | Date | null | undefined): string => {');
    lines.push('  if (!date) return "-";');
    lines.push('  return dayjs(date).format(DATE_FORMAT);');
    lines.push('};');
    lines.push('');
    
    lines.push('export const formatDateTime = (date: string | Date | null | undefined): string => {');
    lines.push('  if (!date) return "-";');
    lines.push('  return dayjs(date).format(DATETIME_FORMAT);');
    lines.push('};');
    lines.push('');
    
    lines.push('export const formatCurrency = (amount: number | null | undefined): string => {');
    lines.push('  if (amount === null || amount === undefined) return "-";');
    lines.push('  return new Intl.NumberFormat("ru-RU", {');
    lines.push('    style: "currency",');
    lines.push('    currency: "RUB",');
    lines.push('  }).format(amount);');
    lines.push('};');
    lines.push('');
    
    lines.push('export const formatNumber = (num: number | null | undefined): string => {');
    lines.push('  if (num === null || num === undefined) return "-";');
    lines.push('  return new Intl.NumberFormat("ru-RU").format(num);');
    lines.push('};');
    
    return lines.join('\n');
  }

  private generateViteConfig(): string {
    const lines: string[] = [];
    
    lines.push('import { defineConfig } from "vite";');
    lines.push('import react from "@vitejs/plugin-react";');
    lines.push('');
    lines.push('export default defineConfig({');
    lines.push('  plugins: [react()],');
    lines.push('  server: {');
    lines.push('    port: 3001,');
    lines.push('    proxy: {');
    lines.push('      "/api": {');
    lines.push('        target: "http://localhost:3000",');
    lines.push('        changeOrigin: true,');
    lines.push('      },');
    lines.push('    },');
    lines.push('  },');
    lines.push('  define: {');
    lines.push('    __DEV__: JSON.stringify(true),');
    lines.push('  },');
    lines.push('});');
    
    return lines.join('\n');
  }

  private generateTsConfig(): string {
    return `{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",

    /* Linting */
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}`;
  }

  private generateTsConfigNode(): string {
    return `{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}`;
  }

  private generateReadme(cir: CIRDocument): string {
    const lines: string[] = [];
    
    lines.push(`# ${cir.metadata.name} - Панель управления`);
    lines.push('');
    lines.push('Современная админ-панель, созданная с помощью Refine и Ant Design.');
    lines.push('');
    lines.push('## 🚀 Особенности');
    lines.push('');
    lines.push('- **Refine Framework** - Быстрая разработка админ-панелей');
    lines.push('- **Ant Design** - Готовые компоненты с красивым дизайном');
    lines.push('- **TypeScript** - Полная типизация');
    lines.push('- **React Router** - Клиентская маршрутизация');
    lines.push('- **Автоматическая генерация** - CRUD операции из коробки');
    lines.push('- **Русская локализация** - Полностью на русском языке');
    lines.push('');
    lines.push('## 📦 Быстрый старт');
    lines.push('');
    lines.push('```bash');
    lines.push('# Установка зависимостей');
    lines.push('npm install');
    lines.push('');
    lines.push('# Запуск в режиме разработки');
    lines.push('npm run dev');
    lines.push('');
    lines.push('# Сборка для продакшена');
    lines.push('npm run build');
    lines.push('```');
    lines.push('');
    lines.push('## 🔐 Вход в систему');
    lines.push('');
    lines.push('Демо-учетные данные:');
    lines.push('- **Email**: demo@example.com');
    lines.push('- **Пароль**: demo');
    lines.push('');
    lines.push('## 🌍 Переменные окружения');
    lines.push('');
    lines.push('Создайте файл `.env` в корне проекта:');
    lines.push('');
    lines.push('```bash');
    lines.push('VITE_API_URL=http://localhost:3000/api');
    lines.push('```');
    lines.push('');
    lines.push('## 📁 Структура проекта');
    lines.push('');
    lines.push('```');
    lines.push('src/');
    lines.push('├── components/         # Компоненты интерфейса');
    lines.push('│   └── layout/        # Компоненты макета');
    lines.push('├── pages/             # Страницы для каждой сущности');
    
    for (const moduleName in cir.modules) {
      const module = cir.modules[moduleName];
      for (const entityName in module.entities) {
        const lowerName = entityName.toLowerCase();
        lines.push(`│   ├── ${lowerName}/           # ${this.getEntityDisplayName(entityName)}`);
      }
    }
    
    lines.push('├── providers/         # Провайдеры данных и аутентификации');
    lines.push('├── types/             # Типы TypeScript');
    lines.push('├── utils/             # Утилиты и константы');
    lines.push('├── App.tsx           # Главный компонент приложения');
    lines.push('└── main.tsx          # Точка входа');
    lines.push('```');
    lines.push('');
    lines.push('## 📊 Доступные разделы');
    lines.push('');
    
    for (const moduleName in cir.modules) {
      const module = cir.modules[moduleName];
      for (const entityName in module.entities) {
        const lowerName = entityName.toLowerCase();
        const pluralName = lowerName + 's';
        const displayName = this.getEntityDisplayName(entityName);
        lines.push(`### ${displayName}`);
        lines.push(`- **Список** - \`/${pluralName}\``);
        lines.push(`- **Создание** - \`/${pluralName}/create\``);
        lines.push(`- **Просмотр** - \`/${pluralName}/show/:id\``);
        lines.push(`- **Редактирование** - \`/${pluralName}/edit/:id\``);
        lines.push('');
      }
    }
    
    lines.push('## 🛠 Разработка');
    lines.push('');
    lines.push('Приложение запускается на `http://localhost:3001`.');
    lines.push('API запросы проксируются на бэкенд `http://localhost:3000`.');
    lines.push('');
    lines.push('### Добавление новых полей');
    lines.push('');
    lines.push('1. Обновите типы в `src/types/index.ts`');
    lines.push('2. Добавьте поля в формы создания и редактирования');
    lines.push('3. Обновите колонки в списках');
    lines.push('');
    lines.push('### Кастомизация интерфейса');
    lines.push('');
    lines.push('- **Темы**: Настройте в `ConfigProvider` в `App.tsx`');
    lines.push('- **Локализация**: Обновите в `src/utils/formatters.ts`');
    lines.push('- **Макет**: Измените компоненты в `src/components/layout/`');
    lines.push('');
    lines.push('## 📚 Полезные ссылки');
    lines.push('');
    lines.push('- [Документация Refine](https://refine.dev/docs/)');
    lines.push('- [Компоненты Ant Design](https://ant.design/components/overview/)');
    lines.push('- [React Router](https://reactrouter.com/)');
    
    return lines.join('\n');
  }

  // Helper methods
  private mapFieldTypeToTypeScript(field: CIRField): string {
    switch (field.type.baseType) {
      case 'string':
        return 'string';
      case 'number':
        return 'number';
      case 'boolean':
        return 'boolean';
      case 'date':
      case 'datetime':
        return 'string';
      case 'uuid':
        return 'string';
      case 'json':
        return 'any';
      case 'enum':
        return 'string';
      default:
        return 'string';
    }
  }

  private getDisplayFields(entity: CIREntity): string[] {
    const fields: string[] = [];
    
    // Look for common display fields first
    const commonFields = ['name', 'title', 'label', 'description'];
    for (const commonField of commonFields) {
      if (entity.fields[commonField]) {
        fields.push(commonField);
        break;
      }
    }
    
    // Add other important fields
    for (const fieldName in entity.fields) {
      if (fields.includes(fieldName)) continue;
      if (fieldName === 'id' || fieldName === 'created_at' || fieldName === 'updated_at') continue;
      
      const field = entity.fields[fieldName];
      if (field.type.baseType === 'string' || field.type.baseType === 'number') {
        fields.push(fieldName);
        if (fields.length >= 3) break;
      }
    }
    
    return fields.slice(0, 3);
  }

  private isEnumField(field: CIRField, fieldName: string): boolean {
    // Check if field name suggests it's an enum/select field
    const enumFields = ['status', 'priority', 'type', 'state', 'role', 'tier'];
    return enumFields.some(enumField => fieldName.toLowerCase().includes(enumField));
  }

  private isLongTextField(field: CIRField, fieldName: string): boolean {
    if (field.type.baseType !== 'string') return false;
    
    // Check field name
    const longTextFields = ['description', 'content', 'comment', 'note', 'remarks'];
    if (longTextFields.some(longField => fieldName.toLowerCase().includes(longField))) {
      return true;
    }
    
    // Check field length constraint
    if (field.constraints.max && field.constraints.max > 100) {
      return true;
    }
    
    return false;
  }

  private getEnumOptions(field: CIRField, fieldName: string): Array<{value: string, label: string}> {
    const fieldLower = fieldName.toLowerCase();
    
    if (fieldLower.includes('status')) {
      if (fieldLower.includes('project')) {
        return [
          { value: 'planning', label: 'Планирование' },
          { value: 'active', label: 'Активный' },
          { value: 'on-hold', label: 'Приостановлен' },
          { value: 'completed', label: 'Завершен' },
          { value: 'cancelled', label: 'Отменен' }
        ];
      } else if (fieldLower.includes('task')) {
        return [
          { value: 'todo', label: 'К выполнению' },
          { value: 'in-progress', label: 'В работе' },
          { value: 'review', label: 'На проверке' },
          { value: 'done', label: 'Выполнено' },
          { value: 'cancelled', label: 'Отменено' }
        ];
      } else {
        return [
          { value: 'active', label: 'Активный' },
          { value: 'inactive', label: 'Неактивный' },
          { value: 'pending', label: 'Ожидание' },
          { value: 'completed', label: 'Завершен' }
        ];
      }
    }
    
    if (fieldLower.includes('priority')) {
      return [
        { value: 'low', label: 'Низкий' },
        { value: 'medium', label: 'Средний' },
        { value: 'high', label: 'Высокий' },
        { value: 'urgent', label: 'Критический' }
      ];
    }
    
    if (fieldLower.includes('tier')) {
      return [
        { value: 'regular', label: 'Обычный' },
        { value: 'vip', label: 'VIP' },
        { value: 'blocked', label: 'Заблокирован' }
      ];
    }
    
    if (fieldLower.includes('type')) {
      return [
        { value: 'personal', label: 'Личный' },
        { value: 'business', label: 'Деловой' },
        { value: 'other', label: 'Другой' }
      ];
    }
    
    // Default options
    return [
      { value: 'option1', label: 'Вариант 1' },
      { value: 'option2', label: 'Вариант 2' },
      { value: 'option3', label: 'Вариант 3' }
    ];
  }

  private formatFieldLabel(fieldName: string): string {
    const russianLabels: Record<string, string> = {
      'name': 'Название',
      'title': 'Заголовок',
      'description': 'Описание',
      'content': 'Содержание',
      'status': 'Статус',
      'priority': 'Приоритет',
      'type': 'Тип',
      'state': 'Состояние',
      'created_at': 'Создано',
      'updated_at': 'Обновлено',
      'email': 'Email',
      'phone': 'Телефон',
      'address': 'Адрес',
      'amount': 'Сумма',
      'price': 'Цена',
      'quantity': 'Количество',
      'date': 'Дата',
      'start_date': 'Дата начала',
      'end_date': 'Дата окончания',
      'due_date': 'Срок выполнения',
      'is_active': 'Активный',
      'is_completed': 'Завершен',
      'comment': 'Комментарий',
      'notes': 'Заметки',
      'remarks': 'Примечания'
    };
    
    // Try to find direct translation
    if (russianLabels[fieldName.toLowerCase()]) {
      return russianLabels[fieldName.toLowerCase()];
    }
    
    // Convert camelCase/snake_case to readable format
    return fieldName
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }

  private getEntityDisplayName(entityName: string): string {
    const russianNames: Record<string, string> = {
      'Project': 'Проекты',
      'Task': 'Задачи',
      'Comment': 'Комментарии',
      'User': 'Пользователи',
      'Customer': 'Клиенты',
      'Order': 'Заказы',
      'Invoice': 'Счета',
      'Product': 'Товары',
      'Category': 'Категории',
      'Company': 'Компании',
      'Contact': 'Контакты',
      'Lead': 'Лиды',
      'Deal': 'Сделки',
      'Document': 'Документы',
      'File': 'Файлы',
      'Report': 'Отчеты',
      'Setting': 'Настройки'
    };
    
    return russianNames[entityName] || entityName + 's';
  }
} 