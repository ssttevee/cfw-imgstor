/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// create a fake namespace object
/******/ 	// mode & 1: value is a module id, require it
/******/ 	// mode & 2: merge all properties of value into the ns
/******/ 	// mode & 4: return value when already ns object
/******/ 	// mode & 8|1: behave like require
/******/ 	__webpack_require__.t = function(value, mode) {
/******/ 		if(mode & 1) value = __webpack_require__(value);
/******/ 		if(mode & 8) return value;
/******/ 		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
/******/ 		var ns = Object.create(null);
/******/ 		__webpack_require__.r(ns);
/******/ 		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
/******/ 		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
/******/ 		return ns;
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 0);
/******/ })
/************************************************************************/
/******/ ({

/***/ "./local_modules/fd/index.ts":
/*!***********************************!*\
  !*** ./local_modules/fd/index.ts ***!
  \***********************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const streamsearch_1 = __webpack_require__(/*! ../streamsearch */ "./local_modules/streamsearch/index.ts");
var RE_BOUNDARY = /^multipart\/form-data(?:; boundary=(?:"(.+)"|([^\s]+)))$/i;
function parseContentDispositionFields(line) {
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
                    }
                    else {
                        value += line.slice(0, quote);
                        break;
                    }
                }
                finally {
                    line = line.slice(quote + 1);
                }
            }
        }
        else {
            const sp = line.indexOf(' ');
            value = line.slice(0, sp);
            line = line.slice(0, sp + 1);
        }
        fields[key] = value;
        const semi = line.indexOf(';');
        if (semi === -1) {
            break;
        }
        else {
            line = line.slice(semi + 1);
        }
    }
    return fields;
}
async function parseUrlEncodedForm(body) {
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
        .reduce((map, [k, v]) => (map.set(k, decodeURIComponent(v)), map), new Map);
}
function createReadableStream(buffers) {
    // return new ReadableStream<Uint8Array>({
    //     pull(controller: ReadableStreamDefaultController) {
    //         for (const buf of buffers) {
    //             controller.enqueue(buf);
    //         }
    //         controller.close();
    //     }
    // });
    const ts = new TransformStream();
    (async function () {
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
const CRLF = new Uint8Array('\r\n'.split('').map((c) => c.charCodeAt(0)));
async function parseFormPart(buffers) {
    const parts = [];
    for await (const token of new streamsearch_1.StreamSearch(CRLF, createReadableStream(buffers))) {
        if (token === streamsearch_1.MATCH) {
            parts.push([]);
        }
        else if (!parts.length) {
            throw new Error('malformed multipart/form-data');
        }
        else {
            parts[parts.length - 1].push(token);
        }
    }
    let headers = new Headers();
    let body;
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
        properties['name'] = { writable: false, value: filename };
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
async function parseMultipartForm(boundary, body) {
    const parts = [];
    for await (const token of new streamsearch_1.StreamSearch('--' + boundary, body)) {
        if (token === streamsearch_1.MATCH) {
            parts.push([]);
        }
        else {
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
async function parseFormData(req) {
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
exports.default = parseFormData;


/***/ }),

/***/ "./local_modules/streamsearch/index.ts":
/*!*********************************************!*\
  !*** ./local_modules/streamsearch/index.ts ***!
  \*********************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
/*
  Based heavily on the Streaming Boyer-Moore-Horspool C++ implementation
  by Hongli Lai at: https://github.com/FooBarWidget/boyer-moore-horspool
*/
function jsmemcmp(buf1, pos1, buf2, pos2, num) {
    for (var i = 0; i < num; ++i) {
        if (buf1[pos1 + i] !== buf2[pos2 + i]) {
            return false;
        }
    }
    return true;
}
exports.MATCH = Symbol('Match');
class StreamSearch {
    constructor(needle, _readableStream) {
        this._readableStream = _readableStream;
        this._lookbehind = new Uint8Array();
        if (typeof needle === 'string') {
            this._needle = needle = new Uint8Array(needle.split('').map((c) => c.charCodeAt(0)));
        }
        else {
            this._needle = needle;
        }
        this._lastChar = needle[needle.length - 1];
        // Populate occurrence table with analysis of the needle,
        // ignoring last letter.
        this._occ = Array.from(new Array(256), () => needle.length);
        if (needle.length > 0) {
            for (let i = 0; i < needle.length - 1; i++) {
                this._occ[needle[i]] = needle.length - 1 - i;
            }
        }
    }
    async *[Symbol.asyncIterator]() {
        const reader = this._readableStream.getReader();
        try {
            while (true) {
                const { done, value: chunk } = await reader.read();
                if (done) {
                    return;
                }
                let pos = 0;
                let tokens;
                while (pos !== chunk.length) {
                    [pos, ...tokens] = this._feed(chunk, pos);
                    yield* tokens;
                }
            }
        }
        finally {
            reader.releaseLock();
        }
    }
    _feed(data, buf_pos) {
        const tokens = [];
        // Positive: points to a position in `data`
        //           pos == 3 points to data[3]
        // Negative: points to a position in the lookbehind buffer
        //           pos == -2 points to lookbehind[lookbehind_size - 2]
        let pos = -this._lookbehind.length;
        if (pos < 0) {
            // Lookbehind buffer is not empty. Perform Boyer-Moore-Horspool
            // search with character lookup code that considers both the
            // lookbehind buffer and the current round's haystack data.
            //
            // Loop until (condition 1)
            //   there is a match.
            // or until
            //   we've moved past the position that requires the
            //   lookbehind buffer. In this case we switch to the
            //   optimized loop.
            // or until (condition 3)
            //   the character to look at lies outside the haystack.
            while (pos < 0 && pos <= data.length - this._needle.length) {
                const ch = this._charAt(data, pos + this._needle.length - 1);
                if (ch === this._lastChar && this._memcmp(data, pos, this._needle.length - 1)) {
                    if (pos > -this._lookbehind.length) {
                        tokens.push(this._lookbehind.slice(0, this._lookbehind.length + pos));
                    }
                    tokens.push(exports.MATCH);
                    this._lookbehind = new Uint8Array();
                    return [pos + this._needle.length, ...tokens];
                }
                else {
                    pos += this._occ[ch];
                }
            }
            // No match.
            if (pos < 0) {
                // There's too few data for Boyer-Moore-Horspool to run,
                // so let's use a different algorithm to skip as much as
                // we can.
                // Forward pos until
                //   the trailing part of lookbehind + data
                //   looks like the beginning of the needle
                // or until
                //   pos == 0
                while (pos < 0 && !this._memcmp(data, pos, data.length - pos)) {
                    pos++;
                }
            }
            if (pos >= 0) {
                // Discard lookbehind buffer.
                tokens.push(this._lookbehind);
                this._lookbehind = new Uint8Array();
            }
            else {
                // Cut off part of the lookbehind buffer that has
                // been processed and append the entire haystack
                // into it.
                const bytesToCutOff = this._lookbehind.length + pos;
                if (bytesToCutOff > 0) {
                    // The cut off data is guaranteed not to contain the needle.
                    tokens.push(this._lookbehind.slice(0, bytesToCutOff));
                }
                this._lookbehind = this._lookbehind.slice(bytesToCutOff);
                this._lookbehind = Uint8Array.from(new Array(this._lookbehind.length + data.length), (_, i) => this._charAt(data, i - this._lookbehind.length));
                return [data.length, ...tokens];
            }
        }
        if (pos >= 0) {
            pos += buf_pos;
        }
        // Lookbehind buffer is now empty. Perform Boyer-Moore-Horspool
        // search with optimized character lookup code that only considers
        // the current round's haystack data.
        while (pos <= data.length - this._needle.length) {
            const ch = data[pos + this._needle.length - 1];
            if (ch === this._lastChar
                && data[pos] === this._needle[0]
                && jsmemcmp(this._needle, 0, data, pos, this._needle.length - 1)) {
                if (pos > 0) {
                    tokens.push(data.slice(buf_pos, pos));
                }
                tokens.push(exports.MATCH);
                return [pos + this._needle.length, ...tokens];
            }
            else {
                pos += this._occ[ch];
            }
        }
        // There was no match. If there's trailing haystack data that we cannot
        // match yet using the Boyer-Moore-Horspool algorithm (because the trailing
        // data is less than the needle size) then match using a modified
        // algorithm that starts matching from the beginning instead of the end.
        // Whatever trailing data is left after running this algorithm is added to
        // the lookbehind buffer.
        if (pos < data.length) {
            while (pos < data.length && (data[pos] !== this._needle[0]
                || !jsmemcmp(data, pos, this._needle, 0, data.length - pos))) {
                ++pos;
            }
            if (pos < data.length) {
                this._lookbehind = data.slice(pos);
            }
        }
        // Everything until pos is guaranteed not to contain needle data.
        if (pos > 0) {
            tokens.push(data.slice(buf_pos, pos < data.length ? pos : data.length));
        }
        return [data.length, ...tokens];
    }
    _charAt(data, pos) {
        if (pos < 0) {
            return this._lookbehind[this._lookbehind.length + pos];
        }
        else {
            return data[pos];
        }
    }
    ;
    _memcmp(data, pos, len) {
        for (let i = 0; i < len; i++) {
            if (this._charAt(data, pos + i) !== this._needle[i]) {
                return false;
            }
        }
        return true;
    }
    ;
}
exports.StreamSearch = StreamSearch;


/***/ }),

/***/ "./node_modules/baseconv/index.js":
/*!****************************************!*\
  !*** ./node_modules/baseconv/index.js ***!
  \****************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
class DuplicateCharacterError extends Error {
    constructor(index, char) {
        super(`duplicate character "${String.fromCharCode(char)}" found at index ${index}`);
    }
}
exports.DuplicateCharacterError = DuplicateCharacterError;
class UnexpectedCharacterError extends Error {
    constructor(index, char) {
        super(`unexpected character "${String.fromCharCode(char)}" found at index ${index}`);
    }
}
exports.UnexpectedCharacterError = UnexpectedCharacterError;
function strToChars(str) {
    return str.split('').map((c) => c.charCodeAt(0));
}
const zero = BigInt(0);
class Base {
    constructor(charset) {
        this._charmap = new Map();
        this._charset = charset;
        for (const [index, char] of strToChars(charset).entries()) {
            if (this._charmap.has(char)) {
                throw new DuplicateCharacterError(index, char);
            }
            this._charmap.set(char, BigInt(index));
        }
        this._radix = BigInt(charset.length);
    }
    get charset() {
        return this._charset;
    }
    get radix() {
        return this._charset.length;
    }
    parse(number) {
        let sum = zero;
        for (const [i, c] of strToChars(number).reverse().entries()) {
            const value = this._charmap.get(c);
            if (typeof value === 'undefined') {
                throw new UnexpectedCharacterError(i, c);
            }
            sum += value * (this._radix ** BigInt(i));
        }
        return sum;
    }
    encode(value) {
        let numbers = [];
        while (value > zero) {
            const rem = value % this._radix;
            value = (value - rem) / this._radix;
            numbers.push(this._charset[Number(rem)]);
        }
        return numbers.reverse().join('');
    }
}
exports.Base = Base;


/***/ }),

/***/ "./node_modules/http-hash/index.js":
/*!*****************************************!*\
  !*** ./node_modules/http-hash/index.js ***!
  \*****************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


module.exports = HttpHash;

function HttpHash() {
    if (!(this instanceof HttpHash)) {
        return new HttpHash();
    }

    this._hash = new RouteNode();
}

HttpHash.prototype.get = get;
HttpHash.prototype.set = set;

function get(pathname) {
    var pathSegments = pathname.split('/');

    var hash = this._hash;
    var splat = null;
    var params = {};
    var variablePaths;

    for (var i = 0; i < pathSegments.length; i++) {
        var segment = pathSegments[i];

        if (!segment && !hash.isSplat) {
            continue;
        } else if (
            segment === '__proto__' &&
            hash.hasOwnProperty('proto')
        ) {
            hash = hash.proto;
        } else if (hash.staticPaths.hasOwnProperty(segment)) {
            hash = hash.staticPaths[segment];
        } else if ((variablePaths = hash.variablePaths)) {
            if (variablePaths.isSplat) {
                splat = pathSegments.slice(i).join('/');
                hash = variablePaths;
                break;
            } else {
                params[variablePaths.segment] = segment;
                hash = variablePaths;
            }
        } else {
            hash = null;
            break;
        }
    }

    // Match the empty splat
    if (hash &&
        hash.handler === null &&
        hash.variablePaths &&
        hash.variablePaths.isSplat
    ) {
        splat = '';
        hash = hash.variablePaths;
    }

    return new RouteResult(hash, params, splat);
}

function set(pathname, handler) {
    var pathSegments = pathname.split('/');
    var hash = this._hash;
    var lastIndex = pathSegments.length - 1;
    var splatIndex = pathname.indexOf('*');
    var hasSplat = splatIndex >= 0;

    if (hasSplat && splatIndex !== pathname.length - 1) {
        throw SplatError(pathname);
    }

    for (var i = 0; i < pathSegments.length; i++) {
        var segment = pathSegments[i];

        if (!segment) {
            continue;
        }

        if (hasSplat && i === lastIndex) {
            hash = (
                hash.variablePaths ||
                (hash.variablePaths = new RouteNode(hash, segment, true))
            );

            if (!hash.isSplat) {
                throw RouteConflictError(pathname, hash);
            }
        } else if (segment.indexOf(':') === 0) {
            segment = segment.slice(1);
            hash = (
                hash.variablePaths ||
                (hash.variablePaths = new RouteNode(hash, segment))
            );

            if (hash.segment !== segment || hash.isSplat) {
                throw RouteConflictError(pathname, hash);
            }
        } else if (segment === '__proto__') {
            hash = (
                (
                    hash.hasOwnProperty('proto') &&
                    hash.proto
                ) ||
                (hash.proto = new RouteNode(hash, segment))
            );
        } else {
            hash = (
                (
                    hash.staticPaths.hasOwnProperty(segment) &&
                    hash.staticPaths[segment]
                ) ||
                (hash.staticPaths[segment] = new RouteNode(hash, segment))
            );
        }
    }

    if (hash.handler === null) {
        hash.src = pathname;
        hash.handler = handler;
    } else {
        throwRouteConflictError(pathname, hash);
    }
}

function RouteNode(parent, segment, isSplat) {
    this.parent = parent || null;
    this.segment = segment || null;
    this.handler = null;
    this.staticPaths = {};
    this.variablePaths = null;
    this.isSplat = !!isSplat;
    this.src = null;
}

function RouteResult(node, params, splat) {
    this.handler = node && node.handler || null;
    this.splat = splat;
    this.params = params;
    this.src = node && node.src || null;
}

function SplatError(pathname) {
    var err = new Error('The splat * must be the last segment of the path');
    err.pathname = pathname;
    return err;
}

function RouteConflictError(pathname, hash) {
    var conflictPath = hash.isSplat ? '' : '/';

    while (hash && hash.parent) {
        var prefix = (
            !hash.isSplat &&
            hash === hash.parent.variablePaths
        ) ? ':' : '';

        conflictPath = '/' + prefix + hash.segment + conflictPath;

        hash = hash.parent;
    }

    var err = new Error('Route conflict');
    err.attemptedPath = pathname;
    err.conflictPath = conflictPath;

    return err;
}

// Break this out to prevent deoptimization of path.set
function throwRouteConflictError(pathname, hash) {
    throw RouteConflictError(pathname, hash);
}


/***/ }),

/***/ "./src/lib/b2/index.ts":
/*!*****************************!*\
  !*** ./src/lib/b2/index.ts ***!
  \*****************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const sha1_1 = __webpack_require__(/*! ../../lib/sha1 */ "./src/lib/sha1.ts");
const Expired = Symbol('expired');
class B2APIError extends Error {
    constructor(data, ...extra) {
        super(`B2APIError: ${data.code} - ${data.message} [${extra.join(' ')}]`);
    }
}
exports.B2APIError = B2APIError;
function strToBuf(str) {
    return new Uint8Array(str.split('').map((c) => c.charCodeAt(0)));
}
function createSummingReadableStream(input) {
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
        (async function () {
            const summer = new sha1_1.Summer();
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
        }
        else if (ArrayBuffer.isView(input)) {
            input = new Uint8Array(input.buffer);
        }
        else if (input instanceof ArrayBuffer) {
            input = new Uint8Array(input);
        }
        else {
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
    const ts = new TransformStream({
        async transform(chunk, controller) {
            controller.enqueue(chunk);
            controller.enqueue(strToBuf(await sha1_1.sum(chunk, 'hex')));
            controller.terminate();
        },
    });
    (async function () {
        const w = ts.writable.getWriter();
        await w.write(input);
        await w.close();
    })();
    return ts.readable;
}
async function createUploader(account, bucketId) {
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
    const { uploadUrl, authorizationToken } = body;
    return async (file, name, length, options) => {
        options = options || {};
        let body;
        if (options.checksum) {
            body = file;
        }
        else {
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
async function* createUploaderFactory(account, bucketId) {
    const queue = [];
    while (true) {
        if (queue.length > 0) {
            yield queue.shift();
        }
        else {
            const uploader = await createUploader(account, bucketId);
            const uploadFn = async function () {
                const result = await uploader.apply(null, arguments);
                // discard this uploader it throws an exception
                queue.push(uploadFn);
                return result;
            };
            yield uploadFn;
        }
    }
}
function createAccountFunc(accountFactory) {
    let account;
    return async function (renew) {
        if (!renew && account) {
            return account;
        }
        return ({ value: account } = await accountFactory.next()) && account;
    };
}
class Bucket {
    constructor(accountFactory, _bucketId) {
        this._bucketId = _bucketId;
        this._account = createAccountFunc(accountFactory);
        this._uploaderPool = createUploaderFactory(this._account, this._bucketId);
    }
    get bucketId() {
        return this._bucketId;
    }
    async put() {
        for (let i = 0; i < 2; i++) {
            const { value } = await this._uploaderPool.next();
            try {
                return (await value.apply(null, arguments)).fileId;
            }
            catch (err) {
                if (i || err !== Expired) {
                    throw err;
                }
            }
            // retry with new uploader
        }
    }
    async get(fileId, options) {
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
                    value: (k) => res.headers.get(k),
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
async function* createAccountFactory(token) {
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
        }
        else {
            throw new B2APIError(body);
        }
    }
}
class B2Client {
    constructor(id_or_token, key) {
        let token = id_or_token;
        if (key) {
            token = btoa(id_or_token + ':' + key);
        }
        this._accountFactory = createAccountFactory(token);
    }
    bucket(bucketId) {
        return new Bucket(this._accountFactory, bucketId);
    }
}
exports.B2Client = B2Client;


/***/ }),

/***/ "./src/lib/imgstor.ts":
/*!****************************!*\
  !*** ./src/lib/imgstor.ts ***!
  \****************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const b2_1 = __webpack_require__(/*! ./b2 */ "./src/lib/b2/index.ts");
const util_1 = __webpack_require__(/*! ./util */ "./src/lib/util.ts");
class ExistingUserError extends Error {
}
exports.ExistingUserError = ExistingUserError;
class UnexpectedExtensionError extends Error {
    constructor(expected, actual) {
        super(`unexpected extension: expected "${expected}" but got "${actual}"`);
        this.expected = expected;
        this.actual = actual;
    }
}
exports.UnexpectedExtensionError = UnexpectedExtensionError;
const bucket = new b2_1.B2Client('0027de69ac7eeba0000000001', 'K002bTlHhwt5/FI4h15WjGKuUdMPnKA').bucket('f7ed3e56c96a1c476eae0b1a');
const numbers = '0123456789';
const lowerAlpha = 'abcdefghijklmnopqrstuvwxyz';
const upperAlpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const alphanumeric = numbers + lowerAlpha + upperAlpha;
const uppernumeric = numbers + upperAlpha;
function randomString(charset, length) {
    return Array.from(Array(length), () => charset.charAt(Math.floor(Math.random() * charset.length))).join('');
}
function encodeKey(kind, ref) {
    return encodeURIComponent(`${kind}:${ref}`);
}
const objectKey = encodeKey.bind(null, 'object');
const tailKey = encodeKey.bind(null, 'tail');
const keyKey = encodeKey.bind(null, 'key');
const userKey = encodeKey.bind(null, 'user');
const hashKey = encodeKey.bind(null, 'hash');
const thumbKey = encodeKey.bind(null, 'thumb');
const prevKey = encodeKey.bind(null, 'prev');
async function digest(algo, str) {
    const digest = new Uint8Array(await crypto.subtle.digest(algo, Uint8Array.from(new Uint8Array(str.length), (_, i) => str.charCodeAt(i))));
    return Array.from(digest.values()).map((x) => ('0' + x.toString(16)).slice(-2)).join('');
}
const sha256sum = digest.bind(null, 'SHA-256');
const sha512sum = digest.bind(null, 'SHA-512');
const NEXT = Symbol('next');
const DOWNLOAD = Symbol('download');
const DOWNLOAD_THUMB = Symbol('download thumb');
const NO_USER = Symbol('no user');
async function deleteObject(ref) {
    throw new Error('not implemented');
}
function makeRef(key, id) {
    return `${key}.${id}`;
}
function makeObjectRef(object) {
    return `${object.key}.${object.id}`;
}
async function generateThumbnail() {
    const file = await bucket.get(this.fileId);
    const res = await fetch('https://muki-image-store--thumb-gen.herokuapp.com/', {
        method: 'POST',
        headers: {
            'content-type': file.get('content-type'),
            'content-length': file.get('content-length'),
        },
        body: file,
    });
    const fileId = await bucket.put(res.clone().body, this.name + '.thumb', +res.headers.get('content-length'), {
        contentType: 'image/png',
    });
    return [
        fileId,
        Object.defineProperty(res.body, 'get', {
            value: (k) => res.headers.get(k),
        }),
    ];
}
function makeFile(file) {
    return Object.defineProperties(file, {
        name: { writable: false, value: this.name },
        type: { writable: false, value: file.get('content-type') },
        size: { writable: false, value: file.get('content-length') },
    });
}
async function downloadObjectThumbnail() {
    const key = thumbKey(makeObjectRef(this));
    const fileId = await StorKV.get(key);
    if (!fileId) {
        const [fileId, file] = generateThumbnail.call(this);
        await StorKV.put(key, fileId);
        return makeFile(file);
    }
    return makeFile(await bucket.get(fileId));
}
async function downloadObject() {
    const fileId = this.fileId;
    if (!fileId) {
        return;
    }
    return makeFile(await bucket.get(fileId));
}
function makeDeletableObject(object) {
    return Object.defineProperties(object, {
        delete: { writable: false, value: deleteObject.bind(this, makeObjectRef(object)) },
    });
}
function makeInternalObject(object) {
    return Object.defineProperties(object, {
        numericId: { writable: false, value: () => util_1.base63.parse(makeObjectRef(object)).toString() },
        [NEXT]: { writable: false, value: getObject.bind(this, object.next) },
        [DOWNLOAD]: { writable: false, value: downloadObject.bind(object) },
        [DOWNLOAD_THUMB]: { writable: false, value: downloadObjectThumbnail.bind(object) },
    });
}
async function getObject(ref) {
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
function getTailRef(userHash) {
    return StorKV.get(tailKey(userHash));
}
async function uploadObject(userHash, input, name, size, type) {
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
async function listObjects(userHash, limit, start) {
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
async function getTailObject(userHash) {
    return getObject.call(this, await getTailRef(userHash));
}
async function changeUserEmail(userHash, email) {
    const newUserHash = await sha256sum(email);
    await Promise.all([
        StorKV.put(userKey(newUserHash), JSON.stringify(this)),
        StorKV.put(hashKey(newUserHash), await StorKV.get(hashKey(userHash))),
        StorKV.delete(userKey(userHash)),
        StorKV.delete(hashKey(userHash)),
    ]);
}
async function changeUserPassword(userHash, password) {
    return StorKV.put(hashKey(userHash), await sha256sum(password));
}
async function getUser(userHash) {
    const user = await StorKV.get(userKey(userHash), 'json');
    if (!user) {
        return;
    }
    return Object.defineProperties(user, {
        tail: { writable: false, value: getTailObject.bind(user, userHash) },
        objects: { writable: false, value: listObjects.bind(user, userHash) },
        store: { writable: false, value: uploadObject.bind(user, userHash) },
        delete: { writable: false, value: (object) => deleteObject.call(user, makeObjectRef(object)) },
        changeEmail: { writable: false, value: changeUserEmail.bind(user, userHash) },
        changePassword: { writable: false, value: changeUserPassword.bind(user, userHash) },
    });
}
function parseNumericId(numericId) {
    return util_1.base63.encode(BigInt(numericId));
}
exports.default = {
    async createUser(email, password) {
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
    async getUserByCredentials(email, password) {
        const userHash = await sha256sum(email);
        if (await StorKV.get(hashKey(userHash)) !== await sha256sum(password)) {
            return;
        }
        return getUser(userHash);
    },
    async getUserByApiKey(apiKey) {
        if (!apiKey || typeof apiKey !== 'string') {
            return;
        }
        const userHash = await StorKV.get(keyKey(apiKey));
        if (!userHash) {
            return;
        }
        return getUser(userHash);
    },
    getObject(key, id) {
        return getObject.call(NO_USER, makeRef(key, id));
    },
    getObjectByNumericId(numericId) {
        return getObject.call(NO_USER, parseNumericId(numericId));
    },
    async getFile(key, id, ext) {
        const object = await getObject.call(NO_USER, makeRef(key, id));
        if (!object) {
            return;
        }
        const expectedExt = util_1.findExt(object.name);
        if (ext !== expectedExt) {
            throw new UnexpectedExtensionError(expectedExt, ext);
        }
        return object[DOWNLOAD]();
    },
    async getThumbnail(key, id, ext) {
        const object = await getObject.call(NO_USER, makeRef(key, id));
        if (!object) {
            return;
        }
        if (ext !== '.png') {
            throw new UnexpectedExtensionError('.png', ext);
        }
        return object[DOWNLOAD_THUMB]();
    },
};


/***/ }),

/***/ "./src/lib/sha1.ts":
/*!*************************!*\
  !*** ./src/lib/sha1.ts ***!
  \*************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const SIZE_OF_CONTEXT = 128;
const SIZE_OF_DIGEST = 20;
const memory = new WebAssembly.Memory({ initial: 2 });
const allocs = [];
let view = new Uint8Array(memory.buffer);
const instance = new WebAssembly.Instance(Sha1Wasm, {
    module: {},
    env: {
        memory: memory,
        table: new WebAssembly.Table({ initial: 0, element: 'anyfunc' }),
    },
});
async function sum(input, encoding) {
    if (!(input instanceof Uint8Array) && !(input instanceof ReadableStream)) {
        if (typeof input === 'string') {
            input = new Uint8Array(input.split('').map((c) => c.charCodeAt(0)));
        }
        else if (ArrayBuffer.isView(input)) {
            input = new Uint8Array(input.buffer);
        }
        else if (input instanceof ArrayBuffer) {
            input = new Uint8Array(input);
        }
        else {
            throw new Error(`unsupported input type: ${input[Symbol.toStringTag]}`);
        }
    }
    const ctx = new_context();
    try {
        if (input instanceof ReadableStream) {
            const reader = input.getReader();
            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    break;
                }
                if (!value.length) {
                    continue;
                }
                feed(ctx, value);
            }
        }
        else {
            feed(ctx, input);
        }
        return encoded_result(ctx, encoding);
    }
    finally {
        free(ctx);
    }
}
exports.sum = sum;
class Summer {
    constructor() {
        this._context = new_context();
    }
    push(data) {
        this._assert();
        feed(this._context, data);
    }
    digest(encoding) {
        this._assert();
        return encoded_result(this._context, encoding);
    }
    close() {
        this._assert();
        this._freed = true;
        free(this._context);
    }
    _assert() {
        if (this._freed) {
            throw new Error('Summer may not be used after it has been closed');
        }
    }
}
exports.Summer = Summer;
function new_context() {
    const ptr = malloc(SIZE_OF_CONTEXT);
    instance.exports.SHA1Reset(ptr);
    return ptr;
}
function encoded_result(ctx, encoding) {
    const digest = result(ctx);
    if (encoding === 'hex') {
        return Array.from(digest).map((b) => ('0' + b.toString(16)).slice(-2)).join('');
    }
    return digest;
}
function result(context_ptr) {
    const ptr = malloc(SIZE_OF_DIGEST);
    try {
        handle_error(instance.exports.SHA1Result(context_ptr, ptr));
        return view.slice(ptr, ptr + SIZE_OF_DIGEST);
    }
    finally {
        free(ptr);
    }
}
function feed(context_ptr, buffer) {
    const ptr = malloc(buffer.length);
    try {
        view.set(buffer, ptr);
        handle_error(instance.exports.SHA1Input(context_ptr, ptr, buffer.length));
    }
    finally {
        free(ptr);
    }
}
function handle_error(code) {
    if (code === 1) {
        throw new Error('input too long');
    }
    else if (code === 2) {
        throw new Error('state error');
    }
    else if (code !== 0) {
        throw new Error(`unexpected error code: ${code}`);
    }
}
// function _malloc(length: number): number {
//     const ptr = _mallocx(length);
//     console.log('malloc', ptr, length);
//     return ptr;
// }
function malloc(length) {
    if (!allocs.length) {
        allocs.push([0, length]);
        return 0;
    }
    // look for space in between allocations
    const last_alloc = allocs[allocs.length - 1];
    if (allocs.length > 1) {
        if (last_alloc[0] + last_alloc[1] + length > view.length) {
            // not enough memory to allocate
            memory.grow(1);
            view = new Uint8Array(memory.buffer);
            return malloc(length);
        }
        for (let i = 0; i < allocs.length - 1; i++) {
            const a = allocs[i][0] + allocs[i][1];
            const b = allocs[i + 1][0];
            if (b - a >= length) {
                allocs.splice(i + 1, 0, [a, length]);
                return a;
            }
        }
    }
    // allocate at the end
    const ptr = last_alloc[0] + last_alloc[1];
    allocs.push([ptr, length]);
    return ptr;
}
// function _free(ptr: number): void {
//     console.log('free', ptr);
//     _freex(ptr);
// }
function free(ptr) {
    for (const [i, alloc] of allocs.entries()) {
        if (alloc[0] === ptr) {
            allocs.splice(i, 1);
            return;
        }
    }
    throw new Error('attempted to free invalid pointer');
}


/***/ }),

/***/ "./src/lib/util.ts":
/*!*************************!*\
  !*** ./src/lib/util.ts ***!
  \*************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const baseconv_1 = __webpack_require__(/*! baseconv */ "./node_modules/baseconv/index.js");
function findExt(name) {
    const dot = name.lastIndexOf('.');
    return dot === -1 ? '' : name.slice(dot);
}
exports.findExt = findExt;
function baseUrl(url, request) {
    const forwardedProto = request.headers.get('x-muki-forwarded-proto');
    const forwardedHost = request.headers.get('x-muki-forwarded-host');
    return `${forwardedProto || url.protocol}//${forwardedHost || url.host}`;
}
exports.baseUrl = baseUrl;
exports.base63 = new baseconv_1.Base('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ.');


/***/ }),

/***/ "./src/main.ts":
/*!*********************!*\
  !*** ./src/main.ts ***!
  \*********************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = __importDefault(__webpack_require__(/*! ./routers/index */ "./src/routers/index.ts"));
async function routeRequest(url, request, waitUntil) {
    const route = this.get(url.pathname);
    return route && route.handler.call(route, url, request, waitUntil);
}
async function handleRequest(request, waitUntil) {
    try {
        const url = new URL(request.url);
        const router = index_1.default[url.hostname];
        if (router) {
            var response = await routeRequest.call(router, url, request, waitUntil);
        }
        return response || new Response('404 not found', { status: 404 });
    }
    catch (err) {
        return new Response(err.stack, { status: 500 });
    }
}
addEventListener('fetch', (event) => event.respondWith(handleRequest(event.request, event.waitUntil)));


/***/ }),

/***/ "./src/routers/i.muki.pw/api/auth.ts":
/*!*******************************************!*\
  !*** ./src/routers/i.muki.pw/api/auth.ts ***!
  \*******************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
const fd_1 = __importDefault(__webpack_require__(/*! fd */ "./local_modules/fd/index.ts"));
const imgstor_1 = __importDefault(__webpack_require__(/*! ../../../lib/imgstor */ "./src/lib/imgstor.ts"));
module.exports = async function (url, request) {
    if (request.method !== 'POST')
        return new Response(null, { status: 405 });
    try {
        var fd = await fd_1.default(request);
    }
    catch (err) {
        return new Response(null, { status: 400 });
    }
    const email = fd.get('e');
    const password = fd.get('p');
    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
        return new Response(null, { status: 400 });
    }
    const user = await imgstor_1.default.getUserByCredentials(email, password);
    if (!user) {
        return new Response(null, { status: 401 });
    }
    return new Response(`1,${user.apiKey},Never!,0`);
};


/***/ }),

/***/ "./src/routers/i.muki.pw/api/hist.ts":
/*!*******************************************!*\
  !*** ./src/routers/i.muki.pw/api/hist.ts ***!
  \*******************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
const fd_1 = __importDefault(__webpack_require__(/*! fd */ "./local_modules/fd/index.ts"));
const imgstor_1 = __importDefault(__webpack_require__(/*! ../../../lib/imgstor */ "./src/lib/imgstor.ts"));
const util_1 = __webpack_require__(/*! ../../../lib/util */ "./src/lib/util.ts");
function objectLine(url, request, object) {
    return `${object.numericId()},${object.created},${util_1.baseUrl(url, request)}/${object.key}/${object.id}${util_1.findExt(object.name)},${object.name},0,0`;
}
module.exports = async function (url, request) {
    if (request.method !== 'POST')
        return new Response(null, { status: 405 });
    try {
        var fd = await fd_1.default(request);
    }
    catch (err) {
        return new Response(null, { status: 400 });
    }
    const user = await imgstor_1.default.getUserByApiKey(fd.get('k'));
    if (!user) {
        return new Response(null, { status: 403 });
    }
    const list = await user.objects(+fd.get('limit') || 50, fd.get('start'));
    if (!list.length) {
        return new Response();
    }
    return new Response(list.map(objectLine.bind(null, url, request)).join('\n') + '\n', {
        headers: {
            'Next-Cursor': list[list.length - 1].next,
        },
    });
};


/***/ }),

/***/ "./src/routers/i.muki.pw/api/new.ts":
/*!******************************************!*\
  !*** ./src/routers/i.muki.pw/api/new.ts ***!
  \******************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
const fd_1 = __importDefault(__webpack_require__(/*! fd */ "./local_modules/fd/index.ts"));
const imgstor_1 = __importStar(__webpack_require__(/*! ../../../lib/imgstor */ "./src/lib/imgstor.ts"));
module.exports = async function (url, request) {
    if (request.method !== 'POST')
        return new Response(null, { status: 405 });
    try {
        var fd = await fd_1.default(request);
    }
    catch (err) {
        return new Response(null, { status: 400 });
    }
    const email = fd.get('e');
    const password = fd.get('p');
    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
        return new Response(null, { status: 400 });
    }
    try {
        await imgstor_1.default.createUser(email, password);
    }
    catch (err) {
        if (err instanceof imgstor_1.ExistingUserError) {
            return new Response(null, { status: 409 });
        }
        throw err;
    }
    return new Response();
};


/***/ }),

/***/ "./src/routers/i.muki.pw/api/up.ts":
/*!*****************************************!*\
  !*** ./src/routers/i.muki.pw/api/up.ts ***!
  \*****************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
const fd_1 = __importDefault(__webpack_require__(/*! fd */ "./local_modules/fd/index.ts"));
const imgstor_1 = __importDefault(__webpack_require__(/*! ../../../lib/imgstor */ "./src/lib/imgstor.ts"));
const util_1 = __webpack_require__(/*! ../../../lib/util */ "./src/lib/util.ts");
module.exports = async function (url, request) {
    if (request.method !== 'POST')
        return new Response(null, { status: 405 });
    try {
        var fd = await fd_1.default(request);
    }
    catch (err) {
        return new Response(err.stack, { status: 400 });
    }
    const user = await imgstor_1.default.getUserByApiKey(fd.get('k'));
    if (!user) {
        return new Response(null, { status: 403 });
    }
    const file = fd.get('f');
    if (!file || typeof file === 'string') {
        return new Response(null, { status: 400 });
    }
    const object = await user.store(file, file.name, file.size, file.type);
    return new Response(`0,${util_1.baseUrl(url, request)}/${object.key}/${object.id}${util_1.findExt(object.name)},${object.numericId()},0`);
};


/***/ }),

/***/ "./src/routers/i.muki.pw/index.ts":
/*!****************************************!*\
  !*** ./src/routers/i.muki.pw/index.ts ***!
  \****************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_hash_1 = __importDefault(__webpack_require__(/*! http-hash */ "./node_modules/http-hash/index.js"));
const imgstor_1 = __importStar(__webpack_require__(/*! ../../lib/imgstor */ "./src/lib/imgstor.ts"));
const util_1 = __webpack_require__(/*! ../../lib/util */ "./src/lib/util.ts");
function imageHandler(thumbnail) {
    const getFile = thumbnail ? imgstor_1.default.getThumbnail : imgstor_1.default.getFile;
    return async function image(url) {
        const id = this.params['id'];
        const ext = util_1.findExt(id);
        try {
            var file = await getFile.call(null, this.params['key'], id.slice(0, id.length - ext.length), ext);
            if (!file) {
                return;
            }
        }
        catch (err) {
            if (err instanceof imgstor_1.UnexpectedExtensionError) {
                return new Response(null, {
                    status: 301,
                    headers: {
                        'Location': url.pathname.slice(0, url.pathname.length - ext.length) + err.expected,
                    }
                });
            }
            throw err;
        }
        return new Response(file, {
            headers: {
                'Content-Length': file.size,
                'Content-Type': file.type,
                'Content-Disposition': `filename="${encodeURIComponent(file.name)}"`,
            },
        });
    };
}
exports.default = (function () {
    const router = new http_hash_1.default();
    router.set('/api/auth', (__webpack_require__(/*! ./api/auth */ "./src/routers/i.muki.pw/api/auth.ts")));
    router.set('/api/hist', (__webpack_require__(/*! ./api/hist */ "./src/routers/i.muki.pw/api/hist.ts")));
    router.set('/api/new', (__webpack_require__(/*! ./api/new */ "./src/routers/i.muki.pw/api/new.ts")));
    router.set('/api/up', (__webpack_require__(/*! ./api/up */ "./src/routers/i.muki.pw/api/up.ts")));
    router.set('/thumb/:key/:id', imageHandler(true));
    router.set('/:key/:id', imageHandler());
    router.set('/test', (__webpack_require__(/*! ./test */ "./src/routers/i.muki.pw/test.ts")));
    router.set('/home', () => fetch('https://puushes.storage.googleapis.com/public/index.html'));
    return router;
})();


/***/ }),

/***/ "./src/routers/i.muki.pw/test.ts":
/*!***************************************!*\
  !*** ./src/routers/i.muki.pw/test.ts ***!
  \***************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

module.exports = async function (url, request) {
    let n = 1;
    const ts = new TransformStream({
        start: () => { },
        transform(_, controller) {
            controller.enqueue(new Uint8Array(`received chunk ${n}\n`.split('').map((c) => c.charCodeAt(0))));
        },
        flush(controller) {
            controller.enqueue(new Uint8Array(`all chunks received\n`.split('').map((c) => c.charCodeAt(0))));
        }
    });
    return new Response(request.body.pipeThrough(ts), {
        headers: {
            'content-type': 'text/plain',
        }
    });
};


/***/ }),

/***/ "./src/routers/index.ts":
/*!******************************!*\
  !*** ./src/routers/index.ts ***!
  \******************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = __importDefault(__webpack_require__(/*! ./i.muki.pw/index */ "./src/routers/i.muki.pw/index.ts"));
// import mv_ssttevee_com from './mv.ssttevee.com/index';
exports.default = {
    'i.muki.pw': index_1.default,
};


/***/ }),

/***/ 0:
/*!***************************!*\
  !*** multi ./src/main.ts ***!
  \***************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__(/*! /media/steve/Data/SL/Projects/cf-workers-muki-image-store/cloudworker/src/main.ts */"./src/main.ts");


/***/ })

/******/ });
//# sourceMappingURL=main.js.map