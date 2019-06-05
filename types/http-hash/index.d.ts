declare module "http-hash" {
    class HttpHash<T = any> {
        _hash: HttpHash.RouteNode<T>;
        set(path: string, handler: T): void;
        get(path: string): HttpHash.RouteResult<T>;
    }
    
    namespace HttpHash {
        type RouteResult<T = any> = {
            handler: T | null;
            params: {[param: string]: string};
            splat: string | null;
        }
    
        type RouteNode<T = any> = {
            handler: T;
            fixedPaths: {[path: string]: RouteNode<T>};
            variablePaths: RouteNode<T> | null;
        }
    }

    export = HttpHash;
}
