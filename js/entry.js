/* 진입 연출: 프리렌더 프레임을 문서 스크롤에 매핑해 재생
   모네100(interlude.js)에서 가져온 것: 번호 webp, fetch→blob→createImageBitmap, 앞쪽 선로딩 창, 창 밖 bitmap.close(),
   없는 프레임은 가까운 이전 프레임으로 대체, DPR 최대 2, cover 그리기.
   바꾼 것: 휠 입력 누적 대신 문서 스크롤 위치(고객 요구: 모션을 거치지 않고도 CTA 가능), 입장 버튼·로딩 대기 없음. */
(() => {
  const stage = document.getElementById('entry');
  const canvas = document.getElementById('entryCanvas');
  const poster = document.getElementById('entryPoster');
  if (!stage || !canvas) return;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ctx = canvas.getContext('2d', { alpha: false });
  const dir = () => (innerHeight > innerWidth ? 'v' : 'h');
  const FRAMES = (() => { const m = location.search.match(/[?&]frames=([a-z0-9-]+)/); return m ? `assets/frames-${m[1]}` : 'assets/frames'; })();  // ?frames=blender 로 비교용 세트 전환
  const src = (set, i) => `${FRAMES}/${set}/${String(i + 1).padStart(3, '0')}.webp`;

  let set = dir(), count = 0, manifest = null;
  const blobs = new Map();     // i → Blob (압축본, 전부 보관: 5~6MB)
  const bitmaps = new Map();   // i → ImageBitmap (디코드본, 현재 위치 ±WIN만 보관)
  const pending = new Set();
  const urgent = new Set();    // 현재 위치 근처라 순서를 앞당겨 받는 중인 프레임
  const WIN = 16, AHEAD = 10;

  let target = 0, shown = -1, cur = 0, raf = 0, dpr = 1;

  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(innerWidth * dpr);
    canvas.height = Math.round(innerHeight * dpr);
    const d = dir();
    if (d !== set && manifest) { set = d; count = manifest[set].count; blobs.clear(); for (const b of bitmaps.values()) b.close(); bitmaps.clear(); pending.clear(); shown = -1; fetchAll(); }
    shown = -1; // 다음 프레임에서 다시 그림
  }

  const inflight = new Set();
  async function fetchOne(i) {
    if (blobs.has(i) || i < 0 || i >= count || inflight.has(i)) return;
    inflight.add(i);
    try { const r = await fetch(src(set, i)); if (r.ok) blobs.set(i, await r.blob()); } catch {} finally { inflight.delete(i); }
  }
  // 1) 처음 12장을 먼저, 2) 나머지는 순서대로 뒤에서 조용히 (한 번에 4개)
  async function fetchAll() {
    await Promise.all(Array.from({ length: Math.min(12, count) }, (_, i) => fetchOne(i)));
    stage.classList.add('is-ready');
    let i = 12;
    const worker = async () => { while (i < count) { const k = i++; await fetchOne(k); } };
    await Promise.all([worker(), worker(), worker(), worker()]);
  }

  function decodeWindow(center) {
    const lo = Math.max(0, center - 4), hi = Math.min(count - 1, center + AHEAD);
    for (let i = lo; i <= hi; i++) {
      if (!blobs.has(i)) { if (!urgent.has(i)) { urgent.add(i); fetchOne(i).finally(() => urgent.delete(i)); } continue; }  // 순차 로딩보다 앞서 현재 위치부터 받는다
      if (bitmaps.has(i) || pending.has(i)) continue;
      pending.add(i);
      createImageBitmap(blobs.get(i)).then(b => { bitmaps.set(i, b); }).catch(() => {}).finally(() => pending.delete(i));
    }
    for (const [i, b] of bitmaps) if (i < center - WIN || i > center + WIN) { b.close(); bitmaps.delete(i); }
  }

  function nearest(i) {
    if (bitmaps.has(i)) return bitmaps.get(i);
    for (let d = 1; d <= 8; d++) { if (bitmaps.has(i - d)) return bitmaps.get(i - d); if (bitmaps.has(i + d)) return bitmaps.get(i + d); }
    return null;
  }

  function draw(i) {
    const b = nearest(i);
    if (!b) return false;
    const s = Math.max(canvas.width / b.width, canvas.height / b.height);
    const w = b.width * s, h = b.height * s;
    ctx.drawImage(b, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
    return true;
  }

  // 스크롤 위치 → 진행률. stage는 position:sticky 부모(.entry-track) 안에서 고정된다.
  function progress() {
    const track = stage.parentElement;
    const r = track.getBoundingClientRect();
    const total = track.offsetHeight - innerHeight;
    return Math.max(0, Math.min(1, -r.top / Math.max(1, total)));
  }

  const debug = /[?&]debug=1/.test(location.search) ? Object.assign(document.createElement('pre'), { style: 'position:fixed;left:8px;top:64px;z-index:99;background:rgba(0,0,0,.6);color:#0f0;font:11px/1.4 monospace;padding:6px 8px;margin:0;pointer-events:none' }) : null;
  if (debug) document.body.append(debug);

  let last = 0, lastTick = 0, ticks = 0;
  function step(now = performance.now()) {
    const dt = Math.min(0.1, (now - (last || now)) / 1000); last = now; lastTick = now; ticks++;
    const p = progress();
    target = p * (count - 1);
    // 시간 기준 감쇠: 프레임 속도가 떨어져도 같은 속도로 따라감. 모션 축소 설정이면 감쇠 없이 바로 맞춤
    cur = reduced ? target : cur + (target - cur) * (1 - Math.exp(-dt * 14));
    const i = Math.round(cur);
    decodeWindow(Math.round(target));
    if (i !== shown) { if (draw(i)) { shown = i; if (poster) poster.classList.add('is-hidden'); } }
    stage.style.setProperty('--p', p.toFixed(4));
    stage.dataset.chapter = p < 0.3 ? '1' : p < 0.72 ? '2' : '3';
    stage.classList.toggle('is-end', p > 0.98);
    if (debug) debug.textContent = `p ${p.toFixed(3)}  frame ${i}/${count - 1}  shown ${shown}  blobs ${blobs.size}  bitmaps ${bitmaps.size}  ticks ${ticks}  ${set}`;
  }
  function tick(now) { step(now); raf = requestAnimationFrame(tick); }

  async function init() {
    try { manifest = await (await fetch(`${FRAMES}/manifest.json`)).json(); } catch { manifest = null; }
    if (!manifest) { stage.classList.add('is-static'); return; }   // 프레임 없음 → 포스터만
    if (reduced) stage.classList.add('is-reduced');                 // 모션 축소: 그레인·힌트만 끄고 스크롤 연동은 유지
    count = manifest[set].count;
    resize();
    addEventListener('resize', resize, { passive: true });
    fetchAll();
    raf = requestAnimationFrame(tick);
    // rAF가 멈추거나 느려진 환경(숨은 탭, 절전 모드)에서도 스크롤에는 바로 반응
    addEventListener('scroll', () => { if (performance.now() - lastTick > 90) step(); }, { passive: true });
    setInterval(() => { if (performance.now() - lastTick > 300) step(); }, 250);
  }
  init();
  // 검증용 훅: tick을 직접 돌려 볼 수 있게 한다
  window.__entry = { tick: (t) => step(t ?? performance.now()), state: () => ({ set, count, cur, target, shown, blobs: blobs.size, bitmaps: bitmaps.size, ticks }) };

  // 사운드: 파일이 있을 때만 버튼 노출, 기본은 꺼짐(브라우저 자동재생 제한)
  const snd = document.getElementById('sndBtn');
  if (snd) {
    const a = new Audio(); a.loop = true; a.volume = 0.45; a.preload = 'none';
    a.src = 'assets/audio/ambience.mp3';
    fetch(a.src, { method: 'HEAD' }).then(r => { if (r.ok) snd.hidden = false; }).catch(() => {});
    snd.addEventListener('click', () => {
      if (a.paused) { a.play().then(() => { snd.dataset.on = '1'; snd.textContent = '소리 끄기'; }).catch(() => {}); }
      else { a.pause(); snd.dataset.on = ''; snd.textContent = '소리 켜기'; }
    });
  }
})();
