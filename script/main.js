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
    // 1600 이상에서 숨긴 Work style 섹션은 빼고 셈
    if (isFullpage) {
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


/* ===== Contact: 복사하기 누르면 이메일 복사 → 체크 + 복사완료! → 3초 뒤 원래대로 ===== */
document.querySelectorAll('.contact_btn--copy').forEach((button) => {
  const label = button.querySelector('.contact_btn_txt');
  let timer;

  button.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(button.dataset.copy);
      button.classList.add('is-copied');
      label.textContent = '복사완료!';
    } catch {
      label.textContent = '복사실패';
    }
    clearTimeout(timer);
    timer = setTimeout(() => {
      button.classList.remove('is-copied');
      label.textContent = '복사하기';
    }, 3000);
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

// 1600 이상에서는 Work style 섹션이 About 안으로 합쳐져서 섹션 수가 바뀜
// fullPage.js는 켤 때만 섹션을 세므로, 1600을 넘나들면 껐다가 다시 켬
const bigQuery = window.matchMedia('(min-width: 1600px)');
bigQuery.addEventListener('change', () => {
  destroyFullpage();
  handlePcQuery();
});


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
