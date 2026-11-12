// 움직임 줄이기 설정 (Header 스크롤, Hero 점에서 같이 씀)
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ms만큼 기다리기 (Hero 인트로, Contact 타이핑에서 같이 씀)
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// 1024 이상에서 fullPage.js가 켜져 있는지 (맨 아래 fullPage.js 부분에서 바꿈)
let isFullpage = false;


/* ===== Header: 조금이라도 스크롤하면 반투명 유리 스타일 ===== */
const header = document.querySelector('.header');

function updateHeader() {
  header.classList.toggle('is-scrolled', window.scrollY > 0);
}

if (header) {
  updateHeader(); // 새로고침했을 때 이미 내려가 있는 경우
  window.addEventListener('scroll', updateHeader, { passive: true });
}


/* ===== 1024 미만: 맨 위로 버튼 (화면 반 이상 내려가면 나타남) =====
   누르면 아래 헤더 링크 코드가 #hero로 부드럽게 스크롤해 줌
   PC는 CSS에서 숨김 (사이드 메뉴 · 헤더 메뉴에 Home이 있음) */
const topBtn = document.querySelector('.top_btn');
const viewSiteLinks = document.querySelectorAll('.project_link');
const TOP_BTN_GAP = 12; // VIEW SITE와 이 거리 안으로 가까워지면 숨김

function toggleTopBtn(show) {
  topBtn?.classList.toggle('is-shown', show);
}

// 모바일: 스크롤하다 VIEW SITE 원이 탑 버튼 자리를 지나가는 동안만 잠깐 숨김
function isOverViewSite() {
  const btn = topBtn.getBoundingClientRect();
  return [...viewSiteLinks].some((link) => {
    const rect = link.getBoundingClientRect();
    return rect.right > btn.left - TOP_BTN_GAP && rect.left < btn.right + TOP_BTN_GAP
      && rect.bottom > btn.top - TOP_BTN_GAP && rect.top < btn.bottom + TOP_BTN_GAP;
  });
}

function updateTopBtn() {
  if (isFullpage) return; // PC는 숨김이라 계산 안 함
  toggleTopBtn(window.scrollY > window.innerHeight / 2 && !isOverViewSite());
}

if (topBtn) {
  updateTopBtn();
  window.addEventListener('scroll', updateTopBtn, { passive: true });
}


/* ===== Header: 링크 누르면 천천히 출발 → 빨라졌다가 → 부드럽게 멈추며 이동 =====
   CSS scroll-behavior: smooth는 속도를 브라우저가 정해서 너무 빨라 직접 만듦 */
const SCROLL_DURATION = 800; // 0.8초

// 천천히 시작해서 천천히 끝나는 가속 곡선
const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function smoothScrollTo(targetY) {
  const startY = window.scrollY;
  const distance = targetY - startY;
  const startTime = performance.now();

  function step(now) {
    const progress = Math.min((now - startTime) / SCROLL_DURATION, 1);
    // behavior: 'instant'로 CSS smooth를 꺼야 매 프레임 위치가 정확히 들어감
    window.scrollTo({ top: startY + distance * easeInOutCubic(progress), behavior: 'instant' });
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

document.querySelectorAll('.header a[href^="#"], .side_nav a[href^="#"], .mobile_menu a[href^="#"], .top_btn').forEach((link) => {
  link.addEventListener('click', (event) => {
    const target = document.querySelector(link.getAttribute('href'));
    if (!target) return;
    event.preventDefault();
    closeMenu(); // 햄버거 메뉴에서 눌렀으면 먼저 닫고 (스크롤 잠금 풀고) 이동
    history.pushState(null, '', link.getAttribute('href')); // 주소창 #도 원래처럼 바뀌게

    // 1024 이상: fullPage.js가 해당 섹션으로 넘겨줌 (moveTo는 1부터 셈)
    // 1600 이상에서 숨긴 Work style 섹션은 빼고 셈
    // stopPropagation: fullPage.js도 문서 전체에서 # 링크 클릭을 받아 섹션 안 스크롤을
    // 대상.offsetTop(페이지 기준 값)만큼 내려버림 → Contact가 풋터까지 내려가는 문제라 막음
    if (isFullpage) {
      event.stopPropagation();
      const sections = [...document.querySelectorAll('#fullpage .section')]
        .filter((section) => getComputedStyle(section).display !== 'none');
      fullpage_api.moveTo(sections.indexOf(target.closest('.section')) + 1);
      return;
    }

    // 고정 헤더에 가리지 않게 헤더 높이만큼 덜 내려감, 페이지 끝을 넘지 않게
    const headerHeight = header ? header.offsetHeight : 0;
    const maxY = document.documentElement.scrollHeight - window.innerHeight;
    const targetY = Math.min(
      Math.max(target.getBoundingClientRect().top + window.scrollY - headerHeight, 0),
      maxY
    );

    if (reduceMotion) {
      window.scrollTo({ top: targetY, behavior: 'instant' });
    } else {
      smoothScrollTo(targetY);
    }
  });
});


/* ===== Hero: 첫 등장 애니메이션 + 점 터뜨리기 =====
   움직임 줄이기 설정은 CSS(@media)에서 애니메이션을 빼서 처리 */
const DOT_RESPAWN = 2000; // 터지고 나서 다시 나타날 때까지
const PIECE_COUNT = 8;    // 파편 개수

const hero = document.querySelector('.hero');
const heroMain = document.querySelector('.hero_main');

// PORTFOLIO를 글자마다 span으로 쪼개기
// 쪼갠 글자는 aria-hidden으로 숨기고, 스크린리더용 한 단어(sr-only)를 따로 둠
if (heroMain) {
  const text = heroMain.textContent.trim();

  const srText = document.createElement('span');
  srText.className = 'sr-only';
  srText.textContent = text;

  const letters = document.createElement('span');
  letters.className = 'hero_main_letters';
  letters.setAttribute('aria-hidden', 'true');
  [...text].forEach((char, i) => {
    const span = document.createElement('span');
    span.className = 'hero_main_letter';
    span.style.setProperty('--i', i);
    span.textContent = char;
    letters.appendChild(span);
  });

  heroMain.replaceChildren(srText, letters);
}

/* ===== Hero: 끈적 인트로 =====
   1. 점 4개가 톡 나타남
   2. 띠 왼쪽 끝으로 모이며 남색으로 → 필터(#goo) 때문에 서로 녹아 붙음
   3. 남색 원 하나가 됨 → 오른쪽으로 쭉 늘어나 띠가 됨
   4. 그다음은 원래 등장 순서(.is-play): 글자 → WEB · PUBLISHER → 이름 → 점이 제자리에 톡
   점 · 띠는 .hero_goo 한 층에 모아 둠 (같은 층에 있어야 녹아 붙음)
   움직임 줄이기 설정이면 예전처럼 최종 화면만 */
const heroInner = document.querySelector('.hero_inner');
const heroDots = [...document.querySelectorAll('.hero_dot')];
const HERO_NAVY = '#33597F';
const heroGoo = document.createElement('div');
const heroBand = document.createElement('div');
heroGoo.className = 'hero_goo';
heroBand.className = 'hero_goo_band';
heroBand.setAttribute('aria-hidden', 'true');
let heroIntroDone = false;

// 띠 자리: 원래 띠(.hero_main::before)와 같은 곳, 오른쪽은 화면 밖까지
// width를 안 주면 다 늘어난 길이
function placeHeroBand(width) {
  const gooRect = heroGoo.getBoundingClientRect();
  const mainRect = heroMain.getBoundingClientRect();
  const bandLeft = mainRect.left + parseFloat(getComputedStyle(heroMain, '::before').left);
  const fullWidth = window.innerWidth - bandLeft + mainRect.height; // 오른쪽 둥근 끝은 화면 밖으로
  heroBand.style.left = `${bandLeft - gooRect.left}px`;
  heroBand.style.top = `${mainRect.top - gooRect.top}px`;
  heroBand.style.height = `${mainRect.height}px`;
  heroBand.style.width = `${width ?? fullWidth}px`;
  return { fullWidth, size: mainRect.height };
}

// WAAPI 애니메이션 끝날 때까지 기다리기 (중간에 취소돼도 멈추지 않게)
const done = (animation) => animation.finished.catch(() => {});

async function playHeroIntro() {
  hero.classList.add('is-goo');
  heroGoo.classList.add('is-gooey');
  const { fullWidth, size } = placeHeroBand();
  heroBand.style.width = `${size}px`; // 처음엔 띠 높이와 같은 원

  // 모일 곳: 띠 왼쪽 끝 원의 가운데
  const targetX = heroBand.offsetLeft + size / 2;
  const targetY = heroBand.offsetTop + size / 2;

  // 1. 점 등장
  heroDots.forEach((dot, i) => {
    dot.animate(
      [{ transform: 'scale(0)' }, { transform: 'scale(1.25)', offset: 0.6 }, { transform: 'scale(1)' }],
      { duration: 400, delay: i * 60, easing: 'ease-out', fill: 'backwards' }
    );
  });
  await wait(600);

  // 2. 가운데로 모이기 (둥글게 휘어서 날아감)
  const flights = heroDots.map((dot, i) => {
    const dx = targetX - (dot.offsetLeft + dot.offsetWidth / 2);
    const dy = targetY - (dot.offsetTop + dot.offsetHeight / 2);
    const bend = (i % 2 ? 1 : -1) * size * 0.4; // 점마다 반대쪽으로 휨
    const grow = (size * 0.55) / dot.offsetWidth;
    const color = getComputedStyle(dot).backgroundColor;
    return dot.animate([
      { transform: 'translate(0, 0) scale(1)', backgroundColor: color },
      { transform: `translate(${dx / 2 + bend}px, ${dy / 2 - Math.abs(bend)}px) scale(1.2)`, backgroundColor: color, offset: 0.5 },
      { transform: `translate(${dx}px, ${dy}px) scale(${grow})`, backgroundColor: HERO_NAVY },
    ], { duration: 700, delay: i * 50, easing: 'cubic-bezier(0.6, 0, 0.25, 1)', fill: 'forwards' });
  });
  await done(flights.at(-1));

  // 3. 남색 원 하나로 합체
  heroBand.classList.add('is-shown');
  heroBand.animate(
    [{ transform: 'scale(0.55)' }, { transform: 'scale(1.08)', offset: 0.6 }, { transform: 'scale(1)' }],
    { duration: 300, easing: 'ease-out' }
  );
  heroDots.forEach((dot) => dot.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 150, delay: 100, fill: 'forwards' }));
  await wait(250);

  // 4. 띠로 늘어나면서 원래 등장 순서 시작 (글자는 띠가 반쯤 늘어났을 때)
  const stretch = heroBand.animate(
    [{ width: `${size}px` }, { width: `${fullWidth}px` }],
    { duration: 650, easing: 'cubic-bezier(0.7, 0, 0.2, 1)', fill: 'forwards' }
  );
  await wait(200);
  heroDots.forEach((dot) => dot.getAnimations().forEach((a) => a.cancel())); // CSS 등장(톡)이 이어받음
  hero.classList.add('is-play');
  await done(stretch);
  stretch.cancel();
  placeHeroBand(); // 애니메이션 값 대신 실제 값으로

  heroIntroDone = true;
  heroGoo.classList.remove('is-gooey'); // 필터는 무거워서 인트로가 끝나면 끔
}

if (hero && heroInner && heroMain) {
  if (reduceMotion) {
    hero.classList.add('is-play'); // 움직임 줄이기: CSS가 애니메이션을 빼서 최종 화면만
  } else {
    // 점과 띠를 한 층으로 (층이 .hero_inner와 같은 크기라 점의 % 위치는 그대로)
    heroGoo.append(...heroDots, heroBand);
    heroInner.prepend(heroGoo);

    // 폰트가 바뀌면 PORTFOLIO 폭 → 띠 위치가 달라져서 폰트를 기다림 (오래 걸리면 1.5초 뒤 그냥 시작)
    Promise.race([document.fonts?.ready, wait(1500)]).then(playHeroIntro);

    window.addEventListener('resize', () => {
      if (heroIntroDone) placeHeroBand();
    });
  }
}

// 점 주변으로 작은 파편 퍼뜨리기
function scatterPieces(dot) {
  const x = dot.offsetLeft + dot.offsetWidth / 2;
  const y = dot.offsetTop + dot.offsetHeight / 2;
  const color = getComputedStyle(dot).backgroundColor;

  for (let i = 0; i < PIECE_COUNT; i++) {
    const angle = (i / PIECE_COUNT) * Math.PI * 2;
    const distance = 24 + Math.random() * 12;
    const piece = document.createElement('span');
    piece.className = 'hero_burst_piece';
    piece.setAttribute('aria-hidden', 'true');
    piece.style.left = `${x}px`;
    piece.style.top = `${y}px`;
    piece.style.backgroundColor = color;
    piece.style.setProperty('--dx', `${Math.cos(angle) * distance}px`);
    piece.style.setProperty('--dy', `${Math.sin(angle) * distance}px`);
    piece.addEventListener('animationend', () => piece.remove());
    dot.parentElement.appendChild(piece);
  }
}

document.querySelectorAll('.hero_dot').forEach((dot) => {
  dot.addEventListener('click', () => {
    if (dot.classList.contains('is-burst')) return; // 터지는 중엔 무시

    dot.classList.remove('is-respawn');
    dot.classList.add('is-burst');
    if (!reduceMotion) scatterPieces(dot);

    setTimeout(() => {
      dot.classList.remove('is-burst');
      dot.classList.add('is-respawn');
    }, DOT_RESPAWN);
  });
});


/* ===== Contact: 타이핑 장면 반복 =====
   1. 첫 문구 타이핑 → 끝나면 투명도 80%
   2. 캐릭터 2로 바뀌면서 두 번째 문구 타이핑
   3. 끝나고 3초 뒤 처음 상태로 → 반복 */
const TYPE_SPEED = 100;   // 글자당 0.1초
const SCENE_GAP = 500;    // 첫 문구 끝 → 두 번째 장면 시작 사이 (시안에 수치가 없어 눈대중)
const LOOP_DELAY = 3000;  // 두 번째 문구 끝 → 다시 처음

const firstMessage = document.querySelector('.contact_message--first');
const secondMessage = document.querySelector('.contact_message--second');
const characters = document.querySelectorAll('.contact_character_img');

// 문구를 글자마다 span으로 쪼개기 (스크린리더는 aria-label로 문장 전체를 읽음)
function splitChars(message) {
  const text = message.textContent;
  message.setAttribute('aria-label', text);
  message.textContent = '';
  return [...text].map((char) => {
    const span = document.createElement('span');
    span.className = 'contact_char';
    span.setAttribute('aria-hidden', 'true');
    span.textContent = char;
    message.appendChild(span);
    return span;
  });
}

async function typeChars(chars) {
  for (let i = 0; i < chars.length; i++) {
    if (i > 0) chars[i - 1].classList.remove('is-cursor');
    chars[i].classList.add('is-shown', 'is-cursor');
    await wait(TYPE_SPEED);
  }
}

function showCharacter(index) {
  characters.forEach((img, i) => img.classList.toggle('is-active', i === index));
}

function reset(firstChars, secondChars) {
  [...firstChars, ...secondChars].forEach((span) => span.classList.remove('is-shown', 'is-cursor'));
  firstMessage.classList.remove('is-done');
  showCharacter(0);
}

async function playContactScenes() {
  const firstChars = splitChars(firstMessage);
  const secondChars = splitChars(secondMessage);

  // 움직임 줄이기 설정이면 마지막 장면만 보여주고 멈춤
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    [...firstChars, ...secondChars].forEach((span) => span.classList.add('is-shown'));
    firstMessage.classList.add('is-done');
    showCharacter(1);
    return;
  }

  while (true) {
    reset(firstChars, secondChars);

    await typeChars(firstChars);
    firstChars.at(-1).classList.remove('is-cursor');
    firstMessage.classList.add('is-done');
    await wait(SCENE_GAP);

    showCharacter(1);
    await typeChars(secondChars); // 커서는 3초 기다리는 동안 계속 깜빡임
    await wait(LOOP_DELAY);
  }
}

if (firstMessage && secondMessage) playContactScenes();


/* ===== Contact: 복사 아이콘 누르면 값 복사 → 체크 아이콘 → 3초 뒤 원래대로 ===== */
document.querySelectorAll('.contact_copy').forEach((button) => {
  let timer;

  button.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(button.dataset.copy);
    } catch {
      return;
    }
    button.classList.add('is-copied');
    clearTimeout(timer);
    timer = setTimeout(() => {
      button.classList.remove('is-copied');
    }, 3000);
  });
});


/* ===== 1024 이상: fullPage.js로 섹션 단위 스크롤 =====
   1024 미만은 지금처럼 일반 스크롤. 창 크기가 1024를 넘나들면 켜고 끔 */
const pcQuery = window.matchMedia('(min-width: 1024px)');
// 1600 이상에서는 Work style 섹션이 About 안으로 합쳐짐
const bigQuery = window.matchMedia('(min-width: 1600px)');

/* 사이드 메뉴: 지금 보고 있는 섹션 표시
   남색 배경 위에서는 흰 글자로 (Contact, 1024의 Work style 띠, 1600의 About 오른쪽 칸) */
const sideNav = document.querySelector('.side_nav');

function updateSideNav(key) {
  if (!sideNav) return;
  sideNav.querySelectorAll('li').forEach((item) => {
    const isCurrent = item.dataset.key === key;
    item.classList.toggle('is-active', isCurrent);
    if (isCurrent) item.querySelector('a').setAttribute('aria-current', 'true');
    else item.querySelector('a').removeAttribute('aria-current');
  });
  const isDark = key === 'contact' || key === 'workstyle' || (key === 'about' && bigQuery.matches);
  sideNav.classList.toggle('is-dark', isDark);
  sideNav.classList.toggle('is-hidden', key === 'hero'); // Home에서는 숨김
}

function initFullpage() {
  if (isFullpage || typeof fullpage === 'undefined') return;

  new fullpage('#fullpage', {
    licenseKey: 'gplv3-license', // GPLv3 오픈소스 프로젝트용 키 (비우면 워터마크 표시)
    scrollingSpeed: reduceMotion ? 0 : SCROLL_DURATION, // 헤더 링크 스크롤과 같은 0.8초
    verticalCentered: false, // 섹션 안 레이아웃은 지금 CSS 그대로
    scrollOverflow: true,    // 화면보다 긴 섹션은 안에서 스크롤한 뒤 다음 섹션으로
    // 첫 섹션(Hero)을 벗어나면 헤더를 반투명 유리 스타일로
    onLeave: (origin, destination, direction) => {
      header?.classList.toggle('is-scrolled', destination.index > 0);
      updateSideNav(destination.item.dataset.key); // 넘어가기 시작할 때 바로 바뀌게
      moveTravelBlob(destination.item.dataset.key); // 원이 다음 섹션 자리로 날아감
      animateWorksPc(origin, destination, direction); // Works 깊이감 · 숫자판 · 제목
      // Works끼리 넘길 때만 고정 WORKS(+띠)를 켜 둠
      // Works ↔ 다른 섹션일 땐 끄고, 섹션 안 WORKS가 섹션과 같이 움직이게
      const isWorks = (section) => section.item.dataset.key === 'projects';
      setWorksTitleFixed(isWorks(origin) && isWorks(destination));
    },
    // 다 넘어온 뒤 Works면 다시 고정 WORKS로 (섹션 안 WORKS와 자리가 같아서 티 안 남)
    afterLoad: (origin, destination) => {
      setWorksTitleFixed(destination.item.dataset.key === 'projects');
    },
  });
  isFullpage = true;
  if (!reduceMotion && travelBlob) document.documentElement.classList.add('has-travel-blob');
  const activeKey = fullpage_api.getActiveSection().item.dataset.key;
  updateSideNav(activeKey);
  setWorksTitleFixed(activeKey === 'projects');
}

function destroyFullpage() {
  if (!isFullpage) return;
  fullpage_api.destroy('all'); // fullPage.js가 넣은 스타일, 감싼 요소 전부 원래대로
  isFullpage = false;
  document.documentElement.classList.remove('has-travel-blob'); // 모바일은 섹션마다 원래 원
  travelKey = null;
  travelBox = null;
  if (header) updateHeader();
  updateTopBtn();
}

/* ===== 1024 미만: Works 5개를 옆으로 넘기기 =====
   PC는 fullPage.js가 섹션을 하나씩 넘겨야 해서 섹션이 #fullpage 바로 아래에 있어야 함
   → 모바일에서만 .works_slider > .works_track 으로 묶고, PC로 가면 다시 풀어놓음 */
const works = [...document.querySelectorAll('#fullpage .projects')];
const worksEyebrow = works[0]?.querySelector('.eyebrow'); // 테슬라 섹션의 WORKS 제목
const worksSlider = document.createElement('div');
const worksHead = document.createElement('div');
const worksTrack = document.createElement('div');
const worksDots = document.createElement('div');
worksSlider.className = 'works_slider';
worksHead.className = 'works_head';
worksTrack.className = 'works_track';
worksDots.className = 'works_dots';
worksSlider.append(worksHead, worksTrack, worksDots);

// WORKS 오른쪽 숫자: 지금 장 / 전체 (예: 01 / 05)
const pad = (n) => String(n).padStart(2, '0');
const worksCount = document.createElement('span');
const worksCountNow = document.createElement('span');
worksCount.className = 'works_count';
worksCount.setAttribute('aria-hidden', 'true'); // 스크린리더는 아래 점의 aria-current로 앎
worksCountNow.className = 'works_count_now';
worksCount.append(worksCountNow, ` / ${pad(works.length)}`);
worksHead.appendChild(worksCount);

// 점: 누르면 그 프로젝트로 넘김
const dots = works.map((section, i) => {
  const dot = document.createElement('button');
  dot.type = 'button';
  dot.className = 'works_dot';
  dot.setAttribute('aria-label', `${i + 1}번째 프로젝트 보기`);
  dot.addEventListener('click', () => goToWork(i));
  worksDots.appendChild(dot);
  return dot;
});

// 지금 보이는 장 번호 (0부터)
function currentWork() {
  return Math.round(worksTrack.scrollLeft / worksTrack.clientWidth);
}

// i번째 장으로 부드럽게 이동
function goToWork(i) {
  const index = Math.min(Math.max(i, 0), works.length - 1); // 처음 · 끝 장 밖으로 안 나가게
  worksTrack.scrollTo({ left: index * worksTrack.clientWidth, behavior: reduceMotion ? 'instant' : 'smooth' });
}

/* 스와이프: 브라우저 기본 가로 스크롤은 세게 밀면 여러 장 넘어가서 직접 처리
   - 미는 동안: 손가락을 따라 움직임
   - 손 뗄 때: 50px 넘게 밀었으면 딱 한 장만 넘기고, 아니면 제자리로
   세로로 밀면 원래대로 페이지 스크롤 (CSS touch-action: pan-y) */
const SWIPE_MIN = 50;
let touchStartX = 0;
let touchStartY = 0;
let touchStartScroll = 0;
let touchStartIndex = 0;
let isSwipe = null; // null: 아직 모름, true: 가로로 미는 중, false: 세로 스크롤

worksTrack.addEventListener('touchstart', (event) => {
  touchStartX = event.touches[0].clientX;
  touchStartY = event.touches[0].clientY;
  touchStartScroll = worksTrack.scrollLeft;
  touchStartIndex = currentWork();
  isSwipe = null;
}, { passive: true });

worksTrack.addEventListener('touchmove', (event) => {
  const dx = event.touches[0].clientX - touchStartX;
  const dy = event.touches[0].clientY - touchStartY;
  if (isSwipe === null) {
    if (Math.abs(dx) < 5 && Math.abs(dy) < 5) return; // 너무 조금 움직이면 아직 판단 안 함
    isSwipe = Math.abs(dx) > Math.abs(dy);
  }
  if (isSwipe) worksTrack.scrollTo({ left: touchStartScroll - dx, behavior: 'instant' });
}, { passive: true });

worksTrack.addEventListener('touchend', (event) => {
  if (!isSwipe) return;
  const dx = event.changedTouches[0].clientX - touchStartX;
  let index = touchStartIndex;
  if (dx < -SWIPE_MIN) index += 1;     // 왼쪽으로 밀면 다음 장
  else if (dx > SWIPE_MIN) index -= 1; // 오른쪽으로 밀면 이전 장
  goToWork(index);
});

// 전화가 오는 등 터치가 끊기면 원래 장으로
worksTrack.addEventListener('touchcancel', () => {
  if (isSwipe) goToWork(touchStartIndex);
});

// 화면을 돌리거나 폭이 바뀌면 보던 장에 다시 맞춤
let activeWork = 0;
window.addEventListener('resize', () => {
  if (worksSlider.isConnected) worksTrack.scrollTo({ left: activeWork * worksTrack.clientWidth, behavior: 'instant' });
});

// 지금 보이는 장에 맞춰 점 표시
function updateWorksDots() {
  const index = currentWork();
  activeWork = index;
  if (index !== shownWork) showWorkMobile(index); // 장이 바뀐 순간에만 숫자판 · 제목 · 배경색
  dots.forEach((dot, i) => {
    dot.classList.toggle('is-active', i === index);
    if (i === index) dot.setAttribute('aria-current', 'true');
    else dot.removeAttribute('aria-current');
  });
}
worksTrack.addEventListener('scroll', updateWorksDots, { passive: true });

function wrapWorks() {
  if (worksSlider.isConnected || works.length < 2) return;
  works[0].before(worksSlider);
  if (worksEyebrow) worksHead.prepend(worksEyebrow); // WORKS는 넘기는 줄 위에 고정 (숫자 왼쪽)
  worksTrack.append(...works);
  worksTrack.scrollLeft = 0;
  shownWork = 0;
  worksSlider.style.backgroundColor = workTint(0);
  updateWorksDots();
}

function unwrapWorks() {
  if (!worksSlider.isConnected) return;
  worksSlider.replaceWith(...works);
  if (worksEyebrow) works[0].querySelector('.projects_inner').prepend(worksEyebrow); // 테슬라 섹션으로 돌려놓기
}

/* ===== 1024 이상: Works 장식 원을 화면에 고정 =====
   Works 섹션 5개는 레이아웃이 같아서, 첫 섹션(테슬라)의 목업 · 프로젝트 자리를
   섹션 맨 위 기준으로 재서 고정 장식(.works_deco)에 똑같이 옮겨 둠
   원 모양 · 크기 · 간격은 CSS(.works_deco_visual::before, .works_deco_project::after) */
const decoEyebrow = document.querySelector('.works_deco_eyebrow');
const decoVisual = document.querySelector('.works_deco_visual');
const decoProject = document.querySelector('.works_deco_project');

function placeBox(box, el, section) {
  const sectionRect = section.getBoundingClientRect();
  const rect = el.getBoundingClientRect();
  box.style.top = `${rect.top - sectionRect.top}px`; // 섹션 맨 위에서 떨어진 거리 = 화면 맨 위에서 거리
  box.style.left = `${rect.left}px`;
  box.style.width = `${rect.width}px`;
  box.style.height = `${rect.height}px`;
}

function placeWorksDeco() {
  if (!pcQuery.matches || !decoEyebrow || !decoVisual || !decoProject || !works[0]) return;
  // 모바일 → PC로 창을 넓히는 순간엔 WORKS 제목이 아직 슬라이더에 있음 → 섹션으로 돌아온 뒤(handlePcQuery) 다시 계산
  if (!works[0].querySelector('.eyebrow')) return;
  placeBox(decoEyebrow, works[0].querySelector('.eyebrow'), works[0]);
  placeBox(decoVisual, works[0].querySelector('.project_visual'), works[0]);
  placeBox(decoProject, works[0].querySelector('.project'), works[0]);
  placeWorksBand();
  placeTravelBlob(); // Works 원 자리가 정해진 뒤에 날아가는 원 위치도 다시
}

/* WORKS 제목 층(.works_title)은 섹션보다 위에 있어서
   목업 너비만큼 배경 띠를 깔아 Works끼리 넘길 때 목업이 WORKS 뒤로 지나가게 함
   Works 섹션에 있을 때 · Works끼리 넘길 때만 켬 (html.is-works-fixed) */
const worksBand = document.querySelector('.works_title_band');

function setWorksTitleFixed(on) {
  document.documentElement.classList.toggle('is-works-fixed', on);
}

// 띠: 가로는 목업과 같게, 세로는 화면 맨 위부터 WORKS 제목 아랫선까지
function placeWorksBand() {
  if (!worksBand) return;
  const sectionRect = works[0].getBoundingClientRect();
  const mockupRect = works[0].querySelector('.project_mockup').getBoundingClientRect();
  const eyebrowRect = works[0].querySelector('.eyebrow').getBoundingClientRect();
  worksBand.style.left = `${mockupRect.left}px`;
  worksBand.style.width = `${mockupRect.width}px`;
  worksBand.style.height = `${eyebrowRect.bottom - sectionRect.top}px`;
}

window.addEventListener('resize', placeWorksDeco);
window.addEventListener('load', placeWorksDeco); // 목업 이미지가 다 불러와져야 높이가 정해짐
document.fonts?.ready.then(placeWorksDeco);     // 폰트가 바뀌면 WORKS 글자 크기 · 줄 높이가 달라짐

/* ===== 1024 이상: 섹션을 따라 날아가는 원 =====
   섹션마다 있던 대표 원(About 오른쪽 위, Work style 왼쪽, Skills 왼쪽 위, Works 오른쪽 위)은 CSS에서 숨기고
   화면에 고정된 원 하나(.travel_blob)가 섹션을 넘길 때마다 다음 섹션의 원 자리로 날아감
   자리 · 크기 · 색은 숨긴 원래 원의 CSS 값을 그대로 읽음 → 시안을 고쳐도 여기는 안 고쳐도 됨
   Hero에선 파란 점 자리에 투명하게 숨어 있다가, 넘기면 파란 점에서 튀어나옴 */
const travelBlob = document.querySelector('.travel_blob');
const travelShape = travelBlob?.querySelector('.travel_blob_shape');
const TRAVEL_DURATION = 1100;
const WORKS_BLOB_OUT = 0.3; // Works 오른쪽 원이 화면 밖으로 나가는 비율 (0.3 = 원 너비의 30%)
let travelKey = null; // 지금 원이 가 있는 섹션
let travelBox = null; // 지금 원의 자리 · 크기 · 색

const isTravelOn = () => isFullpage && !reduceMotion && Boolean(travelBlob);
const sectionByKey = (key) => document.querySelector(`#fullpage .section[data-key="${key}"]`);

// 가상 요소(::before 등)의 자리 · 크기 · 색
// left · top은 right · bottom으로 정해 둔 원이어도 브라우저가 계산한 px로 돌려줌
function pseudoBox(el, pseudo, baseX = 0, baseY = 0) {
  const style = getComputedStyle(el, pseudo);
  return {
    x: baseX + parseFloat(style.left),
    y: baseY + parseFloat(style.top),
    w: parseFloat(style.width),
    h: parseFloat(style.height),
    color: style.backgroundColor,
    opacity: 1,
    blend: 'multiply',
  };
}

// 섹션별 원 자리 (섹션이 화면 맨 위에 왔을 때 기준 = 화면 기준)
function travelTarget(key) {
  const section = sectionByKey(key);
  if (key === 'hero') {
    const dot = document.querySelector('.hero_dot--blue');
    const sectionRect = section.getBoundingClientRect();
    const layerRect = dot.offsetParent.getBoundingClientRect(); // 인트로 중에도 움직이지 않는 점의 원래 자리
    return {
      x: layerRect.left - sectionRect.left + dot.offsetLeft,
      y: layerRect.top - sectionRect.top + dot.offsetTop,
      w: dot.offsetWidth,
      h: dot.offsetHeight,
      color: '#78A9E8',
      opacity: 0,
      blend: 'multiply',
    };
  }
  if (key === 'about' || key === 'skills') return pseudoBox(section, '::before');
  if (key === 'workstyle') {
    // 남색 띠 위에선 색을 바꾸느라 버벅여서, 위쪽 흰 바탕(헤더 아래 ~ 띠 위) 왼쪽에 걸쳐 둠
    const sectionTop = section.getBoundingClientRect().top;
    const whiteTop = parseFloat(getComputedStyle(section).paddingTop); // 헤더 높이
    const whiteBottom = section.querySelector('.workstyle_band').getBoundingClientRect().top - sectionTop;
    const h = Math.max(120, Math.min(220, whiteBottom - whiteTop - 30)); // 흰 바탕 안에 들어가는 크기 (낮은 화면에서도 최소 120)
    const w = h * 1.15;
    return {
      ...pseudoBox(section, '::before'),
      x: -w * 0.3, // 왼쪽 끝에 걸침
      y: whiteTop + (whiteBottom - whiteTop - h) / 2, // 흰 바탕 세로 가운데
      w,
      h,
    };
  }
  if (key === 'projects') {
    // Works 원은 화면에 고정된 .works_deco_project 안에 있음 (위치는 placeWorksDeco)
    // 세로 위치 · 크기 · 색 · 투명도는 CSS(.works_deco_project::after) 값 그대로,
    // 가로는 화면 너비와 상관없이 항상 화면 오른쪽 끝에 걸치게 (원 너비의 WORKS_BLOB_OUT만큼 화면 밖)
    const box = pseudoBox(decoProject, '::after', parseFloat(decoProject.style.left) || 0, parseFloat(decoProject.style.top) || 0);
    return {
      ...box,
      x: window.innerWidth - box.w * (1 - WORKS_BLOB_OUT),
      opacity: parseFloat(getComputedStyle(decoProject, '::after').opacity),
    };
  }
  // Contact: 메일 보내기 버튼 가운데로 날아가 동그랗게 내려앉았다가, 점으로 줄어들며 버튼 속으로 빨려 들어감
  // 최종 자리는 버튼 가운데의 크기 0 점 (거꾸로 넘기면 여기서 튀어나옴)
  const mailBtn = section.querySelector('.contact_btn--mail');
  const sectionRect = section.getBoundingClientRect();
  const btnRect = mailBtn.getBoundingClientRect();
  return {
    x: btnRect.left - sectionRect.left + btnRect.width / 2,
    y: btnRect.top - sectionRect.top + btnRect.height / 2,
    w: 0,
    h: 0,
    land: btnRect.height * 1.4, // 내려앉을 때 원 크기
    color: '#78A9E8',
    opacity: 0,
    blend: 'normal', // 남색 배경 위에서 진해지지 않게 (창 크기가 바뀌어도 유지)
  };
}

function applyTravelBox(box) {
  travelBlob.style.width = `${box.w}px`;
  travelBlob.style.height = `${box.h}px`;
  travelBlob.style.transform = `translate(${box.x}px, ${box.y}px)`;
  travelBlob.style.opacity = box.opacity;
  travelShape.style.backgroundColor = box.color;
}

// 지금 섹션 자리에 바로 놓기 (켤 때, 창 크기 바뀔 때)
function placeTravelBlob() {
  if (!isTravelOn()) return;
  travelBlob.style.transformOrigin = 'center';
  travelBlob.getAnimations().forEach((animation) => animation.cancel());
  travelKey = fullpage_api.getActiveSection().item.dataset.key;
  travelBox = travelTarget(travelKey);
  applyTravelBox(travelBox);
  travelBlob.classList.toggle('is-normal', travelBox.blend === 'normal');
}

// Contact: 멈추지 않고 점점 빨라지며 버튼 가운데로 날아가, 도착하는 순간 점으로 줄어들며 샥 들어감
// 크기(width · height)를 바꾸면 매 프레임 다시 그려서 버벅임 → 크기는 고정하고 transform(scale)만 움직임
function flyIntoButton(from, to) {
  const size = to.land;
  const duration = 500;
  // 원 가운데 기준으로 옮기고 크기는 scale로 (transform-origin: center)
  const at = (cx, cy, sx, sy = sx) => `translate(${cx - size / 2}px, ${cy - size / 2}px) scale(${sx}, ${sy})`;
  const fromX = from.x + from.w / 2;
  const fromY = from.y + from.h / 2;
  const midX = (fromX + to.x) / 2;
  const midY = (fromY + to.y) / 2 - 60; // 살짝 위로 휘어서

  travelBlob.classList.add('is-normal'); // 남색 배경 위에서 multiply로 진해지지 않게 원래 색 그대로
  travelBlob.style.transformOrigin = 'center';
  travelBlob.style.width = `${size}px`;
  travelBlob.style.height = `${size}px`;
  travelShape.style.backgroundColor = to.color;
  // 버튼 바로 앞(남은 거리의 1/4) — 여기서부터 줄어들기 시작
  const nearX = midX + (to.x - midX) * 0.75;
  const nearY = midY + (to.y - midY) * 0.75;
  // 칸마다 easing을 따로 주면 칸 경계에서 멈칫함 → 전체에 ease-in 하나만 (갈수록 빨라짐)
  const fly = travelBlob.animate([
    { transform: at(fromX, fromY, from.w / size, from.h / size), opacity: from.opacity },
    { transform: at(midX, midY, (from.w / size + 1) / 2), opacity: 1, offset: 0.5 },
    { transform: at(nearX, nearY, 0.8), opacity: 1, offset: 0.85 },
    { transform: at(to.x, to.y, 0), opacity: 1 }, // 샥
  ], { duration, easing: 'cubic-bezier(0.5, 0, 0.9, 0.4)', fill: 'forwards' });
  setTimeout(popMailButton, duration * 0.97); // 들어가는 순간 버튼이 톡
  fly.finished.then(() => {
    fly.cancel();
    applyTravelBox(to); // 최종: 버튼 가운데 크기 0, 투명
  }).catch(() => {});
}

// 원이 들어간 뒤 메일 보내기 버튼이 한 번 톡 튐
function popMailButton() {
  document.querySelector('.contact_btn--mail')?.animate(
    [{ transform: 'scale(1)' }, { transform: 'scale(1.1)', offset: 0.35 }, { transform: 'scale(1)' }],
    { duration: 400, easing: 'ease-out' }
  );
}

function moveTravelBlob(key) {
  if (!isTravelOn() || key === travelKey) return; // Works끼리는 같은 자리라 그대로
  const from = travelBox;
  const to = travelTarget(key);
  travelKey = key;
  travelBox = to;
  if (!from) {
    applyTravelBox(to);
    return;
  }

  // 날아가는 방향으로 늘어났다(가운데) → 도착하면서 살짝 반대로 눌렸다 → 원래 모양
  // 모든 칸의 함수 목록을 같게 맞춰야 브라우저가 부드럽게 이어 줌
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const frame = (x, y, scaleX = 1, scaleY = 1) =>
    `translate(${x}px, ${y}px) rotate(${angle}rad) scale(${scaleX}, ${scaleY}) rotate(${-angle}rad)`;
  const midX = (from.x + to.x) / 2;
  const midY = (from.y + to.y) / 2 - 60; // 살짝 위로 휘어서
  const midW = (from.w + to.w) / 2;
  const midH = (from.h + to.h) / 2;

  travelBlob.getAnimations().forEach((animation) => animation.cancel());
  travelBlob.classList.remove('is-normal'); // 날아가는 동안엔 글자가 비쳐 보이게

  if (to.land) {
    flyIntoButton(from, to);
    return;
  }

  travelBlob.animate([
    { transform: frame(from.x, from.y), width: `${from.w}px`, height: `${from.h}px`, opacity: from.opacity },
    { transform: frame(midX, midY, 1.3, 0.75), width: `${midW}px`, height: `${midH}px`, opacity: 1, offset: 0.45 },
    { transform: frame(to.x, to.y, 0.94, 1.06), width: `${to.w}px`, height: `${to.h}px`, opacity: to.opacity || 1, offset: 0.82 },
    { transform: frame(to.x, to.y), width: `${to.w}px`, height: `${to.h}px`, opacity: to.opacity },
  ], { duration: TRAVEL_DURATION, easing: 'cubic-bezier(0.65, 0, 0.35, 1)' })
    .finished.then(() => {
      travelBlob.classList.toggle('is-normal', to.blend === 'normal');
    }).catch(() => {});
  applyTravelBox(to); // 애니메이션이 끝나면 이 값이 남음 (색은 CSS transition으로 바뀜)
}


/* ===== Works: 넘길 때 효과 =====
   - 번호: 숫자판처럼 굴러감 (01 → 02)
   - PC 제목: 글자가 섞였다가 왼쪽부터 맞춰짐 (모바일은 안 씀)
   - PC: 목업 · 배경 조약돌 · 글이 서로 다른 거리로 늦게 따라와서 깊이감 + 목업에 마우스를 올리면 3D로 기울어짐
   - 모바일: 슬라이더 배경색이 프로젝트 색으로 (색은 css --work-tint) */

// 숫자판: 앞자리 0은 고정, 뒷자리 0~9를 세로로 쌓아 두고 위치만 옮김 (프로젝트 9개까지)
function makeOdometer(el, value) {
  const srText = document.createElement('span');
  srText.className = 'sr-only';
  srText.textContent = pad(value);

  const odo = document.createElement('span');
  odo.className = 'odo';
  odo.setAttribute('aria-hidden', 'true');
  const tens = document.createElement('span');
  tens.textContent = '0';
  const column = document.createElement('span');
  column.className = 'odo_col';
  for (let n = 0; n <= 9; n++) {
    const digit = document.createElement('span');
    digit.textContent = n;
    column.appendChild(digit);
  }
  column.style.transform = `translateY(-${value * 10}%)`;
  odo.append(tens, column);
  el.replaceChildren(srText, odo);
  return { column, srText };
}

// from 숫자에서 to 숫자로 굴리기
function rollOdometer(odometer, from, to) {
  odometer.srText.textContent = pad(to);
  odometer.column.style.transition = 'none';
  odometer.column.style.transform = `translateY(-${from * 10}%)`;
  odometer.column.offsetHeight; // 시작 위치를 먼저 그리게 해야 transition이 걸림
  odometer.column.style.transition = reduceMotion ? 'none' : '';
  odometer.column.style.transform = `translateY(-${to * 10}%)`;
}

const workOdometers = works.map((section, i) => makeOdometer(section.querySelector('.project_num'), i + 1));
const countOdometer = makeOdometer(worksCountNow, 1);

// 제목 섞기 (PC fullPage에서만): 알파벳 · 기호로 섞음
const SCRAMBLE_DURATION = 700;
const SCRAMBLE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ#*/<>';
const scrambleFrames = new Map();
const randomChar = () => SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];

function scrambleTitle(section) {
  if (reduceMotion) return;
  const title = section.querySelector('.project_title');
  // L'OCCITANE처럼 PC · 모바일 글자가 따로 있으면 지금 보이는(PC) 쪽만
  const target = [...title.children].find((el) => getComputedStyle(el).display !== 'none') || title;
  if (target.children.length) return;
  target.dataset.text ??= target.textContent; // 원래 글자 (섞는 중에 또 불려도 원래 글자로)
  const text = target.dataset.text;
  const start = performance.now();

  cancelAnimationFrame(scrambleFrames.get(target));
  function step(now) {
    const progress = Math.min((now - start) / SCRAMBLE_DURATION, 1);
    const fixedCount = Math.floor(progress * text.length); // 왼쪽부터 맞춰진 글자 수
    target.textContent = [...text]
      .map((char, i) => (i < fixedCount || /[\s·’']/.test(char) ? char : randomChar()))
      .join('');
    if (progress < 1) scrambleFrames.set(target, requestAnimationFrame(step));
    else target.textContent = text;
  }
  scrambleFrames.set(target, requestAnimationFrame(step));
}

const workTint = (index) => getComputedStyle(works[index]).getPropertyValue('--work-tint').trim();

// 모바일: 장이 바뀌면
let shownWork = 0;
function showWorkMobile(index) {
  rollOdometer(countOdometer, shownWork + 1, index + 1);
  worksSlider.style.backgroundColor = workTint(index);
  shownWork = index;
}

// PC: fullPage.js onLeave에서 부름 (섹션은 fullPage.js가 0.8초에 옮김)
function animateWorksPc(origin, destination, direction) {
  const isWorks = (section) => section.item.dataset.key === 'projects';
  if (!isWorks(destination)) return;
  const toIndex = works.indexOf(destination.item);
  const fromIndex = isWorks(origin) ? works.indexOf(origin.item) : -1; // 다른 섹션에서 오면 00부터
  rollOdometer(workOdometers[toIndex], fromIndex + 1, toIndex + 1);
  setTimeout(() => scrambleTitle(destination.item), 250);
  if (reduceMotion) return;

  // 깊이감: 층마다 다른 거리만큼 아래(위로 넘기면 위)에서 늦게 따라옴 → 목업이 가장 멀리서
  const dir = direction === 'up' ? -1 : 1;
  const ease = 'cubic-bezier(0.22, 1, 0.36, 1)';
  const layers = [
    ['.project_mockup', 170, 0, 1300],
    ['.project_circle', 60, 0, 1400],
    ['.project_content', 90, 80, 1200],
    ['.project_details', 120, 160, 1200],
  ];
  layers.forEach(([selector, distance, delay, duration]) => {
    destination.item.querySelector(selector)?.animate(
      [{ transform: `translateY(${dir * distance}px)`, opacity: selector === '.project_circle' ? 1 : 0.2 }, { transform: 'none', opacity: 1 }],
      { duration, delay, easing: ease, fill: 'backwards' }
    );
  });
  // Works끼리 넘길 때: 나가는 목업은 섹션보다 빨리 빠져나감
  if (isWorks(origin)) {
    origin.item.querySelector('.project_mockup')?.animate(
      [{ transform: 'none' }, { transform: `translateY(${-dir * 120}px)` }],
      { duration: SCROLL_DURATION, easing: 'cubic-bezier(0.55, 0, 1, 0.45)' }
    );
  }
}

// PC: 목업에 마우스를 올리면 3D로 기울어지고, 뒤 조약돌은 반대로 살짝 → 앞뒤 거리감
if (!reduceMotion) {
  works.forEach((section) => {
    const visual = section.querySelector('.project_visual');
    const mockup = section.querySelector('.project_mockup');
    const circle = section.querySelector('.project_circle');
    if (!visual || !mockup) return;

    visual.addEventListener('pointermove', (event) => {
      if (event.pointerType !== 'mouse' || !pcQuery.matches) return;
      const rect = visual.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5; // -0.5 ~ 0.5
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      mockup.style.transform = `perspective(1000px) rotateY(${x * 12}deg) rotateX(${-y * 9}deg)`;
      if (circle) circle.style.translate = `${-x * 30}px ${-y * 20}px`;
    });
    visual.addEventListener('pointerleave', () => {
      mockup.style.transform = '';
      if (circle) circle.style.translate = '';
    });
  });
}

function handlePcQuery() {
  if (pcQuery.matches) {
    unwrapWorks(); // fullPage.js 켜기 전에 섹션을 원래 자리로
    initFullpage();
    placeWorksDeco();
  } else {
    destroyFullpage(); // fullPage.js 끈 다음에 묶기
    wrapWorks();
  }
}

handlePcQuery();
pcQuery.addEventListener('change', handlePcQuery);

// 1600 이상에서는 Work style 섹션이 About 안으로 합쳐져서 섹션 수가 바뀜
// fullPage.js는 켤 때만 섹션을 세므로, 1600을 넘나들면 껐다가 다시 켬
bigQuery.addEventListener('change', () => {
  destroyFullpage();
  handlePcQuery();
});


/* ===== 1024 미만: 햄버거 메뉴 =====
   닫혀 있을 땐 가운데 줄이 지금 섹션까지 차오름 (Home 1/6 → Contact 6/6)
   모바일은 fullPage.js가 꺼져 있어서 스크롤 위치로 지금 섹션을 계산 */
const menuButton = document.querySelector('.burger');
const mobileMenu = document.querySelector('.mobile_menu');
const pageContent = document.getElementById('fullpage');
const pageSections = [...document.querySelectorAll('#fullpage .section')];
// 메뉴 항목 순서 (Works 섹션 5개는 data-key가 같아서 한 칸으로 셈)
const menuKeys = [...new Set(pageSections.map((section) => section.dataset.key))];

// 화면 가운데 줄을 지나간 마지막 섹션 = 지금 섹션 (맨 아래까지 내리면 Contact)
function updateMobileNav() {
  if (!menuButton || pcQuery.matches) return;
  const middle = window.innerHeight / 2;
  const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;

  let current = pageSections[0];
  pageSections.forEach((section) => {
    if (section.getBoundingClientRect().top <= middle) current = section;
  });
  if (atBottom) current = pageSections.at(-1);
  const index = menuKeys.indexOf(current.dataset.key);

  // Home 40%에서 시작해 Contact 100%까지 (처음부터 햄버거 모양이 분명하게)
  const progress = 0.4 + 0.6 * (index / (menuKeys.length - 1));
  menuButton.style.setProperty('--progress', progress);
  mobileMenu.querySelectorAll('.mobile_menu_list a').forEach((link, i) => {
    if (i === index) link.setAttribute('aria-current', 'true');
    else link.removeAttribute('aria-current');
  });
}

// 원이 퍼지기 시작하는 점 = 버튼 가운데
function placeMenuOrigin() {
  if (!menuButton) return;
  const rect = menuButton.getBoundingClientRect();
  mobileMenu.style.setProperty('--menu-x', `${rect.left + rect.width / 2}px`);
  mobileMenu.style.setProperty('--menu-y', `${rect.top + rect.height / 2}px`);
}

function isMenuOpen() {
  return document.body.classList.contains('is-menu-open');
}

function openMenu() {
  document.body.classList.add('is-menu-open');
  mobileMenu.inert = false;
  pageContent.inert = true; // Tab이 메뉴 뒤 페이지로 새지 않게
  menuButton.setAttribute('aria-expanded', 'true');
  menuButton.setAttribute('aria-label', '메뉴 닫기');
}

// 위쪽 헤더 링크 코드에서도 부르므로 function으로 (어디서든 호출 가능)
function closeMenu() {
  if (!isMenuOpen()) return;
  document.body.classList.remove('is-menu-open');
  mobileMenu.inert = true;
  pageContent.inert = false;
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.setAttribute('aria-label', '메뉴 열기');
}

if (menuButton && mobileMenu) {
  menuButton.addEventListener('click', () => {
    if (isMenuOpen()) closeMenu();
    else openMenu();
  });

  // Esc로 닫기
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && isMenuOpen()) {
      closeMenu();
      menuButton.focus();
    }
  });

  // 열어둔 채 1024 이상으로 넓어지면 닫기 (PC엔 햄버거가 없음)
  pcQuery.addEventListener('change', closeMenu);

  // 스크롤마다 계산하지 않고 한 프레임에 한 번만
  let navTicking = false;
  window.addEventListener('scroll', () => {
    if (navTicking) return;
    navTicking = true;
    requestAnimationFrame(() => {
      updateMobileNav();
      navTicking = false;
    });
  }, { passive: true });

  window.addEventListener('resize', () => {
    placeMenuOrigin();
    updateMobileNav();
  });

  placeMenuOrigin();
  updateMobileNav();
}


/* ===== Works: PC에서 VIEW SITE 원이 마우스를 따라다님 =====
   보이고 숨는 건 CSS(:hover)에서, 여기서는 위치와 클릭만 처리 */
document.querySelectorAll('.project_visual').forEach((visual) => {
  const mockup = visual.querySelector('.project_mockup');
  const link = visual.querySelector('.project_link');
  if (!mockup || !link) return;

  function followMouse(event) {
    if (!pcQuery.matches) return; // 모바일은 버튼이 제자리에 고정
    const rect = visual.getBoundingClientRect();
    link.style.left = `${event.clientX - rect.left}px`;
    link.style.top = `${event.clientY - rect.top}px`;
  }

  mockup.addEventListener('mouseenter', followMouse);
  mockup.addEventListener('mousemove', followMouse);

  // PC에서는 원이 클릭을 안 받아서(pointer-events: none) 이미지를 누르면 링크 열기
  mockup.addEventListener('click', () => {
    if (pcQuery.matches) link.click();
  });

  // 모바일: 누르면 색 원 효과를 먼저 보여주고 0.5초 뒤에 새 탭 열기
  link.addEventListener('click', (event) => {
    if (pcQuery.matches) return; // PC는 hover에서 이미 효과가 나와서 바로 열기
    event.preventDefault();
    if (link.classList.contains('is-active')) return; // 연타 막기
    link.classList.add('is-active');

    setTimeout(() => {
      // 'noopener'를 넣으면 항상 null이 돌아와서, 대신 opener를 직접 끊음
      const opened = window.open(link.href, '_blank');
      if (opened) opened.opener = null;
      else location.href = link.href; // 새 탭이 막히면 현재 탭에서 열기
      link.classList.remove('is-active');
    }, 500);
  });
  // 화면이 1024 미만으로 줄면 모바일 위치(오른쪽 아래)로 돌려놓기
  pcQuery.addEventListener('change', () => {
    link.style.left = '';
    link.style.top = '';
  });
});
