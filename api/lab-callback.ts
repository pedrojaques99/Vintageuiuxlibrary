/**
 * GET /api/lab-callback: a volta do GitHub. Confere o state (CSRF), troca o
 * code com o code_verifier (PKCE), guarda login + token no cookie selado da
 * sessão e volta pro /lab?admin. Qualquer falha volta com `&erro=`.
 */

import * as oauth from "oauth4webapi";
import { AS, CALLBACK, client, clientAuth, configured, gh, loginState, redirect, session } from "./_lab-auth.js";

export async function GET(request: Request) {
  const headers = new Headers();
  if (!configured()) return redirect("/lab?admin&erro=login-nao-configurado", headers);

  const pending = await loginState(request, headers);
  const { state, verifier } = pending;
  pending.destroy();
  if (!state || !verifier) return redirect("/lab?admin&erro=login-expirou", headers);

  try {
    const params = oauth.validateAuthResponse(AS, client(), new URL(request.url), state);
    const res = await oauth.authorizationCodeGrantRequest(AS, client(), clientAuth(), params, CALLBACK, verifier);
    const tokens = await oauth.processAuthorizationCodeResponse(AS, client(), res);
    const user = await gh(tokens.access_token)<{ login: string }>("/user");
    const s = await session(request, headers);
    s.login = user.login;
    s.token = tokens.access_token;
    await s.save();
    return redirect("/lab?admin", headers);
  } catch {
    return redirect("/lab?admin&erro=login-falhou", headers);
  }
}
