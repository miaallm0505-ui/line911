// PSX-рендер: картинка как с PlayStation 1 — низкое разрешение, дрожащие вершины,
// дизеринг и урезанная палитра, зерно плёнки, виньетка. Всё в одном проходе после сцены.
import * as THREE from 'three';

// Дрожание вершин: позиция на экране округляется до «сетки» низкого разрешения.
export function psxify(mat, snap = 160) {
  mat.onBeforeCompile = sh => {
    sh.uniforms.uSnap = { value: snap };
    sh.vertexShader = 'uniform float uSnap;\n' + sh.vertexShader.replace('#include <project_vertex>', `#include <project_vertex>
      { vec4 p = gl_Position; p.xyz /= p.w; p.xy = floor(p.xy * uSnap + .5) / uSnap; p.xyz *= p.w; gl_Position = p; }`);
  };
  mat.customProgramCacheKey = () => 'psx' + snap;
  return mat;
}

// Материал «как на PS1»: освещение по вершинам (Lambert), текстуры без сглаживания.
export function mat(o = {}) {
  const m = new THREE.MeshLambertMaterial(o);
  if (m.map) { m.map.magFilter = THREE.NearestFilter; m.map.minFilter = THREE.NearestMipmapNearestFilter; m.map.colorSpace = THREE.SRGBColorSpace }
  return psxify(m, o.snap || 160);
}

const POST_V = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`;
const POST_F = `
precision highp float;
uniform sampler2D tScene; uniform vec2 uRes; uniform float uTime, uGrain, uVig, uDepth, uCold, uDanger, uBlood, uGlitch, uFade;
varying vec2 vUv;
float bayer(vec2 p){ int x = int(mod(p.x,4.)), y = int(mod(p.y,4.)); int i = x + y*4;
  float m[16]; m[0]=0.;m[1]=8.;m[2]=2.;m[3]=10.;m[4]=12.;m[5]=4.;m[6]=14.;m[7]=6.;m[8]=3.;m[9]=11.;m[10]=1.;m[11]=9.;m[12]=15.;m[13]=7.;m[14]=13.;m[15]=5.;
  for(int k=0;k<16;k++){ if(k==i) return m[k]/16.; } return 0.; }
float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)) + uTime*7.) * 43758.5453); }
void main(){
  vec2 uv = vUv;
  // сбой изображения: строки сдвигаются
  if (uGlitch > 0.) { float row = floor(uv.y * uRes.y / 3.); float g = step(1. - uGlitch*.35, h(vec2(row, floor(uTime*20.)))); uv.x += g * (h(vec2(row, 1.)) - .5) * .08 * uGlitch; }
  // лёгкая хроматическая аберрация к краям
  vec2 d = uv - .5; float r2 = dot(d, d);
  float ca = .0025 + uDanger * .004;
  vec3 c = vec3(texture2D(tScene, uv + d*ca).r, texture2D(tScene, uv).g, texture2D(tScene, uv - d*ca).b);
  c = pow(max(c, 0.), vec3(1. / 2.2));   // линейный свет → sRGB экрана
  // холод: синеет и выцветает; кровь: красные края
  float l = dot(c, vec3(.299,.587,.114));
  c = mix(c, vec3(l) * vec3(.82,.92,1.08), uCold * .55);
  c += vec3(.35,0.,0.) * uBlood * smoothstep(.12,.5,r2);
  // зерно и виньетка
  c += (h(uv * uRes) - .5) * uGrain;
  c *= 1. - uVig * smoothstep(.18, .75, r2);
  // палитра 15 бит + дизеринг 4×4, как у PS1
  float b = bayer(floor(vUv * uRes));
  c = floor(c * uDepth + b) / uDepth;
  c *= uFade;
  gl_FragColor = vec4(c, 1.);
}`;

export class PSX {
  constructor(canvas, { height = 240 } = {}) {
    this.r = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    this.r.setPixelRatio(1); this.r.outputColorSpace = THREE.SRGBColorSpace;
    this.lowH = height;
    this.rt = new THREE.WebGLRenderTarget(4, 4, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: true });
    this.post = new THREE.ShaderMaterial({
      vertexShader: POST_V, fragmentShader: POST_F, depthTest: false, depthWrite: false,
      uniforms: { tScene: { value: this.rt.texture }, uRes: { value: new THREE.Vector2() }, uTime: { value: 0 }, uGrain: { value: .07 }, uVig: { value: .85 }, uDepth: { value: 31 }, uCold: { value: 0 }, uDanger: { value: 0 }, uBlood: { value: 0 }, uGlitch: { value: 0 }, uFade: { value: 1 } }
    });
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.post);
    this.postScene = new THREE.Scene(); this.postScene.add(this.quad);
    this.postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.fx = this.post.uniforms;
    this.resize();
  }
  resize() {
    const c = this.r.domElement, w = c.clientWidth || innerWidth, h = c.clientHeight || innerHeight;
    this.r.setSize(w, h, false);
    const k = this.lowH / Math.min(w, h), lw = Math.round(w * k), lh = Math.round(h * k);   // короткая сторона = lowH пикселей
    this.rt.setSize(lw, lh); this.fx.uRes.value.set(lw, lh);
    this.aspect = w / h;
  }
  render(scene, cam, t) {
    cam.aspect = this.aspect; cam.updateProjectionMatrix();
    this.fx.uTime.value = t;
    this.r.setRenderTarget(this.rt); this.r.render(scene, cam);
    this.r.setRenderTarget(null); this.r.render(this.postScene, this.postCam);
  }
  dispose() { this.r.dispose(); this.rt.dispose() }
}
