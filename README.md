# 아트한스푼 MVP (시안)

숨고 가브리엘 의뢰(채팅 240977429) 대응용 시안. 2026-11-07 제작.
정적 사이트라 아무 웹서버에서나 열린다: `python -I -m http.server 8794 --directory .` 후 http://localhost:8794

## 구성

| 파일 | 역할 |
|---|---|
| `index.html` | 한 페이지. 진입 연출 → 소개 → 진행 단계 → 전시 사례 → 작가 → 공간 → 맞춤 제안 폼 → QR 도슨트 → 푸터 |
| `docent.html` | QR이 여는 공개 도슨트 페이지. `?w=1` 작품별, 없으면 전시 통합 |
| `js/entry.js` | 프레임 스크롤 재생 (모네100 interlude.js 방식 이식) |
| `js/main.js` | 맞춤 제안 폼·후보 추천·운영자 매칭 요청·로그인 모의·QR 생성 |
| `css/style.css` | 톤: 어두운 갈색·앰버·크림. Noto Serif KR + Pretendard |
| `assets/frames/{h,v}/NNN.webp` | 진입 프레임(Blender v2 Cycles 렌더). 가로 1152×648 161장 3.3MB, 세로 648×1152 161장 2.5MB (16fps, webp q72) |
| `assets/frames/manifest.json` | 프레임 수·규격. 없으면 포스터만 보이는 정적 모드 |
| `assets/frames-kling/`, `assets/frames-blender/` | 비교용 이전 세트(Kling 생성 영상 / Blender v1+Kling 보정). `?frames=kling`, `?frames=blender`로 전환. 파노라마는 기본 세트에서만 켜짐 |
| `assets/img/door-{h,v}.webp` | 포스터 = 기본 세트 1번 프레임. `door-*-kling.webp`는 이전 포스터 |
| `assets/img/*.webp` | 섹션 이미지(Sunra 생성, 시안용) |
| `assets/src/` | 원본 PNG·MP4 (Sunra 결과). 배포에는 불필요 |
| `scripts/frames.sh` | 영상 → 프레임 재추출: `bash scripts/frames.sh 가로.mp4 세로.mp4 16 72` ('-'면 그 세트 유지) |
| `js/pano.js` + `assets/pano/room.webp` | 진입 끝(p≥0.985)에서 켜지는 어라운드 뷰. Blender 등거리 파노라마를 three.js 구체에 입혀 마우스 이동·드래그·터치로 회전 |
| `../blender/build_scene_v2.py` | 진입 장면 원본(Blender 5.2 헤드리스, Cycles OptiX, Poly Haven PBR·HDRI·glTF 소품). `--orient h|v`, `--pano 파일` |

## 진입 영상 제작 파이프라인 (v2)

1. `blender -b --python ../blender/build_scene_v2.py -- --orient h --samples 64 --out ../blender/render2_h` (세로는 `--orient v`), 파노라마는 `--pano ../blender/pano_room.png`
2. `bash scripts/frames.sh <가로mp4> <세로mp4> 16 72` 또는 PNG 시퀀스를 ffmpeg로 바로 webp 변환
3. 파노라마 PNG → `assets/pano/room.webp` (3072×1536, q80, 약 120KB). 4096×2048·128샘플은 GPU 메모리를 넘겨 멈췄으니 3072×1536·64샘플로 (`build_scene_v2.py` 기본값)
4. 사용자 입장: 스크롤 → 문 열림 → 실내 → 끝 지점에서 파노라마 어라운드 뷰로 전환(같은 위치·화각)
5. 전환 순간 스크롤을 한 번 멈춤(`is-lock`): "실내를 둘러보세요" 안내 + '계속 보기' 버튼. 0.7초 뒤부터 휠 아래로 누적 160px·↓키·버튼·위로 빠른 스와이프 → 다음 섹션으로 부드럽게 이동, 휠 위로·↑키 → 그냥 풀림. 0.6 미만으로 되돌아가면 다시 멈춤

## 고객 요구 대응

- 품목 2 **첫 화면 모션·사운드**: 스크롤하면 카페 문이 열리고 전시 공간으로 들어감. 첫 화면부터 제목·'맞춤 제안 받기'가 보이고, 헤더 CTA는 항상 고정. 사운드는 `assets/audio/ambience.mp3`가 있을 때만 '소리 켜기' 버튼 노출(기본 꺼짐). 현재 파일은 Suno v5.5 잔잔한 로파이 BGM(`src/bgm-a.m4a` 앞 120초, -18 LUFS, 페이드 2s/3s, 96kbps). 이전 카페 소음 효과음은 `src/ambience-sfx-old.mp3`, 다른 후보는 `src/bgm-b.m4a`.
- 품목 3 **회원·매칭·운영**: 작가/공간주 전환, 지역·일정·설치 조건 입력 → 후보 목록. **후보 없는 지역이면 입력 조건 그대로 운영자 매칭 요청**(접수 번호 발급). Google·카카오 로그인은 버튼만(데모).
- 품목 4 **QR 도슨트**: 전시 통합 QR + 작품별 QR 생성(qrcodejs), 공개 페이지 `docent.html`, '작가 편집 모드' 버튼(데모 안내).
- 품목 1 **브랜드**: 워드마크 '아트한스푼' + 스푼 마크 SVG, 슬로건 제안 "동네 카페에 예술 한 스푼".

## 시안에서 가짜인 것 (실서비스 전 교체)

숫자(12·38·9), 사례 3건, 작가 3명, 공간 2곳, 후보 데이터(`main.js` SPACES/ARTISTS), 로그인, 접수 번호, 도슨트 음성, 사업자 정보.

## 프레임 재생 방식 (모네100에서 가져옴)

- `fetch → blob → createImageBitmap`. 처음 12장을 먼저 받고 나머지는 뒤에서 4개씩 순서대로.
- 디코드본은 현재 위치 −4 ~ +10만 만들고, ±16 밖은 `close()`로 메모리 해제. 압축본(blob)은 전부 보관(5~6MB).
- 없는 프레임은 ±8 안의 가까운 프레임으로 대체해 끊김을 가림.
- 진행률은 문서 스크롤 위치(`.entry-track` 420vh 안의 sticky). 모네는 휠 입력 누적이었지만 고객 요구(모션 건너뛰기)에 맞춰 바꿈.
- `prefers-reduced-motion`이거나 manifest가 없으면 포스터 정지 화면.
- 세로 화면(`innerHeight > innerWidth`)은 `v/` 세트. 회전 시 세트 교체.
