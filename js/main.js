/* 섹션 동작: 맞춤 제안 폼(후보 추천 → 없으면 운영자 매칭), 로그인 모의, QR 생성, 토스트 */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const toast = $('#toast');
  const say = (m) => { toast.textContent = m; toast.classList.add('is-on'); clearTimeout(say.t); say.t = setTimeout(() => toast.classList.remove('is-on'), 2600); };

  // 데모용 등록 데이터 (실서비스는 DB). 베타 초기라 지역이 몇 곳뿐이라는 전제를 그대로 둔다.
  const SPACES = [
    { name: '골목 끝 카페', region: '경기 양주시', cond: ['wall', 'light'], img: 'assets/img/space-1.webp', note: '빈 벽 6m · 레일 조명 · 주말 운영' },
    { name: '꽃집 카페 모퉁이', region: '서울 마포구', cond: ['shelf', 'window'], img: 'assets/img/space-2.webp', note: '벽돌 벽 + 선반 · 소품 전시 적합' },
    { name: '동네 베이커리', region: '서울 마포구', cond: ['window'], img: 'assets/img/case-2.webp', note: '창가 줄 설치 · 오전 손님 많음' },
  ];
  const ARTISTS = [
    { name: '김하늘', region: '경기 양주시', cond: ['wall'], genre: '회화', img: 'assets/img/art-1.webp', note: '유화 소품 8점 · 액자 완비' },
    { name: '박도윤', region: '서울 마포구', cond: ['window', 'shelf'], genre: '일러스트', img: 'assets/img/art-2.webp', note: '과슈 원화 12점 · 집게 설치 가능' },
    { name: '이서연', region: '서울 성동구', cond: ['wall', 'shelf'], genre: '드로잉', img: 'assets/img/art-3.webp', note: '수채 드로잉 10점 세트' },
  ];

  const form = $('#matchForm'); if (!form) return;
  const result = $('#result');
  let role = 'artist';

  const setRole = (r) => {
    role = r;
    form.querySelectorAll('.seg button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.role === r)));
    form.querySelectorAll('[data-for]').forEach(f => { f.hidden = f.dataset.for !== r; });
    $('#condHint').textContent = r === 'artist' ? '(작품을 어떻게 설치할 수 있나요)' : '(공간에서 가능한 설치 방식)';
    result.classList.remove('is-on');
  };
  form.querySelectorAll('.seg button').forEach(b => b.addEventListener('click', () => setRole(b.dataset.role)));
  document.querySelectorAll('a[data-role]').forEach(a => a.addEventListener('click', () => setRole(a.dataset.role)));

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const region = $('#region').value;
    const month = $('#month').value;
    const cond = [...form.querySelectorAll('input[name=cond]:checked')].map(i => i.value);
    if (!region) { say('지역을 선택해 주세요'); $('#region').focus(); return; }
    const pool = role === 'artist' ? SPACES : ARTISTS;           // 작가는 공간을, 공간주는 작가를 찾는다
    const hits = pool.filter(p => p.region === region && (cond.length === 0 || cond.some(c => p.cond.includes(c))));
    const summary = `${region} · ${month ? month.replace('-', '년 ') + '월' : '일정 미정'} · ${cond.length ? cond.length + '개 조건' : '조건 무관'}`;
    const who = role === 'artist' ? '공간' : '작가';
    const whoS = role === 'artist' ? '공간이' : '작가가';
    const unit = role === 'artist' ? '곳' : '명';
    let html = `<p class="eyebrow">결과 · ${summary}</p>`;
    if (hits.length) {
      html += `<p>조건에 맞는 ${who} <b>${hits.length}${unit}</b>을 찾았어요. 로그인하면 연락처와 자세한 조건을 볼 수 있어요.</p><div class="cands">` +
        hits.map(h => `<div class="cand"><img src="${h.img}" alt=""><div><b>${h.name}</b><span>${h.region} · ${h.note}</span></div></div>`).join('') + `</div>`;
    } else {
      html += `<div class="empty"><b>아직 ${region}에 등록된 ${whoS} 없어요.</b><p style="margin:8px 0 0;color:var(--ink-2)">입력하신 조건(${summary}) 그대로 운영자가 직접 찾아 연결해 드릴게요. 보통 3일 안에 연락드립니다.</p></div>`;
    }
    html += `<div class="login"><button type="button" data-login="google"><svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.6 2.5 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.3l7.8 6C12.3 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z"/><path fill="#FBBC05" d="M10.4 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7l-7.8-6A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.7l7.8-6z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.7-4.1-13.6-9.9l-7.8 6C6.5 42.6 14.6 48 24 48z"/></svg>Google로 계속</button>` +
      `<button type="button" class="kakao" data-login="kakao">카카오로 계속</button></div>` +
      `<div class="done" id="done" hidden></div>`;
    result.innerHTML = html; result.classList.add('is-on');
    result.querySelectorAll('[data-login]').forEach(b => b.addEventListener('click', () => {
      const d = $('#done'); d.hidden = false;
      d.innerHTML = hits.length
        ? `<b>로그인 완료(데모)</b> · 후보 ${hits.length}${unit}의 연락처가 열렸어요. 실서비스에서는 여기서 바로 메시지를 보냅니다.`
        : `<b>운영자 매칭 요청이 접수됐어요(데모).</b> 접수 번호 AH-${String(Date.now()).slice(-6)} · 조건: ${summary}`;
      say(`${b.dataset.login === 'kakao' ? '카카오' : 'Google'} 로그인은 데모에서 생략됩니다`);
      d.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }));
    result.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });

  // QR: 전시 통합 / 작품별 (qrcodejs). 주소는 현재 페이지 기준 상대 경로.
  if (window.QRCode) {
    const base = location.href.replace(/[^/]*$/, '');
    const make = (id, url) => { const d = document.createElement('div'); new QRCode(d, { text: url, width: 240, height: 240, correctLevel: QRCode.CorrectLevel.M });
      setTimeout(() => { const c = d.querySelector('canvas'); const im = $('#' + id); if (c && im) im.src = c.toDataURL(); }, 50); };
    make('qrAll', base + 'docent.html');
    make('qrOne', base + 'docent.html?w=1');
  }
})();
