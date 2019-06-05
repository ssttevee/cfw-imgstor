import { B2Client, File as B2File } from './b2';
import { base63, findExt } from './util';

export class ExistingUserError extends Error { }

export class UnexpectedExtensionError extends Error {
    constructor(public expected: string, public actual: string) {
        super(`unexpected extension: expected "${expected}" but got "${actual}"`);
    }
}

export interface User {
    email: string;
    created: number;
    apiKey: string;

    tail(): Promise<DeletableObject>;
    objects(limit: number, start?: any): Promise<DeletableObject[]>;
    store(reader: ReadableStream<Uint8Array>, name: string, size: number, type?: string): Promise<DeletableObject>;
    delete(object: Object): Promise<void>;

    changeEmail(email: string): Promise<void>;
    changePassword(password: string): Promise<void>;
}

export interface Object {
    id: string;
    key: string;
    created: number;
    fileId: string;
    name: string;
    size: number;
    next: string;
    numericId(): string;
}

interface InternalObject extends Object {
    [NEXT](): Promise<Object>;
    [DOWNLOAD](): Promise<File>;
    [DOWNLOAD_THUMB](): Promise<File>;
}

export interface DeletableObject extends Object {
    delete(): Promise<void>;
}

type InternalDeletableObject = InternalObject & DeletableObject;

export interface File extends ReadableStream<Uint8Array> {
    name: string;
    type: string;
    size: string;
}

declare const B2_ID: string;
declare const B2_KEY: string;
declare const B2_BUCKET: string;

const bucket = new B2Client(B2_ID, B2_KEY).bucket(B2_BUCKET);

const numbers = '0123456789';
const lowerAlpha = 'abcdefghijklmnopqrstuvwxyz';
const upperAlpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const alphanumeric = numbers + lowerAlpha + upperAlpha;
const uppernumeric = numbers + upperAlpha;

function randomString(charset, length) {
    return Array.from(Array(length), () => charset.charAt(Math.floor(Math.random() * charset.length))).join('');
}

function encodeKey(kind: string, ref: string): string {
    return encodeURIComponent(`${kind}:${ref}`);
}

const objectKey: (ref: string) => string = encodeKey.bind(null, 'object');
const tailKey: (ref: string) => string = encodeKey.bind(null, 'tail');
const keyKey: (ref: string) => string = encodeKey.bind(null, 'key');
const userKey: (ref: string) => string = encodeKey.bind(null, 'user');
const hashKey: (ref: string) => string = encodeKey.bind(null, 'hash');
const thumbKey: (ref: string) => string = encodeKey.bind(null, 'thumb');
const prevKey: (ref: string) => string = encodeKey.bind(null, 'prev');

async function digest(algo: string, str: string): Promise<string> {
    const digest = new Uint8Array(await crypto.subtle.digest(algo, Uint8Array.from(new Uint8Array(str.length), (_, i) => str.charCodeAt(i))));
    return Array.from(digest.values()).map((x) => ('0' + x.toString(16)).slice(-2)).join('');
}

const sha256sum: (str: string) => Promise<string> = digest.bind(null, 'SHA-256');
const sha512sum: (str: string) => Promise<string> = digest.bind(null, 'SHA-512');

const NEXT = Symbol('next');
const DOWNLOAD = Symbol('download');
const DOWNLOAD_THUMB = Symbol('download thumb');
const NO_USER = Symbol('no user');

async function deleteObject(this: User, ref: string): Promise<void> {
    throw new Error('not implemented');
}

function makeRef(key: string, id: string): string {
    return `${key}.${id}`;
}

function makeObjectRef(object: Object): string {
    return `${object.key}.${object.id}`;
}

async function generateThumbnail(this: Object): Promise<[string, File]> {
    const file = await bucket.get(this.fileId);
    const res = await fetch('https://muki-image-store--thumb-gen.herokuapp.com/', {
        method: 'POST',
        headers: {
            'content-type': file.get('content-type'),
            'content-length': file.get('content-length'),
        },
        body: file,
    });

    return [
        await bucket.put(res.clone().body, this.name + '.thumb', +res.headers.get('content-length'), {
            contentType: 'image/png',
        }),
        Object.defineProperty(res.body, 'get', {
            value: (k: string) => res.headers.get(k),
        }),
    ];
}

function makeFile(file: B2File): File {
    return Object.defineProperties(file, {
        name: { writable: false, value: this.name },
        type: { writable: false, value: file.get('content-type') },
        size: { writable: false, value: file.get('content-length') },
    });
}

async function downloadObjectThumbnail(this: Object): Promise<File> {
    const key = thumbKey(makeObjectRef(this));
    const fileId = await StorKV.get(key);
    if (!fileId) {
        const [ fileId, file ] = await generateThumbnail.call(this);
        await StorKV.put(key, fileId);
        return makeFile(file);
    }

    return makeFile(await bucket.get(fileId));
}

async function downloadObject(this: Object): Promise<File> {
    const fileId = this.fileId;
    if (!fileId) {
        return;
    }

    return makeFile(await bucket.get(fileId));
}

function makeDeletableObject(this: User, object: InternalObject): DeletableObject {
    return Object.defineProperties(object, {
        delete: { writable: false, value: deleteObject.bind(this, makeObjectRef(object)) },
    });
}

function makeInternalObject(object: any): InternalObject {
    return Object.defineProperties(object, {
        numericId: { writable: false, value: () => base63.parse(makeObjectRef(object)).toString() },
        [NEXT]: { writable: false, value: getObject.bind(this, object.next) },
        [DOWNLOAD]: { writable: false, value: downloadObject.bind(object) },
        [DOWNLOAD_THUMB]: { writable: false, value: downloadObjectThumbnail.bind(object) },
    });
}

async function getObject(this: User, ref: string): Promise<InternalDeletableObject>;
async function getObject(this: typeof NO_USER, ref: string): Promise<InternalObject>;
async function getObject(this: typeof NO_USER | User, ref: string): Promise<InternalDeletableObject> {
    if (!ref) {
        return;
    }

    let object = await StorKV.get(objectKey(ref), 'json');
    if (!object) {
        return;
    }

    object = makeInternalObject(object);

    return this === NO_USER ? object : makeDeletableObject.call(this, object);
}

function getTailRef(userHash: string): Promise<string> {
    return StorKV.get(tailKey(userHash));
}

async function uploadObject(this: User, userHash: string, input: BodyInit, name: string, size: number, type?: string): Promise<InternalDeletableObject> {
    const created = Date.now();

    const fileId = await bucket.put(input, await sha256sum(`${created}-${name || randomString(alphanumeric, 8)}`), size, {
        contentType: type,
    });

    const next = await StorKV.get(tailKey(userHash), 'text');

    while (true) {
        const str = randomString(alphanumeric, 15);
        var key = str.slice(0, 6);
        var id = str.slice(6);
        var ref = makeRef(key, id);

        // "ensure" no collision
        if (!(await StorKV.get(objectKey(ref)))) {
            break;
        }
    }

    const object = { id, key, next, created, fileId, name, size };
    await Promise.all([
        StorKV.put(objectKey(ref), JSON.stringify(object)),
        StorKV.put(tailKey(userHash), ref),
        StorKV.put(prevKey(next), ref),
    ]);

    return makeDeletableObject.call(this, makeInternalObject(object));
}

async function listObjects(this: User, userHash: string, limit: number, start?: any): Promise<InternalDeletableObject[]> {
    const firstObject = start && typeof start === 'string' ? await getObject.call(this, start) : await getTailObject.call(this, userHash);
    if (!firstObject) {
        return [];
    }

    const objects = [firstObject];
    while (objects.length < limit) {
        const object = await objects[objects.length - 1][NEXT]();
        if (!object) {
            break;
        }

        objects.push(object);
    }

    return objects;
}

async function getTailObject(this: User, userHash: string): Promise<InternalDeletableObject> {
    return getObject.call(this, await getTailRef(userHash));
}

async function changeUserEmail(this: User, userHash: string, email: string): Promise<void> {
    const newUserHash = await sha256sum(email);

    await Promise.all([
        StorKV.put(userKey(newUserHash), JSON.stringify(this)),
        StorKV.put(hashKey(newUserHash), await StorKV.get(hashKey(userHash))),
        StorKV.delete(userKey(userHash)),
        StorKV.delete(hashKey(userHash)),
    ]);
}

async function changeUserPassword(this: User, userHash: string, password: string): Promise<void> {
    return StorKV.put(hashKey(userHash), await sha256sum(password));
}

async function getUser(userHash: string): Promise<User> {
    const user = await StorKV.get(userKey(userHash), 'json');
    if (!user) {
        return;
    }

    return Object.defineProperties(user, {
        tail: { writable: false, value: getTailObject.bind(user, userHash) },
        objects: { writable: false, value: listObjects.bind(user, userHash) },
        store: { writable: false, value: uploadObject.bind(user, userHash) },
        delete: { writable: false, value: (object: Object) => deleteObject.call(user, makeObjectRef(object)) },
        changeEmail: { writable: false, value: changeUserEmail.bind(user, userHash) },
        changePassword: { writable: false, value: changeUserPassword.bind(user, userHash) },
    });
}

function parseNumericId(numericId: string): string {
    return base63.encode(BigInt(numericId));
}

export default {
    async createUser(email: string, password: string): Promise<string> {
        const userHash = await sha256sum(email);
        if (await StorKV.get(userKey(userHash))) {
            throw new ExistingUserError();
        }

        const created = Date.now();

        const secretp = sha256sum(password);

        let apiKey;
        while (await StorKV.get(keyKey(apiKey = randomString(uppernumeric, 32)))) { }

        const object = { email, created, apiKey };

        await Promise.all([
            StorKV.put(userKey(userHash), JSON.stringify(object)),
            StorKV.put(hashKey(userHash), await secretp),
            StorKV.put(keyKey(apiKey), userHash),
        ]);

        return apiKey;
    },
    async getUserByCredentials(email: string, password: string): Promise<User> {
        const userHash = await sha256sum(email);

        if (await StorKV.get(hashKey(userHash)) !== await sha256sum(password)) {
            return;
        }

        return getUser(userHash);
    },
    async getUserByApiKey(apiKey: any): Promise<User> {
        if (!apiKey || typeof apiKey !== 'string') {
            return;
        }

        const userHash: string = await StorKV.get(keyKey(apiKey));
        if (!userHash) {
            return;
        }

        return getUser(userHash);
    },
    getObject(key: string, id: string): Promise<Object> {
        return getObject.call(NO_USER, makeRef(key, id));
    },
    getObjectByNumericId(numericId: string): Promise<Object> {
        return getObject.call(NO_USER, parseNumericId(numericId));
    },
    async getFile(key: string, id: string, ext: string): Promise<File> {
        const object: InternalObject = await getObject.call(NO_USER, makeRef(key, id));
        if (!object) {
            return;
        }

        const expectedExt = findExt(object.name);
        if (ext !== expectedExt) {
            throw new UnexpectedExtensionError(expectedExt, ext);
        }

        return object[DOWNLOAD]();
    },
    async getThumbnail(key: string, id: string, ext: string): Promise<File> {
        const object: InternalObject = await getObject.call(NO_USER, makeRef(key, id));
        if (!object) {
            return;
        }

        if (ext !== '.png') {
            throw new UnexpectedExtensionError('.png', ext);
        }

        return object[DOWNLOAD_THUMB]();
    },
}