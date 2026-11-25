// Real-time 3D car scenes powered by three.js.
// 3D model: "Ferrari 458 Italia" by vicent091036 (CC BY 4.0), via the three.js examples.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const PAINTS = [
  { name: 'Nardo Grey', hex: '#8e9196' },
  { name: 'Midnight Black', hex: '#141416' },
  { name: 'Pearl White', hex: '#f2f2ee' },
  { name: 'Liquid Silver', hex: '#c3c7cc' },
  { name: 'Graphite', hex: '#3c3e42' },
  { name: 'Racing Green', hex: '#1f5a32' },
  { name: 'Rosso Red', hex: '#d3202a' },
];

// ---------------------------------------------------------------------------
// Shared asset loading (the model is downloaded once for every scene)
// ---------------------------------------------------------------------------
let modelPromise;
const progressListeners = new Set();

export function onModelProgress(fn) { progressListeners.add(fn); }

function loadModel() {
  if (!modelPromise) {
    const draco = new DRACOLoader().setDecoderPath('vendor/three/examples/jsm/libs/draco/gltf/');
    const loader = new GLTFLoader().setDRACOLoader(draco);
    modelPromise = new Promise((resolve, reject) => {
      loader.load('models/ferrari.glb', (gltf) => resolve(gltf.scene.children[0]), (e) => {
        if (e.total) progressListeners.forEach((fn) => fn(e.loaded / e.total));
      }, reject);
    });
  }
  return modelPromise;
}

let shadowTexture;
function getShadowTexture() {
  if (!shadowTexture) shadowTexture = new THREE.TextureLoader().load('models/car_shadow.png');
  return shadowTexture;
}

export function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch { return false; }
}

// Build an independent, re-skinnable copy of the car.
function buildCar(template, paint) {
  const car = template.clone(true);
  const body = new THREE.MeshPhysicalMaterial({
    color: paint, metalness: 0.65, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.03,
    envMapIntensity: 1.25,
  });
  const details = new THREE.MeshStandardMaterial({ color: 0xe8edf2, metalness: 1, roughness: 0.32 });
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0x0c1a2b, metalness: 0.4, roughness: 0.02, transparent: true, opacity: 0.62, envMapIntensity: 1.6,
  });

  car.getObjectByName('body').material = body;
  ['rim_fl', 'rim_fr', 'rim_rr', 'rim_rl', 'trim'].forEach((n) => {
    const o = car.getObjectByName(n);
    if (o) o.material = details;
  });
  car.getObjectByName('glass').material = glass;

  const wheels = ['wheel_fl', 'wheel_fr', 'wheel_rl', 'wheel_rr'].map((n) => car.getObjectByName(n)).filter(Boolean);

  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(0.655 * 4, 1.3 * 4),
    new THREE.MeshBasicMaterial({ map: getShadowTexture(), transparent: true, depthWrite: false, opacity: 0.92, toneMapped: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.002;
  shadow.renderOrder = 2;
  car.add(shadow);

  // The source model faces -z; wrap it so "forward" is +z everywhere.
  car.rotation.y = Math.PI;
  const holder = new THREE.Group();
  holder.add(car);

  return { car: holder, body, wheels };
}

function createRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  return renderer;
}

function makeEnvironment(renderer) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;
  pmrem.dispose();
  return env;
}

// Radial-gradient sprite used for the soft glowing podium.
function glowTexture(inner, outer) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grd.addColorStop(0, inner);
  grd.addColorStop(1, outer);
  g.fillStyle = grd;
  g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function makePodium() {
  const group = new THREE.Group();
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(3.6, 96),
    new THREE.MeshBasicMaterial({ map: glowTexture('rgba(255,255,255,0.95)', 'rgba(255,255,255,0)'), transparent: true, depthWrite: false, toneMapped: false }),
  );
  disc.rotation.x = -Math.PI / 2;
  disc.position.y = -0.002;
  group.add(disc);

  const rings = [];
  [[2.95, 3.0, 0x6b7280, 0.5], [3.35, 3.37, 0xb4b9c1, 0.45]].forEach(([a, b, color, opacity]) => {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(a, b, 160),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.userData.baseOpacity = opacity;
    group.add(ring);
    rings.push(ring);
  });
  return { group, rings };
}

// Run a render loop only while the canvas is on screen.
function visibilityLoop(el, frame) {
  let visible = false;
  let raf = 0;
  const clock = new THREE.Clock();
  const loop = () => {
    raf = requestAnimationFrame(loop);
    frame(Math.min(clock.getDelta(), 0.05), clock.elapsedTime);
  };
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible && !raf) { clock.getDelta(); loop(); }
    if (!visible && raf) { cancelAnimationFrame(raf); raf = 0; }
  }, { rootMargin: '100px' }).observe(el);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && raf) { cancelAnimationFrame(raf); raf = 0; } else if (!document.hidden && visible && !raf) { clock.getDelta(); loop(); }
  });
}

const easeOutCubic = (t) => 1 - (1 - t) ** 3;
const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const WHEEL_RADIUS = 0.34;

// ---------------------------------------------------------------------------
// HERO: the car drives onto a glowing podium, then slowly turns with the
// cursor and the page scroll.
// ---------------------------------------------------------------------------
export async function createHeroScene(container, { paint = PAINTS[0].hex } = {}) {
  const canvas = container.querySelector('canvas');
  const renderer = createRenderer(canvas);
  const scene = new THREE.Scene();
  scene.environment = makeEnvironment(renderer);

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  const lookAt = new THREE.Vector3(0, 0.55, 0);

  const template = await loadModel();
  const { car, body, wheels } = buildCar(template, paint);
  const rig = new THREE.Group();
  rig.add(car);
  scene.add(rig);
  const podium = makePodium();
  scene.add(podium.group);

  // Layout: on wide screens the car sits to the right of the headline.
  let wide = false;
  function resize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    wide = w > 960;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = wide ? 30 : 34;
    if (wide) camera.setViewOffset(w, h, -w * 0.21, -h * 0.02, w, h);
    else camera.clearViewOffset();
    camera.updateProjectionMatrix();
  }
  resize();
  new ResizeObserver(resize).observe(container);

  // Pointer parallax
  const pointer = { x: 0, y: 0, sx: 0, sy: 0 };
  window.addEventListener('pointermove', (e) => {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });

  // Scroll progress through the hero (0 → 1)
  let scrollP = 0;
  let scrollS = 0;
  const onScroll = () => {
    const r = container.getBoundingClientRect();
    scrollP = THREE.MathUtils.clamp(-r.top / (r.height * 0.9), 0, 1);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Intro: drive in from behind along the car's own axis.
  const INTRO = reduceMotion ? 0 : 2.6;
  const START_Z = -9;
  let t0 = null;
  let spin = 0;
  let wheelAngle = 0;
  let lastZ = START_Z;
  const targetColor = new THREE.Color(paint);
  container.classList.add('is-ready');

  visibilityLoop(container, (dt, time) => {
    if (t0 === null) t0 = time;
    const t = time - t0;

    // Drive-in + wheel rotation driven by distance travelled
    const p = INTRO ? Math.min(1, t / INTRO) : 1;
    const z = START_Z * (1 - easeOutCubic(p));
    wheelAngle += (z - lastZ) / WHEEL_RADIUS;
    lastZ = z;
    car.position.z = z;
    wheels.forEach((w) => { w.rotation.x = -wheelAngle; });
    // a subtle nose-dip as the car brakes
    car.rotation.x = p < 1 ? -Math.sin(p * Math.PI) * 0.012 : 0;

    // Slow showroom turntable after arrival
    if (p >= 1 && !reduceMotion) spin += dt * 0.12;

    pointer.sx += (pointer.x - pointer.sx) * 0.05;
    pointer.sy += (pointer.y - pointer.sy) * 0.05;
    scrollS += (scrollP - scrollS) * 0.08;

    rig.rotation.y = 0.2 + spin + pointer.sx * 0.25 + scrollS * 1.6;

    // Camera orbit/dolly with scroll and parallax
    const radius = (wide ? 10.9 : 9.6 + Math.max(0, 1.3 - camera.aspect) * 4) - scrollS * 2.2;
    const height = 2.7 + scrollS * 1.6 - pointer.sy * 0.35;
    const az = 0.9 + pointer.sx * 0.06;
    camera.position.set(Math.sin(az) * radius, height, Math.cos(az) * radius);
    camera.lookAt(lookAt);

    // Pulsing podium rings
    podium.rings.forEach((ring, i) => {
      const s = 1 + Math.sin(time * 1.4 + i * 1.6) * 0.012;
      ring.scale.setScalar(s);
      ring.material.opacity = ring.userData.baseOpacity * (0.75 + Math.sin(time * 1.4 + i) * 0.25);
    });

    body.color.lerp(targetColor, 0.06);
    renderer.render(scene, camera);
  });

  return {
    setPaint(hex) { targetColor.set(hex); },
  };
}

// ---------------------------------------------------------------------------
// SHOWROOM: orbit, repaint, change camera angle and switch on "drive" mode.
// ---------------------------------------------------------------------------
export async function createShowroom(container, { paint = PAINTS[1].hex } = {}) {
  const canvas = container.querySelector('canvas');
  const renderer = createRenderer(canvas);
  const scene = new THREE.Scene();
  scene.environment = makeEnvironment(renderer);

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(-6.1, 2.1, 5.9);

  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0, 0.5, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.enablePan = false;
  controls.enableZoom = false;
  controls.minPolarAngle = 0.25;
  controls.maxPolarAngle = Math.PI / 2 - 0.04;
  controls.autoRotate = !reduceMotion;
  controls.autoRotateSpeed = 0.7;
  controls.update();

  const template = await loadModel();
  const { car, body, wheels } = buildCar(template, paint);
  const rig = new THREE.Group();
  rig.add(car);
  scene.add(rig);
  const podium = makePodium();
  scene.add(podium.group);

  // Moving road for drive mode
  const grid = new THREE.GridHelper(40, 40, 0x9aa3b2, 0xd3d8e0);
  grid.material.transparent = true;
  grid.material.opacity = 0;
  grid.material.depthWrite = false;
  rig.add(grid);

  function resize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  new ResizeObserver(resize).observe(container);

  // Interaction state
  const targetColor = new THREE.Color(paint);
  let drive = false;
  let speed = 0;
  let wheelAngle = 0;
  let roadDist = 0;
  let resumeTimer;
  let tween = null; // camera preset tween
  let zoom = 1;
  let zoomS = 1;

  const pauseAutoRotate = () => {
    controls.autoRotate = false;
    clearTimeout(resumeTimer);
    resumeTimer = setTimeout(() => { if (!reduceMotion) controls.autoRotate = true; }, 5000);
  };
  controls.addEventListener('start', () => { tween = null; pauseAutoRotate(); container.classList.add('interacted'); });

  const PRESETS = {
    front: new THREE.Vector3(0.7, 1.3, 7.7),
    side: new THREE.Vector3(8.2, 1.0, 0.1),
    rear: new THREE.Vector3(-1.7, 1.9, -7.5),
    top: new THREE.Vector3(0.01, 9.6, 0.5),
    hero: new THREE.Vector3(-6.1, 2.1, 5.9),
  };

  visibilityLoop(container, (dt, time) => {
    // camera preset tween (spherical-ish lerp, keeps distance natural)
    if (tween) {
      tween.t = Math.min(1, tween.t + dt / 1.4);
      const k = easeInOutCubic(tween.t);
      camera.position.lerpVectors(tween.from, tween.to, k);
      if (tween.t >= 1) tween = null;
    }

    zoomS += (zoom - zoomS) * 0.1;
    controls.update();
    // apply zoom as an fov change so OrbitControls stays in charge of position
    const fov = 32 / zoomS;
    if (Math.abs(camera.fov - fov) > 0.01) { camera.fov = fov; camera.updateProjectionMatrix(); }

    // drive mode
    speed += ((drive ? 9 : 0) - speed) * Math.min(1, dt * 1.6);
    wheelAngle += (speed * dt) / WHEEL_RADIUS;
    wheels.forEach((w) => { w.rotation.x = -wheelAngle; });
    roadDist += speed * dt;
    grid.position.z = -(roadDist % 1);
    grid.material.opacity = Math.min(0.9, speed / 9);
    car.position.y = drive ? Math.sin(time * 18) * 0.004 * (speed / 9) : car.position.y * 0.9;
    podium.group.visible = speed < 6;
    podium.rings.forEach((ring, i) => {
      ring.material.opacity = ring.userData.baseOpacity * (1 - speed / 9) * (0.75 + Math.sin(time * 1.4 + i) * 0.25);
    });

    body.color.lerp(targetColor, 0.07);
    renderer.render(scene, camera);
  });

  container.classList.add('is-ready');

  return {
    setPaint(hex) { targetColor.set(hex); },
    view(name) {
      const to = PRESETS[name];
      if (!to) return;
      pauseAutoRotate();
      tween = { from: camera.position.clone(), to: to.clone(), t: 0 };
    },
    zoom(dir) { zoom = THREE.MathUtils.clamp(zoom + dir * 0.18, 0.75, 1.9); pauseAutoRotate(); },
    toggleDrive() {
      drive = !drive;
      if (drive) this.view('hero');
      return drive;
    },
  };
}
