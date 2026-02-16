import { CIRDocument, CIREntity, CIRField, CIRAction } from '../types/cir.js';

export class ReactGenerator {
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
    files.set('src/api/client.ts', this.generateApiClient(cir));
    
    // Generate hooks
    files.set('src/hooks/useApi.ts', this.generateApiHooks());
    
    // Generate components
    files.set('src/components/Layout.tsx', this.generateLayout());
    files.set('src/components/Navigation.tsx', this.generateNavigation(cir));
    files.set('src/components/LoadingSpinner.tsx', this.generateLoadingSpinner());
    files.set('src/components/ErrorBoundary.tsx', this.generateErrorBoundary());
    
    // Generate entity components
    for (const moduleName in cir.modules) {
      const module = cir.modules[moduleName];
      for (const entityName in module.entities) {
        const entity = module.entities[entityName];
        
        // List component
        files.set(`src/components/${entityName}List.tsx`, this.generateListComponent(entity, cir));
        
        // Form component
        files.set(`src/components/${entityName}Form.tsx`, this.generateFormComponent(entity, cir));
        
        // Detail component
        files.set(`src/components/${entityName}Detail.tsx`, this.generateDetailComponent(entity, cir));
        
        // Page components
        files.set(`src/pages/${entityName}Page.tsx`, this.generatePageComponent(entity, cir));
      }
    }
    
    // Generate routing
    files.set('src/router/index.tsx', this.generateRouter(cir));
    
    // Generate utilities
    files.set('src/utils/formatters.ts', this.generateFormatters());
    files.set('src/utils/validators.ts', this.generateValidators());
    
    // Generate styles
    files.set('src/styles/index.css', this.generateStyles());
    files.set('tailwind.config.js', this.generateTailwindConfig());
    files.set('postcss.config.js', this.generatePostCssConfig());
    
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
      name: `${cir.metadata.name.toLowerCase()}-frontend`,
      version: cir.metadata.version,
      description: `Generated frontend for ${cir.metadata.name}`,
      type: 'module',
      scripts: {
        dev: 'vite',
        build: 'tsc && vite build',
        preview: 'vite preview',
        lint: 'eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0'
      },
      dependencies: {
        react: '^18.2.0',
        'react-dom': '^18.2.0',
        'react-router-dom': '^6.20.0',
        'react-hook-form': '^7.48.0',
        'react-query': '^3.39.0',
        axios: '^1.6.0',
        '@headlessui/react': '^1.7.17',
        '@heroicons/react': '^2.0.18',
        'react-hot-toast': '^2.4.1',
        clsx: '^2.0.0',
        'date-fns': '^2.30.0'
      },
      devDependencies: {
        '@types/react': '^18.2.37',
        '@types/react-dom': '^18.2.15',
        '@typescript-eslint/eslint-plugin': '^6.10.0',
        '@typescript-eslint/parser': '^6.10.0',
        '@vitejs/plugin-react': '^4.1.1',
        autoprefixer: '^10.4.16',
        eslint: '^8.53.0',
        'eslint-plugin-react-hooks': '^4.6.0',
        'eslint-plugin-react-refresh': '^0.4.4',
        postcss: '^8.4.31',
        tailwindcss: '^3.3.5',
        typescript: '^5.2.2',
        vite: '^4.5.0'
      }
    };
    
    return JSON.stringify(packageJson, null, 2);
  }
  
  private generateApp(cir: CIRDocument): string {
    const lines: string[] = [];
    
    lines.push('import React from \'react\';');
    lines.push('import { BrowserRouter } from \'react-router-dom\';');
    lines.push('import { QueryClient, QueryClientProvider } from \'react-query\';');
    lines.push('import { Toaster } from \'react-hot-toast\';');
    lines.push('import { Router } from \'./router\';');
    lines.push('import { ErrorBoundary } from \'./components/ErrorBoundary\';');
    lines.push('import \'./styles/index.css\';');
    lines.push('');
    
    lines.push('const queryClient = new QueryClient({');
    lines.push('  defaultOptions: {');
    lines.push('    queries: {');
    lines.push('      retry: 1,');
    lines.push('      staleTime: 5 * 60 * 1000, // 5 minutes');
    lines.push('    },');
    lines.push('  },');
    lines.push('});');
    lines.push('');
    
    lines.push('function App() {');
    lines.push('  return (');
    lines.push('    <ErrorBoundary>');
    lines.push('      <QueryClientProvider client={queryClient}>');
    lines.push('        <BrowserRouter>');
    lines.push('          <div className="min-h-screen bg-gray-50">');
    lines.push(`            <div className="bg-white shadow-sm border-b border-gray-200 mb-8">`);
    lines.push('              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">');
    lines.push('                <div className="flex justify-between items-center py-6">');
    lines.push(`                  <h1 className="text-3xl font-bold text-gray-900">${cir.metadata.name}</h1>`);
    lines.push('                  <div className="text-sm text-gray-500">');
    lines.push(`                    v${cir.metadata.version}`);
    lines.push('                  </div>');
    lines.push('                </div>');
    lines.push('              </div>');
    lines.push('            </div>');
    lines.push('            <Router />');
    lines.push('          </div>');
    lines.push('          <Toaster position="top-right" />');
    lines.push('        </BrowserRouter>');
    lines.push('      </QueryClientProvider>');
    lines.push('    </ErrorBoundary>');
    lines.push('  );');
    lines.push('}');
    lines.push('');
    lines.push('export default App;');
    
    return lines.join('\n');
  }
  
  private generateMain(): string {
    const lines: string[] = [];
    
    lines.push('import React from \'react\';');
    lines.push('import ReactDOM from \'react-dom/client\';');
    lines.push('import App from \'./App\';');
    lines.push('');
    
    lines.push('ReactDOM.createRoot(document.getElementById(\'root\')!).render(');
    lines.push('  <React.StrictMode>');
    lines.push('    <App />');
    lines.push('  </React.StrictMode>');
    lines.push(');');
    
    return lines.join('\n');
  }
  
  private generateIndexHtml(cir: CIRDocument): string {
    const lines: string[] = [];
    
    lines.push('<!DOCTYPE html>');
    lines.push('<html lang="en">');
    lines.push('<head>');
    lines.push('  <meta charset="UTF-8" />');
    lines.push('  <link rel="icon" type="image/svg+xml" href="/vite.svg" />');
    lines.push('  <meta name="viewport" content="width=device-width, initial-scale=1.0" />');
    lines.push(`  <title>${cir.metadata.name}</title>`);
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
    
    lines.push('// Generated types');
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
        lines.push(`export interface ${entityName} extends BaseEntity {`);
        
        // Add fields
        for (const fieldName in entity.fields) {
          const field = entity.fields[fieldName];
          if (fieldName === 'id' || fieldName === 'created_at' || fieldName === 'updated_at') {
            continue; // Skip base fields
          }
          
          const tsType = this.mapFieldTypeToTypeScript(field);
          const optional = field.constraints.nullable ? '?' : '';
          lines.push(`  ${fieldName}${optional}: ${tsType};`);
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
          
          const tsType = this.mapFieldTypeToTypeScript(field);
          const optional = field.constraints.nullable || field.constraints.default !== undefined ? '?' : '';
          lines.push(`  ${fieldName}${optional}: ${tsType};`);
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
    
    // Common types
    lines.push('export interface ApiResponse<T> {');
    lines.push('  data: T;');
    lines.push('  message?: string;');
    lines.push('}');
    lines.push('');
    
    lines.push('export interface ApiError {');
    lines.push('  message: string;');
    lines.push('  code?: string;');
    lines.push('  details?: any;');
    lines.push('}');
    
    return lines.join('\n');
  }
  
  private generateApiClient(cir: CIRDocument): string {
    const lines: string[] = [];
    
    lines.push('import axios from \'axios\';');
    lines.push('import * as types from \'../types\';');
    lines.push('');
    
    lines.push('const API_BASE_URL = import.meta.env.VITE_API_URL || \'http://localhost:3000/api\';');
    lines.push('');
    
    lines.push('const apiClient = axios.create({');
    lines.push('  baseURL: API_BASE_URL,');
    lines.push('  headers: {');
    lines.push('    \'Content-Type\': \'application/json\',');
    lines.push('  },');
    lines.push('});');
    lines.push('');
    
    lines.push('// Request interceptor');
    lines.push('apiClient.interceptors.request.use(');
    lines.push('  (config) => {');
    lines.push('    // Add auth token if available');
    lines.push('    const token = localStorage.getItem(\'authToken\');');
    lines.push('    if (token) {');
    lines.push('      config.headers.Authorization = `Bearer ${token}`;');
    lines.push('    }');
    lines.push('    return config;');
    lines.push('  },');
    lines.push('  (error) => Promise.reject(error)');
    lines.push(');');
    lines.push('');
    
    lines.push('// Response interceptor');
    lines.push('apiClient.interceptors.response.use(');
    lines.push('  (response) => response,');
    lines.push('  (error) => {');
    lines.push('    if (error.response?.status === 401) {');
    lines.push('      localStorage.removeItem(\'authToken\');');
    lines.push('      window.location.href = \'/login\';');
    lines.push('    }');
    lines.push('    return Promise.reject(error);');
    lines.push('  }');
    lines.push(');');
    lines.push('');
    
    // Generate API methods for each entity
    for (const moduleName in cir.modules) {
      const module = cir.modules[moduleName];
      
      for (const entityName in module.entities) {
        const entity = module.entities[entityName];
        const routeName = entityName.toLowerCase();
        
        lines.push(`// ${entityName} API`);
        lines.push(`export const ${routeName}Api = {`);
        
        // Get all
        lines.push(`  getAll: async (): Promise<types.${entityName}[]> => {`);
        lines.push(`    const response = await apiClient.get('/${routeName}s');`);
        lines.push('    return response.data;');
        lines.push('  },');
        lines.push('');
        
        // Get by ID
        lines.push(`  getById: async (id: string): Promise<types.${entityName}> => {`);
        lines.push(`    const response = await apiClient.get(\`/${routeName}s/\${id}\`);`);
        lines.push('    return response.data;');
        lines.push('  },');
        lines.push('');
        
        // Create
        lines.push(`  create: async (data: types.Create${entityName}Request): Promise<types.${entityName}> => {`);
        lines.push(`    const response = await apiClient.post('/${routeName}s', data);`);
        lines.push('    return response.data;');
        lines.push('  },');
        lines.push('');
        
        // Update
        lines.push(`  update: async (id: string, data: types.Update${entityName}Request): Promise<types.${entityName}> => {`);
        lines.push(`    const response = await apiClient.put(\`/${routeName}s/\${id}\`, data);`);
        lines.push('    return response.data;');
        lines.push('  },');
        lines.push('');
        
        // Delete
        lines.push(`  delete: async (id: string): Promise<void> => {`);
        lines.push(`    await apiClient.delete(\`/${routeName}s/\${id}\`);`);
        lines.push('  },');
        
        lines.push('};');
        lines.push('');
      }
    }
    
    lines.push('export default apiClient;');
    
    return lines.join('\n');
  }
  
  private generateApiHooks(): string {
    const lines: string[] = [];
    
    lines.push('import { useQuery, useMutation, useQueryClient } from \'react-query\';');
    lines.push('import toast from \'react-hot-toast\';');
    lines.push('');
    
    lines.push('export function useApiQuery<T>(');
    lines.push('  key: string[],');
    lines.push('  queryFn: () => Promise<T>,');
    lines.push('  options?: {');
    lines.push('    enabled?: boolean;');
    lines.push('    onSuccess?: (data: T) => void;');
    lines.push('    onError?: (error: any) => void;');
    lines.push('  }');
    lines.push(') {');
    lines.push('  return useQuery(key, queryFn, {');
    lines.push('    ...options,');
    lines.push('    onError: (error: any) => {');
    lines.push('      const message = error.response?.data?.message || error.message || \'An error occurred\';');
    lines.push('      toast.error(message);');
    lines.push('      options?.onError?.(error);');
    lines.push('    },');
    lines.push('  });');
    lines.push('}');
    lines.push('');
    
    lines.push('export function useApiMutation<TData, TVariables>(');
    lines.push('  mutationFn: (variables: TVariables) => Promise<TData>,');
    lines.push('  options?: {');
    lines.push('    onSuccess?: (data: TData, variables: TVariables) => void;');
    lines.push('    onError?: (error: any, variables: TVariables) => void;');
    lines.push('    invalidateQueries?: string[][];');
    lines.push('  }');
    lines.push(') {');
    lines.push('  const queryClient = useQueryClient();');
    lines.push('');
    lines.push('  return useMutation(mutationFn, {');
    lines.push('    onSuccess: (data, variables) => {');
    lines.push('      // Invalidate and refetch queries');
    lines.push('      if (options?.invalidateQueries) {');
    lines.push('        options.invalidateQueries.forEach(queryKey => {');
    lines.push('          queryClient.invalidateQueries(queryKey);');
    lines.push('        });');
    lines.push('      }');
    lines.push('      options?.onSuccess?.(data, variables);');
    lines.push('    },');
    lines.push('    onError: (error: any, variables) => {');
    lines.push('      const message = error.response?.data?.message || error.message || \'An error occurred\';');
    lines.push('      toast.error(message);');
    lines.push('      options?.onError?.(error, variables);');
    lines.push('    },');
    lines.push('  });');
    lines.push('}');
    
    return lines.join('\n');
  }
  
  private generateLayout(): string {
    const lines: string[] = [];
    
    lines.push('import React from \'react\';');
    lines.push('import { Navigation } from \'./Navigation\';');
    lines.push('');
    
    lines.push('interface LayoutProps {');
    lines.push('  children: React.ReactNode;');
    lines.push('}');
    lines.push('');
    
    lines.push('export function Layout({ children }: LayoutProps) {');
    lines.push('  return (');
    lines.push('    <div className="min-h-screen bg-gray-50">');
    lines.push('      <Navigation />');
    lines.push('      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">');
    lines.push('        {children}');
    lines.push('      </main>');
    lines.push('    </div>');
    lines.push('  );');
    lines.push('}');
    
    return lines.join('\n');
  }
  
  private generateNavigation(cir: CIRDocument): string {
    const lines: string[] = [];
    
    lines.push('import React from \'react\';');
    lines.push('import { Link, useLocation } from \'react-router-dom\';');
    lines.push('import { HomeIcon } from \'@heroicons/react/24/outline\';');
    lines.push('import clsx from \'clsx\';');
    lines.push('');
    
    lines.push('const navigation = [');
    lines.push('  { name: \'Dashboard\', href: \'/\', icon: HomeIcon },');
    
    // Add navigation items for each entity
    for (const moduleName in cir.modules) {
      const module = cir.modules[moduleName];
      for (const entityName in module.entities) {
        const routeName = entityName.toLowerCase();
        lines.push(`  { name: '${entityName}s', href: '/${routeName}s' },`);
      }
    }
    
    lines.push('];');
    lines.push('');
    
    lines.push('export function Navigation() {');
    lines.push('  const location = useLocation();');
    lines.push('');
    lines.push('  return (');
    lines.push('    <nav className="bg-white shadow-sm border-b border-gray-200">');
    lines.push('      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">');
    lines.push('        <div className="flex justify-between h-16">');
    lines.push('          <div className="flex">');
    lines.push('            <div className="flex-shrink-0 flex items-center">');
    lines.push(`              <h1 className="text-xl font-bold text-gray-900">${cir.metadata.name}</h1>`);
    lines.push('            </div>');
    lines.push('            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">');
    lines.push('              {navigation.map((item) => {');
    lines.push('                const isActive = location.pathname === item.href;');
    lines.push('                return (');
    lines.push('                  <Link');
    lines.push('                    key={item.name}');
    lines.push('                    to={item.href}');
    lines.push('                    className={clsx(');
    lines.push('                      \'inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium\',');
    lines.push('                      isActive');
    lines.push('                        ? \'border-indigo-500 text-gray-900\'');
    lines.push('                        : \'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700\'');
    lines.push('                    )}');
    lines.push('                  >');
    lines.push('                    {item.icon && (');
    lines.push('                      <item.icon className="mr-2 h-4 w-4" aria-hidden="true" />');
    lines.push('                    )}');
    lines.push('                    {item.name}');
    lines.push('                  </Link>');
    lines.push('                );');
    lines.push('              })}');
    lines.push('            </div>');
    lines.push('          </div>');
    lines.push('        </div>');
    lines.push('      </div>');
    lines.push('    </nav>');
    lines.push('  );');
    lines.push('}');
    
    return lines.join('\n');
  }
  
  private generateListComponent(entity: CIREntity, cir: CIRDocument): string {
    const lines: string[] = [];
    const entityName = entity.name;
    const routeName = entityName.toLowerCase();
    
    lines.push('import React from \'react\';');
    lines.push('import { Link } from \'react-router-dom\';');
    lines.push('import { PlusIcon, PencilIcon, TrashIcon } from \'@heroicons/react/24/outline\';');
    lines.push('import { useApiQuery, useApiMutation } from \'../hooks/useApi\';');
    lines.push(`import { ${routeName}Api } from '../api/client';`);
    lines.push(`import * as types from '../types';`);
    lines.push('import { LoadingSpinner } from \'./LoadingSpinner\';');
    lines.push('import { formatDate, formatCurrency } from \'../utils/formatters\';');
    lines.push('import toast from \'react-hot-toast\';');
    lines.push('');
    
    lines.push(`export function ${entityName}List() {`);
    lines.push(`  const { data: ${routeName}s, isLoading, error } = useApiQuery(`);
    lines.push(`    ['${routeName}s'],`);
    lines.push(`    ${routeName}Api.getAll`);
    lines.push('  );');
    lines.push('');
    
    lines.push(`  const deleteMutation = useApiMutation(`);
    lines.push(`    ${routeName}Api.delete,`);
    lines.push('    {');
    lines.push(`      onSuccess: () => {`);
    lines.push(`        toast.success('${entityName} deleted successfully');`);
    lines.push('      },');
    lines.push(`      invalidateQueries: [['${routeName}s']],`);
    lines.push('    }');
    lines.push('  );');
    lines.push('');
    
    lines.push(`  const handleDelete = async (id: string) => {`);
    lines.push(`    if (window.confirm('Are you sure you want to delete this ${entityName.toLowerCase()}?')) {`);
    lines.push('      deleteMutation.mutate(id);');
    lines.push('    }');
    lines.push('  };');
    lines.push('');
    
    lines.push('  if (isLoading) return <LoadingSpinner />;');
    lines.push('  if (error) return <div className="text-red-600">Error loading data</div>;');
    lines.push('');
    
    lines.push('  return (');
    lines.push('    <div className="space-y-6">');
    lines.push('      <div className="flex justify-between items-center">');
    lines.push(`        <h1 className="text-2xl font-bold text-gray-900">${entityName}s</h1>`);
    lines.push(`        <Link`);
    lines.push(`          to="/${routeName}s/new"`);
    lines.push('          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"');
    lines.push('        >');
    lines.push('          <PlusIcon className="mr-2 h-4 w-4" />');
    lines.push(`          New ${entityName}`);
    lines.push('        </Link>');
    lines.push('      </div>');
    lines.push('');
    
    lines.push('      <div className="bg-white shadow overflow-hidden sm:rounded-md">');
    lines.push(`        {${routeName}s && ${routeName}s.length > 0 ? (`);
    lines.push('          <ul className="divide-y divide-gray-200">');
    lines.push(`            {${routeName}s.map((${routeName}) => (`);
    lines.push(`              <li key={${routeName}.id} className="px-6 py-4">`);
    lines.push('                <div className="flex items-center justify-between">');
    lines.push('                  <div className="flex-1 min-w-0">');
    
    // Generate display fields
    const displayFields = this.getDisplayFields(entity);
    displayFields.forEach((fieldName, index) => {
      const field = entity.fields[fieldName];
      if (index === 0) {
        lines.push('                    <div className="flex items-center">');
        lines.push(`                      <p className="text-sm font-medium text-gray-900 truncate">`);
        lines.push(`                        {${routeName}.${fieldName}}`);
        lines.push('                      </p>');
        lines.push('                    </div>');
      } else {
        lines.push(`                    <p className="text-sm text-gray-500">`);
        if (field.type.baseType === 'date' || field.type.baseType === 'datetime') {
          lines.push(`                      {formatDate(${routeName}.${fieldName})}`);
        } else if (field.type.baseType === 'number' && field.type.subType === 'money') {
          lines.push(`                      {formatCurrency(${routeName}.${fieldName})}`);
        } else {
          lines.push(`                      {${routeName}.${fieldName}}`);
        }
        lines.push('                    </p>');
      }
    });
    
    lines.push('                  </div>');
    lines.push('                  <div className="flex items-center space-x-2">');
    lines.push(`                    <Link`);
    lines.push(`                      to={\`/${routeName}s/\${${routeName}.id}\`}`);
    lines.push('                      className="text-indigo-600 hover:text-indigo-900"');
    lines.push('                    >');
    lines.push('                      <PencilIcon className="h-4 w-4" />');
    lines.push('                    </Link>');
    lines.push('                    <button');
    lines.push(`                      onClick={() => handleDelete(${routeName}.id)}`);
    lines.push('                      className="text-red-600 hover:text-red-900"');
    lines.push('                    >');
    lines.push('                      <TrashIcon className="h-4 w-4" />');
    lines.push('                    </button>');
    lines.push('                  </div>');
    lines.push('                </div>');
    lines.push('              </li>');
    lines.push('            ))}');
    lines.push('          </ul>');
    lines.push('        ) : (');
    lines.push('          <div className="text-center py-12">');
    lines.push('            <div className="text-gray-500">');
    lines.push(`              <p>No ${routeName}s found.</p>`);
    lines.push(`              <Link`);
    lines.push(`                to="/${routeName}s/new"`);
    lines.push('                className="text-indigo-600 hover:text-indigo-500"');
    lines.push('              >');
    lines.push(`                Create your first ${routeName}`);
    lines.push('              </Link>');
    lines.push('            </div>');
    lines.push('          </div>');
    lines.push('        )}');
    lines.push('      </div>');
    lines.push('    </div>');
    lines.push('  );');
    lines.push('}');
    
    return lines.join('\n');
  }
  
  private generateFormComponent(entity: CIREntity, cir: CIRDocument): string {
    const lines: string[] = [];
    const entityName = entity.name;
    const routeName = entityName.toLowerCase();
    
    lines.push('import React from \'react\';');
    lines.push('import { useForm } from \'react-hook-form\';');
    lines.push('import { useNavigate } from \'react-router-dom\';');
    lines.push('import { useApiMutation } from \'../hooks/useApi\';');
    lines.push(`import { ${routeName}Api } from '../api/client';`);
    lines.push(`import * as types from '../types';`);
    lines.push('import toast from \'react-hot-toast\';');
    lines.push('');
    
    lines.push('interface ' + entityName + 'FormProps {');
    lines.push(`  ${routeName}?: types.${entityName};`);
    lines.push('  onSubmit?: (data: any) => void;');
    lines.push('}');
    lines.push('');
    
    lines.push(`export function ${entityName}Form({ ${routeName}, onSubmit }: ${entityName}FormProps) {`);
    lines.push('  const navigate = useNavigate();');
    lines.push('  const { register, handleSubmit, formState: { errors } } = useForm({');
    lines.push(`    defaultValues: ${routeName} || {},`);
    lines.push('  });');
    lines.push('');
    
    lines.push('  const createMutation = useApiMutation(');
    lines.push(`    ${routeName}Api.create,`);
    lines.push('    {');
    lines.push('      onSuccess: () => {');
    lines.push(`        toast.success('${entityName} created successfully');`);
    lines.push(`        navigate('/${routeName}s');`);
    lines.push('      },');
    lines.push('      onError: (error: any) => {');
    lines.push(`        toast.error(error.response?.data?.message || 'Failed to create ${entityName.toLowerCase()}');`);
    lines.push('      },');
    lines.push('    }');
    lines.push('  );');
    lines.push('');
    
    lines.push('  const updateMutation = useApiMutation(');
    lines.push(`    (data: any) => ${routeName}Api.update(${routeName}!.id, data),`);
    lines.push('    {');
    lines.push('      onSuccess: () => {');
    lines.push(`        toast.success('${entityName} updated successfully');`);
    lines.push(`        navigate('/${routeName}s');`);
    lines.push('      },');
    lines.push('      onError: (error: any) => {');
    lines.push(`        toast.error(error.response?.data?.message || 'Failed to update ${entityName.toLowerCase()}');`);
    lines.push('      },');
    lines.push('    }');
    lines.push('  );');
    lines.push('');
    
    lines.push('  const handleFormSubmit = (data: any) => {');
    lines.push('    // Clean up empty strings to undefined');
    lines.push('    const cleanData = Object.keys(data).reduce((acc, key) => {');
    lines.push('      if (data[key] === \'\' || data[key] === null) {');
    lines.push('        acc[key] = undefined;');
    lines.push('      } else {');
    lines.push('        acc[key] = data[key];');
    lines.push('      }');
    lines.push('      return acc;');
    lines.push('    }, {} as any);');
    lines.push('');
    lines.push('    if (onSubmit) {');
    lines.push('      onSubmit(cleanData);');
    lines.push(`    } else if (${routeName}) {`);
    lines.push('      updateMutation.mutate(cleanData);');
    lines.push('    } else {');
    lines.push('      createMutation.mutate(cleanData);');
    lines.push('    }');
    lines.push('  };');
    lines.push('');
    
    lines.push('  return (');
    lines.push('    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">');
    
    // Generate form fields
    for (const fieldName in entity.fields) {
      const field = entity.fields[fieldName];
      if (fieldName === 'id' || fieldName === 'created_at' || fieldName === 'updated_at') {
        continue;
      }
      
      const isRequired = !field.constraints.nullable && field.constraints.default === undefined;
      const fieldLabel = this.formatFieldLabel(fieldName);
      
      if (field.type.baseType === 'boolean') {
        lines.push('      <div className="flex items-center">');
        lines.push(`        <input`);
        lines.push(`          type="checkbox"`);
        lines.push(`          id="${fieldName}"`);
        lines.push(`          {...register('${fieldName}')}`);
        lines.push('          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"');
        lines.push('        />');
        lines.push(`        <label htmlFor="${fieldName}" className="ml-2 block text-sm text-gray-900">`);
        lines.push(`          ${fieldLabel}`);
        lines.push('        </label>');
        lines.push('      </div>');
      } else {
        lines.push('      <div>');
        lines.push(`        <label htmlFor="${fieldName}" className="form-label">`);
        lines.push(`          ${fieldLabel}${isRequired ? ' *' : ''}`);
        lines.push('        </label>');
        lines.push('        <div className="mt-1">');
        
        // Determine field type and render appropriate input
        if (this.isEnumField(field, fieldName)) {
          const options = this.getEnumOptions(field, fieldName);
          lines.push(`          <select`);
          lines.push(`            id="${fieldName}"`);
          lines.push(`            {...register('${fieldName}'${isRequired ? `, { required: '${fieldLabel} is required' }` : ''})}`);
          lines.push('            className="form-input"');
          lines.push('          >');
          lines.push('            <option value="">Select ' + fieldLabel.toLowerCase() + '</option>');
          options.forEach(option => {
            lines.push(`            <option value="${option.value}">${option.label}</option>`);
          });
          lines.push('          </select>');
        } else if (field.type.baseType === 'string' && 
                   (fieldName.includes('description') || fieldName.includes('content') || 
                    (field.constraints.max && field.constraints.max > 100))) {
          lines.push(`          <textarea`);
          lines.push(`            id="${fieldName}"`);
          lines.push(`            {...register('${fieldName}'${isRequired ? `, { required: '${fieldLabel} is required' }` : ''})}`);
          lines.push('            className="form-input"');
          lines.push(`            rows={${fieldName.includes('content') ? '4' : '3'}}`);
          lines.push(`            placeholder="Enter ${fieldLabel.toLowerCase()}"`);
          lines.push('          />');
        } else {
          const inputType = this.getInputType(field);
          lines.push(`          <input`);
          lines.push(`            type="${inputType}"`);
          lines.push(`            id="${fieldName}"`);
          lines.push(`            {...register('${fieldName}'${isRequired ? `, { required: '${fieldLabel} is required' }` : ''})}`);
          lines.push('            className="form-input"');
          if (inputType === 'text') {
            lines.push(`            placeholder="Enter ${fieldLabel.toLowerCase()}"`);
          }
          lines.push('          />');
        }
        
        if (isRequired) {
          lines.push(`          {errors.${fieldName} && (`);
          lines.push(`            <p className="mt-1 text-sm text-red-600">{errors.${fieldName}.message}</p>`);
          lines.push('          )}');
        }
        lines.push('        </div>');
        lines.push('      </div>');
      }
    }
    
    lines.push('');
    lines.push('      <div className="flex justify-end space-x-3">');
    lines.push('        <button');
    lines.push('          type="button"');
    lines.push(`          onClick={() => navigate('/${routeName}s')}`);
    lines.push('          className="btn-secondary"');
    lines.push('        >');
    lines.push('          Cancel');
    lines.push('        </button>');
    lines.push('        <button');
    lines.push('          type="submit"');
    lines.push('          disabled={createMutation.isLoading || updateMutation.isLoading}');
    lines.push('          className="btn-primary disabled:opacity-50"');
    lines.push('        >');
    lines.push('          {createMutation.isLoading || updateMutation.isLoading ? \'Saving...\' : \'Save\'}');
    lines.push('        </button>');
    lines.push('      </div>');
    lines.push('    </form>');
    lines.push('  );');
    lines.push('}');
    
    return lines.join('\n');
  }
  
  private generateDetailComponent(entity: CIREntity, cir: CIRDocument): string {
    const lines: string[] = [];
    const entityName = entity.name;
    const routeName = entityName.toLowerCase();
    
    lines.push('import React from \'react\';');
    lines.push('import { useParams, Link } from \'react-router-dom\';');
    lines.push('import { PencilIcon } from \'@heroicons/react/24/outline\';');
    lines.push('import { useApiQuery } from \'../hooks/useApi\';');
    lines.push(`import { ${routeName}Api } from '../api/client';`);
    lines.push('import { LoadingSpinner } from \'./LoadingSpinner\';');
    lines.push('import { formatDate, formatCurrency } from \'../utils/formatters\';');
    lines.push('');
    
    lines.push(`export function ${entityName}Detail() {`);
    lines.push('  const { id } = useParams<{ id: string }>();');
    lines.push('');
    lines.push('  // Early return if no ID');
    lines.push(`  if (!id || id === 'undefined' || id === 'null') {`);
    lines.push(`    return <div className="text-red-600">Invalid ${entityName.toLowerCase()} ID</div>;`);
    lines.push('  }');
    lines.push('');
    lines.push(`  const { data: ${routeName}, isLoading, error } = useApiQuery(`);
    lines.push(`    ['${routeName}', id],`);
    lines.push(`    () => ${routeName}Api.getById(id),`);
    lines.push('    { enabled: !!id }');
    lines.push('  );');
    lines.push('');
    
    lines.push('  if (isLoading) return <LoadingSpinner />;');
    lines.push('  if (error) return <div className="text-red-600">Error loading data</div>;');
    lines.push(`  if (!${routeName}) return <div>Not found</div>;`);
    lines.push('');
    
    lines.push('  return (');
    lines.push('    <div className="space-y-6">');
    lines.push('      <div className="flex justify-between items-center">');
    lines.push(`        <h1 className="text-2xl font-bold text-gray-900">${entityName} Details</h1>`);
    lines.push(`        <Link`);
    lines.push(`          to={\`/${routeName}s/\${${routeName}.id}/edit\`}`);
    lines.push('          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"');
    lines.push('        >');
    lines.push('          <PencilIcon className="mr-2 h-4 w-4" />');
    lines.push('          Edit');
    lines.push('        </Link>');
    lines.push('      </div>');
    lines.push('');
    
    lines.push('      <div className="bg-white shadow overflow-hidden sm:rounded-lg">');
    lines.push('        <div className="px-4 py-5 sm:px-6">');
    lines.push(`          <h3 className="text-lg leading-6 font-medium text-gray-900">${entityName} Information</h3>`);
    lines.push('        </div>');
    lines.push('        <div className="border-t border-gray-200 px-4 py-5 sm:p-0">');
    lines.push('          <dl className="sm:divide-y sm:divide-gray-200">');
    
    // Generate detail fields
    for (const fieldName in entity.fields) {
      const field = entity.fields[fieldName];
      if (fieldName === 'id') continue;
      
      lines.push('            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">');
      lines.push(`              <dt className="text-sm font-medium text-gray-500">${this.formatFieldLabel(fieldName)}</dt>`);
      lines.push('              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">');
      
      if (field.type.baseType === 'date' || field.type.baseType === 'datetime') {
        lines.push(`                {formatDate(${routeName}.${fieldName})}`);
      } else if (field.type.baseType === 'number' && field.type.subType === 'money') {
        lines.push(`                {formatCurrency(${routeName}.${fieldName})}`);
      } else if (field.type.baseType === 'boolean') {
        lines.push(`                {${routeName}.${fieldName} ? 'Yes' : 'No'}`);
      } else {
        lines.push(`                {${routeName}.${fieldName} || '-'}`);
      }
      
      lines.push('              </dd>');
      lines.push('            </div>');
    }
    
    lines.push('          </dl>');
    lines.push('        </div>');
    lines.push('      </div>');
    lines.push('');
    lines.push('      <div className="flex justify-start">');
    lines.push('        <Link');
    lines.push(`          to="/${routeName}s"`);
    lines.push('          className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded"');
    lines.push('        >');
    lines.push(`          Back to ${entityName}s`);
    lines.push('        </Link>');
    lines.push('      </div>');
    lines.push('    </div>');
    lines.push('  );');
    lines.push('}');
    
    return lines.join('\n');
  }
  
  private generatePageComponent(entity: CIREntity, cir: CIRDocument): string {
    const lines: string[] = [];
    const entityName = entity.name;
    const routeName = entityName.toLowerCase();
    
    lines.push('import React from \'react\';');
    lines.push('import { Routes, Route } from \'react-router-dom\';');
    lines.push(`import { ${entityName}List } from '../components/${entityName}List';`);
    lines.push(`import { ${entityName}Form } from '../components/${entityName}Form';`);
    lines.push(`import { ${entityName}Detail } from '../components/${entityName}Detail';`);
    lines.push('import { Layout } from \'../components/Layout\';');
    lines.push('');
    
    lines.push(`export function ${entityName}Page() {`);
    lines.push('  return (');
    lines.push('    <Layout>');
    lines.push('      <Routes>');
    lines.push(`        <Route path="/" element={<${entityName}List />} />`);
    lines.push(`        <Route path="/new" element={<${entityName}Form />} />`);
    lines.push(`        <Route path="/:id" element={<${entityName}Detail />} />`);
    lines.push(`        <Route path="/:id/edit" element={<${entityName}Form />} />`);
    lines.push('      </Routes>');
    lines.push('    </Layout>');
    lines.push('  );');
    lines.push('}');
    
    return lines.join('\n');
  }
  
  private generateRouter(cir: CIRDocument): string {
    const lines: string[] = [];
    
    lines.push('import React from \'react\';');
    lines.push('import { Routes, Route } from \'react-router-dom\';');
    lines.push('import { Layout } from \'../components/Layout\';');
    
    // Import page components
    for (const moduleName in cir.modules) {
      const module = cir.modules[moduleName];
      for (const entityName in module.entities) {
        lines.push(`import { ${entityName}Page } from '../pages/${entityName}Page';`);
      }
    }
    
    lines.push('');
    
    lines.push('function Dashboard() {');
    lines.push('  return (');
    lines.push('    <Layout>');
    lines.push('      <div className="space-y-6">');
    lines.push(`        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>`);
    lines.push('        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">');
    
    // Generate dashboard cards
    for (const moduleName in cir.modules) {
      const module = cir.modules[moduleName];
      for (const entityName in module.entities) {
        const routeName = entityName.toLowerCase();
        lines.push('          <div className="bg-white overflow-hidden shadow rounded-lg">');
        lines.push('            <div className="p-5">');
        lines.push('              <div className="flex items-center">');
        lines.push('                <div className="flex-shrink-0">');
        lines.push('                  <div className="w-8 h-8 bg-indigo-500 rounded-md flex items-center justify-center">');
        lines.push('                    <span className="text-white font-bold text-sm">');
        lines.push(`                      ${entityName.charAt(0)}`);
        lines.push('                    </span>');
        lines.push('                  </div>');
        lines.push('                </div>');
        lines.push('                <div className="ml-5 w-0 flex-1">');
        lines.push(`                  <dl>`);
        lines.push('                    <dt className="text-sm font-medium text-gray-500 truncate">');
        lines.push(`                      ${entityName}s`);
        lines.push('                    </dt>');
        lines.push('                    <dd className="flex items-baseline">');
        lines.push('                      <div className="text-2xl font-semibold text-gray-900">');
        lines.push('                        -');
        lines.push('                      </div>');
        lines.push('                    </dd>');
        lines.push('                  </dl>');
        lines.push('                </div>');
        lines.push('              </div>');
        lines.push('            </div>');
        lines.push('            <div className="bg-gray-50 px-5 py-3">');
        lines.push('              <div className="text-sm">');
        lines.push(`                <a href="/${routeName}s" className="font-medium text-indigo-700 hover:text-indigo-900">`);
        lines.push(`                  Manage ${entityName}s`);
        lines.push('                </a>');
        lines.push('              </div>');
        lines.push('            </div>');
        lines.push('          </div>');
      }
    }
    
    lines.push('        </div>');
    lines.push('      </div>');
    lines.push('    </Layout>');
    lines.push('  );');
    lines.push('}');
    lines.push('');
    
    lines.push('export function Router() {');
    lines.push('  return (');
    lines.push('    <Routes>');
    lines.push('      <Route path="/" element={<Dashboard />} />');
    
    // Generate routes for each entity
    for (const moduleName in cir.modules) {
      const module = cir.modules[moduleName];
      for (const entityName in module.entities) {
        const routeName = entityName.toLowerCase();
        lines.push(`      <Route path="/${routeName}s/*" element={<${entityName}Page />} />`);
      }
    }
    
    lines.push('    </Routes>');
    lines.push('  );');
    lines.push('}');
    
    return lines.join('\n');
  }
  
  // Helper methods
  private generateLoadingSpinner(): string {
    return `import React from 'react';

export function LoadingSpinner() {
  return (
    <div className="flex justify-center items-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
    </div>
  );
}`;
  }
  
  private generateErrorBoundary(): string {
    return `import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-gray-800">Something went wrong</h3>
                <div className="mt-2 text-sm text-gray-500">
                  <p>Please refresh the page and try again.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}`;
  }
  
  private generateFormatters(): string {
    return `import { format } from 'date-fns';

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '-';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return format(dateObj, 'MMM d, yyyy');
  } catch {
    return '-';
  }
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return '-';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return format(dateObj, 'MMM d, yyyy h:mm a');
  } catch {
    return '-';
  }
}

export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '-';
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

export function formatNumber(num: number | null | undefined): string {
  if (num === null || num === undefined) return '-';
  
  return new Intl.NumberFormat('en-US').format(num);
}`;
  }
  
  private generateValidators(): string {
    return `export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
  return emailRegex.test(email);
}

export function validatePhone(phone: string): boolean {
  const phoneRegex = /^[\\+]?[1-9][\\d\\s\\-\\(\\)]{7,15}$/;
  return phoneRegex.test(phone);
}

export function validateRequired(value: any): boolean {
  return value !== null && value !== undefined && value !== '';
}

export function validateMinLength(value: string, minLength: number): boolean {
  return value && value.length >= minLength;
}

export function validateMaxLength(value: string, maxLength: number): boolean {
  return !value || value.length <= maxLength;
}`;
  }
  
  private generateStyles(): string {
    return `@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  html {
    font-family: 'Inter', system-ui, sans-serif;
  }
}

@layer components {
  .btn {
    @apply inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2;
  }
  
  .btn-primary {
    @apply btn text-white bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500;
  }
  
  .btn-secondary {
    @apply btn text-gray-700 bg-white border-gray-300 hover:bg-gray-50 focus:ring-indigo-500;
  }
  
  .form-input {
    @apply block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm;
  }
  
  .form-label {
    @apply block text-sm font-medium text-gray-700;
  }
}`;
  }
  
  private generateTailwindConfig(): string {
    return `/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}`;
  }

  private generatePostCssConfig(): string {
    return `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}`;
  }
  
  private generateViteConfig(): string {
    return `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3001,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})`;
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
    
    lines.push(`# ${cir.metadata.name} Frontend`);
    lines.push('');
    lines.push('Generated React frontend application with modern UI components.');
    lines.push('');
    lines.push('## Features');
    lines.push('');
    lines.push('- 🚀 **React 18** - Latest React with hooks');
    lines.push('- 🎨 **Tailwind CSS** - Utility-first CSS framework');
    lines.push('- 📱 **Responsive Design** - Mobile-first approach');
    lines.push('- 🔄 **React Query** - Data fetching and caching');
    lines.push('- 📝 **React Hook Form** - Form management');
    lines.push('- 🧭 **React Router** - Client-side routing');
    lines.push('- 🎯 **TypeScript** - Full type safety');
    lines.push('- ⚡ **Vite** - Fast build tool');
    lines.push('');
    lines.push('## Quick Start');
    lines.push('');
    lines.push('```bash');
    lines.push('# Install dependencies');
    lines.push('npm install');
    lines.push('');
    lines.push('# Start development server');
    lines.push('npm run dev');
    lines.push('');
    lines.push('# Build for production');
    lines.push('npm run build');
    lines.push('```');
    lines.push('');
    lines.push('## Environment Variables');
    lines.push('');
    lines.push('Create a `.env` file in the root directory:');
    lines.push('');
    lines.push('```bash');
    lines.push('VITE_API_URL=http://localhost:3000/api');
    lines.push('```');
    lines.push('');
    lines.push('## Project Structure');
    lines.push('');
    lines.push('```');
    lines.push('src/');
    lines.push('├── components/     # Reusable UI components');
    lines.push('├── pages/          # Page components');
    lines.push('├── hooks/          # Custom React hooks');
    lines.push('├── api/            # API client and calls');
    lines.push('├── types/          # TypeScript type definitions');
    lines.push('├── utils/          # Utility functions');
    lines.push('├── styles/         # Global styles');
    lines.push('└── router/         # Routing configuration');
    lines.push('```');
    lines.push('');
    lines.push('## Available Pages');
    lines.push('');
    
    for (const moduleName in cir.modules) {
      const module = cir.modules[moduleName];
      for (const entityName in module.entities) {
        const routeName = entityName.toLowerCase();
        lines.push(`- **${entityName}s** - \`/${routeName}s\``);
        lines.push(`  - List all ${routeName}s`);
        lines.push(`  - Create new ${routeName}`);
        lines.push(`  - View ${routeName} details`);
        lines.push(`  - Edit ${routeName}`);
        lines.push('');
      }
    }
    
    lines.push('## Development');
    lines.push('');
    lines.push('The application runs on `http://localhost:3001` by default.');
    lines.push('API requests are proxied to the backend at `http://localhost:3000`.');
    lines.push('');
    lines.push('## Building');
    lines.push('');
    lines.push('```bash');
    lines.push('npm run build');
    lines.push('```');
    lines.push('');
    lines.push('The built files will be in the `dist/` directory.');
    
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
  
  private getInputType(field: CIRField): string {
    switch (field.type.baseType) {
      case 'string':
        if (field.type.subType === 'email') return 'email';
        if (field.type.subType === 'phone') return 'tel';
        return 'text';
      case 'number':
        return 'number';
      case 'boolean':
        return 'checkbox';
      case 'date':
        return 'date';
      case 'datetime':
        return 'datetime-local';
      default:
        return 'text';
    }
  }

  private isEnumField(field: CIRField, fieldName: string): boolean {
    // Check if field name suggests it's an enum/select field
    const enumFields = ['status', 'priority', 'type', 'state', 'role', 'tier'];
    return enumFields.some(enumField => fieldName.toLowerCase().includes(enumField));
  }

  private getEnumOptions(field: CIRField, fieldName: string): Array<{value: string, label: string}> {
    const fieldLower = fieldName.toLowerCase();
    
    if (fieldLower.includes('status')) {
      if (fieldLower.includes('project')) {
        return [
          { value: 'planning', label: 'Planning' },
          { value: 'active', label: 'Active' },
          { value: 'on-hold', label: 'On Hold' },
          { value: 'completed', label: 'Completed' },
          { value: 'cancelled', label: 'Cancelled' }
        ];
      } else if (fieldLower.includes('task')) {
        return [
          { value: 'todo', label: 'To Do' },
          { value: 'in-progress', label: 'In Progress' },
          { value: 'review', label: 'In Review' },
          { value: 'done', label: 'Done' },
          { value: 'cancelled', label: 'Cancelled' }
        ];
      } else {
        return [
          { value: 'active', label: 'Active' },
          { value: 'inactive', label: 'Inactive' },
          { value: 'pending', label: 'Pending' },
          { value: 'completed', label: 'Completed' }
        ];
      }
    }
    
    if (fieldLower.includes('priority')) {
      return [
        { value: 'low', label: 'Low' },
        { value: 'medium', label: 'Medium' },
        { value: 'high', label: 'High' },
        { value: 'urgent', label: 'Urgent' }
      ];
    }
    
    if (fieldLower.includes('tier')) {
      return [
        { value: 'regular', label: 'Regular' },
        { value: 'vip', label: 'VIP' },
        { value: 'blocked', label: 'Blocked' }
      ];
    }
    
    if (fieldLower.includes('type')) {
      return [
        { value: 'personal', label: 'Personal' },
        { value: 'business', label: 'Business' },
        { value: 'other', label: 'Other' }
      ];
    }
    
    // Default options
    return [
      { value: 'option1', label: 'Option 1' },
      { value: 'option2', label: 'Option 2' },
      { value: 'option3', label: 'Option 3' }
    ];
  }
  
  private formatFieldLabel(fieldName: string): string {
    return fieldName
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }
} 