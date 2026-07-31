"use client";

/**
 * Entrar com a conta Visant — OAuth 2.1 com PKCE, direto do browser.
 *
 * Existe porque a vitrine mostrava as 22 marcas do vault pessoal do dono do
 * repo num JSON público. A resposta certa não é esconder o recurso: é cada
 * pessoa ver o próprio vault. As marcas públicas do site passaram a ser quatro
 * fictícias; as reais chegam por aqui, autenticadas, e não tocam o disco do
 * servidor.
 *
 * Por que PKCE e não um segredo de cliente: isto é uma página estática. Segredo
 * em app de browser não é segredo — qualquer um abre o bundle e lê. O PKCE
 * resolve exatamente esse caso: o `code_verifier` é sorteado a cada tentativa,
 * fica no `sessionStorage` da aba e nunca viaja; o que vai na URL é só o hash
 * dele. Quem interceptar o código de autorização não consegue trocá-lo por
 * token sem o verificador.
 *
 * O token de acesso vive em memória — não em `localStorage`. Um XSS na página
 * lê `localStorage`; memória de módulo some ao fechar a aba, e o refresh token
 * é guardado à parte para a sessão sobreviver a um F5 sem deixar o acesso
 * exposto por 30 dias.
 */

import * as React from "react";

const API = "https://api.visantlabs.com";
const CLIENT_ID = "f5bc2d56-34b4-4c26-9a65-202b0a5e695e";
const ESCOPO = "read";

const CHAVE_VERIFIER = "visant:pkce";
const CHAVE_REFRESH = "visant:refresh";
const CHAVE_DESTINO = "visant:volta-para";

// --- PKCE --------------------------------------------------------------------

const base64url = (bytes: ArrayBuffer) =>
  btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

function sortearVerifier() {
  const bytes = new Uint8Array(64);
  crypto.getRandomValues(bytes);
  return base64url(bytes.buffer).slice(0, 96);
}

async function desafioDe(verifier: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return base64url(digest);
}

// --- tipos -------------------------------------------------------------------

export interface MarcaDoUsuario {
  id: string;
  name: string;
  tagline: string | null;
  colors: { hex: string; role: string | null; name: string | null }[];
  typography: { family: string; role: string | null }[];
  completeness: number | null;
  updatedAt: string | null;
}

interface Sessao {
  estado: "carregando" | "fora" | "dentro" | "erro";
  erro: string | null;
  marcas: MarcaDoUsuario[] | null;
  carregandoMarcas: boolean;
  entrar: () => Promise<void>;
  sair: () => void;
  buscarMarcas: () => Promise<void>;
}

const Ctx = React.createContext<Sessao | null>(null);

// --- provider ----------------------------------------------------------------

export function VisantAuthProvider({ children }: { children: React.ReactNode }) {
  // Em memória de propósito: `localStorage` é legível por qualquer XSS.
  const token = React.useRef<string | null>(null);
  const [estado, setEstado] = React.useState<Sessao["estado"]>("carregando");
  const [erro, setErro] = React.useState<string | null>(null);
  const [marcas, setMarcas] = React.useState<MarcaDoUsuario[] | null>(null);
  const [carregandoMarcas, setCarregandoMarcas] = React.useState(false);

  const trocar = React.useCallback(async (corpo: Record<string, string>) => {
    const res = await fetch(`${API}/oauth/token`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: CLIENT_ID, ...corpo }),
    });
    if (!res.ok) throw new Error(`token → HTTP ${res.status}`);
    const json = (await res.json()) as { access_token: string; refresh_token?: string };
    token.current = json.access_token;
    // O refresh é o que faz um F5 não expulsar a pessoa. Fica separado do acesso.
    if (json.refresh_token) localStorage.setItem(CHAVE_REFRESH, json.refresh_token);
    setEstado("dentro");
  }, []);

  /*
   * Duas entradas possíveis no primeiro render: voltando do provedor com um
   * `?code=` na URL, ou reabrindo a página com um refresh token guardado.
   */
  React.useEffect(() => {
    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");
    const verifier = sessionStorage.getItem(CHAVE_VERIFIER);

    const limparUrl = () => {
      const volta = sessionStorage.getItem(CHAVE_DESTINO) || "/";
      sessionStorage.removeItem(CHAVE_DESTINO);
      sessionStorage.removeItem(CHAVE_VERIFIER);
      window.history.replaceState(null, "", volta);
    };

    (async () => {
      try {
        if (code && verifier) {
          await trocar({
            grant_type: "authorization_code",
            code,
            code_verifier: verifier,
            redirect_uri: `${window.location.origin}/callback`,
          });
          limparUrl();
          return;
        }

        const refresh = localStorage.getItem(CHAVE_REFRESH);
        if (refresh) {
          await trocar({ grant_type: "refresh_token", refresh_token: refresh });
          return;
        }

        setEstado("fora");
      } catch (e) {
        // Refresh vencido não é erro para mostrar na cara de ninguém: é sessão
        // que acabou. Some com ele e volta ao estado deslogado.
        localStorage.removeItem(CHAVE_REFRESH);
        setEstado(code ? "erro" : "fora");
        if (code) setErro(e instanceof Error ? e.message : String(e));
        if (code) limparUrl();
      }
    })();
  }, [trocar]);

  const entrar = React.useCallback(async () => {
    const verifier = sortearVerifier();
    sessionStorage.setItem(CHAVE_VERIFIER, verifier);
    sessionStorage.setItem(CHAVE_DESTINO, window.location.pathname);

    const url = new URL(`${API}/oauth/authorize`);
    url.searchParams.set("client_id", CLIENT_ID);
    url.searchParams.set("redirect_uri", `${window.location.origin}/callback`);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", ESCOPO);
    url.searchParams.set("code_challenge", await desafioDe(verifier));
    url.searchParams.set("code_challenge_method", "S256");
    // `state` fecha a porta de CSRF no retorno.
    url.searchParams.set("state", sortearVerifier().slice(0, 24));

    window.location.href = url.toString();
  }, []);

  const sair = React.useCallback(() => {
    token.current = null;
    localStorage.removeItem(CHAVE_REFRESH);
    setMarcas(null);
    setEstado("fora");
  }, []);

  const buscarMarcas = React.useCallback(async () => {
    if (!token.current) return;
    setCarregandoMarcas(true);
    try {
      const res = await fetch(`${API}/api/brand-guidelines?limit=100`, {
        headers: { Authorization: `Bearer ${token.current}`, Accept: "application/json" },
      });
      if (!res.ok) throw new Error(`brand-guidelines → HTTP ${res.status}`);
      const json = await res.json();
      const lista = Array.isArray(json) ? json : (json.items ?? json.data ?? []);
      setMarcas(
        lista.map((g: Record<string, any>) => ({
          id: g.id,
          name: g.name ?? g.identity?.name ?? "sem nome",
          tagline: g.tagline ?? g.identity?.tagline ?? null,
          colors: (g.colors ?? []).map((c: Record<string, any>) => ({
            hex: c.hex,
            role: c.role ?? null,
            name: c.name ?? null,
          })),
          typography: (g.typography ?? []).map((t: Record<string, any>) => ({
            family: t.family,
            role: t.role ?? null,
          })),
          completeness: g.extraction?.completeness ?? null,
          updatedAt: g.updatedAt ?? null,
        })),
      );
      setErro(null);
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      setCarregandoMarcas(false);
    }
  }, []);

  const valor: Sessao = { estado, erro, marcas, carregandoMarcas, entrar, sair, buscarMarcas };
  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export function useVisantAuth(): Sessao {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error("useVisantAuth precisa de <VisantAuthProvider>");
  return ctx;
}
