// Minimalny service worker: umozliwia instalacje strony jako aplikacji.
// Celowo NIC nie cache'uje - gry dzialaja na zywo, a po wdrozeniu ma byc zawsze swieza wersja.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});
