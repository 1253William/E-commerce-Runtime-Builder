export type Env = { DB: D1Database; ASSETS: R2Bucket; APP_ENV: string; WEB_ORIGIN: string; SESSION_SECRET?: string };
export type Variables = { user: { id: string; email: string; merchantId: string; role: "owner" | "admin" | "member" } };
