// ======================================================
// AR EDUKASI JENIS-JENIS IKAN (MULTI MARKER + MULTI MODEL)
// ======================================================

// === GLOBAL STATE ===
let scene, camera, renderer, arSource = null, arContext;
let activeEntry = null;
let isDragging = false;
let prevMouse = { x: 0, y: 0 };

// === UI ===
const slider = document.getElementById("scaleSlider");
const scaleValue = document.getElementById("scaleValue");
const resetBtn = document.getElementById("resetButton");
const fishName = document.getElementById("fishName");
const fishDesc = document.getElementById("fishDesc");

// tombol sumbu
const toggleBtn = document.createElement("button");
toggleBtn.textContent = "👁️ Tampilkan Sumbu";
toggleBtn.className = "toggle-gizmo";
document.body.appendChild(toggleBtn);

// === DATA IKAN ===
const fishes = [
  {
    pattern: "pattern-koi.patt",
    model: "koi.glb",
    name: "Ikan Koi",
    desc: `Ikan koi berasal dari Jepang dan merupakan hasil budidaya dari ikan mas.

Saat ini koi telah menyebar ke berbagai negara dan banyak dipelihara di kolam air tawar sebagai ikan hias.

Koi termasuk ikan yang jinak dan mudah beradaptasi dengan lingkungan kolam.

Jenis makanan:

Pelet ikan

Serangga kecil

Alga

Tumbuhan air.`
  },
  {
    pattern: "pattern-barramundi.patt",
    model: "barramundi.glb",
    name: "Barramundi",
    desc: `Ikan barramundi banyak ditemukan di wilayah Indo-Pasifik, terutama di Asia Tenggara, Australia, Papua Nugini, dan perairan sekitar Indonesia.

Ikan ini unik karena mampu hidup di air tawar, payau, dan laut, seperti sungai, muara, dan pesisir pantai.

Barramundi adalah ikan predator yang hidup di perairan muara dan pesisir.

Jenis makanan:
- Ikan kecil
- Udang
- Kepiting
- Organisme air berukuran kecil lainnya.`

  },
  {
    pattern: "pattern-hiu.patt",
    model: "hiu.glb",
    name: "Hiu",
    desc: `Ikan hiu tersebar luas di seluruh lautan dunia, terutama di perairan tropis dan subtropis.

Sebagian besar hiu hidup di laut lepas, namun beberapa spesies juga dapat ditemukan di perairan dangkal dan dekat pesisir.

Hiu merupakan predator puncak yang berperan penting dalam menjaga keseimbangan ekosistem laut.

Jenis makanan:

Ikan

Cumi-cumi

Penyu laut

Mamalia laut tertentu.`
  },
  {
    pattern: "pattern-salmon.patt",
    model: "salmon.glb",
    name: "Salmon",
    desc: `Ikan salmon hidup di perairan dingin di Samudra Atlantik dan Samudra Pasifik, terutama di wilayah Amerika Utara, Eropa, dan Asia Utara.

Salmon memiliki sifat anadromous, yaitu hidup di laut dan bermigrasi ke sungai air tawar untuk berkembang biak.

Salmon merupakan ikan predator yang aktif berenang di perairan laut terbuka.

Jenis makanan:

Zooplankton (saat muda)

Ikan kecil

Udang

Krustasea lainnya.`
  },
  {
    pattern: "pattern-piranha.patt",
    model: "piranha.glb",
    name: "Piranha",
    desc: `Ikan piranha berasal dari perairan air tawar Amerika Selatan, khususnya Sungai Amazon, Orinoco, dan Paraná.

Ikan ini hidup di sungai, danau, serta rawa dengan arus yang relatif tenang.

Piranha dikenal sebagai ikan pemangsa dengan gigi tajam dan perilaku agresif.

Jenis makanan:

Ikan kecil

Serangga air

Bangkai hewan

Tumbuhan air tertentu.`
  }
];

// === SCENE ===
scene = new THREE.Scene();
camera = new THREE.Camera();
scene.add(camera);

// === RENDERER ===
renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000, 0);
document.body.appendChild(renderer.domElement);

// === AR CONTEXT (SIAP DARI AWAL) ===
arContext = new THREEx.ArToolkitContext({
  cameraParametersUrl: "camera_para.dat",
  detectionMode: "mono"
});

arContext.init(() => {
  camera.projectionMatrix.copy(arContext.getProjectionMatrix());
});

// === LIGHT ===
scene.add(new THREE.AmbientLight(0xffffff, 1.2));
const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(1, 2, 1);
scene.add(dirLight);

// === GIZMO ===
function createRotationGizmo(radius = 1.2, tube = 0.006) {
  const g = new THREE.Group();
  const make = (color, rot) => {
    const t = new THREE.Mesh(
      new THREE.TorusGeometry(radius, tube, 8, 100),
      new THREE.MeshBasicMaterial({ color })
    );
    if (rot) t.rotation.copy(rot);
    return t;
  };
  g.add(make(0xff0000, new THREE.Euler(0, Math.PI / 2, 0)));
  g.add(make(0x00ff00));
  g.add(make(0x0000ff, new THREE.Euler(Math.PI / 2, 0, 0)));
  return g;
}

// === LOAD MARKER & MODEL ===
const loader = new THREE.GLTFLoader();
const markerEntries = [];

fishes.forEach(fish => {
  const markerRoot = new THREE.Group();
  markerRoot.visible = false;
  scene.add(markerRoot);

  new THREEx.ArMarkerControls(arContext, markerRoot, {
    type: "pattern",
    patternUrl: fish.pattern
  });

  loader.load(fish.model, gltf => {
    const model = gltf.scene;
    model.scale.set(0.5, 0.5, 0.5);
    model.position.y = 0.5;
    model.visible = false;

    const gizmo = createRotationGizmo();
    gizmo.visible = false;
    model.add(gizmo);

    markerRoot.add(model);

    markerEntries.push({ markerRoot, model, gizmo, fish });
  });
});

// === START AR (DARI LANDING PAGE) ===
function startAR() {
  if (arSource) return; // cegah double start

  arSource = new THREEx.ArToolkitSource({ sourceType: "webcam" });
  arSource.init(() => setTimeout(onResize, 500));
}

function onResize() {
  if (!arSource) return;
  arSource.onResizeElement();
  arSource.copyElementSizeTo(renderer.domElement);
  if (arContext.arController) {
    arSource.copyElementSizeTo(arContext.arController.canvas);
  }
}
window.addEventListener("resize", onResize);

// === EVENT BUTTON (DI LUAR ANIMATE!) ===
document.getElementById("startAR").onclick = () => {
  document.getElementById("landingPage").style.display = "none";
  document.getElementById("sliderContainer").style.display = "flex";
  document.getElementById("infoPanel").style.display = "block";
  startAR();
};

// === MOUSE ROTATE ===
renderer.domElement.onmousedown = e => {
  if (!activeEntry) return;
  isDragging = true;
  prevMouse = { x: e.clientX, y: e.clientY };
};

renderer.domElement.onmouseup = () => (isDragging = false);

renderer.domElement.onmousemove = e => {
  if (!isDragging || !activeEntry) return;
  const m = activeEntry.model;
  m.rotation.y += (e.clientX - prevMouse.x) * 0.01;
  m.rotation.x += (e.clientY - prevMouse.y) * 0.01;
  prevMouse = { x: e.clientX, y: e.clientY };
};

// === UI ===
slider.oninput = () => {
  if (!activeEntry) return;
  const s = parseFloat(slider.value);
  scaleValue.textContent = s.toFixed(1);
  activeEntry.model.scale.set(s, s, s);
};

resetBtn.onclick = () => {
  if (!activeEntry) return;
  activeEntry.model.scale.set(0.5, 0.5, 0.5);
  slider.value = 0.5;
  scaleValue.textContent = "0.5";
};

toggleBtn.onclick = () => {
  if (!activeEntry) return;
  activeEntry.gizmo.visible = !activeEntry.gizmo.visible;
  toggleBtn.textContent = activeEntry.gizmo.visible
    ? "🙈 Sembunyikan Sumbu"
    : "👁️ Tampilkan Sumbu";
};

// === ANIMATE ===
function animate() {
  requestAnimationFrame(animate);

  if (arSource && arSource.ready) {
    arContext.update(arSource.domElement);
  }

  let anyVisible = false;

  markerEntries.forEach(e => {
    if (e.markerRoot.visible) {
      e.model.visible = true;
      activeEntry = e;
      fishName.innerText = e.fish.name;
      fishDesc.innerText = e.fish.desc;
      anyVisible = true;
    } else {
      e.model.visible = false;
    }
  });

  if (!anyVisible) {
    activeEntry = null;
    fishName.innerText = "Arahkan kamera ke marker";
    fishDesc.innerText = "Informasi ikan akan muncul di sini";
  }
  document.getElementById("startAR").onclick = () => {
  document.getElementById("landingPage").style.display = "none";
  startAR();

  document.getElementById("sliderContainer").style.display = "flex";
  document.getElementById("infoPanel").style.display = "block";
};


  renderer.render(scene, camera);
}

animate();
