type Nullable<T> = T | null;

declare interface WorkersKV {
    get(key: string, type?: 'text'): Promise<Nullable<string>>;
    get(key: string, type: 'json'): Promise<Nullable<any>>;
    get(key: string, type: 'arrayBuffer'): Promise<Nullable<ArrayBuffer>>;
    get(key: string, type: 'stream'): Promise<Nullable<ReadableStream>>;

    put(
        key: string,
        value: string | ReadableStream | ArrayBuffer | FormData,
        expiration?: { expiration: number } | { expirationTtl: number },
    ): void;

    delete(key: string): void;
}

declare const StorKV: WorkersKV;

declare type WaitUntil = (f: Promise<any>) => void;
