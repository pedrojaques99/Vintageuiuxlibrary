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

import App from "./app/App.tsx";
import "./styles/index.css";

createRoot(document.getElementById("root")!).render(<App />);
