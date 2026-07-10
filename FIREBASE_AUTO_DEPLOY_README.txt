HearMe2nite Firebase Hosting 자동 배포 설정

1. 이 ZIP의 파일을 프로젝트 루트에 그대로 덮어씁니다.
2. GitHub Desktop에서 변경사항을 commit하고 main 브랜치로 push합니다.
3. GitHub 저장소의 Actions 탭에서 "Deploy to Firebase Hosting on main" 작업을 확인합니다.
4. 작업이 성공하면 https://our-baby-care.web.app 에 자동 반영됩니다.

자동 배포에 사용되는 GitHub Secret:
FIREBASE_SERVICE_ACCOUNT_OUR_BABY_CARE

현재 PR 미리보기 워크플로에서도 같은 Secret을 사용하고 있으므로,
기존 PR 배포가 설정되어 있다면 별도의 Secret 추가가 필요하지 않을 가능성이 높습니다.

수동 배포가 필요할 때:
프로젝트 루트의 deploy-firebase-hosting.bat 파일을 더블클릭합니다.
Firebase CLI 로그인이 되어 있어야 합니다.
