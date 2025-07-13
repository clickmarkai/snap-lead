import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { validateConfig, config } from './lib/config'

// Validate configuration on startup
try {
  validateConfig()
} catch (error) {
  // Create a simple error page for configuration issues
  document.body.innerHTML = `
    <div style="
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      font-family: system-ui, -apple-system, sans-serif;
      background: #f3f4f6;
      color: #1f2937;
      padding: 1rem;
    ">
      <div style="
        background: white;
        padding: 2rem;
        border-radius: 8px;
        box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
        max-width: 500px;
        text-align: center;
      ">
        <h1 style="color: #dc2626; margin-bottom: 1rem;">Configuration Error</h1>
        <p style="margin-bottom: 1rem; color: #6b7280;">
          The application could not start due to missing configuration.
        </p>
        <p style="font-family: monospace; font-size: 0.875rem; color: #374151; background: #f9fafb; padding: 1rem; border-radius: 4px; margin-bottom: 1rem;">
          ${error instanceof Error ? error.message : 'Unknown error'}
        </p>
        <p style="font-size: 0.875rem; color: #6b7280;">
          Please check your environment variables and try again.
        </p>
      </div>
    </div>
  `
  throw error
}

createRoot(document.getElementById("root")!).render(<App />);
