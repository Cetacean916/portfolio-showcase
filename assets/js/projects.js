window.PORTFOLIO_PROJECTS = [
  {
    id: "oddroom", code: "WEB 01", filters: ["web"], accent: "coral",
    title: "OddRoom 14페이지 상용 사이트", short: "서비스, 가격, 사례, 문의를 연결한 반응형 브랜드 사이트",
    summary: "14개 역할 페이지와 메뉴, 탭, 필터, 범위 선택, 상담 브리프를 구현하고 GitHub Pages에 공개했습니다.",
    image: "assets/media/oddroom/main-image.png", gallery: ["assets/media/oddroom/detail-01-overview.png", "assets/media/oddroom/detail-02-flow.png", "assets/media/oddroom/detail-03-result.png"],
    facts: [["14", "공개 페이지"], ["2", "반응형 규격"], ["PASS", "배포 검증"]],
    proof: ["14개 HTML 페이지와 404 화면", "데스크톱·모바일 브라우저 스모크", "공개 URL과 정적 배포 산출물"],
    problem: "페이지가 많아도 각 화면의 역할과 구매 흐름이 분리되지 않으면 사용자가 가격과 다음 행동을 놓칩니다.",
    solution: "홈, 서비스, 가격, 사례, 문의를 다른 판단 단계로 설계하고 모든 주요 버튼과 동적 UI를 실제 페이지에 연결했습니다.",
    included: ["페이지 역할과 구매 흐름 설계", "반응형 HTML/CSS/JavaScript", "탭·필터·폼 등 합의한 동적 UI", "메타 정보·404·공개 전 QA"],
    excluded: ["신규 촬영·원고 대필", "회원·결제·복잡한 CMS", "광고 운영·상시 유지보수", "실제 매출 성과 보장"],
    tech: ["HTML", "CSS", "JavaScript", "GitHub Pages", "반응형·접근성 QA"],
    disclosure: "자체 기획한 가상 브랜드 상용 사이트 포트폴리오입니다. 가격과 화면 수치는 실제 고객 성과가 아닙니다.",
    liveUrl: "https://cetacean916.github.io/oddroom-launch/"
  },
  {
    id: "pf01", code: "PF01", filters: ["automation"], accent: "teal",
    title: "AI 고객문의 요약·분류 자동화", short: "문의 요약, 우선순위, 담당팀, 답변 초안을 한 흐름으로",
    summary: "샘플 문의를 분류해 CSV·시트형 결과와 고우선순위 알림 계약까지 확인하는 자동화입니다.",
    image: "assets/media/pf01/main-image.png", gallery: ["assets/media/pf01/detail-01-overview.png", "assets/media/pf01/detail-02-flow.png", "assets/media/pf01/detail-03-result.png"],
    facts: [["15", "처리 문의"], ["4", "긴급 알림"], ["0", "AI 오류"]],
    proof: ["비식별 현행 실행 근거 요약 화면", "정상·오류·경계 테스트", "CSV·시트·알림 출력 계약"],
    problem: "반복 문의를 사람이 처음부터 읽고 분류하면 긴급 문의의 첫 대응이 늦어집니다.",
    solution: "요약, 카테고리, 우선순위, 담당팀, 답변 초안을 생성하고 결과 파일과 알림 대상으로 분리합니다.",
    included: ["문의 요약·분류·우선순위", "담당팀과 답변 초안", "CSV 또는 Google Sheets 출력", "정상·오류 테스트 리포트"],
    excluded: ["운영 서버 배포", "외부 API·SaaS 사용료", "대량 개인정보 처리", "AI 정확도 100% 보장"],
    tech: ["Python", "AI 연동 구조", "Google Sheets", "Slack·Email 계약", "CSV"],
    disclosure: "비식별 샘플 데이터로 제작·검증한 자체 포트폴리오입니다. 실제 계정 연동은 의뢰인 권한으로 별도 검증합니다.",
    demo: {
      url: "demos/pf01/",
      summary: "비식별 기준·합성 문의뿐 아니라 직접 작성한 문의도 즉시 분류해 요약, 우선순위, 담당팀과 답변 초안을 확인할 수 있습니다.",
      boundary: "공개 데모는 외부 AI 연결 없는 키워드 점수 방식입니다. 실제 제작 시에는 의뢰인이 제공하거나 사용을 승인한 AI API, 사내 API 또는 온프레미스 모델에 연동할 수 있으며 계정·사용료·보안 정책은 별도 협의합니다."
    }
  },
  {
    id: "pf02", code: "PF02", filters: ["automation"], accent: "blue",
    title: "폼·웹훅 시트 저장 및 알림", short: "신청 입력을 검증해 시트와 팀 알림으로 전달",
    summary: "필수값, 중복, 알림 실패를 분리하고 공유 비밀 요청 인증과 외부 식별자 마스킹을 적용한 자동화입니다.",
    image: "assets/media/pf02/main-image.png", gallery: ["assets/media/pf02/detail-01-overview.png", "assets/media/pf02/detail-02-flow.png", "assets/media/pf02/detail-03-result.png"],
    facts: [["4", "핵심 예외"], ["2", "출력 채널"], ["PASS", "보안 게이트"]],
    proof: ["웹훅 입력·검증 결과", "중복·알림 실패 기록", "공유 비밀 요청 인증·식별자 마스킹"],
    problem: "상담 신청을 수동으로 옮기거나 알림을 놓치면 응답이 늦고 리드가 유실됩니다.",
    solution: "폼·웹훅을 인증·검증한 뒤 시트형 결과로 저장하고 Slack 또는 Email 알림 상태를 함께 기록합니다.",
    included: ["입력 1종과 필수값 검증", "Google Sheets 또는 시트형 저장", "Slack 또는 Email 알림", "누락·중복·실패 테스트"],
    excluded: ["결제 웹훅", "대량 트래픽 운영", "CRM 전체 구축", "외부 계정·SaaS 비용"],
    tech: ["Python", "Google Apps Script 계약", "Google Sheets", "Slack·Email", "Webhook"],
    disclosure: "비식별 샘플과 로컬 대체 출력으로 검증한 자체 포트폴리오입니다. 외부 계정 연결은 고객 권한으로 마무리합니다.",
    demo: {
      url: "demos/pf02/",
      summary: "정상, 인증 실패, 누락, 중복, 외부 알림 실패를 재현하고 성공 결과는 사용자가 허용한 로컬 기기 알림으로 직접 확인합니다.",
      boundary: "Google Sheets, Slack, Email로 실제 데이터를 전송하지 않습니다. 로컬 기기 알림은 버튼을 누른 뒤 허용한 경우에만 비식별 결과를 표시합니다."
    }
  },
  {
    id: "pf03", code: "PF03", filters: ["automation", "data"], accent: "green",
    title: "엑셀·CSV 정리 및 리포트", short: "정상·오류·중복 파일과 요약 리포트를 자동 생성",
    summary: "샘플 21행을 정상 8행, 오류 11행, 중복 2행으로 분리하고 자동 테스트 7건으로 결과와 경로 이식성을 대조했습니다.",
    image: "assets/media/pf03/main-image.png", gallery: ["assets/media/pf03/detail-01-overview.png", "assets/media/pf03/detail-02-flow.png", "assets/media/pf03/detail-03-result.png"], video: "assets/media/pf03/demo-video.mp4", videoPoster: "assets/media/pf03/video-poster.png",
    facts: [["8", "정상 행"], ["11", "오류 행"], ["2", "중복 행"]],
    proof: ["결과 CSV 3종", "요약 Excel 리포트", "자동 테스트 7건 PASS"],
    problem: "날짜와 연락처 형식, 중복, 필수값 오류를 매번 손으로 찾으면 누락과 판단 차이가 생깁니다.",
    solution: "합의한 컬럼과 검수 규칙을 적용해 정상·오류·중복을 분리하고 같은 건수를 리포트와 테스트에서 확인합니다.",
    included: ["CSV·Excel 입력 1종", "합의한 정리·검수 규칙", "정상·오류·중복 결과", "요약 리포트와 테스트 기록"],
    excluded: ["회계·세무 최종 판단", "운영 DB 직접 연동", "대용량 최적화", "장기 운영 대행"],
    tech: ["Python", "pandas", "openpyxl", "CSV·XLSX", "pytest"],
    disclosure: "비식별 샘플 21행으로 결과와 테스트를 일치시킨 자체 제작 사례입니다.",
    demo: {
      url: "demos/pf03/",
      summary: "샘플 21행을 직접 처리해 정상 8행, 오류 11행, 중복 2행으로 분리하고 결과 CSV를 내려받을 수 있습니다.",
      boundary: "브라우저 안에서 공개 샘플을 재현하는 체험판입니다. 별도 패키지의 Python 실행과 자동 테스트 7건은 검증 근거로 분리해 표시합니다."
    },
    videoSummary: "현행 공개 체험판에서 샘플 21행 처리, 정상·오류·중복 결과 확인과 CSV 저장 흐름을 순서대로 보여줍니다. Python 패키지 실행 근거와 자동 테스트 7건은 별도 검증 자료입니다."
  },
  {
    id: "pf04", code: "PF04", filters: ["automation", "web"], accent: "navy",
    title: "휴가·출장 신청 승인 보드", short: "신청, 팀 캘린더, 승인·반려, CSV 이력을 로컬 웹 화면으로",
    summary: "Node.js 로컬 HTTP API와 정적 HTML UI에서 신청 검증, 팀·기간 필터, 승인 충돌, CSV 내보내기를 확인했습니다.",
    image: "assets/media/pf04/main-image.png", gallery: ["assets/media/pf04/detail-01-overview.png", "assets/media/pf04/detail-02-flow.png", "assets/media/pf04/detail-03-result.png"], video: "assets/media/pf04/demo-video.mp4", videoPoster: "assets/media/pf04/video-poster.png",
    facts: [["3", "초기 신청"], ["1", "승인 대기"], ["2", "처리 완료"]],
    proof: ["작동 데스크톱 웹 화면", "신청·승인·반려·CSV", "360px~데스크톱 반응형"],
    problem: "신청과 승인 이력이 메일, 메신저, 엑셀에 흩어지면 대기 상태와 팀 일정을 함께 보기 어렵습니다.",
    solution: "신청 등록과 검증, 팀 캘린더, 승인·반려, 처리 이력, CSV 저장을 같은 업무 흐름으로 묶었습니다.",
    included: ["신청 등록과 필수값 검증", "목록·필터·팀 캘린더", "승인·반려 상태 처리", "CSV와 테스트 기록"],
    excluded: ["더존 ERP 직접 연동", "전자결재 전체 구축", "복잡한 로그인·권한", "운영 DB·장기 유지보수"],
    tech: ["Node.js 22", "Local HTTP API", "HTML", "CSS·JavaScript", "CSV export"],
    disclosure: "가상 직원·신청 데이터로 제작한 자체 포트폴리오입니다. 실제 인사 규정과 권한은 별도 설계 대상입니다.",
    demo: {
      url: "demos/pf04/",
      summary: "가상 신청을 추가하고 승인·반려한 뒤 팀·상태 필터와 CSV 내보내기까지 직접 조작할 수 있습니다.",
      boundary: "브라우저 메모리에서 동작하는 공개 샘플 체험판입니다. 실제 인사 시스템, 계정, 서버 데이터에는 연결되지 않습니다."
    },
    videoSummary: "현행 공개 체험판에서 신청 생성, 승인·반려, 팀·상태 필터와 CSV 저장 흐름을 순서대로 보여줍니다. Node.js 패키지 검증은 별도 실행 근거입니다."
  },
  {
    id: "pf06", code: "PF06", filters: ["backend"], accent: "red",
    title: "Spring Boot API 오류 수정", short: "500 오류를 재현하고 400·409·201 응답과 테스트로 증명",
    summary: "입력 검증, 예외 처리, 중복 충돌을 수정하고 MockMvc 테스트 5건과 격리 실행 패키지로 재검증했습니다.",
    image: "assets/media/pf06/main-image.png", gallery: ["assets/media/pf06/detail-01-overview.png", "assets/media/pf06/detail-02-flow.png", "assets/media/pf06/detail-03-result.png"], video: "assets/media/pf06/demo-video.mp4",
    facts: [["500→400", "검증 오류"], ["409", "중복 충돌"], ["5/5", "자동 테스트"]],
    proof: ["before 500·after 400/201/409", "MockMvc 자동 테스트 5건", "48.67초 실제 실행 영상"],
    problem: "예측 가능한 잘못된 입력도 500으로 끝나면 호출자가 원인을 알기 어렵고 같은 오류가 반복됩니다.",
    solution: "검증과 도메인 충돌을 명시적인 400·409 응답으로 나누고 정상 201과 함께 회귀 테스트로 고정했습니다.",
    included: ["API 1개 내 합의한 오류", "재현과 수정 코드", "정상·오류·충돌 테스트", "before·after 근거와 노트"],
    excluded: ["운영 DB 직접 수정", "인증·권한 전면 재설계", "결제·정산 핵심 로직", "운영 배포·장기 유지보수"],
    tech: ["Java 21", "Spring Boot", "MockMvc", "JUnit", "H2·Maven"],
    disclosure: "로컬 H2와 더미 요청으로 재현·수정한 자체 제작 사례입니다. 운영 배포와 운영 DB 변경은 포함하지 않습니다.",
    videoSummary: "before 500 재현부터 after 400·201·409 응답과 MockMvc 자동 테스트 5건까지 실제 실행 화면으로 확인합니다."
  }
];
