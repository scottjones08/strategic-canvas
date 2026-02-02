// Code Snippets types for Mission Control integration

export interface CodeSnippet {
  id: string;
  title: string;
  description: string;
  code: string;
  language: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface CreateSnippetInput {
  title: string;
  description: string;
  code: string;
  language: string;
  tags: string[];
}

export interface UpdateSnippetInput extends Partial<CreateSnippetInput> {
  id: string;
}

// Auto-generated report types
export interface ComponentReport {
  name: string;
  path: string;
  type: 'page' | 'component' | 'hook' | 'lib';
  description?: string;
}

export interface APIEndpointReport {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  description?: string;
}

export interface ConfigReport {
  key: string;
  value: string;
  source: 'env' | 'config' | 'package.json';
}

export interface DocumentationReport {
  components: ComponentReport[];
  apiEndpoints: APIEndpointReport[];
  configs: ConfigReport[];
  generatedAt: string;
}

// Language options for syntax highlighting
export const LANGUAGE_OPTIONS = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'jsx', label: 'JSX' },
  { value: 'tsx', label: 'TSX' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'scss', label: 'SCSS' },
  { value: 'json', label: 'JSON' },
  { value: 'python', label: 'Python' },
  { value: 'bash', label: 'Bash' },
  { value: 'sql', label: 'SQL' },
  { value: 'markdown', label: 'Markdown' },
  { value: 'yaml', label: 'YAML' },
  { value: 'graphql', label: 'GraphQL' },
  { value: 'rust', label: 'Rust' },
  { value: 'go', label: 'Go' },
  { value: 'java', label: 'Java' },
  { value: 'csharp', label: 'C#' },
  { value: 'cpp', label: 'C++' },
  { value: 'php', label: 'PHP' },
  { value: 'ruby', label: 'Ruby' },
  { value: 'swift', label: 'Swift' },
  { value: 'kotlin', label: 'Kotlin' },
  { value: 'plaintext', label: 'Plain Text' },
];

// Tag color map for visual distinction
export const TAG_COLORS: Record<string, string> = {
  react: 'bg-blue-100 text-blue-700',
  typescript: 'bg-blue-100 text-blue-700',
  api: 'bg-green-100 text-green-700',
  utility: 'bg-purple-100 text-purple-700',
  hook: 'bg-pink-100 text-pink-700',
  component: 'bg-indigo-100 text-indigo-700',
  config: 'bg-yellow-100 text-yellow-700',
  database: 'bg-orange-100 text-orange-700',
  auth: 'bg-red-100 text-red-700',
  ui: 'bg-cyan-100 text-cyan-700',
  canvas: 'bg-navy-100 text-navy-700',
  whiteboard: 'bg-navy-100 text-navy-700',
  default: 'bg-gray-100 text-gray-700',
};

export const getTagColor = (tag: string): string => {
  const normalizedTag = tag.toLowerCase();
  return TAG_COLORS[normalizedTag] || TAG_COLORS.default;
};
