// 움직임 줄이기 설정 (Header 스크롤, Hero 점에서 같이 씀)
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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

// 페이지 처음 들어올 때 한 번만 재생
if (hero) hero.classList.add('is-play');

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

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
    onLeave: (origin, destination) => {
      header?.classList.toggle('is-scrolled', destination.index > 0);
      updateSideNav(destination.item.dataset.key); // 넘어가기 시작할 때 바로 바뀌게
    },
  });
  isFullpage = true;
  updateSideNav(fullpage_api.getActiveSection().item.dataset.key);
}

function destroyFullpage() {
  if (!isFullpage) return;
  fullpage_api.destroy('all'); // fullPage.js가 넣은 스타일, 감싼 요소 전부 원래대로
  isFullpage = false;
  if (header) updateHeader();
  updateTopBtn();
}

function handlePcQuery() {
  if (pcQuery.matches) initFullpage();
  else destroyFullpage();
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

// 화면 가운데 줄을 지나간 마지막 섹션 = 지금 섹션 (맨 아래까지 내리면 Contact)
function updateMobileNav() {
  if (!menuButton || pcQuery.matches) return;
  const middle = window.innerHeight / 2;
  const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;

  let index = 0;
  pageSections.forEach((section, i) => {
    if (section.getBoundingClientRect().top <= middle) index = i;
  });
  if (atBottom) index = pageSections.length - 1;

  // Home 40%에서 시작해 Contact 100%까지 (처음부터 햄버거 모양이 분명하게)
  const progress = 0.4 + 0.6 * (index / (pageSections.length - 1));
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
