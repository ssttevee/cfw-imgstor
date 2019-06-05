import { StreamSearch, MATCH } from '../streamsearch';

var RE_BOUNDARY = /^multipart\/form-data(?:; boundary=(?:"(.+)"|([^\s]+)))$/i;
function parseContentDispositionFields(line: string): { [key: string]: string } {
    const fields = {};
    while (true) {
        const eq = line.indexOf('=');
        if (eq === -1) {
            throw new Error('malformed content-disposition field');
        }

        const key = line.slice(0, eq).trim();
        line = line.slice(eq + 1);

        let value = '';
        if (line[0] === '"') {
            line = line.slice(1);

            while (true) {
                const quote = line.indexOf('"');
                if (quote === -1) {
                    throw new Error('malformed content-disposition field');
                }
                try {
                    if (value[quote - 1] === '\\') {
                        value += line.slice(0, quote + 1);
                    } else {
                        value += line.slice(0, quote);
                        break;
                    }
                } finally {
                    line = line.slice(quote + 1);
                }
            }
        } else {
            const sp = line.indexOf(' ');
            value = line.slice(0, sp);
            line = line.slice(0, sp + 1);
        }

        fields[key] = value;

        const semi = line.indexOf(';');
        if (semi === -1) {
            break;
        } else {
            line = line.slice(semi + 1);
        }
    }

    return fields;
}

async function parseUrlEncodedForm(this: TextDecoder, body: ReadableStream<Uint8Array>): Promise<Map<string, string>> {
    let text = '';

    const reader = body.getReader();
    while (true) {
        const { done, value } = await reader.read();
        if (done) {
            break;
        }

        text += this.decode(value);
    }

    return text.split('&')
        .map((kv) => kv.split('='))
        .reduce((map, [k, v]): Map<string, string> => (map.set(k, decodeURIComponent(v)), map), new Map);
}

function createReadableStream(buffers: Uint8Array[]): ReadableStream<Uint8Array> {
    // return new ReadableStream<Uint8Array>({
    //     pull(controller: ReadableStreamDefaultController) {
    //         for (const buf of buffers) {
    //             controller.enqueue(buf);
    //         }
    //         controller.close();
    //     }
    // });

    const ts = new TransformStream<Uint8Array, Uint8Array>();
    (async function() {
        const w = ts.writable.getWriter();
        for (const buf of buffers) {
            await w.write(buf);
        }
        await w.close();
    })();
    return ts.readable;
    
    // let locked = false;
    // return {
    //     getReader(): ReadableStreamReader<Uint8Array> {
    //         if (locked) {
    //             throw new TypeError('ReadableStreamReader constructor can only accept readable streams that are not yet locked to a reader');
    //         }

    //         locked = true;

    //         let i = 0;
    //         return {
    //             cancel: () => Promise.resolve(),
    //             read: (): Promise<ReadableStreamReadResult<Uint8Array>> => {
    //                 if (i < buffers.length) {
    //                     try {
    //                         return Promise.resolve({ done: false, value: buffers[i] });
    //                     } finally {
    //                         i += 1;
    //                     }
    //                 }
                    
    //                 return Promise.resolve({ done: true, value: null });
    //             },
    //             releaseLock: (): void => {
    //                 locked = false;
    //             }
    //         } as ReadableStreamReader<Uint8Array>;
    //     },
    // } as ReadableStream<Uint8Array>;
}

interface File extends ReadableStream<Uint8Array> {
    name: string;
    type: string;
    size: number;
}

const CRLF = new Uint8Array('\r\n'.split('').map((c) => c.charCodeAt(0)))

async function parseFormPart(this: TextDecoder, buffers: Uint8Array[]): Promise<[string, string | File]> {
    const parts: Uint8Array[][] = [];
    for await (const token of new StreamSearch(CRLF, createReadableStream(buffers))) {
        if (token === MATCH) {
            parts.push([]);
        } else if (!parts.length) {
            throw new Error('malformed multipart/form-data');
        } else {
            parts[parts.length - 1].push(token);
        }
    }

    let headers = new Headers();
    let body: Uint8Array[];
    for (const line of parts.slice(0, -1)) {
        if (body) {
            body.push(...line, CRLF);
            continue;
        }

        if (line.reduce((n, b) => n + b.length, 0) == 0) {
            body = [];
            continue;
        }

        const header = line.reduce((s, b) => s + this.decode(b), new String);
        const sep = header.indexOf(':');
        headers.append(header.slice(0, sep), header.slice(sep + 1).trim());
    }

    body = body.slice(0, body.length - 1);

    const contentDisposition = headers.get('content-disposition');
    if (!contentDisposition.startsWith('form-data;')) {
        // https://tools.ietf.org/html/rfc7578#section-4.2
        throw new Error('malformed multipart/form-data');
    }

    const cdFields = parseContentDispositionFields(contentDisposition.slice(10));

    const name = cdFields['name'];
    if (!name) {
        throw new Error('malformed multipart/form-data');
    }

    const properties = {};
    const filename = cdFields['filename'];
    if (filename) {
        properties['name'] = { writable: false, value: filename }
    }

    const contentType = headers.get('content-type');
    if (contentType) {
        properties['type'] = { writable: false, value: contentType };
    }

    if (!Object.keys(properties).length) {
        return [name, body.reduce((text, buf) => text + this.decode(buf), '')];
    }

    properties['size'] = { writable: false, value: body.reduce((len, buf) => len + buf.length, 0) };

    return [name, Object.defineProperties(createReadableStream(body), properties)];
}

async function parseMultipartForm(this: TextDecoder, boundary: string, body: ReadableStream<Uint8Array>): Promise<Map<string, string | File>> {
    const parts = [];
    for await (const token of new StreamSearch('--' + boundary, body)) {
        if (token === MATCH) {
            parts.push([]);
        } else {
            parts[parts.length - 1].push(token);
        }
    }

    const map = new Map();
    for (const bufs of parts) {
        if (!bufs.length || this.decode(bufs[0]).startsWith('--')) {
            break;
        }

        const [key, value] = await parseFormPart.call(this, bufs);
        map.set(key, value);
    }

    return map;
}

export default async function parseFormData(req: Request): Promise<Map<string, string | File>> {
    const decoder = new TextDecoder();

    const type = req.headers.get('Content-Type');
    if (type.startsWith('application/x-www-form-urlencoded')) {
        return parseUrlEncodedForm.call(decoder, req.body);
    }

    const matches = RE_BOUNDARY.exec(type);
    if (matches && (matches[1] || matches[2])) {
        return parseMultipartForm.call(decoder, matches[1] || matches[2], req.body);
    }

    throw new Error('Unexpected Content-Type header');
}
