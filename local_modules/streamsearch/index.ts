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

export const MATCH = Symbol('Match');

type Token = Uint8Array | typeof MATCH;

export class StreamSearch {
    private _needle: Uint8Array;
    private _lastChar: number;
    private _occ: Array<number>;

    private _lookbehind = new Uint8Array();

    constructor(needle: Uint8Array | string, private _readableStream: ReadableStream<Uint8Array>) {
        if (typeof needle === 'string') {
            this._needle = needle = new Uint8Array(needle.split('').map((c) => c.charCodeAt(0)));
        } else {
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

    async *[Symbol.asyncIterator](): AsyncIterableIterator<Token> {
        const reader = this._readableStream.getReader();
        try {
            while (true) {
                const { done, value: chunk } = await reader.read();
                if (done) {
                    return;
                }

                let pos = 0;
                let tokens: Token[];
                while (pos !== chunk.length) {
                    [pos, ...tokens] = this._feed(chunk, pos);

                    yield* tokens;
                }
            }
        } finally {
            reader.releaseLock();
        }
    }

    private _feed(data: Uint8Array, buf_pos: number): [number, ...Token[]] {
        const tokens: Token[] = [];

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

                    tokens.push(MATCH);

                    this._lookbehind = new Uint8Array();

                    return [pos + this._needle.length, ...tokens];
                } else {
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
            } else {
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

                tokens.push(MATCH);

                return [pos + this._needle.length, ...tokens];
            } else {
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

    private _charAt(data: Uint8Array, pos: number): number {
        if (pos < 0) {
            return this._lookbehind[this._lookbehind.length + pos];
        } else {
            return data[pos];
        }
    };

    private _memcmp(data: Uint8Array, pos: number, len: number): boolean {
        for (let i = 0; i < len; i++) {
            if (this._charAt(data, pos + i) !== this._needle[i]) {
                return false
            }
        }
        return true;
    };
}
