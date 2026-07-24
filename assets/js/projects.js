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
    image: "assets/media/pf01/main-image.png", gallery: ["assets/media/pf01/detail-01-overview.png", "assets/media/pf01/detail-02-flow.png", "assets/media/pf01/detail-03-result.png"], video: "assets/media/pf01/demo-video.mp4", videoPoster: "assets/media/pf01/video-poster.png",
    facts: [["15", "별도 실연동 처리"], ["4", "별도 실연동 알림"], ["0", "샘플 실행 처리 오류"]],
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
    },
    videoSummary: "현행 공개 체험판에서 합성 문의 생성, 직접 문의 입력, 키워드 점수 분류, 분류 근거와 답변 초안, CSV 결과를 순서대로 안내합니다. 실제 AI·Google Sheets·Slack 실행 근거는 별도 패키지 증거로 구분합니다."
  },
  {
    id: "pf02", code: "PF02", filters: ["automation"], accent: "blue",
    title: "폼·웹훅 시트 저장 및 알림", short: "신청 입력을 검증해 시트와 팀 알림으로 전달",
    summary: "필수값, 중복, 알림 실패를 분리하고 공유 비밀 요청 인증과 외부 식별자 마스킹을 적용한 자동화입니다.",
    image: "assets/media/pf02/main-image.png", gallery: ["assets/media/pf02/detail-01-overview.png", "assets/media/pf02/detail-02-flow.png", "assets/media/pf02/detail-03-result.png"], video: "assets/media/pf02/demo-video.mp4", videoPoster: "assets/media/pf02/video-poster.png",
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
    },
    videoSummary: "현행 공개 체험판에서 정상 접수와 인증·검증·행 저장·알림 재현, 주요 예외 시나리오, 사용자 동의형 로컬 기기 알림을 순서대로 안내합니다. 실제 Google Sheets·Slack·Email 실행 근거는 별도 패키지 증거로 구분합니다."
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
  },
  {
    id: "pf07", code: "PF07", filters: ["automation", "backend", "web"], accent: "blue",
    caseUrl: "case-pf07-ko.html",
    title: "OFFSET — 구매와 주문 운영", short: "고객의 구매 경험은 온전히, 운영자의 주문 관리는 자연스럽게.",
    summary: "상품을 발견하고 주문을 마치는 과정과, 접수된 주문을 확인하고 필요한 조치를 이어가는 운영 환경을 서로 독립적으로 설계했습니다.",
    image: "assets/media/pf07/current-ui/ko/storefront-home-desktop.png",
    gallery: ["assets/media/pf07/current-ui/ko/storefront-shop-desktop.png", "assets/media/pf07/current-ui/ko/operator-console-desktop.png", "assets/media/pf07/current-ui/ko/runtime-hub-desktop.png"],
    facts: [["2", "실행 모드"], ["6", "자동 시도 상한"], ["KO ↔ EN", "동일 런타임"]],
    proof: ["실제 WooCommerce·outbox·n8n 경로", "503 실패 후 2회차 200 복구", "보호된 HubSpot·Slack 연결 관측"],
    problem: "주문을 수동으로 CRM과 메신저에 옮기면 누락·중복·부분 성공을 판별하기 어렵습니다.",
    solution: "주문 사실을 outbox에 한 번 기록하고, 주문별 직렬화·서명 검증·write-once checkpoint·재시도·재조정을 같은 운영 흐름으로 묶었습니다.",
    included: ["한국어 중심·영어 전용 상점과 운영 화면", "credential-free DEMO_MODE", "보호된 CONNECTED_MODE", "제한 재시도·수동 복구·reconciliation", "그래픽 실행 허브와 패키지 소유 식별자"],
    excluded: ["실결제·실고객·실매출 처리", "모든 WooCommerce lifecycle·chargeback", "고가용성·production SLA·enterprise scale", "formal exactly-once delivery", "발송 후 응답 유실 구간의 절대적 제거"],
    tech: ["WordPress", "WooCommerce", "PHP", "Action Scheduler", "n8n", "HubSpot API", "Slack API", "Docker Compose"],
    disclosure: "합성 상품·주문과 0 KRW 비금전 경로로 검증한 자체 제작 사례입니다. 실제 도입은 수신자 계정·권한·데이터 범위에 맞춰 다시 검증합니다.",
    sourceUrl: "https://github.com/Cetacean916/oddroom-woo-orderops",
    refinement: {
      mediaBase: "assets/media/pf07/refinement",
      repositoryUrl: "https://github.com/Cetacean916/oddroom-woo-orderops",
      currentDelivery: {
        buildId: "pf07-build-c14f8fe0b8e95bea97bf",
        artifactSetSha256: "74b458a861d51da2e681b1201f138527731a2b87cde38f2f5f47438b3d20833e",
        publicationState: "PUBLIC_PACKAGE_RELEASE_PASS",
        releaseTag: "pf07-v1.0.3",
        immutablePredecessorTag: "pf07-v1.0.2"
      },
      releaseUrl: "https://github.com/Cetacean916/oddroom-woo-orderops/releases/tag/pf07-v1.0.3",
      releaseAssets: [
        { filename: "pf07-windows-x64-1.0.3.zip", url: "https://github.com/Cetacean916/oddroom-woo-orderops/releases/download/pf07-v1.0.3/pf07-windows-x64-1.0.3.zip", sha256: "969dfb6d5dab0c9dbe82554f9329abce5f8917804754b5ad2806a1168930ad80" },
        { filename: "pf07-windows-kvm-test-kit-1.0.3.zip", url: "https://github.com/Cetacean916/oddroom-woo-orderops/releases/download/pf07-v1.0.3/pf07-windows-kvm-test-kit-1.0.3.zip", sha256: "6a8df9b9385ce0b7f85ccd192a0d716db7098641703c3d9e5d30e4474d065703" },
        { filename: "pf07-macos-universal-1.0.3.zip", url: "https://github.com/Cetacean916/oddroom-woo-orderops/releases/download/pf07-v1.0.3/pf07-macos-universal-1.0.3.zip", sha256: "68062ddf03ec688b37e8f17422655e889165c325d91173dd341fdf405ff7aa22" },
        { filename: "pf07-linux-x86_64-1.0.3.tar.gz", url: "https://github.com/Cetacean916/oddroom-woo-orderops/releases/download/pf07-v1.0.3/pf07-linux-x86_64-1.0.3.tar.gz", sha256: "cd60c8b6b280f1347123262d4895b0fdf53e8d6de07eb59020d57fb8c4c67f2e" },
        { filename: "pf07-linux-server-1.0.3.tar.gz", url: "https://github.com/Cetacean916/oddroom-woo-orderops/releases/download/pf07-v1.0.3/pf07-linux-server-1.0.3.tar.gz", sha256: "33fb64edd845273ccc322fe358c0143e359c05c80ca0542fa62da2f363a1a2e4" }
      ],
      evidenceUrls: [
        "https://github.com/Cetacean916/oddroom-woo-orderops",
        "https://github.com/Cetacean916/oddroom-woo-orderops/blob/main/evidence/refinement/public/acceptance-matrix.json",
        "https://github.com/Cetacean916/oddroom-woo-orderops/blob/main/plugin/oddroom-orderops/tests/run.php",
        "https://github.com/Cetacean916/oddroom-woo-orderops/blob/main/workflow/oddroom-orderops-vsl.json",
        "https://github.com/Cetacean916/oddroom-woo-orderops/blob/main/docs/RECOVERY-RUNBOOK.md",
        "https://github.com/Cetacean916/oddroom-woo-orderops/releases/download/pf07-v1.0.3/PF07-RELEASE-MANIFEST.json",
        "assets/media/pf07/execution-proof.json"
      ],
      postCandidateAssets: [
        "own-ui-captures/after-completion/CASE-017_final-clean-restore-rerun_ko.png",
        "own-ui-captures/after-completion/CASE-018_platform-delivery-entrypoints.svg",
        "own-ui-captures/after-completion/CASE-019_final-observation-scorecard.svg",
        "own-ui-captures/after-completion/CASE-020_final-ci-artifact.png"
      ],
      connectedAssets: [
        "own-ui-captures/during-implementation/CASE-014_n8n-execution-evidence.svg",
        "own-ui-captures/during-implementation/CASE-015_hubspot-deal-contact-evidence.svg",
        "own-ui-captures/during-implementation/CASE-016_slack-delivery-evidence.svg"
      ],
      locales: {
        ko: {
          htmlLang: "ko", pageTitle: "OFFSET — 구매 경험과 주문 운영", metaDescription: "고객에게는 자연스러운 구매 경험을, 운영자에게는 이어지는 주문 관리를 제공하는 상점·운영 자동화 사례.",
          nav: { skip: "사례 내용으로 이동", work: "전체 작업", service: "자동화 서비스", standard: "검증 기준", back: "목록으로", home: "Junsoo Work Index 홈", menu: "주요 메뉴" },
          footer: ["Junsoo Work Index · 자체 제작 포트폴리오", "실제 도입은 수신자 계정·권한·데이터 범위에 맞춰 확정합니다."],
          orientation: {
            eyebrow: "TWO EXPERIENCES, ONE HANDOFF",
            title: "각자의 자리에서, 필요한 경험에 집중하도록.",
            body: "고객은 상품을 살펴보고 주문을 마치는 데 집중합니다. 운영 과정은 구매 경험과 섞이지 않으며, 운영자는 접수된 주문의 상태 확인부터 필요한 조치까지 하나의 흐름 안에서 관리합니다."
          },
          overview: {
            eyebrow: "SERVICE OVERVIEW",
            title: "구매 경험과 주문 운영을 한눈에.",
            description: "고객이 상품을 발견하고 주문을 마치는 과정과, 운영자가 접수된 주문을 확인하고 관리하는 과정을 각각의 관점에서 소개합니다.",
            handoff: "고객은 구매를 온전히 마치고, 운영자는 그 주문을 자연스럽게 이어받습니다.",
            shopperTitle: "고객의 구매 경험",
            shopperIntro: "운영 과정에 방해받지 않고 상품 탐색부터 주문 완료까지 이어집니다.",
            shopperSteps: [["상품 발견", "상점에서 상품과 이야기를 살펴봅니다."], ["선택과 주문", "원하는 구성을 선택하고 주문을 마칩니다."], ["주문 완료", "구매 경험은 운영 과정과 섞이지 않은 채 마무리됩니다."]],
            operatorTitle: "운영자의 주문 관리",
            operatorIntro: "완료된 주문을 이어받아 현재 상태와 다음 조치를 확인합니다.",
            operatorSteps: [["주문 접수", "고객이 완료한 주문이 운영 환경에 접수됩니다."], ["상태 확인", "처리 현황과 필요한 조치를 한눈에 확인합니다."], ["처리 완료", "재시도와 복구까지 같은 주문 흐름에서 이어갑니다."]]
          },
          media: {
            guidedEyebrow: "GUIDED SERVICE TOUR",
            guidedTitle: "상점부터 주문 운영까지, 서비스 전체를 짧게 소개합니다.",
            guidedSummary: "고객이 이용하는 상점과 운영자가 사용하는 관리 환경을 먼저 살펴본 뒤, 구매와 주문 관리가 실제로 어떻게 진행되는지 확인할 수 있습니다.",
            detailEyebrow: "REAL USE, BY ROLE",
            detailTitle: "구매와 주문 관리가 실제로 이루어지는 과정.",
            detailSummary: "상품을 선택하고 주문을 마치는 과정과, 접수된 주문을 확인하고 필요한 조치를 이어가는 과정을 각각 확인할 수 있습니다.",
            items: [
              { id: "guided", label: "전체 서비스 소개", title: "구매 경험과 주문 운영 둘러보기", summary: "상점, 상품 선택, 주문 완료, 운영 환경과 주문 확인까지 전체 구성을 짧게 살펴봅니다.", duration: "약 40초", src: "assets/media/pf07/videos/ko/guided-overview.mp4", poster: "assets/media/pf07/posters/ko/guided-overview.png", captions: "assets/media/pf07/captions/ko/guided-overview.vtt", chapters: [["00:00", "서비스 준비"], ["00:06", "상점과 상품"], ["00:13", "상품 선택"], ["00:24", "주문 완료"], ["00:27", "운영자 인계"]] },
              { id: "purchase", label: "구매와 주문 확인", title: "상품 선택부터 주문 인계까지", summary: "고객이 상품을 선택하고 주문을 완료한 뒤, 운영자가 같은 주문을 확인하는 과정을 이어서 보여줍니다.", duration: "약 62초", src: "assets/media/pf07/videos/ko/purchase-delivery.mp4", poster: "assets/media/pf07/posters/ko/purchase-delivery.png", captions: "assets/media/pf07/captions/ko/purchase-delivery.vtt", chapters: [["00:00", "서비스 준비"], ["00:09", "상점 시작"], ["00:20", "상품 선택"], ["00:38", "주문 완료"], ["00:42", "운영자 주문 확인"], ["00:52", "처리 완료"]] },
              { id: "recovery", label: "실패와 복구", title: "실패한 주문을 다시 정상 흐름으로", summary: "운영자가 같은 주문의 실패 상태를 확인하고 재시도하여 복구 완료까지 이어가는 과정입니다.", duration: "약 29초", src: "assets/media/pf07/videos/ko/failure-recovery.mp4", poster: "assets/media/pf07/posters/ko/failure-recovery.png", captions: "assets/media/pf07/captions/ko/failure-recovery.vtt", chapters: [["00:00", "처리 대기"], ["00:09", "실패 상태"], ["00:17", "정상 전환"], ["00:21", "다시 처리"], ["00:28", "복구 완료"]] }
            ]
          },
          breadcrumb: "전체 작업 / 커머스 자동화", eyebrow: "COMMERCE + ORDER OPERATIONS", title: "구매 경험은 온전히,\n주문 운영은 이어지도록.",
          lead: "고객과 운영자, 각자의 과정에 맞춘 커머스 운영 시스템.", summary: "고객은 상품을 발견하고 주문을 마치는 데 집중하고, 운영자는 접수된 주문의 상태와 필요한 조치를 자연스럽게 이어서 관리합니다.",
          sourceAction: "공개 소스 보기", releaseAction: "1.0.3 배포판 보기", overviewAction: "서비스 둘러보기", languageLabel: "언어", facts: [["2", "독립된 사용자 여정"], ["끝까지", "주문 상태 추적"], ["KO · EN", "현지화 경험"]],
          problemTitle: "주문이 넘어간 뒤의 상태가 보이지 않으면, 운영은 다시 수작업이 됩니다.", problem: "주문이 접수돼도 CRM 기록과 팀 알림이 각각 어디까지 처리됐는지 알 수 없으면 누락과 중복 확인이 반복됩니다.",
          solutionTitle: "주문마다 진행 상태와 다음 조치를 남겼습니다.", solution: "주문을 한 번 기록하고, 완료한 단계는 다시 반복하지 않으며, 실패한 단계만 제한적으로 재시도하고 운영자가 복구할 수 있게 구성했습니다.",
          pathTitle: "접수된 주문이 안전하게 전달되는 과정", pathIntro: "고객이 주문을 마친 뒤부터는 주문 사실을 보존하고, 각 전달 단계의 완료 여부를 확인하며, 실패한 지점부터 다시 이어갑니다.",
          pathSteps: [["01", "상점 주문", "상품 선택과 주문 완료"], ["02", "주문 기록", "변하지 않는 주문 정보 보존"], ["03", "전달 처리", "주문별 순차 처리와 제한 재시도"], ["04", "연결 검증", "요청 위변조와 형식 확인"], ["05", "CRM · 팀 알림", "완료 단계별 중복 방지"]],
          surfacesTitle: "구매자와 운영자가 각자 필요한 화면", surfacesIntro: "한 상점 런타임을 한국어 중심·영어 전용 표현으로 전환하며, 상점 식별자와 주문 상태는 유지합니다.",
          surfaces: [["상점", "상품·장바구니·비금전 checkout·주문 정보를 반응형으로 구성했습니다."], ["운영 콘솔", "정상·재시도·수동 판정·복구·재조정을 같은 event ledger에서 확인합니다."], ["그래픽 허브", "시작·상태·언어·모드·초기화를 단말 명령 없이 조작하도록 연결했습니다."], ["DEMO_MODE", "HubSpot·Slack 자격 증명 없이 실제 WooCommerce·outbox·n8n 경로를 결정적 어댑터로 실행합니다."], ["CONNECTED_MODE", "보호된 수신자 자격 증명을 사용하며 토큰과 원격 ID 전체값을 화면에 표시하지 않습니다."]],
          recoveryTitle: "503에서 멈추지 않고, 같은 이벤트로 복구", recoveryIntro: "일시 실패를 실제 outbox에 기록한 뒤 첫 시도 503에서 재시도 대기, 두 번째 시도 200으로 복구되는 상태를 같은 패키지에서 관측했습니다.", recoveryLabels: ["정상 완료 · 1/6 · HTTP 200", "재시도 대기 · 1/6 · HTTP 503", "복구 완료 · 2/6 · HTTP 200"],
          connectedTitle: "데모 어댑터가 아닌, 보호된 연결 경로", connectedIntro: "같은 주문의 ORDER_CREATED·PAYMENT_CONFIRMED를 실제 n8n workflow, HubSpot Contact·Deal, Slack 메시지 경로로 전달했고 공개 패널에는 마스킹된 식별자만 남겼습니다.", connectedLabels: ["n8n 실행 2건 · success", "HubSpot 동일 Contact·Deal checkpoint", "Slack PAYMENT_CONFIRMED · posted"],
          connectedEvidenceTitle: "연결 결과를 화면 증거로 확인", connectedEvidenceIntro: "보호 값은 마스킹하고 n8n·HubSpot·Slack 결과의 상관관계만 공개-safe 패널로 연결했습니다.",
          packageTitle: "사용 환경에 맞춰 바로 시작할 수 있습니다.", packageIntro: "아래 파일은 공개 릴리즈와 최종 검증 결과가 일치하는 1.0.3 배포판입니다. Linux 패키지는 실제 실행과 복구까지 확인했으며, Windows와 macOS는 각 산출물의 검증 범위를 함께 표시합니다.",
          packages: [["Windows", "구매자 패키지와 독립 KVM 테스트 키트", "아티팩트 준비 완료 · native 미실행"], ["macOS", "그래픽 앱 진입점과 최초 실행 복구 안내", "아티팩트 준비 완료 · native 미실행"], ["Linux local", "패키지 소유 clean bootstrap과 로컬 허브", "canonical 바이트 실행 PASS"], ["Linux server", "격리 서버 배포와 선택적 HTTPS 터널", "canonical 바이트 실행 PASS"]],
          downloadLabels: ["Windows x64 구매자 패키지", "Windows KVM 테스트 키트", "macOS universal 패키지", "Linux local x86_64", "Linux server x86_64"], downloadAction: "직접 다운로드",
          finalProofTitle: "공개 1.0.3 배포와 실행 근거", finalProofIntro: "릴리즈에 공개된 파일과 검증에 사용한 파일이 같은지 확인하고, 실제 Linux 실행·복구와 공개 다운로드까지 다시 검증했습니다.", finalProofLabels: ["canonical Linux 시작·중지·복구·재실행 PASS", "Windows·macOS·Linux 배포 파일 5종", "공개 릴리즈 파일 10/10 무인증 readback 일치", "commit 4085e87 · canonical artifact 1.0.3"],
          videoTitle: "실제 실행과 복구 관측", videoIntro: "최종 패키지의 주문 처리와 실패·수동 재시도·복구를 연속 화면으로 확인합니다.", recoveryVideoTitle: "실패 → 재시도 → 복구", recoveryVideoSummary: "실패 worker, 수동 재시도, 복구 worker와 recovered 수렴을 같은 이벤트에서 보여줍니다.", normalVideoTitle: "주문 접수 → 외부 전달 → 완료", normalVideoSummary: "실제 WooCommerce 비금전 주문, outbox pending, 화면에 드러난 worker, completed 수렴을 연속 녹화했습니다.", videoFallback: "이 브라우저는 실행 영상을 지원하지 않습니다.",
          videoLanguageBoundaryTitle: "한국어 런타임 실행 기록", videoLanguageBoundary: "연속 영상은 한국어 런타임에서 기록했습니다. 영어 페이지에는 한국어 화면을 영어 화면인 것처럼 재사용하지 않습니다.", videoLanguageAction: "한국어 실행 기록 보기",
          scorecardTitle: "공개 evidence가 결속한 관측 점수표", scorecardIntro: "보호된 raw observation에서 파생한 10개 public gate의 수치만 연결했습니다.", scorecardHeaders: ["관측 항목", "실제 수치", "근거"], scorecard: [["지원 주문 이벤트", "4종", "GATE-02"], ["서로 다른 변수 입력 주문", "3건", "GATE-03"], ["동시 중복 억제", "worker 3 + retry conflict 1", "GATE-04"], ["자동 시도 상한", "6회 · 2/5/10/20/30초", "GATE-06"], ["부분 실패 복구", "CRM checkpoint 유지 · Slack 총 1", "GATE-07"], ["Reconciliation", "누락 4 + schedule-only 1 · 두 번째 0", "GATE-08"], ["Clean restore", "Deal 1 · payment Slack 1 · duplicate +0", "GATE-10"]],
          evidenceTitle: "소스와 공개 근거", evidenceIntro: "구현과 실행 결과가 어떤 공개 근거에 연결되는지 직접 확인할 수 있습니다.", evidenceLabels: ["공개 소스", "10-gate evidence index", "WordPress tests", "n8n workflow", "복구 runbook", "1.0.3 Release manifest", "실행 영상 무결성 기록"], evidenceAction: "열기 ↗",
          claimsTitle: "입증 범위와 비입증 범위", claimsIntro: "관측한 사실과 추가 도입 검증이 필요한 항목을 분리합니다.", provesTitle: "이 사례가 입증하는 것", notProvesTitle: "이 사례만으로 입증하지 않는 것", whatProves: ["내구 주문 추적을 가진 WooCommerce custom plugin", "중복 억제·제한 재시도·reconciliation 실행", "서명된 n8n adapter의 HubSpot·Slack 연결", "패키지 소유 clean restore 완료"], doesNotProve: ["Production load, scale, uptime, or SLA", "실결제·실고객·실매출 처리", "Formal exactly-once delivery", "Slack accepted/response-lost window의 절대적 제거", "모든 WooCommerce lifecycle edge"], hostingAvailability: "ON_DEMAND_ONLY · 합성 staging runtime은 검증 창에서만 실행하며 정적 case와 evidence는 계속 공개됩니다.",
          scopeTitle: "적합한 의뢰와 아닌 의뢰", fitTitle: "적합", nonFitTitle: "별도 설계 필요", fit: ["주문을 CRM·메신저로 안정적으로 이관", "재시도·수동 판정·재조정이 필요한 운영", "가시적 진행 상태와 복구 근거가 필요한 맞춤형 WooCommerce"], nonFit: ["실결제·실고객 데이터로 즉시 운영해야 하는 요청", "고규모·고가용성·SLA 증명을 요구하는 시스템", "모든 WooCommerce lifecycle와 formal exactly-once를 바로 보증해야 하는 요청"],
          boundaryTitle: "사례 범위", boundary: "합성 상품·주문과 비금전 결제 경로로 검증한 0 KRW 자체 제작 사례입니다. 실제 도입은 수신자 계정·권한·운영 정책에 맞춰 연결 시험과 사용자 인수를 다시 수행합니다."
        },
        en: {
          htmlLang: "en", pageTitle: "OFFSET — buying and order operations", metaDescription: "A commerce system that keeps the customer buying journey focused while giving operators a clear path from order intake to recovery.",
          nav: { skip: "Skip to case study", work: "All work", service: "Automation services", standard: "Delivery standards", back: "Back to work", home: "Junsoo Work Index home", menu: "Main navigation" },
          footer: ["Junsoo Work Index · self-initiated portfolio", "A live rollout is scoped to the recipient accounts, permissions, and data boundary."],
          orientation: {
            eyebrow: "TWO EXPERIENCES, ONE HANDOFF",
            title: "Designed so each role can focus on the experience it needs.",
            body: "Customers stay focused on discovering products and completing their order. Operations never intrude on the buying journey, while operators manage each received order from status review through the next required action in one coherent workflow."
          },
          overview: {
            eyebrow: "SERVICE OVERVIEW",
            title: "Buying and order operations, at a glance.",
            description: "See the customer journey from product discovery to order completion, then follow the operator journey for reviewing and managing the received order.",
            handoff: "The customer completes the purchase on their terms; the operator picks up the order from there.",
            shopperTitle: "Customer buying journey",
            shopperIntro: "Product discovery, selection, and checkout stay free from operational complexity.",
            shopperSteps: [["Discover", "Browse the store and learn what each product offers."], ["Choose and order", "Select the right option and complete the order."], ["Complete", "Finish the buying journey without entering the operating process."]],
            operatorTitle: "Operator order management",
            operatorIntro: "A completed order arrives with the status and next action ready to review.",
            operatorSteps: [["Receive", "The completed customer order enters the operating environment."], ["Review", "See its current status and the next required action."], ["Resolve", "Continue through retries and recovery within the same order history."]]
          },
          media: {
            guidedEyebrow: "GUIDED SERVICE TOUR",
            guidedTitle: "A short tour from storefront to order operations.",
            guidedSummary: "Start with the store customers use and the management environment operators use, then see how purchasing and order management work in practice.",
            detailEyebrow: "REAL USE, BY ROLE",
            detailTitle: "How buying and order management work in practice.",
            detailSummary: "Follow product selection and order completion from the customer side, then see how operators review the received order and continue with the actions it needs.",
            items: [
              { id: "guided", label: "Complete service tour", title: "Buying and order operations in one tour", summary: "A concise introduction to the store, product selection, checkout, the operating environment, and order review.", duration: "About 40 seconds", src: "assets/media/pf07/videos/en/guided-overview.mp4", poster: "assets/media/pf07/posters/en/guided-overview.png", captions: "assets/media/pf07/captions/en/guided-overview.vtt", chapters: [["00:00", "Service ready"], ["00:06", "Store and catalog"], ["00:13", "Product choice"], ["00:24", "Order complete"], ["00:26", "Operator handoff"]] },
              { id: "purchase", label: "Purchase and handoff", title: "From product choice to operator handoff", summary: "A customer selects a product and completes the order before an operator reviews that same order.", duration: "About 62 seconds", src: "assets/media/pf07/videos/en/purchase-delivery.mp4", poster: "assets/media/pf07/posters/en/purchase-delivery.png", captions: "assets/media/pf07/captions/en/purchase-delivery.vtt", chapters: [["00:00", "Service ready"], ["00:09", "Enter the store"], ["00:20", "Choose a product"], ["00:37", "Complete the order"], ["00:41", "Operator review"], ["00:50", "Processing complete"]] },
              { id: "recovery", label: "Failure and recovery", title: "Bring a failed order back into flow", summary: "An operator reviews the failed state, retries the same order, and confirms its recovery.", duration: "About 23 seconds", src: "assets/media/pf07/videos/en/failure-recovery.mp4", poster: "assets/media/pf07/posters/en/failure-recovery.png", captions: "assets/media/pf07/captions/en/failure-recovery.vtt", chapters: [["00:00", "Awaiting processing"], ["00:08", "Failed state"], ["00:13", "Restore normal"], ["00:16", "Retry processing"], ["00:23", "Recovered"]] }
            ]
          },
          breadcrumb: "All work / Commerce automation", eyebrow: "COMMERCE + ORDER OPERATIONS", title: "A focused buying journey.\nOrder operations that pick up naturally.",
          lead: "A commerce system shaped around the distinct needs of customers and operators.", summary: "Customers stay focused on discovering products and completing an order. Operators pick up each received order with its status and required actions clearly in view.",
          sourceAction: "View public source", releaseAction: "View release 1.0.3", overviewAction: "Explore the service", languageLabel: "Language", facts: [["2", "independent user journeys"], ["End to end", "order-state visibility"], ["KO · EN", "localized experience"]],
          problemTitle: "When post-purchase status disappears, operations fall back to manual checks.", problem: "If a team cannot see whether CRM updates and notifications completed, every order creates another round of omission and duplicate checks.",
          solutionTitle: "Each order keeps its progress and next action.", solution: "The system records the order once, preserves completed steps, retries only the failed stage within a clear limit, and gives operators a direct recovery path.",
          pathTitle: "How a completed order reaches each destination safely", pathIntro: "After the customer completes the order, the service preserves the order fact, checks each delivery stage, and resumes from the point that needs attention.",
          pathSteps: [["01", "Store order", "Product selection and checkout"], ["02", "Order record", "A stable record of the completed order"], ["03", "Delivery processing", "Per-order sequencing and bounded retry"], ["04", "Connection checks", "Request integrity and format validation"], ["05", "CRM · team alert", "Completion checkpoints prevent duplicates"]],
          surfacesTitle: "A clear surface for buyers and operators", surfacesIntro: "The same store runtime switches between Korean-primary and English-only presentation while preserving store identity and order state.",
          surfaces: [["Storefront", "Responsive catalog, cart, synthetic checkout, and account views form one coherent buying journey."], ["Operator console", "Normal, retrying, operator-decision, recovered, and reconciled events remain visible in one ledger."], ["Graphical hub", "Start, status, language, mode, and confirmed reset controls are available without terminal commands."], ["DEMO_MODE", "Runs real WooCommerce, outbox, and n8n behavior without HubSpot or Slack credentials; deterministic adapters cover only the service edges."], ["CONNECTED_MODE", "Uses protected recipient credentials while keeping tokens and full remote identifiers out of the interface."]],
          recoveryTitle: "From HTTP 503 to recovery on the same event", recoveryIntro: "A real package outbox recorded the first HTTP 503, entered retry wait, then recovered with HTTP 200 on attempt two.", recoveryLabels: ["Normal · 1/6 · HTTP 200", "Retry wait · 1/6 · HTTP 503", "Recovered · 2/6 · HTTP 200"],
          connectedTitle: "A protected delivery path, not a demo-edge substitute", connectedIntro: "ORDER_CREATED and PAYMENT_CONFIRMED for one synthetic order traversed the actual n8n workflow, HubSpot Contact and Deal checkpoints, and Slack message path. Public panels retain masked identifiers only.", connectedLabels: ["Two successful n8n executions", "Same HubSpot Contact and Deal checkpoints", "Slack PAYMENT_CONFIRMED posted"],
          connectedEvidenceTitle: "See the connected result, not just the claim", connectedEvidenceIntro: "Protected values stay masked while public-safe panels bind the n8n, HubSpot, and Slack outcomes.",
          packageTitle: "Start with the package for your environment.", packageIntro: "These are the exact 1.0.3 files matched between the public release and final verification. The Linux package was exercised through start and recovery; Windows and macOS retain their stated artifact-validation boundaries.",
          packages: [["Windows", "Buyer package plus a separate KVM test kit", "artifact ready · native not run"], ["macOS", "Graphical app entry and first-run recovery guidance", "artifact ready · native not run"], ["Linux local", "Package-owned clean bootstrap and local hub", "canonical-byte execution PASS"], ["Linux server", "Isolated server deployment with optional HTTPS tunnel", "canonical-byte execution PASS"]],
          downloadLabels: ["Windows x64 buyer package", "Windows KVM test kit", "macOS universal package", "Linux local x86_64", "Linux server x86_64"], downloadAction: "Direct download",
          finalProofTitle: "Published 1.0.3 delivery evidence", finalProofIntro: "The public downloads were matched to the files used for validation, then checked again through Linux start and recovery plus unauthenticated public download.", finalProofLabels: ["Canonical Linux start, stop, recovery, and rerun PASS", "Five Windows, macOS, and Linux delivery packages", "10/10 public release assets matched by unauthenticated readback", "Commit 4085e87 · canonical artifact 1.0.3"],
          videoTitle: "Observed execution and recovery", videoIntro: "Continuous recordings show final-package order handling and the failure, manual-retry, and recovery path.", recoveryVideoTitle: "Failure → retry → recovery", recoveryVideoSummary: "The same event shows the failure worker, manual retry, recovery worker, and convergence to recovered.", normalVideoTitle: "Order → delivery → completion", normalVideoSummary: "A real non-monetary WooCommerce order proceeds through outbox pending, a visible worker, and completed delivery.", videoFallback: "This browser does not support the execution video.",
          videoLanguageBoundaryTitle: "Korean runtime execution record", videoLanguageBoundary: "The continuous recording was captured from the Korean runtime. This English page does not present Korean screens as English UI evidence.", videoLanguageAction: "View the Korean execution record",
          scorecardTitle: "Observed scorecard bound to public evidence", scorecardIntro: "Only values derived from the ten public gates are shown.", scorecardHeaders: ["Observation", "Observed value", "Evidence"], scorecard: [["Supported order events", "4 types", "GATE-02"], ["Distinct variable-input orders", "3", "GATE-03"], ["Concurrent duplicate suppression", "worker 3 + retry conflict 1", "GATE-04"], ["Automatic-attempt cap", "6 · 2/5/10/20/30 seconds", "GATE-06"], ["Partial-failure recovery", "CRM checkpoint kept · Slack total 1", "GATE-07"], ["Reconciliation", "missing 4 + schedule-only 1 · second scan 0", "GATE-08"], ["Clean restore", "Deal 1 · payment Slack 1 · duplicate +0", "GATE-10"]],
          evidenceTitle: "Source and public evidence", evidenceIntro: "Review the public sources that support the implementation and observed results.", evidenceLabels: ["Public source", "10-gate evidence index", "WordPress tests", "n8n workflow", "Recovery runbook", "1.0.3 Release manifest", "Execution-video integrity record"], evidenceAction: "Open ↗",
          claimsTitle: "What this proves and does not prove", claimsIntro: "Observed facts stay separate from claims that require deployment-specific validation.", provesTitle: "What this case proves", notProvesTitle: "What this case does not prove", whatProves: ["A WooCommerce custom plugin with durable order tracking", "Executed duplicate suppression, bounded retry, and reconciliation", "A signed n8n adapter connected to HubSpot and Slack", "A completed package-owned clean restore"], doesNotProve: ["Production load, scale, uptime, or SLA", "Live payments, customers, or revenue", "Formal exactly-once delivery", "Absolute removal of the Slack accepted/response-lost window", "Every WooCommerce lifecycle edge"], hostingAvailability: "ON_DEMAND_ONLY · The synthetic staging runtime operates only during validation windows; the static case and evidence remain public.",
          scopeTitle: "Where this package fits", fitTitle: "Good fit", nonFitTitle: "Needs separate design", fit: ["Reliable WooCommerce handoff into CRM and team messaging", "Operations that need bounded retry, operator decision, and reconciliation", "Custom commerce work that needs visible state and recovery evidence"], nonFit: ["Immediate production use with live payments or customer data", "Systems that already require large-scale availability or SLA proof", "Requests that demand every WooCommerce lifecycle edge and formal exactly-once guarantees"],
          boundaryTitle: "Case boundary", boundary: "This is a 0 KRW self-initiated case validated with synthetic products, orders, and a non-monetary checkout path. A live rollout repeats connection testing and acceptance against the recipient accounts, permissions, and operating policy."
        }
      }
    }
  }
];
