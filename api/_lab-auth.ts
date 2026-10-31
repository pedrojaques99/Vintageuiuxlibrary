/**
 * Login do admin do /lab ("Entrar com Visant Labs") e o veredito guardado.
 *
 * Arquivo com `_` na frente: a Vercel não vira função, só é importado por
 * `lab-login.ts`, `lab-callback.ts` e `lab.ts`.
 *
 * Login: OAuth 2.1 do api.visantlabs.com (oauth4webapi: state + PKCE S256).
 * O cliente foi registrado uma vez por registro dinâmico (POST /oauth/register)
 * e é público (sem segredo), então o client_id mora aqui. Admin é quem o
 * backend do Visant Labs diz que é: `GET /api/admin/status` passa por
 * `validateAdmin` (aceita o token OAuth e confere `user.isAdmin`): 200 ou 403.
 * A sessão (usuário + isAdmin) vai num cookie selado HttpOnly/Secure/SameSite=Lax
 * (iron-session); o token do Visant Labs é usado na volta do login e descartado.
 *
 * Veredito: Supabase do visant-board, tabela `lab.veredictos`, só pelo service
 * role, via RPC `public.lab_veredictos()` / `public.lab_veredicto_put(...)`.
 *
 * Env (Vercel): LAB_SESSION_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
 */

import * as oauth from "oauth4webapi";
import { getIronSession, webCookies, type SessionOptions } from "iron-session";

export const SITE = "https://ui.visantlabs.com";
export const CALLBACK = `${SITE}/api/lab-callback`;
export const VISANT = "https://api.visantlabs.com";
export const SCOPE = "read";
/* POST https://api.visantlabs.com/oauth/register, 2026-10-31. Cliente público: não é segredo. */
const CLIENT_ID = "19eadeb3-98d4-446c-a802-1f6eac1a6603";

declare const process: { env: Record<string, string | undefined> };
const env = () => ({
  cookie: process.env.LAB_SESSION_SECRET,
  db: process.env.SUPABASE_URL,
  key: process.env.SUPABASE_SERVICE_ROLE_KEY,
});
/** Login só existe com o segredo do cookie; veredito só com o Supabase. */
export const loginReady = () => (env().cookie?.length ?? 0) >= 32;
export const storeReady = () => Boolean(env().db && env().key);

export const AS: oauth.AuthorizationServer = {
  issuer: VISANT,
  authorization_endpoint: `${VISANT}/oauth/authorize`,
  token_endpoint: `${VISANT}/oauth/token`,
};
export const client: oauth.Client = { client_id: CLIENT_ID, token_endpoint_auth_method: "none" };
export const clientAuth = oauth.None();

const base = (name: string, ttl: number): SessionOptions => ({
  cookieName: name,
  password: env().cookie!,
  ttl,
  cookieOptions: { httpOnly: true, secure: true, sameSite: "lax", path: "/" },
});

export type LabSession = { user?: string; isAdmin?: boolean };
export type LoginState = { state?: string; verifier?: string };

/** `headers` recebe o Set-Cookie; passe-os pra Response que sair. */
export const session = (req: Request, headers: Headers) =>
  getIronSession<LabSession>(webCookies(req, headers), base("visant_lab", 60 * 60 * 12));
export const loginState = (req: Request, headers: Headers) =>
  getIronSession<LoginState>(webCookies(req, headers), base("visant_lab_oauth", 60 * 10));

/** Pergunta ao Visant Labs se o dono do token é admin (200 = sim, 403 = não). */
export async function adminCheck(token: string): Promise<{ isAdmin: boolean; user: string | null }> {
  const res = await fetch(`${VISANT}/api/admin/status`, { headers: { authorization: `Bearer ${token}` } });
  if (!res.ok) return { isAdmin: false, user: null };
  const j = (await res.json().catch(() => ({}))) as { auth?: { isAdmin?: boolean; userId?: string } };
  return { isAdmin: j.auth?.isAdmin === true, user: j.auth?.userId ?? null };
}

export type Veredicto = { id: string; status: "kept" | "discarded"; reason: string; by: string; at: string };

async function rpc<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  const { db, key } = env();
  const headers: Record<string, string> = { apikey: key!, "content-type": "application/json" };
  /* Chave legada é JWT e vai também no Authorization; a nova (sb_secret_) só no apikey. */
  if (key!.startsWith("eyJ")) headers.authorization = `Bearer ${key}`;
  const res = await fetch(`${db}/rest/v1/rpc/${fn}`, { method: "POST", headers, body: JSON.stringify(args) });
  if (!res.ok) throw new Error(`Supabase ${res.status} em ${fn}`);
  return res.json() as Promise<T>;
}
export const listVeredictos = () => rpc<Veredicto[]>("lab_veredictos");
export const putVeredicto = (id: string, status: Veredicto["status"], reason: string, by: string) =>
  rpc<Veredicto>("lab_veredicto_put", { p_id: id, p_status: status, p_reason: reason, p_by: by });

export const redirect = (to: string, headers: Headers) => {
  headers.set("location", to);
  headers.set("cache-control", "no-store");
  return new Response(null, { status: 302, headers });
};
