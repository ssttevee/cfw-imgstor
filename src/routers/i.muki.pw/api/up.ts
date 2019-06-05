import parseFormData from 'fd';

import imgstor from '../../../lib/imgstor';
import { findExt, baseUrl } from '../../../lib/util';

export = async function (url: URL, request: Request): Promise<Response> {
    if (request.method !== 'POST') return new Response(null, { status: 405 });

    try {
        var fd = await parseFormData(request);
    } catch (err) {
        return new Response(err.stack, { status: 400 });
    }

    const user = await imgstor.getUserByApiKey(fd.get('k'));
    if (!user) {
        return new Response(null, { status: 403 });
    }

    const file = fd.get('f');
    if (!file || typeof file === 'string') {
        return new Response(null, { status: 400 });
    }

    const object = await user.store(file, file.name, file.size, file.type);

    return new Response(`0,${baseUrl(url, request)}/${object.key}/${object.id}${findExt(object.name)},${object.numericId()},0`);
}