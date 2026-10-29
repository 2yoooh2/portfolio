// ===== fullPage.js + About 합치기 =====
// 1024px 미만: 일반 스크롤
// 1024px ~ 1439px: 풀페이지, About 1 / About 2 각각 한 화면
// 1440px 이상: 풀페이지, About 한 화면 안에 좌우로

(function () {
  var mq = window.matchMedia('(min-width: 1440px)');
  var container = document.getElementById('fullpage');
  var about = container.querySelector('[data-key="about"]');
  var about2 = container.querySelector('[data-key="about2"]');
  var panel2 = about2.querySelector('.about-panel');

  // 합치기: about2의 패널을 about으로 옮기고 about2 섹션은 뗀다
  // 나누기: 원래 구조로 되돌린다
  function applyLayout(merged) {
    if (merged) {
      about.appendChild(panel2);
      about2.remove();
    } else {
      about2.appendChild(panel2);
      about.after(about2);
    }
  }

  // fullPage.js 켜기 (섹션 개수가 바뀌므로 anchors는 data-key에서 매번 새로 읽음)
  function init(startAnchor) {
    var sections = container.querySelectorAll(':scope > .section');
    new fullpage('#fullpage', {
      licenseKey: 'gplv3-license', // 비상업용(GPLv3) 무료 키
      responsiveWidth: 1024,       // 1024px 미만에서는 일반 스크롤
      anchors: Array.from(sections, function (s) { return s.dataset.key; }),
      menu: '.nav',                // 현재 섹션 메뉴에 active 클래스 자동으로 붙음
      paddingTop: '80px',          // 고정 헤더 높이만큼 섹션 내용 내리기 (style.css의 --header-height와 같게)
      verticalCentered: false,     // 패널이 섹션 높이를 꽉 채우도록
      scrollOverflow: false,       // true면 섹션 안을 div로 한 번 더 감싸서 About 좌우 배치가 깨짐
      afterRender: function () {
        if (startAnchor) fullpage_api.silentMoveTo(startAnchor);
      }
    });
  }

  // 합쳐진 상태에선 about2가 없으므로 about으로 대체
  function resolveAnchor(anchor, merged) {
    return merged && anchor === 'about2' ? 'about' : anchor;
  }

  // 1440px 경계를 넘을 때: 끄고 → 구조 바꾸고 → 보던 섹션에서 다시 켜기
  function rebuild(merged) {
    var active = fullpage_api.getActiveSection();
    var anchor = active ? active.anchor : null;
    fullpage_api.destroy('all');
    applyLayout(merged);
    var target = resolveAnchor(anchor, merged);
    if (target && target !== anchor) history.replaceState(null, '', '#' + target);
    init(target);
  }

  // 처음 열 때
  if (mq.matches) {
    applyLayout(true);
    if (location.hash === '#about2') history.replaceState(null, '', '#about');
  }
  init();

  // 1440px 경계를 넘을 때만 한 번씩 실행 (창 크기 바꿀 때마다 실행 X)
  mq.addEventListener('change', function (e) { rebuild(e.matches); });
})();
