import HttpHash, { RouteResult } from 'http-hash';

import imgstor, { File, UnexpectedExtensionError } from '../../lib/imgstor';
import { findExt } from '../../lib/util';

function imageHandler(thumbnail?: boolean): Handler {
    const getFile = thumbnail ? imgstor.getThumbnail : imgstor.getFile;
    return async function image(this: RouteResult, url: URL): Promise<Response> {
        const id = this.params['id'];
        const ext = findExt(id);

        try {
            var file: File = await getFile.call(null, this.params['key'], id.slice(0, id.length - ext.length), ext);
            if (!file) {
                return;
            }
        } catch (err) {
            if (err instanceof UnexpectedExtensionError) {
                return new Response(null, {
                    status: 301,
                    headers: {
                        'Location': url.pathname.slice(0, url.pathname.length - ext.length) + err.expected,
                    }
                });
            }

            throw err;
        }

        return new Response(file, {
            headers: {
                'Content-Length': file.size,
                'Content-Type': file.type,
                'Content-Disposition': `filename="${encodeURIComponent(file.name)}"`,
            },
        });
    }
}

declare type Handler = (this: RouteResult, url: URL, request: Request, waitUntil: WaitUntil) => Response | Promise<Response>;

declare const require: Function;

export default (function (): HttpHash<Handler> {
    const router = new HttpHash<Handler>();

    router.set('/api/auth', (require('./api/auth')));
    router.set('/api/hist', (require('./api/hist')));
    router.set('/api/new', (require('./api/new')));
    router.set('/api/up', (require('./api/up')));
    router.set('/thumb/:key/:id', imageHandler(true));
    router.set('/:key/:id', imageHandler());
    router.set('/test', (require('./test')));
    router.set('/home', () => fetch('https://puushes.storage.googleapis.com/public/index.html'));

    return router;
})();
