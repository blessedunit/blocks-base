/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_USE_CONTRACT?: string;
  readonly VITE_CONTRACT_ADDRESS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
