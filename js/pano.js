/* 어라운드 뷰: 진입 연출이 끝나는 지점(p≥0.985)에서 Blender 등거리 파노라마(assets/pano/room.webp)를 three.js 구체에 입혀
   마우스 이동·드래그·터치로 좌우상하를 둘러본다. 프레임 마지막 장과 같은 위치·시야각에서 시작해 자연스럽게 이어진다. */
(() => {
  const stage = document.getElementById('entry');
  const host = document.getElementById('pano');
  if (!stage || !host || !window.THREE) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FRAMES = (() => { const m = location.search.match(/[?&]frames=([a-z0-9-]+)/); return m ? m[1] : ''; })();
  const PANO = 'assets/pano/room.webp';

  let renderer, scene, camera, mesh, ready = false, active = false, loading = false;
  let lon = 180, lat = 0, tLon = 180, tLat = 0;      // 텍스처 중앙(-x) = 실내 안쪽 방향
  let dragging = false, px = 0, py = 0, hoverX = 0, hoverY = 0, idleT = 0;

  function vfov() {  // 진입 카메라와 같은 화각: 가로는 24mm(가로 73.7°), 세로는 20mm(세로 61.9°)
    const a = innerWidth / innerHeight;
    if (a < 1) return 61.9;
    const h = THREE.MathUtils.degToRad(73.7);
    return THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(h / 2) / a));
  }
  function build() {
    renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
    renderer.setSize(innerWidth, innerHeight); host.append(renderer.domElement);
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(vfov(), innerWidth / innerHeight, 0.1, 200);
    const geo = new THREE.SphereGeometry(60, 64, 40); geo.scale(-1, 1, 1);
    new THREE.TextureLoader().load(PANO, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace; tex.minFilter = THREE.LinearFilter; tex.generateMipmaps = false;
      mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex })); scene.add(mesh); ready = true;
      stage.classList.add('has-pano');
    }, undefined, () => { loading = false; });
    addEventListener('resize', () => { if (!renderer) return; renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.fov = vfov(); camera.updateProjectionMatrix(); }, { passive: true });
    // 입력
    const down = (x, y) => { dragging = true; px = x; py = y; host.classList.add('is-drag'); };
    const move = (x, y) => { if (!dragging) return; tLon -= (x - px) * 0.18; tLat += (y - py) * 0.14; px = x; py = y; };
    const up = () => { dragging = false; host.classList.remove('is-drag'); };
    host.addEventListener('pointerdown', e => { if (!active) return; down(e.clientX, e.clientY); host.setPointerCapture?.(e.pointerId); });
    host.addEventListener('pointermove', e => { if (!active) return; if (dragging) move(e.clientX, e.clientY); else if (e.pointerType === 'mouse') { hoverX = (e.clientX / innerWidth - 0.5) * 2; hoverY = (e.clientY / innerHeight - 0.5) * 2; } });
    addEventListener('pointerup', up); addEventListener('pointercancel', up);
  }
  window.__pano = { step: () => tick(0, true), state: () => ({ ready, active, loading, lon: Math.round(lon), lat: Math.round(lat) }) };
  function tick(now, manual) {
    if (!manual) requestAnimationFrame(tick);
    const p = parseFloat(stage.style.getPropertyValue('--p') || '0');
    if (!loading && p > 0.6) { loading = true; build(); }             // 마지막 구간 전에 미리 로드
    const want = ready && p >= 0.985;
    if (want !== active) { active = want; host.classList.toggle('is-on', active); if (active) { tLon = lon = 180; tLat = lat = 0; } }
    if (!active || !renderer) return;
    idleT += 0.016;
    const sway = reduced ? 0 : Math.sin(idleT * 0.35) * 1.2;      // 가만히 있을 때 아주 느린 흔들림
    const hx = dragging ? 0 : hoverX * 7, hy = dragging ? 0 : hoverY * 4;   // 마우스 위치 틸트(파스쿠아 방식)
    tLat = Math.max(-38, Math.min(38, tLat));
    lon += (tLon + hx + sway - lon) * 0.08; lat += (tLat - hy - lat) * 0.08;
    const phi = THREE.MathUtils.degToRad(90 - lat), theta = THREE.MathUtils.degToRad(lon);
    camera.lookAt(Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta));
    renderer.render(scene, camera);
  }
  if (!FRAMES) requestAnimationFrame(tick);   // 파노라마는 기본(Blender v2) 세트의 실내와만 이어진다. 비교용 ?frames= 세트에서는 끔
})();
