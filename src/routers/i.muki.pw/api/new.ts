import parseFormData from 'fd';

import imgstor, { ExistingUserError } from '../../../lib/imgstor';

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

    try {
        await imgstor.createUser(email, password);
    } catch (err) {
        if (err instanceof ExistingUserError) {
            return new Response(null, { status: 409 });
        }

        throw err;
    }

    return new Response();
}
