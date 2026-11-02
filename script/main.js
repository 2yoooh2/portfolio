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

document.querySelectorAll('.header a[href^="#"]').forEach((link) => {
  link.addEventListener('click', (event) => {
    const target = document.querySelector(link.getAttribute('href'));
    if (!target) return;
    event.preventDefault();
    history.pushState(null, '', link.getAttribute('href')); // 주소창 #도 원래처럼 바뀌게

    // 1024 이상: fullPage.js가 해당 섹션으로 넘겨줌 (moveTo는 1부터 셈)
    if (isFullpage) {
      const sections = [...document.querySelectorAll('#fullpage .section')];
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


/* ===== Contact: 이메일 알약 누르면 주소 복사 ===== */
document.querySelectorAll('.contact_copy').forEach((button) => {
  const label = button.querySelector('.contact_pill_text');
  const original = label.textContent;
  let timer;

  button.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(button.dataset.copy);
      label.textContent = '복사됐어요!';
    } catch {
      label.textContent = '복사에 실패했어요';
    }
    clearTimeout(timer);
    timer = setTimeout(() => (label.textContent = original), 1500);
  });
});


/* ===== 1024 이상: fullPage.js로 섹션 단위 스크롤 =====
   1024 미만은 지금처럼 일반 스크롤. 창 크기가 1024를 넘나들면 켜고 끔 */
const pcQuery = window.matchMedia('(min-width: 1024px)');

function initFullpage() {
  if (isFullpage || typeof fullpage === 'undefined') return;

  new fullpage('#fullpage', {
    licenseKey: '', // fullPage.js v4 라이선스 키 (없으면 콘솔 경고 표시)
    scrollingSpeed: reduceMotion ? 0 : SCROLL_DURATION, // 헤더 링크 스크롤과 같은 0.8초
    verticalCentered: false, // 섹션 안 레이아웃은 지금 CSS 그대로
    scrollOverflow: true,    // 화면보다 긴 섹션은 안에서 스크롤한 뒤 다음 섹션으로
    // 첫 섹션(Hero)을 벗어나면 헤더를 반투명 유리 스타일로
    onLeave: (origin, destination) => {
      header?.classList.toggle('is-scrolled', destination.index > 0);
    },
  });
  isFullpage = true;
}

function destroyFullpage() {
  if (!isFullpage) return;
  fullpage_api.destroy('all'); // fullPage.js가 넣은 스타일, 감싼 요소 전부 원래대로
  isFullpage = false;
  if (header) updateHeader();
}

function handlePcQuery() {
  if (pcQuery.matches) initFullpage();
  else destroyFullpage();
}

handlePcQuery();
pcQuery.addEventListener('change', handlePcQuery);
