import { Base } from 'baseconv';

export function findExt(name: string): string {
    const dot = name.lastIndexOf('.');
    return dot === -1 ? '' : name.slice(dot);
}

export function baseUrl(url: URL, request: Request): string {
    const forwardedProto = request.headers.get('x-muki-forwarded-proto');
    const forwardedHost = request.headers.get('x-muki-forwarded-host');
    return `${forwardedProto || url.protocol}//${forwardedHost || url.host}`;
}

export const base63 = new Base('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ.');
