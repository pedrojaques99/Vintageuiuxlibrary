import { createRoot } from "react-dom/client";

/*
 * As fontes da marca padrão entram no bundle, não pela rede de terceiro.
 *
 * O runtime de marca busca as faces no Google Fonts quando alguém troca de
 * marca — está certo, são 21 acervos e ninguém empacota isso. Mas a PRIMEIRA
 * pintura não pode depender disso: a Manrope chegava depois, o título trocava
 * de face e a página inteira descia 124px com a pessoa já lendo. Um teste de
 * regressão flagrou o deslocamento; aqui ele deixa de existir, porque a face já
 * está no disco quando o primeiro pixel é desenhado.
 */
import "@fontsource-variable/manrope";
import "@fontsource/oswald/400.css";
import "@fontsource/oswald/500.css";

/*
 * O tema antes do primeiro quadro. A casa é escura por padrão; só `?solo=1`
 * decide pelo próprio parâmetro (o iframe da ficha manda `dark=1`).
 */
{
  const solo = new URLSearchParams(window.location.search);
  let escuro = true;
  if (solo.get("solo") === "1") escuro = solo.get("dark") === "1";
  else {
    try {
      escuro = localStorage.getItem("visant:ui:tema") !== "claro";
    } catch {
      /* sem storage, fica o padrão */
    }
  }
  document.documentElement.classList.toggle("dark", escuro);
}

/*
 * Chunk que sumiu no deploy novo: recarrega a página uma vez.
 *
 * A aba aberta antes do deploy ainda conhece os nomes de chunk antigos, e o
 * catálogo busca ~130 demos sob demanda conforme a pessoa rola — então a janela
 * pra isso acontecer é a sessão inteira. É o tratamento que a doc do Vite indica
 * (`vite:preloadError`). A trava de 10s impede laço se o chunk faltar de verdade.
 */
window.addEventListener("vite:preloadError", (event) => {
  try {
    const ultima = Number(sessionStorage.getItem("visant:ui:recarga") || 0);
    if (Date.now() - ultima < 10_000) return;
    sessionStorage.setItem("visant:ui:recarga", String(Date.now()));
  } catch {
    /* sem storage: recarrega mesmo assim */
  }
  event.preventDefault();
  window.location.reload();
});

import App from "./app/App.tsx";
import { MediaProvider } from "./app/media.tsx";
import "./styles/index.css";

/*
 * O `MediaProvider` mora na raiz, e não dentro da vitrine, porque a escolha
 * entre mídia real e wireframe vale para o app inteiro — catálogo, studio de
 * marca e bancada. Provider por página faria o botão da barra parar de valer
 * assim que a pessoa trocasse de aba, que é o momento em que ela mais quer
 * comparar as duas leituras.
 */
createRoot(document.getElementById("root")!).render(
  <MediaProvider>
    <App />
  </MediaProvider>,
);
