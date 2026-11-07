/* 어라운드 뷰: 진입 연출이 끝나는 지점(p≥0.985)에서 Blender 등거리 파노라마(assets/pano/room.webp)를 three.js 구체에 입혀
   마우스 이동·드래그·터치로 좌우상하를 둘러본다. 프레임 마지막 장과 같은 위치·시야각에서 시작해 자연스럽게 이어진다.
   켜지는 순간 스크롤을 한 번 멈춰(is-lock) 둘러볼 수 있게 하고, 잠시 뒤 계속 스크롤·방향키·'계속 보기'·위로 쓸어올리기면 아래 섹션으로 넘어간다. */
(() => {
  const stage = document.getElementById('entry');
  const host = document.getElementById('pano');
  if (!stage || !host || !window.THREE) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FRAMES = (() => { const m = location.search.match(/[?&]frames=([a-z0-9-]+)/); return m ? m[1] : ''; })();
  const PANO = 'assets/pano/room.webp';
  const track = stage.parentElement, next = document.getElementById('panoNext');

  let renderer, scene, camera, mesh, ready = false, active = false, loading = false;
  let lon = 180, lat = 0, tLon = 180, tLat = 0;      // 텍스처 중앙(-x) = 실내 안쪽 방향
  let dragging = false, px = 0, py = 0, sx = 0, sy = 0, st = 0, hoverX = 0, hoverY = 0, idleT = 0;
  let locked = false, lockT = 0, acc = 0, seen = false, quietTimer = 0;

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
    const down = (x, y) => { dragging = true; px = sx = x; py = sy = y; st = performance.now(); host.classList.add('is-drag'); };
    const move = (x, y) => { if (!dragging) return; tLon -= (x - px) * 0.18; tLat += (y - py) * 0.14; px = x; py = y; };
    const up = (e) => {
      if (!dragging) return; dragging = false; host.classList.remove('is-drag');
      // 터치: 잠긴 동안 위로 빠르게 쓸어올리면 '계속 보기'와 같다
      if (locked && e && e.pointerType === 'touch' && settled() && sy - py > 90 && performance.now() - st < 400) unlock(1);
    };
    host.addEventListener('pointerdown', e => { if (!active) return; down(e.clientX, e.clientY); host.setPointerCapture?.(e.pointerId); });
    host.addEventListener('pointermove', e => { if (!active) return; if (dragging) move(e.clientX, e.clientY); else if (e.pointerType === 'mouse') { hoverX = (e.clientX / innerWidth - 0.5) * 2; hoverY = (e.clientY / innerHeight - 0.5) * 2; } });
    addEventListener('pointerup', up); addEventListener('pointercancel', up);
  }

  // 멈춤 구간
  const endY = () => track.offsetTop + track.offsetHeight - innerHeight;   // 끝 프레임(p=1)에 맞는 스크롤 위치
  const settled = () => performance.now() - lockT > 700;                   // 켜진 직후의 관성 입력은 무시
  function lock() {
    locked = true; seen = true; lockT = performance.now(); acc = 0;
    scrollTo(0, endY());
    host.classList.add('is-lock'); host.classList.remove('is-quiet');
    clearTimeout(quietTimer); quietTimer = setTimeout(() => host.classList.add('is-quiet'), 6000);
    if (!reduced) { tLon = 173; setTimeout(() => { if (locked) tLon = 187; }, 700); setTimeout(() => { if (locked) tLon = 180; }, 1500); }  // 둘러볼 수 있다는 한 번의 흔들림
  }
  function unlock(dir) {
    if (!locked) return; locked = false; host.classList.remove('is-lock');
    if (dir > 0) track.nextElementSibling?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
  }
  addEventListener('wheel', e => {
    if (!locked) return; e.preventDefault();
    if (!settled()) return;
    if (e.deltaY < 0) return unlock(-1);
    acc += e.deltaY; if (acc > 160) unlock(1);
  }, { passive: false });
  addEventListener('touchmove', e => { if (locked) e.preventDefault(); }, { passive: false });
  addEventListener('keydown', e => {
    if (!locked) return;
    if (['ArrowDown', 'PageDown', ' ', 'End'].includes(e.key)) { e.preventDefault(); if (settled()) unlock(1); }
    else if (['ArrowUp', 'PageUp', 'Home'].includes(e.key)) { e.preventDefault(); unlock(-1); }
  });
  next?.addEventListener('click', () => unlock(1));

  window.__pano = { step: () => tick(0, true), unlock, state: () => ({ ready, active, loading, locked, lon: Math.round(lon), lat: Math.round(lat) }) };
  function tick(now, manual) {
    if (!manual) requestAnimationFrame(tick);
    const p = parseFloat(stage.style.getPropertyValue('--p') || '0');
    if (!loading && p > 0.6) { loading = true; build(); }             // 마지막 구간 전에 미리 로드
    if (p < 0.6) seen = false;                                        // 위로 되돌아가면 다음에 다시 멈춘다
    const want = ready && p >= 0.985;
    if (want !== active) { active = want; host.classList.toggle('is-on', active); if (active) { tLon = lon = 180; tLat = lat = 0; if (!seen) lock(); } }
    if (locked) {
      const y = endY(), t = performance.now() - lockT;
      if (t < 1200) { if (Math.abs(scrollY - y) > 1) scrollTo(0, y); }  // 관성 스크롤이 끝 지점을 지나치지 않게 잡아 둔다
      else if (scrollY > y + 40 || p < 0.97) unlock(0);               // 스크롤바 등으로 직접 움직였으면 풀어 준다
    }
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
