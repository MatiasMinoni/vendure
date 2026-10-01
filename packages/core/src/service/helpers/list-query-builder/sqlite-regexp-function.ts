import type { RE2JS } from 're2js';

import { UserInputError } from '../../../common/error/errors';
import { VendureDatabaseType } from '../../../connection/database-type';

/**
 * A compiled regular expression able to test string values. Both the built-in `RegExp`
 * and the RE2 engine satisfy this shape.
 */
interface CompiledRegExp {
    test(value: string): boolean;
}

/**
 * The flags this file requests. Narrowing to the one flag in use keeps a later caller from passing
 * one the RE2 adapter would silently drop, and `RegExp` accepts any flag string, so the built-in
 * engine stays assignable.
 */
type SupportedFlags = 'i';

type RegExpEngine = new (pattern: string, flags: SupportedFlags) => CompiledRegExp;

/**
 * The SQLite driver flavours whose `regexp` implementation is a JS function evaluated on the
 * Node.js event loop, and which the built-in `RegExp` engine would therefore expose to ReDoS.
 */
const SQLITE_REGEXP_DB_TYPES: VendureDatabaseType[] = ['better-sqlite3', 'sqljs'];

let re2js: typeof import('re2js') | undefined;

/**
 * Upper bound on the number of compiled patterns kept by {@link buildRegexpTester}. Patterns are
 * user-supplied, so the cache must not grow without limit.
 */
const REGEXP_CACHE_MAX_SIZE = 100;

/**
 * Resolves `re2js` on first use rather than at import time. `parse-filter-params.ts` imports this
 * module, and that file is on the path of every list query on every backend, so a top-level import
 * would make a Postgres or MySQL deployment load an engine it can never reach.
 *
 * A load failure is thrown as-is. There is deliberately no fallback to the built-in `RegExp`
 * engine, which would reopen the ReDoS this engine exists to prevent.
 */
function loadRE2JS(): typeof import('re2js') {
    if (!re2js) {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        re2js = require('re2js') as typeof import('re2js');
    }
    return re2js;
}

/**
 * Adapts `re2js` to the `RegExp` shape used by the rest of this file. `re2js` is a JavaScript port
 * of RE2, so it needs no native build step, but its API is not the `RegExp` one: a pattern is
 * compiled once and then matched through a matcher object.
 *
 * RE2 matches in guaranteed linear time, so no pattern can be driven into the catastrophic
 * backtracking the built-in engine allows. It pays for that by supporting neither lookaround nor
 * backreferences, which {@link assertRegexFilterEngineCompatible} rejects up-front.
 *
 * @internal
 */
export class Re2jsRegExp implements CompiledRegExp {
    private readonly compiled: RE2JS;

    /**
     * `SupportedFlags` admits 'i' alone, so the compile is unconditionally case-insensitive. The
     * parameter exists to keep the built-in `RegExp` assignable to {@link RegExpEngine}.
     */
    constructor(pattern: string, _flags: SupportedFlags) {
        const { RE2JS: RE2 } = loadRE2JS();
        this.compiled = RE2.compile(pattern, RE2.CASE_INSENSITIVE);
    }

    /** `find()` searches anywhere in the value, which is what `RegExp.test()` does. */
    test(value: string): boolean {
        return this.compiled.matcher(value).find();
    }
}

/**
 * Throws a {@link UserInputError} if a `regex` filter cannot be evaluated on the given database.
 * On SQLite backends the pattern runs through the {@link https://github.com/google/re2 | RE2}
 * engine, which does not support backtracking-only features such as lookaround and backreferences;
 * these are rejected here with a clear error rather than failing mid-query.
 *
 * Has no effect on other backends, where the database evaluates the pattern with an engine of its
 * own which does support them.
 */
export function assertRegexFilterEngineCompatible(pattern: string, dbType: VendureDatabaseType): void {
    if (!SQLITE_REGEXP_DB_TYPES.includes(dbType)) {
        return;
    }
    // Loaded outside the try block so that a missing or broken engine surfaces as its own error
    // rather than being reported to the caller as unsupported pattern syntax.
    const { RE2JSException, RE2JSInternalException } = loadRE2JS();
    try {
        // eslint-disable-next-line no-new
        new Re2jsRegExp(pattern, 'i');
    } catch (e) {
        // An internal exception is a fault in the engine itself, not in the pattern.
        if (e instanceof RE2JSException && !(e instanceof RE2JSInternalException)) {
            throw new UserInputError('error.regex-filter-pattern-unsupported-syntax');
        }
        throw e;
    }
}

/**
 * Builds the memoised tester used by the SQLite `regexp` user-defined function. Patterns are
 * compiled once per distinct value and cached, since a given query applies a single constant
 * pattern across every row.
 *
 * The engine is a parameter so the null and numeric coercion below can be asserted against both
 * engines, which disagree on it.
 *
 * @internal
 */
export function buildRegexpTester(
    Engine: RegExpEngine,
): (pattern: string, value: string | number | null | undefined) => number {
    const cache = new Map<string, CompiledRegExp>();
    return (pattern: string, value: string | number | null | undefined): number => {
        // SQLite passes the raw column value, so a nullable column yields null and a numeric one
        // yields a number. `NULL REGEXP x` is false in SQL, and RE2 only accepts strings: it throws
        // on anything else, where the built-in RegExp coerced silently.
        if (value == null) {
            return 0;
        }
        const subject = typeof value === 'string' ? value : String(value);
        let compiled = cache.get(pattern);
        if (!compiled) {
            compiled = new Engine(pattern, 'i');
            if (cache.size >= REGEXP_CACHE_MAX_SIZE) {
                cache.clear();
            }
            cache.set(pattern, compiled);
        }
        return compiled.test(subject) ? 1 : 0;
    };
}

/**
 * Creates the JS function registered as SQLite's `REGEXP` implementation. Patterns are evaluated by
 * RE2 in guaranteed linear time and so cannot be exploited for ReDoS, which matters here because
 * these drivers match on the Node.js event loop rather than inside the database.
 */
export function createSqliteRegexpFunction(): (
    pattern: string,
    value: string | number | null | undefined,
) => number {
    return buildRegexpTester(Re2jsRegExp);
}
