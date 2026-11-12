// WebGL2 波動方程式シミュレーション＋屈折風レンダリング。非対応なら null を返す。
const VERT = `#version 300 es
in vec2 p; out vec2 vUv;
void main(){ vUv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }`;

const SIM = `#version 300 es
precision highp float; precision highp int;
uniform sampler2D uState; uniform ivec2 uSize; uniform float uK; uniform float uDisp; uniform float uDif; uniform float uTs; uniform float uDamp; uniform float uGlowDecay;
uniform vec4 uSplat[16]; uniform int uCount; uniform vec4 uStone; uniform vec4 uBar;
out vec4 o;
void main(){
  ivec2 p = ivec2(gl_FragCoord.xy);
  ivec2 mx = uSize - 1;
  vec3 c3 = texelFetch(uState, p, 0).rgb; vec2 c = c3.rg;
  vec3 L4 = texelFetch(uState, clamp(p + ivec2(-1, 0), ivec2(0), mx), 0).rgb; float l = L4.r;
  vec3 R4 = texelFetch(uState, clamp(p + ivec2( 1, 0), ivec2(0), mx), 0).rgb; float r = R4.r;
  vec3 D4 = texelFetch(uState, clamp(p + ivec2( 0,-1), ivec2(0), mx), 0).rgb; float d = D4.r;
  vec3 U4 = texelFetch(uState, clamp(p + ivec2( 0, 1), ivec2(0), mx), 0).rgb; float u = U4.r;
  float lap = l + r + d + u - 4.0 * c.r;
  // 4 次の分散項（毛管波: 短い波ほど先に走る）。軸方向 ±2 の外側 4 点のみ追加で読む
  float bil = 0.0;
  if (uDisp > 0.0) {
    float l2 = texelFetch(uState, clamp(p + ivec2(-2, 0), ivec2(0), mx), 0).r;
    float r2 = texelFetch(uState, clamp(p + ivec2( 2, 0), ivec2(0), mx), 0).r;
    float d2 = texelFetch(uState, clamp(p + ivec2( 0,-2), ivec2(0), mx), 0).r;
    float u2 = texelFetch(uState, clamp(p + ivec2( 0, 2), ivec2(0), mx), 0).r;
    bil = 12.0 * c.r - 4.0 * (l + r + d + u) + l2 + r2 + d2 + u2;
  }
  // 媒質マスク（A チャンネル）: 0=水, 1=石。少し歪んだ小石の形、縁は約 3 セルで柔らかく
  float mk = 0.0;
  if (uStone.w > 0.5) {
    vec2 sd = (vec2(p) + 0.5) - uStone.xy;
    float ang = atan(sd.y, sd.x);
    float sr = uStone.z * (1.0 + 0.055 * sin(3.0 * ang + 1.3) + 0.025 * sin(5.0 * ang + 0.4));
    mk = 1.0 - smoothstep(sr - 1.6, sr + 1.6, length(sd));
  }
  float wet = 1.0 - mk;
  // 砂州（浅瀬）: 楕円の内側だけ波速を下げる（uK 0.44 → 0.30。下げる方向のみ。実効 0.47 を超えない）。境界は約 32 セルでぼかす（折れ防止）
  float kk = uK;
  if (uBar.w > 0.5) {
    vec2 bd = ((vec2(p) + 0.5) - uBar.xy) / uBar.zw;
    float sdc = (length(bd) - 1.0) * min(uBar.z, uBar.w);
    kk = uK - 0.14 * (uK / 0.44) * (1.0 - smoothstep(-16.0, 16.0, sdc));
  }
  float ed = min(min(float(p.x), float(mx.x - p.x)), min(float(p.y), float(mx.y - p.y)));
  float sponge = 1.0 - smoothstep(0.0, 12.0, ed);
  float damp = pow(uDamp - sponge * 0.028, uTs);
  float v = (c.g + kk * wet * lap - uDisp * wet * bil) * damp;
  v = clamp(v, -1.5, 1.5);
  v -= sign(v) * min(abs(v), 0.00006);
  // 高さへの弱い拡散: 格子の分散で生まれる高波数の尾（縁の二重線・ちぎれ）だけを静かに均す
  float h = (c.r + v + uDif * wet * lap) * pow(0.9992, uTs);
  h = clamp(h, -3.0, 3.0);
  // 光の滲み: 近傍へ拡散しつつ約 1.5 秒で消える（波とは別チャンネル）
  float glow = mix(c3.b, (L4.b + R4.b + D4.b + U4.b) * 0.25, 0.35) * pow(uGlowDecay, uTs);
  for (int i = 0; i < 16; i++) {
    if (i >= uCount) break;
    vec4 s = uSplat[i];
    vec2 dd = (vec2(p) + 0.5) - s.xy;
    float gs = exp(-dot(dd, dd) / (2.0 * s.z * s.z));
    h += s.w * gs;
    glow += s.w * gs * 1.6;
  }
  o = vec4(h * wet, v * wet, glow * wet, mk);
}`;

const RENDER = `#version 300 es
precision highp float;
uniform sampler2D uState; uniform vec2 uTexel; uniform vec2 uRes; uniform float uTime;
uniform vec3 uDeep; uniform vec3 uMid; uniform vec3 uAcc; uniform vec4 uLook; uniform float uRimW; uniform float uPulse; uniform vec4 uStoneC; uniform vec4 uBarC; uniform vec4 uChl; uniform float uCssPx; uniform float uSleep; uniform float uCalm; uniform float uLife; uniform vec4 uWakeA; uniform vec4 uWakeB; uniform vec4 uSky; uniform vec3 uSkyC; uniform vec4 uDent; uniform float uHf; uniform vec2 uFloor; uniform vec4 uFlA; uniform vec4 uFlB;
in vec2 vUv; out vec4 o;
#define FRESH 0.9
#define LENS 0.0
#define EDGE_K 40.0
#define EDGE_AT 0.2
#define EDGE_W 0.035
#define EDGE_I 1.5
#define TAIL1 0.22
#define TAIL2 0.0
#define CORE1 0.05
#define CORE2 0.3
#define SAND_K 50.0
#define SAND_D 0.5
float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
vec3 knee(vec3 x){
  vec3 t = max(x - 0.72, 0.0);
  return min(x, vec3(0.72)) + 0.24 * (1.0 - exp(-t / 0.24));
}
// 水底 (c69): 低周波ノイズ＋大きく丸い石の緩い勾配。格子・縁・粒は無し。f は約 0..1
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y); }
float floorStones(vec2 p, float sc, vec2 off){
  vec2 pp = p * sc + off, ci = floor(pp), f = fract(pp) - 0.5;
  float hh = hash(ci + 5.7);
  vec2 jit = (vec2(hash(ci), hash(ci + 3.3)) - 0.5) * 0.22;
  float rad = mix(0.2, 0.33, hash(ci + 9.1));
  return step(0.12, hh) * (1.0 - smoothstep(rad * 0.78, rad, length(f - jit)));
}
float floorTex(vec2 p, float oct2){
  p += 0.28 * vec2(vnoise(p * 1.1 + 7.1), vnoise(p * 1.1 + 2.9));   // 格子に見えないよう領域をゆがめる
  float v = vnoise(p * 2.4 + 3.1) * 0.45 + oct2 * vnoise(p * 5.3 + 11.7) * 0.15;
  v += 0.55 * floorStones(p, 6.0, vec2(0.3, 0.1)) + 0.45 * floorStones(p, 3.3, vec2(4.2, 1.7));
  return v * 0.9;
}
void main(){
  vec2 uv = vUv;
  vec2 tx = uTexel;
  vec4 hs4 = texture(uState, uv); vec3 hs = hs4.rgb;
  float h = hs.r;
  // 勾配は 2 セル幅の中心差分 1 本。読み取りは計 5 回のまま、.rgb で受けて glow(b) の勾配も同時に得る
  vec4 tR = texture(uState, uv + vec2(tx.x * 2.0, 0.0)), tL = texture(uState, uv - vec2(tx.x * 2.0, 0.0));
  vec4 tU = texture(uState, uv + vec2(0.0, tx.y * 2.0)), tD = texture(uState, uv - vec2(0.0, tx.y * 2.0));
  float m = hs4.a;
  vec2 gm = vec2(tR.a - tL.a, tU.a - tD.a) * 0.25; // 媒質マスクの勾配（石の縁で立つ。内向き）
  vec2 g = vec2(tR.r - tL.r, tU.r - tD.r) * 0.25;
  float lap2 = tR.r + tL.r + tU.r + tD.r - 4.0 * h; // 高周波強調（c66）: 追加読み取りなし
  vec2 gg = vec2(tR.b - tL.b, tU.b - tD.b) * 0.25;
  vec3 n = normalize(vec3(-g * 9.0, 1.0));

  vec2 asp = vec2(uRes.x / uRes.y, 1.0);
  // 石の幾何（sim と同じ歪んだ円）。dpx は縁からの外向き距離 (CSS px)
  vec2 spc = (uv - uStoneC.xy) * asp;
  float sl = length(spc);
  float sang = atan(spc.y, spc.x);
  float sRy = max(uStoneC.z, 1e-4);
  float sr = sRy * (1.0 + 0.055 * sin(3.0 * sang + 1.3) + 0.025 * sin(5.0 * sang + 0.4));
  float dpx = (sl - sr) / sRy * uStoneC.w;
  vec2 sn = spc / max(sl, 1e-5);
  float has = step(0.5, uStoneC.w);
  // 縁の外 6〜10px で背景を少しだけゆがませる（水が石に寄る屈折）
  float bend = has * smoothstep(-2.0, 1.5, dpx) * exp(-max(dpx, 0.0) / 6.5);
  vec2 q = uv + g * 2.4 * uLook.x + gg * LENS + gm * 0.06 + sn / asp * 0.0075 * bend;
  vec2 pc = (q - vec2(0.5, 0.40)) * asp;
  float r = length(pc);
  vec3 base = mix(uMid, uDeep, smoothstep(0.0, 0.95, r));
  base *= mix(1.12, 0.62, smoothstep(0.0, 1.0, q.y));
  // 沈む指: 押している間の浅い凹み。縁も塗りも作らず、ガウス凹みの勾配（片側が少し明るく反対が暗い）と中心のごく淡い沈みだけ
  float dentK = 0.0;
  if (uDent.w > 0.001) {
    vec2 dp = (uv - uDent.xy) * uRes / min(uRes.x, uRes.y);
    float dr = uDent.z, de = exp(-dot(dp, dp) / (2.0 * dr * dr));
    float dsh = -dot(dp, vec2(-0.5, 0.86)) / (dr * dr) * de;
    float dg = 0.34 * dr * dsh;
    dentK = uDent.w * (dg * (dg > 0.0 ? 1.0 : 0.5) - 0.04 * de);
  }
  // 横長のときだけ、右上の隅を最大 +15% 持ち上げる（左右の非対称を和らげる。全体は据え置き）
  float rtk = smoothstep(0.68, 1.0, q.x) * smoothstep(0.62, 1.0, q.y) * smoothstep(1.25, 1.6, asp.x);
  base *= 1.0 + 0.15 * rtk;
  float bands = sin(q.x * asp.x * 3.2 + uTime * 0.12 + sin(q.y * 3.6 - uTime * 0.09) * 1.6) * 0.5 + 0.5;
  base += uMid * 0.16 * bands * bands * (1.0 - smoothstep(0.1, 1.1, r));
  // 水底の屈折と曲率の明るみ (c69)。ゲート fa は輪の通る所だけ立ち、静水では 0（home 不変）
  float fAmt = 0.0, fMaxPx = 0.0;
  if (uFloor.x > 0.0001) {
    float wsh = min(uRes.x, uRes.y);
    float wdA = length((uv - uFlA.xy) * uRes) / wsh, wdB = length((uv - uFlB.xy) * uRes) / wsh;
    float wlA = (1.0 - smoothstep(uFlA.z * 0.5, uFlA.z + 0.05, wdA)) * smoothstep(0.0, 0.04, uFlA.z);
    float wlB = (1.0 - smoothstep(uFlB.z * 0.5, uFlB.z + 0.05, wdB)) * smoothstep(0.0, 0.04, uFlB.z);
    float fa = uFloor.y * max(wlA, wlB);
    vec2 fsh = clamp(g * 70.0, vec2(-1.0), vec2(1.0)) * 3.0 / uRes;     // ずれ上限 3px
    vec2 fp = (q + fsh - vec2(0.5, 0.4)) * asp;
    float oct2 = 1.0 - step(600.0, min(uRes.x, uRes.y) / uCssPx);
    float F = floorTex(fp, oct2);
    base *= 1.0 + uFloor.x * fa * (F - 0.4);
    float cv = 1.0 - exp(-max(lap2, 0.0) * 55.0);                  // 波頭の下の曲率: 広く柔らかい明るみ
    base += mix(uMid, uAcc, 0.5) * uFloor.x * fa * cv * 0.2;
  }
  // 砂州の手がかり: 縁を持たない低コントラストのうねり（浅い所がほんのり明るい）。屈折後の座標 q で描く
  if (uBarC.w > 0.0001) {
    vec2 bp = (q - uBarC.xy) * asp / uBarC.zw;
    float bd2 = length(bp);
    float sw = 1.0 - smoothstep(0.0, 1.5, bd2);
    sw *= sw;
    float und = 0.62 + 0.38 * sin(bd2 * 4.2 - uTime * 0.28 + sin(bp.x * 2.3 + uTime * 0.11) * 1.1);
    base += mix(uMid, uAcc, 0.4) * 0.31 * (1.0 - 0.55 * smoothstep(0.25, 0.6, dot(uMid, vec3(0.333)))) * sw * und;
  }

  vec3 L = normalize(vec3(-0.35, 0.55, 0.75));
  vec3 H = normalize(L + vec3(0.0, 0.0, 1.0));
  float spec = pow(max(dot(n, H), 0.0), 90.0);
  // 小さな波は閾値で静かに消し、新しい波だけが明るく残る
  float slope = max(length(g) * 12.0 - 0.006, 0.0);
  float rim = 1.0 - exp(-(slope / (1.0 + slope * 0.9)) * 3.0 / uRimW);
  float hp = max(h, 0.0);
  float gl = hs.b;
  // 光の滲みは塗りつぶさず、勾配の大きい所（水に落ちた光の屈折の縁）だけを細く明るくする
  float ge = length(gg);
  float gb = (gl - EDGE_AT) / EDGE_W;
  float edge = exp(-gb * gb) * min(ge * EDGE_K, 1.0);
  // 打鍵直後の核（glow が強い所）では、波の隆起そのものを塗りつぶさない。縁と尾だけが光り、波が広がるにつれ通常の描画へ戻る
  float fresh = 1.0 - FRESH * smoothstep(0.0, 0.22, gl);
  vec3 add = uAcc * ((rim * 1.5 * uLook.y + spec * uLook.z * smoothstep(0.0, 0.25, slope) + hp * hp * CORE2 + hp * CORE1) * fresh)
           + uMid * max(-h, 0.0) * 0.7
           + uAcc * uHf * smoothstep(0.004, 0.03, lap2) * smoothstep(0.0, 0.02, slope) * fresh
           + uAcc * (edge * EDGE_I + gl * TAIL1 + gl * gl * TAIL2);

  vec3 col = base + (vec3(1.0) - exp(-add * 1.15)) * 0.86;
  col *= 1.0 + dentK;
  col = knee(col);

  // 石: 水に濡れた小石。上寄りがわずかに明るく、下は水に沈む。左上に細い光の弧、右下はほぼ無し。波が当たった側の縁だけ光る
  vec2 lp = spc / sRy;                       // 石の局所座標（半径 1）
  float tY = clamp(lp.y * 0.5 + 0.5, 0.0, 1.0);
  vec3 top = uDeep * 0.7 + uMid * 0.34;
  vec3 bot = uDeep * 0.30 + uMid * 0.03;
  vec3 stoneC = mix(bot, top, smoothstep(0.0, 1.0, tY));
  float mott = sin(lp.x * 6.5 + lp.y * 2.6 + 1.1) * sin(lp.y * 5.2 - lp.x * 1.9 + 0.4) * 0.5 + 0.5;
  stoneC += uMid * 0.05 * mott * (0.4 + 0.6 * tY);
  float wetline = smoothstep(-0.55, -0.1, lp.y);   // 水際より下は沈んで暗く
  stoneC *= mix(0.74, 1.0, wetline);
  // 濡れた艶: 左上寄りのごく淡い面の光
  vec2 gp = (lp - vec2(-0.30, 0.40)) * vec2(1.0, 1.55);
  stoneC += mix(uAcc, vec3(1.0), 0.45) * 0.17 * exp(-dot(gp, gp) * 3.4) * wetline;
  // 下側の淡い反射（水の色が石の下面に映る）
  vec2 rp = (lp - vec2(0.12, -0.62)) * vec2(0.8, 1.9);
  stoneC += mix(uMid, uAcc, 0.35) * 0.17 * exp(-dot(rp, rp) * 2.6);
  // 受光側の面の明るみ: 縁に向かって広く淡く（線ではなく階調）
  float lit = max(dot(normalize(lp + 1e-4), normalize(vec2(-0.55, 0.72))), 0.0);
  float rimg = smoothstep(0.35, 1.0, length(lp));
  stoneC *= 1.0 + 0.22 * pow(lit, 2.0) * rimg - 0.12 * (1.0 - lit) * rimg;
  stoneC += uAcc * 0.02 * smoothstep(0.55, 1.0, m);
  col = mix(col, stoneC, m * 0.95);

  float facing = max(dot(sn, normalize(vec2(-0.55, 0.72))), 0.0);
  float inB = exp(-pow((dpx + 2.2) / 3.6, 2.0)) * has;     // 縁のすぐ内側の細い帯
  float outB = exp(-pow((dpx - 1.6) / 2.6, 2.0)) * has;    // 縁のすぐ外側（波の光が回り込む）
  vec3 arcC = mix(uAcc, vec3(1.0), 0.55);
  col += arcC * inB * (0.15 * pow(facing, 3.0) + 0.02 + 0.015 * (1.0 - facing)) ;
  float meniscus = exp(-pow((dpx - 3.2) / 2.2, 2.0)) * has;   // 縁の外側の影（水が石に寄る暗い溝）
  col *= 1.0 - 0.16 * meniscus * (1.0 - 0.7 * facing);
  // 接地の影: 光と反対（右下）へずらした淡いにじみ。石の外側だけ
  float sd2 = (length(spc - vec2(0.16, -0.22) * sRy) - sr) / sRy * uStoneC.w;
  float cshadow = exp(-max(sd2, 0.0) / 11.0) * (1.0 - smoothstep(-1.0, 2.0, dpx)) * has;
  col *= 1.0 - 0.13 * cshadow * (0.35 + 0.65 * (1.0 - facing));
  col += uAcc * outB * (gl * 0.9 + (0.25 + 0.5 * facing) * 0.07 + 0.3 * uPulse * (0.4 + 0.6 * facing));
  col += uAcc * inB * (0.12 * uPulse + gl * 0.5);

  // 空の映り込み: 反射ベクトルの y 成分（q.y + 法線の傾き）の勾配だけ。線は作らず、上端の帯にだけ薄く乗せる。石の上では弱める
  if (uSky.x > 0.0001) {
    float hb = uSky.y;
    float sy = mix(uv.y, q.y, 0.5) + clamp(n.y, -0.25, 0.25) * 0.55 * (1.0 - smoothstep(0.94, 1.0, uv.y)) + sin(q.x * asp.x * 2.1 + uTime * 0.07) * 0.006;
    float sb = smoothstep(1.0 - hb, 1.0, sy);
    float fres = mix(0.35, 1.0, pow(sb, uSky.z));                  // 浅い視線ほど強い
    float sk = sb * fres * (1.0 - m * 0.85);
    col += uSkyC * uSky.x * sk;
  }
  vec2 vc = (uv - 0.5) * vec2(1.0, mix(1.15, 0.98, smoothstep(0.55, 1.0, uv.y)));   // 上端側は暗縁を弱め、空との帯にしない
  float vtop = 1.0 - 0.95 * clamp((uSky.w - 1.0) / 0.6, 0.0, 1.0) * smoothstep(0.55, 0.8, uv.y);   // 夕: 上端側の暗縁を弱め、帯の下に谷を作らない
  col *= 1.0 - 0.38 * (1.0 - 0.3 * rtk) * vtop * smoothstep(0.25, 0.95, length(vc));
  col += (hash(gl_FragCoord.xy + uTime) - 0.5) / 160.0;

  // クラドニ図形: 板 f=cos(nπX)cos(mπY)−cos(mπX)cos(nπY) の節の線に砂粒(2px)が集まる。解析式のみ・追加読み取り無し
  if (uChl.z > 0.001) {
    float cp = uCssPx;
    float mob = 1.0 - step(600.0, min(uRes.x, uRes.y) / cp);     // 縦長スマホ: 線を細く・量を下げる
    float shortS = min(uRes.x, uRes.y);
    float nn = uChl.x, mm = uChl.y, PI = 3.14159265;
    vec2 P = gl_FragCoord.xy;
    vec2 Q = (P - uRes * 0.5) / shortS + 0.5;
    // 板の僅かな不均一: 反対称式の対角節(X=Y)が画面を貫く直線にならないよう、座標をゆるく歪めて曲げる
    { float ua = Q.x + Q.y, va = Q.x - Q.y; Q += 0.034 * vec2(1.0, -1.0) * sin(7.0 * ua + 1.1 + 1.5 * sin(3.1 * va)) + 0.024 * vec2(1.0, 1.0) * sin(6.0 * va + 0.6 + 1.3 * sin(2.7 * ua)); }
    float cnx = cos(nn * PI * Q.x), cmy = cos(mm * PI * Q.y), cmx = cos(mm * PI * Q.x), cny = cos(nn * PI * Q.y);
    float f = cnx * cmy - cmx * cny;
    vec2 gr = vec2(-nn * sin(nn * PI * Q.x) * cmy + mm * sin(mm * PI * Q.x) * cny,
                   -mm * cnx * sin(mm * PI * Q.y) + nn * cmx * sin(nn * PI * Q.y)) * PI;
    float glen = length(gr);
    float star = 1.0 - smoothstep(0.9, mix(6.0, 7.5, mob), glen);      // 節線の交点(密な結び目)
    float dcss = abs(f) / max(glen, 1.6) * shortS / cp ;     // 節の線までの距離(CSS px)。結び目では距離を伸ばし帯を締める(滲みの広がり対策)
    // 画素ごとの固定ノイズ（2 オクターブ・時間で動かさない）
    float n1 = hash(P + 3.7), n2 = hash(floor(P * 0.5) + 19.1), n3 = hash(P + 71.3);
    float n4 = hash(floor(P * 0.72) + 5.3);
    float nz = 0.5 + 0.6 * (0.7 * n1 + 0.3 * n4 - 0.5);   // 縁の高周波ノイズ振幅を約4割下げる
    float s = smoothstep(n2 * 0.45, n2 * 0.45 + 0.55, uChl.z);   // 塊ごとに時間差で集まる
    // 波頭: 山で締まって濃く、谷でほどけて薄く（読み済みの h のみ）
    float wn = clamp(h * SAND_K, -1.0, 1.0);
    float wf = wn > 0.0 ? mix(1.0, 0.8, wn) : mix(1.0, 1.4, -wn);
    float inten = wn > 0.0 ? mix(1.0, 1.3, wn) : mix(1.0, 0.7, -wn);
    float w = mix(3.3, 2.4, mob) * wf * mix(3.2, 1.0, s);
    float band = exp(-(dcss / w) * (dcss / w)) * inten * mix(0.3, 1.0, s) * mix(1.0, 0.8, mob);
    // 芯は下駄を履かせて抜けにくく、縁だけ smoothstep で粒にほどける
    float core = exp(-(dcss / (w * 0.5)) * (dcss / (w * 0.5))) * mix(0.3, 1.0, s);
    float keep = smoothstep(nz - 0.24, nz + 0.24, band * 0.95 + 0.55 * core);
    // 静かに眠り、波のエネルギー(読み済みの h・v・glow の包絡)で目覚める
    float env = max(sqrt(h * h + hs.g * hs.g * 6.0), hs.b * 0.5);
    // 波頭: 打点から外へ広がる円の内側だけ uSleep、外は眠り(0.05)。縁は幅のある smoothstep
    vec2 wa = (vUv - uWakeA.xy) * uRes, wb = (vUv - uWakeB.xy) * uRes;
    float litA = (1.0 - smoothstep(uWakeA.z * 0.45, uWakeA.z + 0.03, length(wa) / shortS)) * smoothstep(0.0, 0.05, uWakeA.z);
    float litB = (1.0 - smoothstep(uWakeB.z * 0.45, uWakeB.z + 0.03, length(wb) / shortS)) * smoothstep(0.0, 0.05, uWakeB.z);
    float lit = max(litA, litB);
    // 石の砂場: 輝度の基準は最寄りの石までの距離。1.2R の内側は満ち、外径 max(3.2R, 短辺28%) で消え、外にはごく薄い残りだけ
    float stR = max(uStoneC.w, 1.0);
    float dsC = length((vUv - uStoneC.xy) * asp) * uRes.y / cp;
    float hOut = max(3.2 * stR, 0.28 * shortS / cp);
    float halo = (1.0 - smoothstep(1.2 * stR, hOut, dsC)) * has * uLife * 0.6;   // 石が動いている間だけ(uLife)・最大は従来の約6割
    float sleepHere = mix(0.012, mix(min(0.035, uSleep), uSleep, halo), lit);
    float awake = mix(sleepHere, mix(0.05, 1.0, halo), smoothstep(0.006, 0.05, env));
    float br = 0.26 * keep * awake * (0.65 + 0.35 * n3) * smoothstep(0.0, 0.12, uChl.z) * (1.0 - star * mix(0.3, 1.0, mob));
    // 輪が通り過ぎた後は静かに(uCalm)。波のエネルギーが残る波頭の近くだけ今のまま
    br *= mix(uCalm, 1.0, smoothstep(0.02, 0.1, env));
    br *= mix(1.0, 1.55 * mix(1.0, 2.3, mob), halo);   // 砂場の中は石の影として少し濃く(スマホは×1.3)
    float sc = mix(0.2, 0.3, mob);
    br = sc * (1.0 - exp(-br / sc));   // 交点で光が溜まらないよう soft-clamp
    br = min(br, mix(0.17, 0.21, mob));
    br *= mix(1.0, smoothstep(0.0, 6.0, dpx), has);   // 石が最前面: 輪郭の内側は 0、外 6px で立ち上がる
    // 静かな場所: 下端のバー・左上の「響」・ヒント文のまわり
    vec2 cs = uRes / cp, qc = P / cp;
    float yt = cs.y - qc.y;
    float quiet = 0.35 + 0.65 * smoothstep(mix(0.1, 0.13, mob), mix(0.22, 0.27, mob), vUv.y);
    quiet *= 0.25 + 0.75 * smoothstep(34.0, 96.0, length(vec2(qc.x - 56.0, yt - 40.0)));
    vec2 hq = vec2((qc.x - cs.x * 0.5) / 170.0, (qc.y - 122.0) / 30.0);
    quiet *= 0.3 + 0.7 * smoothstep(0.6, 1.3, length(hq));
    col += mix(vec3(1.0), uAcc, 0.3) * br * quiet;
  }
  o = vec4(col, 1.0);
}`;

function compile(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src); gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error('shader: ' + gl.getShaderInfoLog(s));
  return s;
}
function program(gl, frag) {
  const pr = gl.createProgram();
  gl.attachShader(pr, compile(gl, gl.VERTEX_SHADER, VERT));
  gl.attachShader(pr, compile(gl, gl.FRAGMENT_SHADER, frag));
  gl.bindAttribLocation(pr, 0, 'p');
  gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error('link: ' + gl.getProgramInfoLog(pr));
  const u = {};
  const n = gl.getProgramParameter(pr, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) {
    const info = gl.getActiveUniform(pr, i);
    u[info.name.replace(/\[0\]$/, '')] = gl.getUniformLocation(pr, info.name);
  }
  return { pr, u };
}

const STEP_HZ0 = 95;
// 分散 (c65): ?disp=<係数>（既定 0.004、0 で従来式）。実効波速は uK+0.03 の平方根なので、uK を下げた分だけステップ数を増やして速さを保つ
const DISP_DEF = 0.03;
const DISP_K0 = 0.44; // 従来の uK
function readDisp() {
  try {
    const q = new URLSearchParams(location.search);
    if (q.has('disp')) { const v = parseFloat(q.get('disp')); return Number.isFinite(v) ? Math.max(0, Math.min(0.035, v)) : DISP_DEF; }
  } catch { /* noop */ }
  return DISP_DEF;
}
const FLOOR_K = (() => { try { const v = parseFloat(new URLSearchParams(location.search).get('floor')); return Number.isFinite(v) ? Math.max(0, Math.min(9, v)) : 1; } catch { return 1; } })();
const HF_K = (() => { try { const v = parseFloat(new URLSearchParams(location.search).get('hf')); return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0.5; } catch { return 0.5; } })();
const GUARD_TEST = (() => { try { return new URLSearchParams(location.search).get('guardtest') === '1'; } catch { return false; } })(); // テスト専用: 危険な分散係数でガード発火を確認
const LONG_SIDE_CELLS = 420;
const MAX_LONG_PX = 1024; // 内部描画の長辺の上限（CSS で拡大。バイリニアで滑らか）
const MAX_STEPS = 5;
const DIF_ON = (() => { try { const v = parseFloat(new URLSearchParams(location.search).get('dif')); return Number.isFinite(v) ? Math.max(0, Math.min(0.05, v)) : 0.006; } catch { return 0.006; } })();
const GUARD_EVERY = 5; // 秒。発散検知の間隔
const GUARD_LIMIT = 0.7; // |h| がこれを超えたら分散を切る

export function createGL(canvas) {
  try {
    const gl = canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: 'high-performance' });
    if (!gl) return null;
    const ext = gl.getExtension('EXT_color_buffer_float') || gl.getExtension('EXT_color_buffer_half_float');
    if (!ext) return null;

    const sim = program(gl, SIM);
    const ren = program(gl, RENDER);
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const vb = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vb);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    let dent = [0.5, 0.5, 0.05, 0], skyK = 1, sleep = 0.05, calm = 1, life = 0, wakeA = [0.5, 0.5, 0, 0], wakeB = [0.5, 0.5, 0, 0], plate = [0, 0, 0, 0], bar = { x: 0.5, y: 0.7, rx: 100, ry: 50, on: 0 }, stone = { x: 0.5, y: 0.4, r: 44, on: 0 }, pulse = 0, floorAct = 0, flA = [0.5, 0.5, 0, 0], flB = [0.5, 0.5, 0, 0], flTa = -1e4, flTb = -1e4, quality = 1, lastCss = [0, 0, 1], look = [1, 0.95, 2.2, 0.9955, 1, 0.9915], W = 0, H = 0, tex = [], fbo = [], cur = 0, acc = 0, time = 0, lost = false, pending = 0;
    const dispCoef = readDisp();
    let dispOn = dispCoef; let dispOffUntil = 0, guardT = 0, guardTrips = 0, guardMs = 0;
    // 長波の波速² = uK（拡散 uDif は速度への減衰項で速さに効かない）を保つ: uK = 0.44 - 3.3β（β=0.012 で 0.40。安定条件 8K + 32β ≤ 4 は β≤0.035 で満たす）。波速が不変になるようステップ数を増やし、減衰は pow(,uTs) で時間基準に直す
    const difNow = () => (dispOn > 0 ? DIF_ON : 0.03);
    const kNow = () => (dispOn > 0 ? DISP_K0 - 3.3 * dispOn : DISP_K0);
    const stepHz = () => (dispOn > 0 ? STEP_HZ0 * Math.sqrt(DISP_K0 / (DISP_K0 - 3.3 * dispOn)) : STEP_HZ0);
    let guardBuf = null, guardBand = 0;
    function setDispDataset() {
      try { document.body.dataset.disp = dispCoef <= 0 ? 'off' : dispCoef + ',' + (dispOn > 0 ? Math.max(1, Math.round(dispCoef / 0.002)) : 0) + ',trips' + guardTrips; } catch { /* noop */ }
    }
    setDispDataset();
    const splats = new Float32Array(64);
    const queue = []; // 未処理の波源 (x, y, 半径, 振幅) を溜め、1 ステップに最大 16 個ずつ注入する

    const makeTarget = () => {
      const t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, W, H, 0, gl.RGBA, gl.HALF_FLOAT, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      const f = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, f);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
      const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      return { t, f, ok };
    };
    const freeTargets = () => {
      tex.forEach((t) => gl.deleteTexture(t)); fbo.forEach((f) => gl.deleteFramebuffer(f));
      tex = []; fbo = [];
    };

    function resize(cssW, cssH, dpr) {
      lastCss = [cssW, cssH, dpr];
      const px = Math.min(Math.min(dpr, 2), MAX_LONG_PX / Math.max(cssW, cssH)) * quality;
      const cw = Math.max(1, Math.round(cssW * px)), ch = Math.max(1, Math.round(cssH * px));
      if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
      const s = LONG_SIDE_CELLS / Math.max(cssW, cssH);
      const nw = Math.max(32, Math.round(cssW * s)), nh = Math.max(32, Math.round(cssH * s));
      if (nw === W && nh === H && tex.length) return true;
      W = nw; H = nh;
      freeTargets();
      for (let i = 0; i < 2; i++) {
        const t = makeTarget();
        if (!t.ok) return false;
        tex.push(t.t); fbo.push(t.f);
      }
      cur = 0; pending = 0; queue.length = 0;
      return true;
    }

    // ux, uy: 0–1（uy は下が 0）。radiusShort: 短辺に対する半径の比。
    function splat(ux, uy, amp, radiusShort) {
      if (!W || queue.length >= 400) return;
      if (amp >= 0.28) { // 本物の打だけ（雨・石の小さな波・残響では水底を出さない）
        floorAct = 1;
        if (time - flTa > 0.3) { flB = flA; flTb = flTa; }
        flA = [ux, uy, 0, 0]; flTa = time;
      }
      queue.push(ux * W, uy * H, Math.max(1.2, radiusShort * Math.min(W, H)), amp);
      pending = Math.min(16, queue.length / 4);
    }

    // 石: ux, uy は 0–1（uy は下が 0）、rPx は CSS ピクセル半径
    function setStone(ux, uy, rPx) { stone.x = ux; stone.y = uy; stone.r = rPx; stone.on = 1; }
    function firePulse() { pulse = 1; }
    function setSky(v) { skyK = v; }
    function setDent(ux, uy, r, d) { dent[0] = ux; dent[1] = uy; dent[2] = r; dent[3] = d; }
    function setSleep(v) { sleep = v; }
    function setCalm(v) { calm = v; }
    function setLife(v) { life = v; }
    function setWake(a, b) { wakeA = a; wakeB = b; }
    function setPlate(n, m, a, ph) { plate[0] = n; plate[1] = m; plate[2] = a; plate[3] = ph; }
    // 砂州: ux, uy は 0–1（uy は下が 0）、rxPx / ryPx は CSS ピクセル半径（楕円）
    function setBar(ux, uy, rxPx, ryPx) { bar.x = ux; bar.y = uy; bar.rx = rxPx; bar.ry = ryPx; bar.on = 1; }

    function step(withSplats) {
      gl.useProgram(sim.pr);
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo[1 - cur]);
      gl.viewport(0, 0, W, H);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex[cur]);
      gl.uniform1i(sim.u.uState, 0);
      gl.uniform2i(sim.u.uSize, W, H);
      gl.uniform1f(sim.u.uK, kNow()); // 拡散項 0.03 と合わせて実効 0.47（分散なし）/ 0.43（分散あり）
      gl.uniform1f(sim.u.uDisp, GUARD_TEST && dispOn > 0 ? 0.2 : dispOn);
      gl.uniform1f(sim.u.uDif, difNow());
      gl.uniform1f(sim.u.uTs, STEP_HZ0 / stepHz());
      gl.uniform1f(sim.u.uDamp, look[3]);
      gl.uniform1f(sim.u.uGlowDecay, look[5]);
      const n = withSplats ? Math.min(16, queue.length / 4) : 0;
      if (n) { const b = queue.splice(0, n * 4); splats.set(b); }
      gl.uniform4f(sim.u.uStone, stone.x * W, stone.y * H, stone.r * W / lastCss[0], stone.on);
      { const k = W / lastCss[0]; gl.uniform4f(sim.u.uBar, bar.x * W, bar.y * H, bar.rx * k, bar.on ? bar.ry * k : 0); }
      gl.uniform1i(sim.u.uCount, n);
      if (n) gl.uniform4fv(sim.u.uSplat, splats);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      cur = 1 - cur;
      pending = Math.min(16, queue.length / 4);
    }

    // 適応品質: 直近のフレーム時間が長いときだけ内部解像度を段階的に下げる（戻さない）
    let ftSum = 0, ftN = 0, warm = 20;
    function adapt(dt) {
      if (warm > 0) { warm--; return; } // 起動直後（シェーダー初回コンパイル等）は測らない
      if (dt <= 0 || dt >= 0.5) return; // 休止明けの外れ値は無視
      ftSum += dt; ftN++;
      if (ftN < 8) return;
      const avg = ftSum / ftN; ftSum = 0; ftN = 0;
      if (avg > 0.04 && quality > 0.5) {
        quality = quality > 0.75 ? 0.75 : 0.5;
        resize(lastCss[0], lastCss[1], lastCss[2]);
      }
    }

    // 発散防止: 一定間隔で状態を読み、|h| が閾値超え（または NaN）なら分散を 8 秒切る。従来式は安定なので残った振動は自然に減衰する
    function guard(dt) {
      if (dispCoef <= 0) return;
      guardT += dt;
      if (dispOn <= 0 && time > dispOffUntil && !(GUARD_TEST && guardTrips > 0)) { dispOn = dispCoef; setDispDataset(); }
      if (guardT < GUARD_EVERY || dispOn <= 0 || sleep > 0.95) return;
      guardT = 0;
      try {
        const t0 = performance.now();
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo[cur]);
        // RGBA16F の読み出し型は実装依存（FLOAT 不可の環境がある）。実装が示す型で読み、半精度は手で復号する
        const half = gl.getParameter(gl.IMPLEMENTATION_COLOR_READ_TYPE) === gl.HALF_FLOAT;
        const bh = Math.ceil(H / 2), by = guardBand ? bh : 0, rows = guardBand ? H - bh : bh; guardBand ^= 1; // 画面を上下 2 帯に分け、5 秒ごとに交互に読む（1 回の読み出しを半分に）
        if (!guardBuf || guardBuf.length !== W * bh * 4) guardBuf = half ? new Uint16Array(W * bh * 4) : new Float32Array(W * bh * 4);
        gl.readPixels(0, by, W, rows, gl.RGBA, half ? gl.HALF_FLOAT : gl.FLOAT, guardBuf);
        if (gl.getError() !== gl.NO_ERROR) { guardT = -1e9; return; }
        let mx = 0, bad = false;
        for (let i = 0, ie = rows * W * 4; i < ie; i += 16) {
          let a = guardBuf[i];
          if (half) { const e = (a >> 10) & 31; if (e === 31) { bad = true; break; } a = e === 0 ? 0 : Math.pow(2, e - 15) * (1 + (a & 1023) / 1024); }
          else if (a !== a) { bad = true; break; } else if (a < 0) a = -a;
          if (a > mx) mx = a;
        }
        guardMs = performance.now() - t0;
        try { document.body.dataset.dispMax = mx.toFixed(3) + ",ms" + guardMs.toFixed(1); } catch { /* noop */ }
        if (bad || mx > GUARD_LIMIT) { guardTrips++; dispOn = 0; dispOffUntil = time + 8; setDispDataset(); }
      } catch { guardT = -1e9; /* 読めない環境では検知を止める（シェーダー内 clamp が最後の砦） */ }
    }

    function frame(dt, pal) {
      if (lost || !tex.length) return;
      adapt(dt);
      if (pal.look) look = pal.look;
      acc += dt;
      const hz = stepHz();
      let n = Math.min(Math.floor(acc * hz), MAX_STEPS);
      acc = Math.min(acc - n / hz, 1 / hz);
      if (n === 0 && pending) n = 1;
      for (let i = 0; i < n; i++) step(true);
      time += dt;
      floorAct = Math.max(0, floorAct - dt / 6);
      try { document.body.dataset.floor = FLOOR_K <= 0 ? 'off' : FLOOR_K + ',' + (3 * Math.min(1, floorAct * 1.5)).toFixed(2); } catch { /* noop */ }
      guard(dt);
      pulse = Math.max(0, pulse - dt / 1.4);
      gl.useProgram(ren.pr);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex[cur]);
      gl.uniform1i(ren.u.uState, 0);
      gl.uniform2f(ren.u.uTexel, 1 / W, 1 / H);
      gl.uniform2f(ren.u.uRes, canvas.width, canvas.height);
      gl.uniform1f(ren.u.uTime, time);
      gl.uniform3fv(ren.u.uDeep, pal.deep);
      gl.uniform3fv(ren.u.uMid, pal.mid);
      gl.uniform3fv(ren.u.uAcc, pal.accent);
      gl.uniform4f(ren.u.uLook, look[0], look[1], look[2], look[3]);
      gl.uniform1f(ren.u.uRimW, look[4]);
      gl.uniform1f(ren.u.uPulse, pulse * pulse);
      gl.uniform4f(ren.u.uChl, plate[0], plate[1], plate[2], plate[3]);
      gl.uniform1f(ren.u.uCssPx, canvas.width / lastCss[0]);
      gl.uniform1f(ren.u.uSleep, sleep);
      gl.uniform1f(ren.u.uCalm, calm);
      gl.uniform1f(ren.u.uLife, life);
      gl.uniform4fv(ren.u.uWakeA, wakeA);
      const bnd = pal.band || 1;
      gl.uniform4f(ren.u.uSky, skyK * 0.9, 0.2 * bnd * Math.min(1, canvas.width / canvas.height), 1.6, bnd);
      gl.uniform3fv(ren.u.uSkyC, pal.sky || [0, 0, 0]);
      gl.uniform4fv(ren.u.uDent, dent);
      gl.uniform1f(ren.u.uHf, HF_K);
      gl.uniform4f(ren.u.uFlA, flA[0], flA[1], flTa < -1e3 ? 0 : 0.05 + 0.22 * Math.max(0, time - flTa), 0);
      gl.uniform4f(ren.u.uFlB, flB[0], flB[1], flTb < -1e3 ? 0 : 0.05 + 0.22 * Math.max(0, time - flTb), 0);
      gl.uniform2f(ren.u.uFloor, FLOOR_K * 0.3, Math.min(1, floorAct * 1.5));
      gl.uniform4fv(ren.u.uWakeB, wakeB);
      gl.uniform4f(ren.u.uStoneC, stone.x, stone.y, stone.r / lastCss[1], stone.on ? stone.r : 0);
      gl.uniform4f(ren.u.uBarC, bar.x, bar.y, bar.rx / lastCss[1], bar.on ? bar.ry / lastCss[1] : 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); lost = true; });
    canvas.addEventListener('webglcontextrestored', () => { lost = false; W = H = 0; window.dispatchEvent(new Event('resize')); });

    return { kind: 'webgl2', resize, splat, frame, setStone, setBar, firePulse, setPlate, setSky, setDent, setSleep, setCalm, setLife, setWake, guardInfo: () => ({ ms: guardMs, trips: guardTrips, on: dispOn }) };
  } catch (e) {
    try { console.warn('webgl unavailable, falling back', e && e.message); } catch { /* noop */ }
    return null;
  }
}
