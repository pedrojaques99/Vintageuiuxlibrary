/**
 * GET /api/lab-login → github.com/login/oauth/authorize, com state + PKCE.
 * GET /api/lab-login?logout=1 → apaga a sessão e volta pro /lab.
 * O state e o code_verifier ficam num cookie selado de 10 min (`_lab-auth.ts`).
 */

import * as oauth from "oauth4webapi";
import { AS, CALLBACK, SCOPE, client, configured, loginState, redirect, session } from "./_lab-auth.js";

export async function GET(request: Request) {
  const headers = new Headers();
  if (!configured()) return redirect("/lab?admin&erro=login-nao-configurado", headers);

  if (new URL(request.url).searchParams.has("logout")) {
    (await session(request, headers)).destroy();
    return redirect("/lab", headers);
  }

  const state = oauth.generateRandomState();
  const verifier = oauth.generateRandomCodeVerifier();
  const pending = await loginState(request, headers);
  pending.state = state;
  pending.verifier = verifier;
  await pending.save();

  const url = new URL(AS.authorization_endpoint!);
  url.searchParams.set("client_id", client().client_id);
  url.searchParams.set("redirect_uri", CALLBACK);
  url.searchParams.set("scope", SCOPE);
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", await oauth.calculatePKCECodeChallenge(verifier));
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("allow_signup", "false");
  return redirect(url.href, headers);
}
