import parseFormData from 'fd';

import imgstor, { Object } from '../../../lib/imgstor';
import { findExt, baseUrl } from '../../../lib/util';

function objectLine(url: URL, request: Request, object: Object): string {
    return `${object.numericId()},${object.created},${baseUrl(url, request)}/${object.key}/${object.id}${findExt(object.name)},${object.name},0,0`
}

export = async function (url: URL, request: Request): Promise<Response> {
    if (request.method !== 'POST') return new Response(null, { status: 405 });

    try {
        var fd = await parseFormData(request);
    } catch (err) {
        return new Response(null, { status: 400 });
    }

    const user = await imgstor.getUserByApiKey(fd.get('k'));
    if (!user) {
        return new Response(null, { status: 403 });
    }

    const list = await user.objects(+fd.get('limit') || 50, fd.get('start'));
    if (!list.length) {
        return new Response();
    }

    return new Response(list.map(objectLine.bind(null, url, request)).join('\n') + '\n', {
        headers: {
            'Next-Cursor': list[list.length - 1].next,
        },
    });
}
