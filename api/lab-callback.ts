/**
 * GET /api/lab-callback: a volta do Visant Labs. Confere o state (CSRF), troca
 * o code com o code_verifier (PKCE), pergunta ao Visant Labs se a conta é admin
 * e guarda só { user, isAdmin } no cookie selado. O access token não é guardado.
 * Qualquer falha volta pro /lab?admin com `&erro=`.
 */

import * as oauth from "oauth4webapi";
import { AS, CALLBACK, adminCheck, client, clientAuth, loginReady, loginState, redirect, session } from "./_lab-auth.js";

export async function GET(request: Request) {
  const headers = new Headers();
  if (!loginReady()) return redirect("/lab?admin&erro=login-nao-configurado", headers);

  const pending = await loginState(request, headers);
  const { state, verifier } = pending;
  pending.destroy();
  if (!state || !verifier) return redirect("/lab?admin&erro=login-expirou", headers);

  try {
    const params = oauth.validateAuthResponse(AS, client, new URL(request.url), state);
    const res = await oauth.authorizationCodeGrantRequest(AS, client, clientAuth, params, CALLBACK, verifier);
    const tokens = await oauth.processAuthorizationCodeResponse(AS, client, res);
    const { isAdmin, user } = await adminCheck(tokens.access_token);
    if (!isAdmin) return redirect("/lab?admin&erro=nao-admin", headers);
    const s = await session(request, headers);
    s.user = user ?? "admin";
    s.isAdmin = true;
    await s.save();
    return redirect("/lab?admin", headers);
  } catch {
    return redirect("/lab?admin&erro=login-falhou", headers);
  }
}
