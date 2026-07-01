# Project Rules

## 절대 원칙

- 최신 Full Source 기준으로만 개발한다.
- modified_files_only 누적 개발을 금지한다.
- Firebase 구조를 임의로 변경하지 않는다.
- Room 구조를 임의로 변경하지 않는다.
- History 구조를 임의로 변경하지 않는다.
- Presence 구조를 임의로 변경하지 않는다.
- MasterOS Access Gate를 변경하지 않는다.
- Popup 구조와 Responsive 구조를 유지한다.

## 개발 순서

```text
기능
↓
UI 설계
↓
UX 검토
↓
개발
↓
QA
↓
문서 업데이트
↓
GitHub Commit
↓
Deploy
```

## 배포 규칙

1. Full Source에서 수정한다.
2. 로컬에서 기본 동작을 확인한다.
3. QA_CHECKLIST를 업데이트한다.
4. RELEASE_NOTES를 업데이트한다.
5. GitHub Desktop으로 커밋한다.
6. Netlify 배포 후 실제 URL에서 확인한다.

## 코드 변경 주의

- 기존 함수명 변경 금지
- Firebase path 변경 금지
- Room Membership 검증 우회 금지
- 승인 사용자 제한 우회 금지
- 모바일 팝업 중앙 정렬 구조 훼손 금지
- Desktop Dashboard 부활 금지

## RC2.18 특이사항

RC2.18은 문서화와 Help Center 중심 버전입니다. 핵심 데이터 구조 변경은 하지 않습니다.
