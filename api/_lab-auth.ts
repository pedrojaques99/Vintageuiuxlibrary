/**
 * Login do admin do /lab: "Entrar com GitHub" (OAuth web flow) e a sessão.
 *
 * Arquivo com `_` na frente: a Vercel não vira função, só é importado pelas
 * três rotas (`lab-login`, `lab-callback`, `lab.ts`). O token do GitHub de quem
 * entrou mora SÓ num cookie HttpOnly/Secure/SameSite=Lax selado (iron-session,
 * criptografado e assinado); o navegador nunca lê. Quem pode aprovar é quem tem
 * push no repo, conferido no GitHub a cada request, não uma lista aqui.
 *
 *   oauth4webapi: authorize URL, state + PKCE (S256), troca do code.
 *   iron-session: cookie selado da sessão e do state/verifier do login.
 *
 * Env (Vercel): GITHUB_OAUTH_CLIENT_ID, GITHUB_OAUTH_CLIENT_SECRET, LAB_SESSION_SECRET.
 */

import * as oauth from "oauth4webapi";
import { getIronSession, webCookies, type SessionOptions } from "iron-session";

export const SITE = "https://ui.visantlabs.com";
export const REPO = "pedrojaques99/Vintageuiuxlibrary";
export const CALLBACK = `${SITE}/api/lab-callback`;
/* O repo é público: `public_repo` basta pra escrever nele. */
export const SCOPE = "public_repo";

declare const process: { env: Record<string, string | undefined> };
const env = () => ({
  id: process.env.GITHUB_OAUTH_CLIENT_ID,
  secret: process.env.GITHUB_OAUTH_CLIENT_SECRET,
  cookie: process.env.LAB_SESSION_SECRET,
});
export const configured = () => {
  const e = env();
  return Boolean(e.id && e.secret && e.cookie && e.cookie.length >= 32);
};

export const AS: oauth.AuthorizationServer = {
  issuer: "https://github.com",
  authorization_endpoint: "https://github.com/login/oauth/authorize",
  token_endpoint: "https://github.com/login/oauth/access_token",
};
export const client = (): oauth.Client => ({ client_id: env().id! });
export const clientAuth = () => oauth.ClientSecretPost(env().secret!);

const base = (name: string, ttl: number): SessionOptions => ({
  cookieName: name,
  password: env().cookie!,
  ttl,
  cookieOptions: { httpOnly: true, secure: true, sameSite: "lax", path: "/" },
});

export type LabSession = { login?: string; token?: string };
export type LoginState = { state?: string; verifier?: string };

/** `headers` recebe o Set-Cookie; passe-os pra Response que sair. */
export const session = (req: Request, headers: Headers) =>
  getIronSession<LabSession>(webCookies(req, headers), base("visant_lab", 60 * 60 * 24 * 30));
export const loginState = (req: Request, headers: Headers) =>
  getIronSession<LoginState>(webCookies(req, headers), base("visant_lab_oauth", 60 * 10));

export const gh = (token: string) => async <T>(path: string, init: RequestInit = {}): Promise<T> => {
  const res = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      accept: "application/vnd.github+json",
      "x-github-api-version": "2022-11-28",
      "content-type": "application/json",
      "user-agent": "visant-lab",
    },
  });
  if (!res.ok) throw Object.assign(new Error(`GitHub ${res.status} em ${path}`), { status: res.status });
  return res.json() as Promise<T>;
};

/** Push no repo, perguntado ao GitHub com o token de quem entrou. */
export async function canPush(token: string) {
  try {
    const repo = await gh(token)<{ permissions?: { push?: boolean } }>(`/repos/${REPO}`);
    return Boolean(repo.permissions?.push);
  } catch {
    return false;
  }
}

export const redirect = (to: string, headers: Headers) => {
  headers.set("location", to);
  headers.set("cache-control", "no-store");
  return new Response(null, { status: 302, headers });
};
