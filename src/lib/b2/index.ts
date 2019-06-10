import { Summer as SHA1Summer } from '../../lib/sha1';

interface FileInfo {
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

interface AuthorizedAccount {
    apiUrl: string;
    downloadUrl: string;
    authorizationToken: string;
}

interface UploadURL {
    uploadUrl: string;
    authorizationToken: string;
}

export class B2APIError extends Error {
    constructor(data: any, ...extra: any[]) {
        super(`B2APIError: ${data.code} - ${data.message} [${extra.join(' ')}]`);
    }
}

function strToBuf(str: string): Uint8Array {
    return new Uint8Array(str.split('').map((c) => c.charCodeAt(0)));
}

function createSummingReadableStream(input: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
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

    const ts = new TransformStream();
    (async function () {
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

export class Download {
    constructor(
        private _reader: ReadableStream<Uint8Array>,
        private _headers: Headers,
    ) {}

    public get reader(): ReadableStream<Uint8Array> {
        return this._reader;
    }

    public get(key: string): string {
        return this._headers.get(key);
    }
}

interface DownloadOptions {
    range?: string;
    contentDisposition?: string;
}

class Bucket {
    constructor(
        private _client: B2Client,
        private _bucketId: string,
    ) {}

    get bucketId(): string {
        return this._bucketId;
    }

    async put(file: ReadableStream<Uint8Array>, name: string, length: number, options: { contentType?: string, checksum?: string }): Promise<FileInfo> {
        const { uploadUrl, authorizationToken }: UploadURL = await this._client[POST]('/b2api/v2/b2_get_upload_url', { bucketId: this._bucketId });

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
        if (res.ok) {
            return data;
        }

        throw new B2APIError(data);
    }

    async info(fileId: string): Promise<FileInfo> {
        return this[POST]('/b2api/v2/b2_get_file_info', { fileId });
    }

    public async downloadByName(name: string, options?: DownloadOptions): Promise<Download> {
        return this[DOWNLOAD_BY_NAME](this._bucketId, name, options);
    }

    public async downloadById(fileId: string, options?: DownloadOptions): Promise<Download> {
        return this._client[DOWNLOAD_BY_ID](fileId, options);
    }
}

const POST = Symbol('post');
const DOWNLOAD_BY_NAME = Symbol('download by name');
const DOWNLOAD_BY_ID = Symbol('download by id');

export class B2Client {
    public static async create(id: string, key: string): Promise<B2Client> {
        const client = new B2Client(id, key);
        await client._refresh();
        return client;
    }

    private _authorizedAccount: AuthorizedAccount;
    private _authToken: string;

    private constructor(id: string, key: string) {
        this._authToken = btoa(`${id}:${key}`);
    }

    private async _refresh(): Promise<void> {
        const res = await fetch('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
            headers: {
                'Authorization': `Basic ${this._authToken}`,
                'Accept': 'application/json',
            },
        });

        const body = await res.json();
        if (!res.ok) {
            throw new B2APIError(body);
        }

        this._authorizedAccount = body;
    }

    public async [POST](path: string, data: any): Promise<any> {
        const { apiUrl, authorizationToken } = this._authorizedAccount;
        const res = await fetch(apiUrl + path, {
            method: 'POST',
            headers: { 'Authorization': authorizationToken },
            body: JSON.stringify(data),
        });

        const json = await res.json();
        if (res.ok) {
            return json;
        }

        switch (json.code) {
            default:
                throw new B2APIError(json);
            case 'expired_auth_token':
            case 'bad_auth_token':
        }
        
        await this._refresh();
        return this[POST](path, data);
    }

    public async [DOWNLOAD_BY_NAME](bucketId: string, name: string, options?: DownloadOptions): Promise<Download> {
        options = options || {};

        const { downloadUrl, authorizationToken } = this._authorizedAccount;

        const headers = {'Authorization': authorizationToken};
        if (options.range) {
            headers['Range'] = options.range;
        }

        const qs = [];
        if (options.contentDisposition) {
            qs.push(`b2ContentDisposition=${encodeURIComponent(options.contentDisposition)}`);
        }

        const res = await fetch(`${downloadUrl}/file/${bucketId}/${name}${qs.length ? '?' + qs.join('&') : ''}`, { headers });
        if (res.status === 200) {
            return new Download(res.body, res.headers);
        }

        const json = await res.json();
        switch (json.code) {
            default:
                throw new B2APIError(json);
            case 'bad_auth_token':
            case 'expired_auth_token':
        }

        await this._refresh();
        return this[DOWNLOAD_BY_NAME](bucketId, name, options);

    }

    public async [DOWNLOAD_BY_ID](fileId: string, options?: DownloadOptions): Promise<Download> {
        options = options || {};
        const { downloadUrl, authorizationToken } = this._authorizedAccount;
        
        const headers = {
            'Authorization': authorizationToken,
            'Content-Type': 'application/json',
        };
        if (options.range) {
            headers['Range'] = options.range;
        }

        const body = { fileId };
        if (options.contentDisposition) {
            body['b2ContentDisposition'] = options.contentDisposition;
        }

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
            return new Download(res.body, res.headers);
        }

        const json = await res.json();
        switch (json.code) {
            default:
                throw new B2APIError(json);
            case 'bad_auth_token':
            case 'expired_auth_token':
        }

        await this._refresh();
        return this[DOWNLOAD_BY_ID](fileId, options);
}

    public bucket(bucketId: string): Bucket {
        return new Bucket(this, bucketId);
    }
}
