/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_KEY: string;
  readonly GEMINI_API_KEY: string;
  // Add other VITE_ prefixed environment variables here if you use them
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}