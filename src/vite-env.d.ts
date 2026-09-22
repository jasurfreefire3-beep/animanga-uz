/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string;
  readonly [key: string]: string | boolean | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
