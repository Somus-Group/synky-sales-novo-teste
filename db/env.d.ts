declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
    FILES: R2Bucket | KVNamespace;
    OPENAI_API_KEY?: string;
    STUDIO_DAILY_BUDGET_USD?: string;
    STUDIO_DESIGN_AI_MODEL?: string;
    STUDIO_ECONOMY_AI_MODEL?: string;
  }
}
