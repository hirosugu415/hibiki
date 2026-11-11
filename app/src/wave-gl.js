// WebGL2 波動方程式シミュレーション＋屈折風レンダリング。非対応なら null を返す。
const VERT = `#version 300 es
in vec2 p; out vec2 vUv;
void main(){ vUv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }`;

const SIM = `#version 300 es
precision highp float; precision highp int;
uniform sampler2D uState; uniform ivec2 uSize; uniform float uK; uniform float uDamp;
uniform vec4 uSplat[16]; uniform int uCount;
out vec4 o;
void main(){
  ivec2 p = ivec2(gl_FragCoord.xy);
  ivec2 mx = uSize - 1;
  vec2 c = texelFetch(uState, p, 0).rg;
  float l = texelFetch(uState, clamp(p + ivec2(-1, 0), ivec2(0), mx), 0).r;
  float r = texelFetch(uState, clamp(p + ivec2( 1, 0), ivec2(0), mx), 0).r;
  float d = texelFetch(uState, clamp(p + ivec2( 0,-1), ivec2(0), mx), 0).r;
  float u = texelFetch(uState, clamp(p + ivec2( 0, 1), ivec2(0), mx), 0).r;
  float lap = l + r + d + u - 4.0 * c.r;
  float ed = min(min(float(p.x), float(mx.x - p.x)), min(float(p.y), float(mx.y - p.y)));
  float sponge = 1.0 - smoothstep(0.0, 12.0, ed);
  float damp = uDamp - sponge * 0.028;
  float v = (c.g + uK * lap) * damp;
  float h = (c.r + v) * 0.9997;
  for (int i = 0; i < 16; i++) {
    if (i >= uCount) break;
    vec4 s = uSplat[i];
    vec2 dd = (vec2(p) + 0.5) - s.xy;
    h += s.w * exp(-dot(dd, dd) / (2.0 * s.z * s.z));
  }
  o = vec4(h, v, 0.0, 1.0);
}`;

const RENDER = `#version 300 es
precision highp float;
uniform sampler2D uState; uniform vec2 uTexel; uniform vec2 uRes; uniform float uTime;
uniform vec3 uDeep; uniform vec3 uMid; uniform vec3 uAcc;
in vec2 vUv; out vec4 o;
float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
vec3 knee(vec3 x){
  vec3 t = max(x - 0.72, 0.0);
  return min(x, vec3(0.72)) + 0.24 * (1.0 - exp(-t / 0.24));
}
void main(){
  vec2 uv = vUv;
  float h  = texture(uState, uv).r;
  float hx = texture(uState, uv + vec2(uTexel.x, 0.0)).r - texture(uState, uv - vec2(uTexel.x, 0.0)).r;
  float hy = texture(uState, uv + vec2(0.0, uTexel.y)).r - texture(uState, uv - vec2(0.0, uTexel.y)).r;
  vec2 g = vec2(hx, hy) * 0.5;
  vec3 n = normalize(vec3(-g * 9.0, 1.0));

  vec2 asp = vec2(uRes.x / uRes.y, 1.0);
  vec2 q = uv + g * 2.4;
  vec2 pc = (q - vec2(0.5, 0.40)) * asp;
  float r = length(pc);
  vec3 base = mix(uMid, uDeep, smoothstep(0.0, 0.95, r));
  base *= mix(1.12, 0.62, smoothstep(0.0, 1.0, q.y));
  float bands = sin(q.x * asp.x * 3.2 + uTime * 0.12 + sin(q.y * 3.6 - uTime * 0.09) * 1.6) * 0.5 + 0.5;
  base += uMid * 0.16 * bands * bands * (1.0 - smoothstep(0.1, 1.1, r));

  vec3 L = normalize(vec3(-0.35, 0.55, 0.75));
  vec3 H = normalize(L + vec3(0.0, 0.0, 1.0));
  float spec = pow(max(dot(n, H), 0.0), 90.0);
  float slope = length(g) * 9.0;
  float rim = 1.0 - exp(-slope * 3.2);
  vec3 add = uAcc * (rim * 0.8 + spec * 2.2 + max(h, 0.0) * 1.1)
           + uMid * max(-h, 0.0) * 0.9;

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

    let W = 0, H = 0, tex = [], fbo = [], cur = 0, acc = 0, time = 0, lost = false, pending = 0;
    const splats = new Float32Array(64);

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
      const px = Math.min(dpr, 2);
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
      cur = 0; pending = 0;
      return true;
    }

    // ux, uy: 0–1（uy は下が 0）。radiusShort: 短辺に対する半径の比。
    function splat(ux, uy, amp, radiusShort) {
      if (pending >= 16 || !W) return;
      const o = pending * 4;
      splats[o] = ux * W; splats[o + 1] = uy * H;
      splats[o + 2] = Math.max(1.2, radiusShort * Math.min(W, H)); splats[o + 3] = amp;
      pending++;
    }

    function step(withSplats) {
      gl.useProgram(sim.pr);
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo[1 - cur]);
      gl.viewport(0, 0, W, H);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex[cur]);
      gl.uniform1i(sim.u.uState, 0);
      gl.uniform2i(sim.u.uSize, W, H);
      gl.uniform1f(sim.u.uK, 0.47);
      gl.uniform1f(sim.u.uDamp, 0.9964);
      const n = withSplats ? pending : 0;
      gl.uniform1i(sim.u.uCount, n);
      if (n) gl.uniform4fv(sim.u.uSplat, splats);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      cur = 1 - cur;
      if (withSplats) pending = 0;
    }

    function frame(dt, pal) {
      if (lost || !tex.length) return;
      acc += dt;
      let n = Math.min(Math.floor(acc * STEP_HZ), 7);
      acc = Math.min(acc - n / STEP_HZ, 1 / STEP_HZ);
      if (n === 0 && pending) n = 1;
      for (let i = 0; i < n; i++) step(i === 0);
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
