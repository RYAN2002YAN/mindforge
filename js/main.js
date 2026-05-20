import * as THREE from 'three';

// ═══════════════════════════════════════════════
//  DOM REFS
// ═══════════════════════════════════════════════
const $hudHint  = document.getElementById('hud-hint');
const $dialog   = document.getElementById('dialog');
const $dlgName  = document.getElementById('dlg-name');
const $dlgLine  = document.getElementById('dlg-line');
const $dlgHint  = document.getElementById('dlg-hint');
const $statTask = document.getElementById('stat-tasks');
const $statDay  = document.getElementById('stat-day');

// ═══════════════════════════════════════════════
//  SCENE · CAMERA · RENDERER
// ═══════════════════════════════════════════════
const scene   = new THREE.Scene();
scene.background = new THREE.Color(0x3a3040);
scene.fog        = new THREE.FogExp2(0xd4c5b9, 0.00028);

const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.5, 100);

const renderer = new THREE.WebGLRenderer({ antialias: false });  // false = big perf win
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));          // cap for perf
renderer.shadowMap.enabled = true;
renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
renderer.toneMapping       = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
document.body.appendChild(renderer.domElement);

// ═══════════════════════════════════════════════
//  LIGHTING
// ═══════════════════════════════════════════════
scene.add(new THREE.HemisphereLight(0xffeedd, 0x4a6a3a, 1.0));

const sun = new THREE.DirectionalLight(0xffcc88, 4.0);
sun.position.set(15, 18, -4);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);   // was 2048 → halved for perf
sun.shadow.camera.near   = 0.5;
sun.shadow.camera.far    = 60;
sun.shadow.camera.left   = -15;
sun.shadow.camera.right  =  15;
sun.shadow.camera.top    =  15;
sun.shadow.camera.bottom = -15;
sun.shadow.bias = -0.0004;
scene.add(sun);

// ═══════════════════════════════════════════════
//  HELPER: 小屋
// ═══════════════════════════════════════════════
function createCottage(x, z, wallColor, roofColor, rot = 0) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 1.3, 1.0),
    new THREE.MeshStandardMaterial({ color: wallColor, roughness: 0.7 })
  );
  body.position.y = 0.65;
  body.castShadow = body.receiveShadow = true;
  g.add(body);

  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(1.0, 0.85, 4).rotateY(Math.PI / 4),
    new THREE.MeshStandardMaterial({ color: roofColor, roughness: 0.55 })
  );
  roof.position.y = 1.52;
  roof.castShadow = roof.receiveShadow = true;
  g.add(roof);

  // door
  g.add(new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 0.5, 0.05),
    new THREE.MeshStandardMaterial({ color: 0x5c3a1e, roughness: 0.5 })
  )).position.set(0, 0.25, 0.53);

  // windows
  const wm = new THREE.MeshStandardMaterial({ color: 0xffcc66, emissive: 0xff9922, emissiveIntensity: 0.5, roughness: 0.3 });
  [[-0.32, 0.53], [0.32, 0.53]].forEach(([wx, wz]) => {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.22), wm);
    w.position.set(wx, 0.9, wz);
    g.add(w);
  });

  // chimney
  const chim = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 0.45, 0.2),
    new THREE.MeshStandardMaterial({ color: 0x8b7355, roughness: 0.7 })
  );
  chim.position.set(0.32, 1.7, -0.22);
  chim.castShadow = true;
  g.add(chim);

  g.position.set(x, 0, z);
  g.rotation.y = rot;
  return g;
}

// ═══════════════════════════════════════════════
//  WORLD: GROUND + PLAZA + PATHS
// ═══════════════════════════════════════════════
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(50, 50),
  new THREE.MeshStandardMaterial({ color: 0x5a7d4a, roughness: 0.95 })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
ground.name = 'ground';   // for raycasting
scene.add(ground);

const plaza = new THREE.Mesh(
  new THREE.CylinderGeometry(1.5, 1.6, 0.04, 20),
  new THREE.MeshStandardMaterial({ color: 0xc8b898, roughness: 0.8 })
);
plaza.position.y = 0.02;
plaza.receiveShadow = true;
scene.add(plaza);

// 石板路 helper
function addPath(a, b, n = 12) {
  const mat = new THREE.MeshStandardMaterial({ color: 0xb8a896, roughness: 0.85 });
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const stone = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.14, 0.05, 5), mat);
    stone.position.set(
      a.x + (b.x - a.x) * t + (Math.random() - 0.5) * 0.5,
      0.03,
      a.z + (b.z - a.z) * t + (Math.random() - 0.5) * 0.5
    );
    stone.receiveShadow = true;
    scene.add(stone);
  }
}

// ═══════════════════════════════════════════════
//  MOUNTAIN — 「远山」长期目标视觉隐喻
// ═══════════════════════════════════════════════
const mountainGroup = new THREE.Group();

// 主山体 (大锥体)
const mtBody = new THREE.Mesh(
  new THREE.ConeGeometry(3.5, 8, 16),
  new THREE.MeshStandardMaterial({ color: 0x6b5c4a, roughness: 0.8 })
);
mtBody.position.y = 4;
mtBody.castShadow = true;
mtBody.receiveShadow = true;
mountainGroup.add(mtBody);

// 雪顶
const mtSnow = new THREE.Mesh(
  new THREE.ConeGeometry(1.6, 2.5, 16),
  new THREE.MeshStandardMaterial({ color: 0xf8f4e8, roughness: 0.4 })
);
mtSnow.position.y = 8;
mtSnow.castShadow = true;
mountainGroup.add(mtSnow);

// 三个营地 (环形平台 + 旗帜)
const camps = [
  { y: 2.5, label: '营地 I',   color: 0x88aa88 },
  { y: 5.0, label: '营地 II',  color: 0x998866 },
  { y: 7.2, label: '登顶营',  color: 0xccbbaa },
];
const campFlags = [];
camps.forEach((camp) => {
  // 平台环
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.2, 0.15, 8, 16),
    new THREE.MeshStandardMaterial({ color: camp.color, roughness: 0.6 })
  );
  ring.position.y = camp.y;
  ring.rotation.x = Math.PI / 2;
  ring.castShadow = true;
  ring.receiveShadow = true;
  mountainGroup.add(ring);

  // 旗杆
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, 0.9, 6),
    new THREE.MeshStandardMaterial({ color: 0x5c4030 })
  );
  pole.position.set(1.0, camp.y + 0.45, 0);
  pole.castShadow = true;
  mountainGroup.add(pole);

  // 旗帜
  const flag = new THREE.Mesh(
    new THREE.PlaneGeometry(0.35, 0.22),
    new THREE.MeshStandardMaterial({ color: 0xff6630, roughness: 0.4, side: THREE.DoubleSide })
  );
  flag.position.set(1.2, camp.y + 0.72, 0);
  mountainGroup.add(flag);
  campFlags.push(flag);
});

// 山顶光柱
const summitGlow = new THREE.Mesh(
  new THREE.SphereGeometry(0.3, 8, 6),
  new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffddaa, emissiveIntensity: 1.0, roughness: 0.1 })
);
summitGlow.position.y = 9.3;
mountainGroup.add(summitGlow);

mountainGroup.position.set(0, 0, -24);
mountainGroup.scale.setScalar(1);
scene.add(mountainGroup);

// ═══════════════════════════════════════════════
//  BUILDINGS
// ═══════════════════════════════════════════════
const cottageDefs = [
  { x: 0,    z: -5.5, rot: 0,               wall: 0xf5ecd7, roof: 0xc4723a, name: '村长屋' },
  { x: -4.5, z: -1.5, rot: Math.PI / 5,      wall: 0xefe0c8, roof: 0xb85a2e, name: '铁匠铺' },
  { x: 4.5,  z: -1.5, rot: -Math.PI / 5,     wall: 0xf0e4d0, roof: 0x9e4a2a, name: '旅店'   },
  { x: 0,    z: 4.5,  rot: Math.PI,           wall: 0xe8dcc8, roof: 0x6b4a3a, name: '书屋'   },
];

const buildings = [];
cottageDefs.forEach(def => {
  const c = createCottage(def.x, def.z, def.wall, def.roof, def.rot);
  c.userData = { name: def.name, pos: new THREE.Vector3(def.x, 0, def.z) };
  scene.add(c);
  buildings.push(c);
  addPath({ x: 0, z: 0 }, { x: def.x, z: def.z }, 12);
});

// 建筑名牌 (CSS → canvas → sprite)
function makeLabel(text) {
  const canvas = document.createElement('canvas');
  canvas.width = 128; canvas.height = 32;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgba(0,0,0,0)';
  ctx.fillRect(0, 0, 128, 32);
  ctx.font = '14px Georgia, serif';
  ctx.fillStyle = '#f5e6d3';
  ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 4;
  ctx.fillText(text, 64, 20);

  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
  sprite.scale.set(1.6, 0.4, 1);
  return sprite;
}

cottageDefs.forEach(def => {
  const label = makeLabel(def.name);
  label.position.set(def.x, 2.5, def.z);
  scene.add(label);
});

// ═══════════════════════════════════════════════
//  TREES — 精简到 12 棵 (was 20)
// ═══════════════════════════════════════════════
function createTree(x, z, s = 1) {
  const g = new THREE.Group();
  const th = 1.1 * s;
  g.add(new THREE.Mesh(
    new THREE.CylinderGeometry(0.1 * s, 0.16 * s, th, 5),
    new THREE.MeshStandardMaterial({ color: 0x8b6b4a, roughness: 0.85 })
  )).position.y = th / 2;

  [0x5a7a3a, 0x4d6b2e, 0x3d5a22].forEach((c, i) => {
    const cr = new THREE.Mesh(
      new THREE.ConeGeometry(0.65 * s - i * 0.13 * s, 0.7 * s, 6),
      new THREE.MeshStandardMaterial({ color: c, roughness: 0.7 })
    );
    cr.position.y = th + i * 0.4 * s;
    cr.castShadow = true;
    cr.receiveShadow = true;
    g.add(cr);
  });
  g.position.set(x, 0, z);
  return g;
}

[[-7,-7],[7,-7],[-7,7],[7,7],[-6,-2.5],[6,-2.5],[-6,2.5],[6,2.5],[-2.5,-7],[2.5,-7],[-2.5,7],[2.5,7]]
  .forEach(([tx, tz]) => scene.add(createTree(tx + (Math.random()-0.5)*0.8, tz + (Math.random()-0.5)*0.8, 0.7 + Math.random() * 0.7)));

// ═══════════════════════════════════════════════
//  FLOWERS — 30 朵 (was 80)
// ═══════════════════════════════════════════════
const flowerColors = [0xffdddd, 0xffffff, 0xffffcc, 0xffd4e0, 0xfff0dd];
for (let i = 0; i < 30; i++) {
  const a = Math.random() * Math.PI * 2, r = 1.5 + Math.random() * 5;
  const fx = Math.cos(a) * r + (Math.random() - 0.5) * 1.5;
  const fz = Math.sin(a) * r + (Math.random() - 0.5) * 1.5;
  const color = flowerColors[Math.floor(Math.random() * flowerColors.length)];

  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.016, 0.22, 4),
    new THREE.MeshStandardMaterial({ color: 0x4a7a3a })
  );
  stem.position.set(fx, 0.11, fz);
  scene.add(stem);

  const petal = new THREE.Mesh(
    new THREE.SphereGeometry(0.04, 4, 3),
    new THREE.MeshStandardMaterial({ color, roughness: 0.4 })
  );
  petal.position.set(fx, 0.24, fz);
  scene.add(petal);
}

// ═══════════════════════════════════════════════
//  CAMPFIRE
// ═══════════════════════════════════════════════
const cfGroup = new THREE.Group();
for (let i = 0; i < 6; i++) {
  const s = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 4, 3),
    new THREE.MeshStandardMaterial({ color: 0x7a7a7a, roughness: 0.7 })
  );
  s.position.set(Math.cos(i / 6 * Math.PI * 2) * 0.5, 0.07, Math.sin(i / 6 * Math.PI * 2) * 0.5);
  s.castShadow = true;
  cfGroup.add(s);
}
for (let i = 0; i < 3; i++) {
  const log = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.05, 0.8, 5),
    new THREE.MeshStandardMaterial({ color: 0x4a3020, roughness: 0.95 })
  );
  log.rotation.z = Math.PI / 2;
  log.rotation.y = (i / 3) * Math.PI;
  log.position.y = 0.1;
  log.castShadow = true;
  cfGroup.add(log);
}
scene.add(cfGroup);

const fireLight = new THREE.PointLight(0xff8830, 7, 5, 1.5);
fireLight.position.set(0, 0.55, 0);
fireLight.castShadow = true;
fireLight.shadow.mapSize.set(256, 256);
scene.add(fireLight);

const flameMat = new THREE.MeshStandardMaterial({ color: 0xff8830, emissive: 0xff5500, emissiveIntensity: 1.0, roughness: 0.2 });
const flame = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.5, 6), flameMat);
flame.position.set(0, 0.42, 0);
scene.add(flame);

// ═══════════════════════════════════════════════
//  NPC — 守夜人
// ═══════════════════════════════════════════════
const npcGroup = new THREE.Group();
npcGroup.add(new THREE.Mesh(
  new THREE.CapsuleGeometry(0.22, 0.5, 4, 8),
  new THREE.MeshStandardMaterial({ color: 0x5c4060, roughness: 0.5 })
)).position.y = 0.5;

const npcHead = new THREE.Mesh(
  new THREE.SphereGeometry(0.2, 8, 6),
  new THREE.MeshStandardMaterial({ color: 0xd4b896, roughness: 0.6 })
);
npcHead.position.y = 1.0;
npcGroup.add(npcHead);

const hood = new THREE.Mesh(
  new THREE.ConeGeometry(0.25, 0.28, 6),
  new THREE.MeshStandardMaterial({ color: 0x4a3050, roughness: 0.55 })
);
hood.position.y = 1.22;
npcHead.add(hood);

const halo = new THREE.Mesh(
  new THREE.TorusGeometry(0.32, 0.035, 8, 20),
  new THREE.MeshStandardMaterial({ color: 0xffcc88, emissive: 0xffaa44, emissiveIntensity: 0.7, roughness: 0.2 })
);
halo.rotation.x = Math.PI / 2;
halo.position.y = 1.4;
npcGroup.add(halo);

const glowDisc = new THREE.Mesh(
  new THREE.CircleGeometry(0.5, 16),
  new THREE.MeshBasicMaterial({ color: 0xffcc88, transparent: true, opacity: 0.2, depthWrite: false })
);
glowDisc.rotation.x = -Math.PI / 2;
glowDisc.position.y = 0.01;
npcGroup.add(glowDisc);

npcGroup.position.set(1.2, 0, -1.8);
scene.add(npcGroup);

// ═══════════════════════════════════════════════
//  PLAYER — 小探险家
// ═══════════════════════════════════════════════
const playerGroup = new THREE.Group();

// 身体
const pBody = new THREE.Mesh(
  new THREE.CapsuleGeometry(0.18, 0.35, 4, 8),
  new THREE.MeshStandardMaterial({ color: 0x5b8c5a, roughness: 0.4 })
);
pBody.position.y = 0.55;
pBody.castShadow = true;
playerGroup.add(pBody);

// 头
const pHead = new THREE.Mesh(
  new THREE.SphereGeometry(0.2, 10, 8),
  new THREE.MeshStandardMaterial({ color: 0xffdbb4, roughness: 0.5 })
);
pHead.position.y = 1.08;
pHead.castShadow = true;
playerGroup.add(pHead);

// 帽子 (小圆帽)
const pHat = new THREE.Mesh(
  new THREE.CylinderGeometry(0.16, 0.2, 0.1, 8),
  new THREE.MeshStandardMaterial({ color: 0xc44a30, roughness: 0.5 })
);
pHat.position.y = 1.25;
playerGroup.add(pHat);
const pHatTop = new THREE.Mesh(
  new THREE.CylinderGeometry(0.1, 0.16, 0.08, 8),
  new THREE.MeshStandardMaterial({ color: 0xc44a30, roughness: 0.5 })
);
pHatTop.position.y = 1.35;
playerGroup.add(pHatTop);

// 手杖 (小棍)
const staff = new THREE.Mesh(
  new THREE.CylinderGeometry(0.025, 0.025, 0.6, 6),
  new THREE.MeshStandardMaterial({ color: 0x8b6b4a })
);
staff.position.set(0.22, 0.4, 0.1);
staff.rotation.z = -0.25;
playerGroup.add(staff);

playerGroup.position.set(0, 0, 0);
playerGroup.castShadow = true;
scene.add(playerGroup);

// 跟随光源 (角色周围微光)
const playerLight = new THREE.PointLight(0xffddaa, 2, 3, 2);
playerLight.position.y = 1;
playerGroup.add(playerLight);

// ═══════════════════════════════════════════════
//  PARTICLES: 萤火虫 80 只 (was 250) + 火星 20 (was 40)
// ═══════════════════════════════════════════════
const ffCount = 80;
const ffPos = new Float32Array(ffCount * 3);
const ffData = [];
for (let i = 0; i < ffCount; i++) {
  ffData.push({ by: 0.3 + Math.random() * 4.5, sp: 0.3 + Math.random() * 1.0, amp: 0.15 + Math.random() * 0.7, ph: Math.random() * Math.PI * 2 });
  ffPos[i * 3] = (Math.random() - 0.5) * 16;
  ffPos[i * 3 + 1] = ffData[i].by;
  ffPos[i * 3 + 2] = (Math.random() - 0.5) * 16;
}
const ffGeo = new THREE.BufferGeometry();
ffGeo.setAttribute('position', new THREE.BufferAttribute(ffPos, 3));
const fireflies = new THREE.Points(ffGeo, new THREE.PointsMaterial({
  color: 0xffdd88, size: 0.07, transparent: true, opacity: 0.65, blending: THREE.AdditiveBlending, depthWrite: false,
}));
scene.add(fireflies);

const spCount = 20;
const spPos = new Float32Array(spCount * 3);
const spData = [];
for (let i = 0; i < spCount; i++) {
  spData.push({ sp: 0.5 + Math.random() * 1.2, life: Math.random(), maxL: 0.4 + Math.random() * 1.2 });
  spPos[i * 3] = (Math.random() - 0.5) * 0.35;
  spPos[i * 3 + 1] = 0.25 + Math.random() * 1.2;
  spPos[i * 3 + 2] = (Math.random() - 0.5) * 0.35;
}
const spGeo = new THREE.BufferGeometry();
spGeo.setAttribute('position', new THREE.BufferAttribute(spPos, 3));
const sparks = new THREE.Points(spGeo, new THREE.PointsMaterial({
  color: 0xff9944, size: 0.05, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false,
}));
scene.add(sparks);

// ═══════════════════════════════════════════════
//  INPUT STATE
// ═══════════════════════════════════════════════
const keys = {};
const input = {
  moveDir: new THREE.Vector3(),
  targetPos: null,           // click-to-move target
  camTheta: 0.55,
  camPhi: 1.0,
  camDist: 9,
  isDragging: false,
  prevMouse: { x: 0, y: 0 },
  dragStart: { x: 0, y: 0 },
};

window.addEventListener('keydown', e => { keys[e.key.toLowerCase()] = true; });
window.addEventListener('keyup',   e => { keys[e.key.toLowerCase()] = false; });

// ═══════════════════════════════════════════════
//  INPUT: 鼠标拖拽 (旋转视角) + 点击 (移动/对话)
// ═══════════════════════════════════════════════
renderer.domElement.addEventListener('pointerdown', e => {
  input.isDragging = true;
  input.prevMouse.x = e.clientX;
  input.prevMouse.y = e.clientY;
  input.dragStart.x = e.clientX;
  input.dragStart.y = e.clientY;
});

window.addEventListener('pointerup', () => {
  input.isDragging = false;
});

window.addEventListener('pointermove', e => {
  if (!input.isDragging) return;
  const dx = e.clientX - input.prevMouse.x;
  const dy = e.clientY - input.prevMouse.y;
  input.camTheta -= dx * 0.005;
  input.camPhi   += dy * 0.005;
  input.camPhi    = Math.max(0.3, Math.min(1.45, input.camPhi));
  input.prevMouse.x = e.clientX;
  input.prevMouse.y = e.clientY;
});

renderer.domElement.addEventListener('wheel', e => {
  input.camDist += e.deltaY * 0.012;
  input.camDist  = Math.max(3, Math.min(22, input.camDist));
});

// 点击：区分拖拽 vs 点击
renderer.domElement.addEventListener('click', e => {
  const moved = Math.abs(e.clientX - input.dragStart.x) + Math.abs(e.clientY - input.dragStart.y);
  if (moved > 5) return;  // was a drag, not a click

  const mouse = new THREE.Vector2(
    (e.clientX / innerWidth) * 2 - 1,
    -(e.clientY / innerHeight) * 2 + 1
  );

  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(mouse, camera);

  // 1. 优先检测 NPC
  const npcHits = raycaster.intersectObjects(npcGroup.children, true);
  if (npcHits.length > 0) {
    talkToNPC();
    return;
  }

  // 2. 否则检测地面 → 移动
  const groundHits = raycaster.intersectObject(ground);
  if (groundHits.length > 0) {
    input.targetPos = groundHits[0].point.clone();
  }
});

// ═══════════════════════════════════════════════
//  DIALOGUE
// ═══════════════════════════════════════════════
function talkToNPC() {
  $dlgName.textContent = '守夜人 · 艾尔文';
  $dlgLine.textContent = '「旅行者，你来了。篝火旁还有未完成的使命——今日可有一事，值得你为之挥剑？」';
  $dlgHint.textContent = '按 E 键接取任务 · 按 Esc 离开';
  $dialog.style.display = 'block';
}

window.addEventListener('keydown', e => {
  if (e.key === 'Escape') { $dialog.style.display = 'none'; return; }
  if ($dialog.style.display !== 'block') return;

  if (e.key === 'e' || e.key === 'E') {
    $dlgLine.textContent = '「好！溪谷今日有三件事：① 取水 ② 劈柴 ③ 送信给铁匠。你想从哪一件开始？」';
    $dlgHint.textContent = '按 1/2/3 选择任务 · 按 Esc 离开';
  }
  if (['1','2','3'].includes(e.key)) {
    const tasks = ['取水', '劈柴', '送信给铁匠'];
    $dlgLine.textContent = `「${tasks[+e.key - 1]}——明智之选。任务完成时回到篝火旁，我会为你记下。」`;
    $dlgHint.textContent = '任务已接取 ✨ 按 Esc 关闭';
    $statTask.textContent = String(parseInt($statTask.textContent) - 1);
    $statDay.textContent  = String(parseInt($statDay.textContent) + 1);
  }
});

// ═══════════════════════════════════════════════
//  UPDATE: 玩家移动 + 摄像机跟随
// ═══════════════════════════════════════════════
function updatePlayer(dt) {
  const speed = 3.5;
  const pos = playerGroup.position;

  // WASD 移动 (相对于摄像机朝向)
  const fwd = new THREE.Vector3(
    Math.sin(input.camPhi) * Math.cos(input.camTheta),
    0,
    Math.sin(input.camPhi) * Math.sin(input.camTheta)
  ).normalize();
  const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize();

  input.moveDir.set(0, 0, 0);
  if (keys['w'] || keys['arrowup'])    input.moveDir.add(fwd);
  if (keys['s'] || keys['arrowdown'])  input.moveDir.sub(fwd);
  if (keys['a'] || keys['arrowleft'])  input.moveDir.sub(right);
  if (keys['d'] || keys['arrowright']) input.moveDir.add(right);

  // 点击移动 (优先于 WASD)
  if (input.targetPos) {
    const toTarget = new THREE.Vector3().subVectors(input.targetPos, pos);
    toTarget.y = 0;
    const dist = toTarget.length();
    if (dist < 0.2) {
      input.targetPos = null;  // arrived
    } else {
      input.moveDir.copy(toTarget.normalize());
    }
  }

  if (input.moveDir.lengthSq() > 0) {
    input.moveDir.normalize();
    pos.x += input.moveDir.x * speed * dt;
    pos.z += input.moveDir.z * speed * dt;

    // 角色面向移动方向
    const angle = Math.atan2(input.moveDir.x, input.moveDir.z);
    playerGroup.rotation.y += (angle - playerGroup.rotation.y) * 0.15;

    // 走路颠簸
    const bob = Math.sin(Date.now() * 0.012) * 0.04;
    playerGroup.position.y = bob;
    // 手杖摆动
    staff.rotation.z = -0.25 + Math.sin(Date.now() * 0.015) * 0.12;
  } else {
    // 站立时的呼吸浮动
    const breathe = Math.sin(Date.now() * 0.002) * 0.015;
    playerGroup.position.y = breathe;
  }

  // 更新摄像机 → 平滑跟随玩家
  const targetCamPos = new THREE.Vector3(
    Math.sin(input.camPhi) * Math.cos(input.camTheta) * input.camDist,
    Math.cos(input.camPhi) * input.camDist,
    Math.sin(input.camPhi) * Math.sin(input.camTheta) * input.camDist
  ).add(pos).add(new THREE.Vector3(0, 0.8, 0));

  camera.position.lerp(targetCamPos, 0.08);
  camera.lookAt(pos.x, pos.y + 0.8, pos.z);
}

// ═══════════════════════════════════════════════
//  ANIMATION LOOP
// ═══════════════════════════════════════════════
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();
  const dt = Math.min(clock.getDelta(), 0.1);  // cap delta for tab-away

  // 玩家
  updatePlayer(dt);

  // 火焰
  const fs = 0.82 + Math.sin(t * 6) * 0.07 + Math.sin(t * 13) * 0.05;
  flame.scale.setScalar(fs);
  flameMat.emissiveIntensity = 0.8 + Math.sin(t * 8) * 0.35;
  fireLight.intensity = 5.5 + Math.sin(t * 7) * 1.8 + Math.sin(t * 11) * 1.0;

  // NPC
  npcGroup.position.y = Math.sin(t * 1.3) * 0.22;
  halo.rotation.z += 0.006;
  halo.scale.setScalar(1 + Math.sin(t * 2.5) * 0.05);
  glowDisc.material.opacity = 0.16 + Math.sin(t * 1.8) * 0.06;

  // 萤火虫
  const fp = fireflies.geometry.attributes.position.array;
  for (let i = 0; i < ffCount; i++) {
    fp[i * 3 + 1] = ffData[i].by + Math.sin(t * ffData[i].sp + ffData[i].ph) * ffData[i].amp;
  }
  fireflies.geometry.attributes.position.needsUpdate = true;

  // 火星
  const sp = sparks.geometry.attributes.position.array;
  for (let i = 0; i < spCount; i++) {
    spData[i].life += dt;
    sp[i * 3 + 1] = 0.25 + spData[i].life * spData[i].sp;
    if (spData[i].life > spData[i].maxL) {
      spData[i].life = 0;
      sp[i * 3] = (Math.random() - 0.5) * 0.35;
      sp[i * 3 + 1] = 0.25;
      sp[i * 3 + 2] = (Math.random() - 0.5) * 0.35;
    }
  }
  sparks.geometry.attributes.position.needsUpdate = true;

  // 山顶光柱呼吸
  summitGlow.material.emissiveIntensity = 0.8 + Math.sin(t * 1.2) * 0.35;

  // 旗帜飘动
  campFlags.forEach((f, i) => {
    f.rotation.z = Math.sin(t * 2 + i) * 0.2;
  });

  renderer.render(scene, camera);
  updateHUD();
}

// ═══════════════════════════════════════════════
//  HUD
// ═══════════════════════════════════════════════
function updateHUD() {
  if (input.targetPos) {
    $hudHint.innerHTML = '🏃 正在前往目的地...';
  } else if (input.moveDir.lengthSq() > 0.01) {
    $hudHint.innerHTML = '⌨ WASD 移动 &nbsp;|&nbsp; 🖱 拖拽旋转 &nbsp;|&nbsp; 滚轮缩放 &nbsp;|&nbsp; 点击地面移动 &nbsp;|&nbsp; 点击 NPC 对话';
  }
}

// ═══════════════════════════════════════════════
//  RESIZE
// ═══════════════════════════════════════════════
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// ═══════════════════════════════════════════════
//  START
// ═══════════════════════════════════════════════
animate();

console.log('🏮 MindForge · 溪谷世界已加载');
console.log('   🏃 WASD 移动 | 🖱 拖拽旋转 | 🖱 点击地面移动 | 🖱 点击 NPC 对话');
console.log('   🏘  四栋小屋 | 🌲 松林 | 🔥 篝火 | 🏔️ 远山 (长期目标)');
console.log('   ⚡ 萤火虫 80 → 火星 20 → Shadow 1K → AA off → 全面优化');
