# 제품·패키지 동결 후 공개 수락본

아래 파일은 동결된 한·영 UI와 최종 공개 build `pf07-build-fc73e14334ce507a9844`의 정확한 CI·Release·Linux 실행 사실에 맞춰 공개 경계를 검토했습니다.

- `CASE-005~007`: 한국어 데스크톱·모바일과 실제 영어 전용 상점
- `CASE-008`: 실제 한국어 variable product 상세
- `CASE-009`: 같은 브라우저 세션의 실제 장바구니·결제 화면
- `GUIDE-001~002`: 최종 Windows buyer/KVM 산출물의 파일명·해시·진입점 기반 한·영 안내
- `GUIDE-003~004`: 최종 macOS app bundle의 파일명·해시·진입점 기반 한·영 안내
- `GUIDE-005`: 실제 실행한 최종 Linux local package 허브의 Ready 화면
- `GUIDE-007`: 새로 추출해 실행한 최종 Linux server package의 실제 `server/pf07-server status` 화면
- `GUIDE-008`: 실제 최종 Linux package에서 HTTPS 터널을 켠 상태의 허브 제어 화면
- `CASE-017`: exact final-CI Linux package의 암호화 백업 복원·재실행 직후 실제 Ready 허브
- `CASE-018`: 최종 5개 플랫폼 산출물의 파일명·해시·진입점·실행 경계 패널
- `CASE-019`: 580개 브라우저 관측, VSL·backend 검사, canonical runtime, 공개 Release 읽기 결과의 점수표
- `CASE-020`: commit `5488672`의 성공한 public GitHub Actions run과 `pf07-canonical-packages-1.0.0` 산출물 실제 화면

`GUIDE-001~004`와 `CASE-018`은 계약에 따라 실제 Windows/macOS 화면을 흉내 내지 않으며 native execution 미주장 경계를 표시합니다. `GUIDE-005`, `GUIDE-007`, `GUIDE-008`, `CASE-017`은 실제 Linux 실행 화면이고 `CASE-020`은 무인증으로 열어 확인한 실제 public CI 화면입니다. `CASE-017~020`은 PF07 release commit과 패키지 안에 들어가지 않는 showcase-only 후행 산출물입니다. 모든 공개 캡처에는 실제 고객·결제·자격 증명·로컬 절대경로가 없습니다.
