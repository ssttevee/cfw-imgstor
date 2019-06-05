import HttpHash = require('http-hash');

import routers from './routers/index';

async function routeRequest(this: HttpHash, url: URL, request: Request, waitUntil: WaitUntil): Promise<Response> {
    const route = this.get(url.pathname);
    return route && route.handler.call(route, url, request, waitUntil);
}

async function handleRequest(request: Request, waitUntil: WaitUntil): Promise<Response> {
    try {
        const url = new URL(request.url);
        const router = routers[url.hostname];
        if (router) {
            var response = await routeRequest.call(router, url, request, waitUntil);
        }

        return response || new Response('404 not found', { status: 404 });
    } catch (err) {
        return new Response(err.stack, { status: 500 });
    }
}

addEventListener('fetch', (event: FetchEvent) => event.respondWith(handleRequest(event.request, event.waitUntil)));
