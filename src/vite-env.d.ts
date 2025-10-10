/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_LOG_ENDPOINT?: string;
  readonly VITE_NANO_GPT_API_KEY?: string;
  readonly VITE_NANO_GPT_BASE_URL?: string;
  readonly VITE_DEFAULT_MODEL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
