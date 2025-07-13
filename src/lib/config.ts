// Application configuration management
export interface AppConfig {
  supabase: {
    url: string;
    anonKey: string;
  };
  n8n: {
    webhookUrl: string;
    analyzeUrl: string;
  };
  app: {
    name: string;
    version: string;
    isDevelopment: boolean;
  };
}

// Environment variable validation
const getEnvVar = (name: string, required: boolean = true): string => {
  const value = import.meta.env[name];
  
  if (required && !value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  
  return value || '';
};

// Application configuration
export const config: AppConfig = {
  supabase: {
    url: getEnvVar('VITE_SUPABASE_URL'),
    anonKey: getEnvVar('VITE_SUPABASE_ANON_KEY'),
  },
  n8n: {
    webhookUrl: getEnvVar('VITE_N8N_WEBHOOK_URL', false),
    analyzeUrl: getEnvVar('VITE_N8N_ANALYZE_URL', false),
  },
  app: {
    name: getEnvVar('VITE_APP_NAME', false) || 'DELIFRU',
    version: getEnvVar('VITE_APP_VERSION', false) || '1.0.0',
    isDevelopment: getEnvVar('VITE_DEV_MODE', false) === 'true',
  },
};

// Validate configuration on startup
export const validateConfig = (): void => {
  const errors: string[] = [];
  
  // Required configuration
  if (!config.supabase.url) {
    errors.push('Supabase URL is required');
  }
  
  if (!config.supabase.anonKey) {
    errors.push('Supabase anonymous key is required');
  }
  
  if (errors.length > 0) {
    throw new Error(`Configuration errors: ${errors.join(', ')}`);
  }
};

// Production safety checks
export const isProduction = (): boolean => {
  return import.meta.env.MODE === 'production';
};

export const isDevelopment = (): boolean => {
  return import.meta.env.MODE === 'development';
};

// Feature flags
export const features = {
  aiAnalysis: Boolean(config.n8n.webhookUrl && config.n8n.analyzeUrl),
  debugMode: config.app.isDevelopment,
  errorReporting: isProduction(),
}; 