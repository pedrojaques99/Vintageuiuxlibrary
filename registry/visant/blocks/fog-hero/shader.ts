/**
 * Shader da hero "noir dissolve fog" (protótipo YURA, 2026-10).
 *
 * Só duas cores entram aqui, `uPaper` e `uInk`, e as duas vêm dos tokens da
 * marca resolvidos no navegador. Todo o resto é mistura entre elas: a fumaça é
 * tinta, a clareira é papel, o vídeo vira luminância e é pintado de tinta sobre
 * papel. Por isso a hero troca de tema sem uma linha de cor no GLSL — os únicos
 * literais são 0 e 1 de matemática.
 *
 * O vídeo é lido só no canal R: a hero é P&B por desenho, e a luminância de um
 * canal basta para virar mancha de tinta.
 */
export const fragmentShader = /* glsl */ `
precision highp float;
uniform sampler2D uVideo, uVideoB, uLogo, uTrail;
uniform vec2 uRes, uVideoRes, uVideoResB, uLogoRes;
uniform float uTime, uIntro, uLogoIn, uScroll, uVideoReady, uSwap, uLogoOn;
uniform vec3 uPaper, uInk;
uniform float uGrain, uGrainSize, uGrainFps, uSoft, uSpray, uFogOpacity, uSmokeLift;
uniform float uContrast, uHaze, uClear, uCenter, uScale, uSpeed, uWarp, uDetail;
uniform float uPhoto, uInvert, uFlipY, uVideoZoom, uVideoY, uVignette, uLogoSize, uLogoBleed, uCursor;
varying vec2 vUv;

// Simplex 2D (Ashima Arts / Stefan Gustavson, MIT)
vec3 permute(vec3 x){ return mod(((x*34.0)+1.0)*x, 289.0); }
float snoise(vec2 v){
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz; x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
  m = m*m; m = m*m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}
float fbm(vec2 p){
  float s = 0.0, a = 0.5;
  mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 5; i++) { s += a * snoise(p); p = m * p; a *= 0.5; }
  return s;
}
float fbm3(vec2 p){
  float s = 0.0, a = 0.5;
  mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 3; i++) { s += a * snoise(p); p = m * p; a *= 0.5; }
  return s;
}
// hash12 (Dave Hoskins, sem sin: não gera listras)
float hash(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }

vec2 cover(vec2 uv, vec2 res, vec2 tex){
  float rs = res.x / res.y, rt = tex.x / tex.y;
  vec2 s = rs > rt ? vec2(1.0, rt / rs) : vec2(rs / rt, 1.0);
  return (uv - 0.5) * s + 0.5;
}

void main(){
  vec2 uv = vUv;
  vec2 p = (uv - 0.5) * vec2(uRes.x / uRes.y, 1.0);
  float t = uTime * 0.035 * uSpeed;
  float tr = texture2D(uTrail, uv).r * uCursor * 2.0;

  // Fumaça: fbm com domain warp, empurrada pelo rastro do cursor
  vec2 q = vec2(fbm3(p * 0.7 * uScale + vec2(0.0, t)), fbm3(p * 0.7 * uScale + vec2(5.2, -t)));
  vec2 wp = p * uScale + q * uWarp + vec2(t * 1.4, t * 0.5) + tr * 0.25;
  float f = fbm3(wp) * 0.5 + 0.5 + snoise(wp * 3.0 - t) * uDetail;

  // Abertura: clareira cresce do centro (intro) e fecha de novo (scroll)
  float open = uIntro * (1.0 - uScroll);
  float r = length(p * vec2(0.75, 1.0));
  float v = f + r * uCenter * open - tr * 0.5;
  float th = mix(-0.3, uClear, open);

  // Grão por célula (tamanho e fps ajustáveis)
  vec2 gp = floor(gl_FragCoord.xy / uGrainSize);
  float n = hash(gp + mod(floor(uTime * uGrainFps), 64.0) * 37.0);

  // Borda: pontilhado (spray) ou degradê liso
  float fog = smoothstep(th - uSoft, th + uSoft, v + (n - 0.5) * uSoft * uSpray);
  fog *= mix(1.0, uFogOpacity, open);

  float mott = fbm3(wp * 1.6 - t) * 0.5 + 0.5;
  float core = smoothstep(th, th + 0.45, v);
  vec3 smoke = mix(mix(uPaper, uInk, 0.72), uInk, core) + (mott - 0.5) * 0.12 * (uInk - uPaper);
  smoke = mix(smoke, uPaper, uSmokeLift * open);

  // Foto: só na faixa perto da fumaça; centro fica limpo
  // Cada vídeo com a própria proporção: a playlist pode misturar 16:9 e 9:16.
  vec2 vuv = cover(uv, uRes, uVideoRes);
  vec2 vuvB = cover(uv, uRes, uVideoResB);
  if (uFlipY > 0.5) { vuv.y = 1.0 - vuv.y; vuvB.y = 1.0 - vuvB.y; }
  vuv = (vuv - 0.5) / uVideoZoom + 0.5 + vec2(0.0, uVideoY);
  vuvB = (vuvB - 0.5) / uVideoZoom + 0.5 + vec2(0.0, uVideoY);
  // Troca de mídia em névoa: a próxima aparece através do mesmo ruído da fumaça,
  // e a borda da dissolução clareia (mais névoa no meio da passagem).
  // Fora do quadro do vídeo (zoom < 1) a leitura vira papel: sem isso o
  // clamp-to-edge da textura estica a última linha em listras pela tela.
  vec2 inA = step(vec2(0.0), vuv) * step(vuv, vec2(1.0));
  vec2 inB = step(vec2(0.0), vuvB) * step(vuvB, vec2(1.0));
  // Filmagem escura (vinheta de marca em fundo preto) entra invertida: o fundo
  // vira névoa e a forma vira tinta. Inverte ANTES da borda, para o que fica
  // fora do quadro continuar papel, e não virar tinta junto.
  float sa = texture2D(uVideo, vuv).r;
  float sb = texture2D(uVideoB, vuvB).r;
  sa = mix(sa, 1.0 - sa, uInvert);
  sb = mix(sb, 1.0 - sb, uInvert);
  float La = mix(1.0, sa, inA.x * inA.y);
  float Lb = mix(1.0, sb, inB.x * inB.y);
  float nm = fbm3(p * 1.4 + vec2(t * 3.0, -t * 2.0)) * 0.5 + 0.5;
  float troca = smoothstep(nm - 0.18, nm + 0.18, uSwap * 1.36 - 0.18);
  float L = mix(La, Lb, troca);
  L = mix(L, 1.0, (1.0 - abs(troca * 2.0 - 1.0)) * 0.55 * step(0.001, uSwap) * step(uSwap, 0.999));
  float photoVis = smoothstep(th - 0.42, th - 0.06, v) * uVideoReady * uIntro;
  vec3 paper = mix(uPaper, mix(uPaper, uInk, 1.0 - L), photoVis * uPhoto);

  vec3 col = mix(paper, smoke, fog);

  // Contraste e haze (levanta tudo pro papel)
  vec3 mid = mix(uPaper, uInk, 0.5);
  col = mix(mid, col, mix(1.0, uContrast, open));
  col = mix(col, uPaper, uHaze * open);

  // Logo: surge por dissolve de ruído com leve sangria de tinta
  float lw = uRes.x < uRes.y ? uRes.x * min(uLogoSize * 2.1, 0.85) : min(uRes.x * uLogoSize, uRes.y * 0.8);
  vec2 lsz = vec2(lw, lw * uLogoRes.y / uLogoRes.x);
  vec2 lp = (gl_FragCoord.xy - uRes * 0.5) / lsz + 0.5;
  lp += vec2(snoise(lp * 9.0 + t * 4.0), snoise(lp * 9.0 - t * 4.0)) * uLogoBleed * (1.0 - uLogoIn * 0.7);
  float la = 0.0;
  // Sem logo (uLogoOn = 0) o bloco inteiro vira no-op: a hero é só névoa.
  if (uLogoOn > 0.5 && lp.x > 0.0 && lp.x < 1.0 && lp.y > 0.0 && lp.y < 1.0) la = texture2D(uLogo, lp).a;
  float ln = fbm(lp * vec2(6.0, 1.5)) * 0.5 + 0.5;
  la *= smoothstep(ln - 0.08, ln + 0.08, uLogoIn * 1.25 - 0.1);
  col = mix(col, uInk, la);

  // Grão + vinheta
  col += (n - 0.5) * uGrain;
  col = mix(col, uInk, uVignette * smoothstep(0.55, 1.15, r));

  gl_FragColor = vec4(col, 1.0);
}`

export const vertexShader = /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`
