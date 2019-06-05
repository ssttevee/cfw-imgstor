import HttpHash from 'http-hash';

declare const require: Function;

export default (function (): HttpHash {
    const router = new HttpHash();

    router.set('/api/auth', (require('../i.muki.pw/api/auth')));
    router.set('/api/hist', (require('../i.muki.pw/api/hist')));
    router.set('/api/up', (require('../i.muki.pw/api/up')));
    router.set('/*', (url: URL) => {
        url.host = 'i.muki.pw'
        return new Response(null, {
          status: 301,
          headers: {
            'location': url.toString(),
          }
        });
    });

    return router;
})();
