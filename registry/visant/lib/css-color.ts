/**
 * CSS Color — a ponte entre os tokens da marca e o que não é CSS (WebGL, canvas).
 *
 * Shader não lê `var(--brand)`. A tentação é passar um hex por prop, e é
 * exatamente isso que o registry proíbe: componente com cor própria some no
 * primeiro cliente de outra cor. Aqui a cor vem do token, resolvida pelo
 * próprio navegador.
 *
 * ── Por que pintar um pixel em vez de ler a string ─────────────────────────
 *
 * O motor de tokens emite OKLCH. `getComputedStyle` devolve a string do jeito
 * que veio (`oklch(0.98 0.004 91)`), e nem o `THREE.Color` nem um parser
 * caseiro entendem isso de forma confiável. Um canvas 1×1 entende qualquer cor
 * que o CSS entende, inclusive `color-mix()`: pinta, lê o pixel, devolve sRGB
 * 0..1. Custa um `getImageData` por troca de tema, não por quadro.
 */

export type RGB = [number, number, number];

let ctx: CanvasRenderingContext2D | null = null;

/** Resolve uma cor CSS qualquer (ou `var(--token)`) para sRGB 0..1. */
export function resolveCssColor(color: string, el: Element = document.documentElement): RGB {
  // var(--x) precisa passar pelo cascade do elemento para resolver o tema certo
  let valor = color.trim();
  const m = valor.match(/^var\((--[^,)]+)(?:,([^)]*))?\)$/);
  if (m) valor = getComputedStyle(el).getPropertyValue(m[1]).trim() || (m[2] ?? "").trim();
  if (!ctx) {
    const c = document.createElement("canvas");
    c.width = c.height = 1;
    ctx = c.getContext("2d", { willReadFrequently: true });
  }
  if (!ctx || !valor) return [0, 0, 0];
  ctx.clearRect(0, 0, 1, 1);
  ctx.fillStyle = "rgb(0 0 0)";
  ctx.fillStyle = valor;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return [r / 255, g / 255, b / 255];
}

/**
 * Avisa quando o tema muda (classe, data-theme ou style no <html>), para a cena
 * reler os tokens. Devolve o unsubscribe.
 */
export function onThemeChange(cb: () => void, el: Element = document.documentElement): () => void {
  const mo = new MutationObserver(cb);
  mo.observe(el, { attributes: true, attributeFilter: ["class", "data-theme", "style"] });
  return () => mo.disconnect();
}
