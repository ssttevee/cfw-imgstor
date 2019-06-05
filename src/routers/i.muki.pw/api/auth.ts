import parseFormData from 'fd';

import imgstor from '../../../lib/imgstor';

export = async function(url: URL, request: Request): Promise<Response> {
    if (request.method !== 'POST') return new Response(null, { status: 405 });

    try {
        var fd = await parseFormData(request);
    } catch (err) {
        return new Response(null, { status: 400 });
    }

    const email = fd.get('e');
    const password = fd.get('p');

    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
        return new Response(null, { status: 400 });
    }

    const user = await imgstor.getUserByCredentials(email, password);
    if (!user) {
        return new Response(null, { status: 401 });
    }

    return new Response(`1,${user.apiKey},Never!,0`);
}