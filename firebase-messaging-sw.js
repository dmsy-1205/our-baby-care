// =================================================================
// [마스터] 파이어베이스 백그라운드 알림 문지기 (Service Worker)
// =================================================================

// 1. 파이어베이스 본부에서 필요한 도구 로드
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// 2. 내 파이어베이스 고유 주소 설정 (★여기에 본인의 키값을 넣으세요★)
const firebaseConfig = {
  apiKey: "AIzaSyDMVl65SWhqPcxrMY7h_ir7OgPbk7P1LAs",
  authDomain: "our-baby-care.firebaseapp.com",
  projectId: "our-baby-care",
  storageBucket: "our-baby-care.appspot.com",
  messagingSenderId: "564751165",
  appId: "1:564751165:web:12012e95e1240e87e27354"
};

// 3. 파이어베이스 실행 및 메시징 기능 연결
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// 4. 앱이 완전히 꺼져있을 때(백그라운드) 알림을 받으면 폰 화면에 띄우는 명령
messaging.onBackgroundMessage((payload) => {
  console.log('[백그라운드] 알림 도착:', payload);

  const notificationTitle = payload.notification.title || "새로운 메시지";
  const notificationOptions = {
    body: payload.notification.body || "웹앱에서 확인해 보세요!",
    icon: '/icon.png', // 알림창에 뜰 아이콘 이미지 (없으면 기본 브라우저 아이콘으로 대체됨)
    badge: '/icon.png' // 안드로이드 상단바에 뜰 작은 아이콘
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});