self.addEventListener('install', function (event) {
    event.waitUntil(
        caches.open('v1')
            .then(() => cache.addAll([
                    '/js/main.js',
                    '/js/service.js'
                ])
            )
            .then(self.skipWaiting())
    );
});

self.addEventListener('fetch', function (event) {
    const url = new URL(event.request.url);

    if (event.request.url.startsWith(self.location.origin) && event.request.method === 'GET') {
        event.respondWith(
            caches.match(event.request)
                .then(function (response) {
                    
                    if(response) return response;
                    
                    
                    return fetch(event.request)
                        .then(function (response) {
                            const responseClone = response.clone();
                            caches.open('v1')
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