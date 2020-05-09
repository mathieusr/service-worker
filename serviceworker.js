var urlsToCache = [
    '/js/main.js',
    '/js/service.js'
];
  
self.addEventListener('install', function (event) {
event.waitUntil(
    caches.open(cacheVersion)
    .then(function (cache) {
        return cache.addAll(urlsToCache);
    })
);
});

self.addEventListener('fetch', function (event) {
const url = new URL(event.request.url);
const link = `${url.origin}${url.pathname}`;

if (event.request.method === 'GET') {
    event.respondWith(
    caches.match(event.request)
        .then(function (response) {
        return response || fetch(event.request)
            .then(function (response) {
            const responseClone = response.clone();
            caches.open(cacheVersion)
                .then(function (cache) {
                cache.put(event.request, responseClone);
                });

            return response;
            })
        })
        .catch(function () {
        return caches.match('index.html');
        })
    )
}
});