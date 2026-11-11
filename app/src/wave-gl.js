// WebGL2 波動方程式シミュレーション＋屈折風レンダリング。非対応なら null を返す。
const VERT = `#version 300 es
in vec2 p; out vec2 vUv;
void main(){ vUv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }`;

const SIM = `#version 300 es
precision highp float; precision highp int;
uniform sampler2D uState; uniform ivec2 uSize; uniform float uK; uniform float uDamp; uniform float uGlowDecay;
uniform vec4 uSplat[16]; uniform int uCount;
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
  float ed = min(min(float(p.x), float(mx.x - p.x)), min(float(p.y), float(mx.y - p.y)));
  float sponge = 1.0 - smoothstep(0.0, 12.0, ed);
  float damp = uDamp - sponge * 0.028;
  float v = (c.g + uK * lap) * damp;
  v -= sign(v) * min(abs(v), 0.00006);
  float h = (c.r + v) * 0.9992;
  // 光の滲み: 近傍へ拡散しつつ約 1.5 秒で消える（波とは別チャンネル）
  float glow = mix(c3.b, (L4.b + R4.b + D4.b + U4.b) * 0.25, 0.35) * uGlowDecay;
  for (int i = 0; i < 16; i++) {
    if (i >= uCount) break;
    vec4 s = uSplat[i];
    vec2 dd = (vec2(p) + 0.5) - s.xy;
    float gs = exp(-dot(dd, dd) / (2.0 * s.z * s.z));
    h += s.w * gs;
    glow += s.w * gs * 1.6;
  }
  o = vec4(h, v, glow, 1.0);
}`;

const RENDER = `#version 300 es
precision highp float;
uniform sampler2D uState; uniform vec2 uTexel; uniform vec2 uRes; uniform float uTime;
uniform vec3 uDeep; uniform vec3 uMid; uniform vec3 uAcc; uniform vec4 uLook; uniform float uRimW;
in vec2 vUv; out vec4 o;
float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
vec3 knee(vec3 x){
  vec3 t = max(x - 0.72, 0.0);
  return min(x, vec3(0.72)) + 0.24 * (1.0 - exp(-t / 0.24));
}
void main(){
  vec2 uv = vUv;
  vec2 tx = uTexel;
  vec3 hs = texture(uState, uv).rgb;
  float h = hs.r;
  // 勾配は 2 セル幅の中心差分 1 本（以前の 1px/3px 混合の近似）。テクスチャ読み取りは計 5 回
  vec2 g = vec2(texture(uState, uv + vec2(tx.x * 2.0, 0.0)).r - texture(uState, uv - vec2(tx.x * 2.0, 0.0)).r,
                texture(uState, uv + vec2(0.0, tx.y * 2.0)).r - texture(uState, uv - vec2(0.0, tx.y * 2.0)).r) * 0.25;
  vec3 n = normalize(vec3(-g * 9.0, 1.0));

  vec2 asp = vec2(uRes.x / uRes.y, 1.0);
  vec2 q = uv + g * 2.4 * uLook.x;
  vec2 pc = (q - vec2(0.5, 0.40)) * asp;
  float r = length(pc);
  vec3 base = mix(uMid, uDeep, smoothstep(0.0, 0.95, r));
  base *= mix(1.12, 0.62, smoothstep(0.0, 1.0, q.y));
  float bands = sin(q.x * asp.x * 3.2 + uTime * 0.12 + sin(q.y * 3.6 - uTime * 0.09) * 1.6) * 0.5 + 0.5;
  base += uMid * 0.16 * bands * bands * (1.0 - smoothstep(0.1, 1.1, r));

  vec3 L = normalize(vec3(-0.35, 0.55, 0.75));
  vec3 H = normalize(L + vec3(0.0, 0.0, 1.0));
  float spec = pow(max(dot(n, H), 0.0), 90.0);
  // 小さな波は閾値で静かに消し、新しい波だけが明るく残る
  float slope = max(length(g) * 12.0 - 0.02, 0.0);
  float rim = 1.0 - exp(-slope * 3.0 / uRimW);
  float hp = max(h, 0.0);
  float gl = hs.b;
  vec3 add = uAcc * (rim * 1.5 * uLook.y + spec * uLook.z * smoothstep(0.0, 0.25, slope) + hp * hp * 3.0 + hp * 0.5)
           + uMid * max(-h, 0.0) * 0.7
           + uAcc * (gl * 0.9 + gl * gl * 1.4);

  vec3 col = base + (vec3(1.0) - exp(-add * 1.15)) * 0.86;
  col = knee(col);

  vec2 vc = (uv - 0.5) * vec2(1.0, 1.15);
  col *= 1.0 - 0.38 * smoothstep(0.25, 0.95, length(vc));
  col += (hash(gl_FragCoord.xy + uTime) - 0.5) / 160.0;
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

const STEP_HZ = 180;
const LONG_SIDE_CELLS = 420;
const MAX_LONG_PX = 1024; // 内部描画の長辺の上限（CSS で拡大。バイリニアで滑らか）
const MAX_STEPS = 4;

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

    let quality = 1, lastCss = [0, 0, 1], look = [1, 0.95, 2.2, 0.9955, 1, 0.9915], W = 0, H = 0, tex = [], fbo = [], cur = 0, acc = 0, time = 0, lost = false, pending = 0;
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
      gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT);
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
      queue.push(ux * W, uy * H, Math.max(1.2, radiusShort * Math.min(W, H)), amp);
      pending = Math.min(16, queue.length / 4);
    }

    function step(withSplats) {
      gl.useProgram(sim.pr);
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo[1 - cur]);
      gl.viewport(0, 0, W, H);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex[cur]);
      gl.uniform1i(sim.u.uState, 0);
      gl.uniform2i(sim.u.uSize, W, H);
      gl.uniform1f(sim.u.uK, 0.47);
      gl.uniform1f(sim.u.uDamp, look[3]);
      gl.uniform1f(sim.u.uGlowDecay, look[5]);
      const n = withSplats ? Math.min(16, queue.length / 4) : 0;
      if (n) { const b = queue.splice(0, n * 4); splats.set(b); }
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

    function frame(dt, pal) {
      if (lost || !tex.length) return;
      adapt(dt);
      if (pal.look) look = pal.look;
      acc += dt;
      let n = Math.min(Math.floor(acc * STEP_HZ), MAX_STEPS);
      acc = Math.min(acc - n / STEP_HZ, 1 / STEP_HZ);
      if (n === 0 && pending) n = 1;
      for (let i = 0; i < n; i++) step(true);
      time += dt;
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
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); lost = true; });
    canvas.addEventListener('webglcontextrestored', () => { lost = false; W = H = 0; window.dispatchEvent(new Event('resize')); });

    return { kind: 'webgl2', resize, splat, frame };
  } catch (e) {
    try { console.warn('webgl unavailable, falling back'); } catch { /* noop */ }
    return null;
  }
}
