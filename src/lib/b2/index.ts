import { Summer as SHA1Summer, SumInput, sum as sha1sum } from '../../lib/sha1';

interface B2File {
    accountId: string;
    action: 'start' | 'upload' | 'hide' | 'folder';
    bucketId: string;
    contentLength: number;
    contentSha1: string;
    contentType: string;
    fileId: string;
    fileInfo: { [key: string]: string };
    fileName: string;
    uploadTimestamp: number;
}

export interface B2Bucket {
    bucketId: string;
    put(file: any, name: string, length: number, options?: { contentType?: string, checksum?: string }): Promise<string>;
    get(fileId: string, options?: { range?: string, contentDisposition?: string }): Promise<File>;
}

interface AuthorizedAccount {
    apiUrl: string;
    downloadUrl: string;
    authorizationToken: string;
}

type Uploader = (file: SumInput, name: string, length: number, options: { contentType?: string, checksum?: string }) => Promise<B2File>;
type UploaderFactory = AsyncIterator<Uploader>;

interface UploadURL {
    uploadUrl: string;
    authorizationToken: string;
}

type AccountFunction = (renew?: boolean) => Promise<AuthorizedAccount>;
type AccountFactory = AsyncIterator<AuthorizedAccount>;

export interface File extends ReadableStream<Uint8Array> {
    get(key: string): string;
}

const Expired = Symbol('expired');

export class B2APIError extends Error {
    constructor(data: any, ...extra: any[]) {
        super(`B2APIError: ${data.code} - ${data.message} [${extra.join(' ')}]`);
    }
}

function strToBuf(str: string): Uint8Array {
    return new Uint8Array(str.split('').map((c) => c.charCodeAt(0)));
}

function createSummingReadableStream(input: SumInput): ReadableStream<Uint8Array> {
    if (input instanceof ReadableStream) {
        // if (input instanceof ReadableStream) {
        // const summer = new SHA1Summer();
        // const ts = new TransformStream<Uint8Array, Uint8Array>({
        //     transform(chunk: Uint8Array, controller: TransformStreamDefaultController<Uint8Array>): void {
        //         summer.push(chunk);
        //         controller.enqueue(chunk);
        //     },
        //     flush(controller: TransformStreamDefaultController<Uint8Array>): void {
        //         try {
        //             controller.enqueue(strToBuf(summer.digest('hex')));
        //             controller.terminate();
        //         } finally {
        //             summer.close();
        //         }
        //     }
        // });
        // return input.pipeThrough(ts);

        const ts = new TransformStream();
        (async function() {
            const summer = new SHA1Summer();

            const w = ts.writable.getWriter();
            const r = input.getReader();
            while (true) {
                const { done, value } = await r.read();
                if (done) {
                    break;
                }

                summer.push(value);
                await w.write(value);
            }

            await w.write(strToBuf(summer.digest('hex')));
            await w.close();
        })();

        return ts.readable;
    }

    if (!(input instanceof Uint8Array)) {
        if (typeof input === 'string') {
            input = new Uint8Array(input.split('').map((c) => c.charCodeAt(0)));
        } else if (ArrayBuffer.isView(input)) {
            input = new Uint8Array(input.buffer);
        } else if (input instanceof ArrayBuffer) {
            input = new Uint8Array(input);
        } else {
            throw new Error(`unsupported input type: ${input[Symbol.toStringTag]}`);
        }
    }

    // return new ReadableStream({
    //     async pull(controller: ReadableStreamDefaultController<Uint8Array>): Promise<void> {
    //         controller.enqueue(input as Uint8Array);
    //         controller.enqueue(await sha1sum(input));
    //         controller.close();
    //     },
    // })

    const ts = new TransformStream<Uint8Array, Uint8Array>({
        async transform(chunk, controller): Promise<void> {
            controller.enqueue(chunk);
            controller.enqueue(strToBuf(await sha1sum(chunk, 'hex')));
            controller.terminate();
        },
    });

    (async function() {
        const w = ts.writable.getWriter();
        await w.write(input as Uint8Array);
        await w.close();
    })()

    return ts.readable;
}

async function createUploader(account: AccountFunction, bucketId: string): Promise<Uploader> {
    for (let i = 0; i < 2; i++) {
        const { apiUrl, authorizationToken } = await account(!!i);
        const res = await fetch(apiUrl + '/b2api/v2/b2_get_upload_url', {
            method: 'POST',
            headers: { 'Authorization': authorizationToken },
            body: JSON.stringify({ bucketId }),
        });

        var body = await res.json();
        if (res.status === 200) {
            break;
        }

        switch (body.code) {
            default:
                throw new B2APIError(body);
            case 'expired_auth_token':
        }
    }

    const { uploadUrl, authorizationToken } = body as UploadURL;
    return async (file: SumInput, name: string, length: number, options) => {
        options = options || {};

        let body: BodyInit;
        if (options.checksum) {
            body = file;
        } else {
            body = createSummingReadableStream(file);
        }
        const res = await fetch(uploadUrl, {
            method: 'POST',
            headers: {
                'Authorization': authorizationToken,
                'X-Bz-File-Name': encodeURIComponent(name),
                'Content-Type': options.contentType || 'b2/x-auto',
                'Content-Length': (options.checksum ? length : length + 40).toString(),
                'X-Bz-Content-Sha1': options.checksum || 'hex_digits_at_end',
            },
            body,
        });

        const data = await res.json();

        if (res.status === 200) {
            return data;
        }

        switch (data.code) {
            case 'bad_auth_token':
            case 'expired_auth_token':
            case 'service_unavailable':
                throw Expired;
        }

        throw new B2APIError(data);
    };
}

async function* createUploaderFactory(account: AccountFunction, bucketId: string): UploaderFactory {
    const queue = [];
    while (true) {
        if (queue.length > 0) {
            yield queue.shift();
        } else {
            const uploader = await createUploader(account, bucketId);
            const uploadFn = async function () {
                const result = await uploader.apply(null, arguments);
                // discard this uploader it throws an exception
                queue.push(uploadFn);
                return result;
            } as Uploader;
            yield uploadFn;
        }
    }
}

function createAccountFunc(accountFactory: AccountFactory): AccountFunction {
    let account;
    return async function (renew?: boolean): Promise<AuthorizedAccount> {
        if (!renew && account) {
            return account;
        }

        return ({ value: account } = await accountFactory.next()) && account;
    };
}

class Bucket {
    private _account: AccountFunction;
    private _uploaderPool: UploaderFactory;

    constructor(accountFactory: AccountFactory, private _bucketId: string) {
        this._account = createAccountFunc(accountFactory);
        this._uploaderPool = createUploaderFactory(this._account, this._bucketId);
    }

    get bucketId(): string {
        return this._bucketId;
    }

    async put(file: BodyInit, name: string, length: number, options: { contentType?: string, checksum?: string }): Promise<string>;
    async put(): Promise<string> {
        for (let i = 0; i < 2; i++) {
            const { value } = await this._uploaderPool.next();
            try {
                return (await value.apply(null, arguments)).fileId;
            } catch (err) {
                if (i || err !== Expired) {
                    throw err;
                }
            }

            // retry with new uploader
        }
    }

    async get(fileId: string, options?: { range?: string, contentDisposition?: string }): Promise<File> {
        options = options || {};
        const headers = {};
        if (options.range) {
            headers['Range'] = options.range;
        }

        const body = { fileId };
        if (options.contentDisposition) {
            body['b2ContentDisposition'] = options.contentDisposition;
        }

        for (let i = 0; i < 2; i++) {
            const { downloadUrl, authorizationToken } = await this._account(!!i);
            const res = await fetch(downloadUrl + '/b2api/v2/b2_download_file_by_id', {
                method: 'POST',
                headers: {
                    'Authorization': authorizationToken,
                    'Content-Type': 'application/json',
                    ...headers,
                },
                body: JSON.stringify(body),
            });

            if (res.status === 200) {
                return Object.defineProperty(res.body, 'get', {
                    value: (k: string) => res.headers.get(k),
                });
            }

            const data = await res.json();

            switch (data.code) {
                default:
                    throw new B2APIError(data);
                case 'bad_auth_token':
                case 'expired_auth_token':
                    if (!!i) {
                        throw new B2APIError(data);
                    }
            }

            // retry with a new downloadUrl
        }
    }
}

async function* createAccountFactory(token: string): AsyncIterator<AuthorizedAccount> {
    while (true) {
        const res = await fetch('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
            headers: {
                'Authorization': `Basic ${token}`,
                'Accept': 'application/json',
            },
        });

        const body = await res.json();

        if (res.status === 200) {
            yield body;
        } else {
            throw new B2APIError(body);
        }
    }
}

export class B2Client {
    private _accountFactory: AccountFactory;

    constructor(id: string);
    constructor(id: string, key: string);
    constructor(id_or_token: string, key?: string) {
        let token = id_or_token;
        if (key) {
            token = btoa(id_or_token + ':' + key);
        }

        this._accountFactory = createAccountFactory(token);
    }

    bucket(bucketId: string): Bucket {
        return new Bucket(this._accountFactory, bucketId);
    }
}
