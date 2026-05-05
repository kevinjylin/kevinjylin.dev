export type TestCase = {
  nums: number[];
  target: number;
  expected: [number, number];
};

export type Result = {
  test: TestCase;
  got: unknown;
  pass: boolean;
  error: string | null;
};

export type RunOutcome = {
  results: Result[];
  error: string | null;
};

type TwoSumFn = (nums: number[], target: number) => unknown;

export const TESTS: TestCase[] = [
  { nums: [2, 7, 11, 15], target: 9, expected: [0, 1] },
  { nums: [3, 2, 4], target: 6, expected: [1, 2] },
  { nums: [3, 3], target: 6, expected: [0, 1] },
  { nums: [-1, -2, -3, -4, -5], target: -8, expected: [2, 4] },
  { nums: [0, 4, 3, 0], target: 0, expected: [0, 3] },
];

export function sameIndices(
  got: unknown,
  expected: [number, number],
  nums: number[],
  target: number
): boolean {
  if (!Array.isArray(got) || got.length !== 2) return false;
  const [a, b] = got as [number, number];
  if (!Number.isInteger(a) || !Number.isInteger(b)) return false;
  if (a === b) return false;
  if (a < 0 || b < 0 || a >= nums.length || b >= nums.length) return false;
  if (nums[a] + nums[b] !== target) return false;
  const sortedGot = [a, b].sort((x, y) => x - y);
  const sortedExp = [...expected].sort((x, y) => x - y);
  return sortedGot[0] === sortedExp[0] && sortedGot[1] === sortedExp[1];
}

export function runJavaScriptTests(code: string): RunOutcome {
  let fn: TwoSumFn;
  try {
    const candidate = new Function(`${code}\n;return twoSum;`)() as unknown;
    if (typeof candidate !== "function") throw new Error("twoSum is not a function");
    fn = candidate as TwoSumFn;
  } catch (e) {
    return { results: [], error: e instanceof Error ? e.message : String(e) };
  }

  return { results: runTests(fn), error: null };
}

export function runCppTests(code: string): RunOutcome {
  try {
    const fn = compileCppTwoSum(code);
    return { results: runTests(fn), error: null };
  } catch (e) {
    return { results: [], error: e instanceof Error ? e.message : String(e) };
  }
}

function runTests(fn: TwoSumFn): Result[] {
  return TESTS.map((t) => {
    try {
      const got = fn(t.nums.slice(), t.target);
      return { test: t, got, pass: sameIndices(got, t.expected, t.nums, t.target), error: null };
    } catch (e) {
      return { test: t, got: null, pass: false, error: e instanceof Error ? e.message : String(e) };
    }
  });
}

function compileCppTwoSum(code: string): TwoSumFn {
  const body = extractTwoSumBody(code);
  const jsBody = translateCppBody(body);
  const source = `"use strict";\nreturn function twoSum(nums, target) {\n${jsBody}\n};`;
  const candidate = new Function(source)() as unknown;
  if (typeof candidate !== "function") {
    throw new Error("C++ runner could not build a twoSum function.");
  }
  return candidate as TwoSumFn;
}

function extractTwoSumBody(code: string): string {
  const functionMatch = /\btwoSum\s*\(/.exec(code);
  if (!functionMatch) {
    throw new Error("Could not find a twoSum function.");
  }

  const paramsStart = code.indexOf("(", functionMatch.index);
  const paramsEnd = findMatchingDelimiter(code, paramsStart, "(", ")");
  const bodyStart = code.indexOf("{", paramsEnd);
  if (bodyStart === -1) {
    throw new Error("Could not find the body for twoSum.");
  }

  const bodyEnd = findMatchingDelimiter(code, bodyStart, "{", "}");
  return code.slice(bodyStart + 1, bodyEnd);
}

function translateCppBody(body: string): string {
  const mapNames = collectMapNames(body);

  let js = body
    .replace(/\bstd::/g, "")
    .replace(/\bnums\s*\.\s*size\s*\(\s*\)/g, "nums.length")
    .replace(/\bnums\s*\.\s*at\s*\(\s*([^)]+)\s*\)/g, "nums[$1]")
    .replace(/\btrue\b/g, "true")
    .replace(/\bfalse\b/g, "false")
    .replace(/\bNULL\b/g, "null")
    .replace(/\bnullptr\b/g, "null")
    .replace(/\bvector\s*<\s*int\s*>\s+([A-Za-z_]\w*)\s*=\s*\{\s*([^}]*)\s*\}\s*;/g, "let $1 = [$2];")
    .replace(/\bvector\s*<\s*int\s*>\s+([A-Za-z_]\w*)\s*\{\s*([^}]*)\s*\}\s*;/g, "let $1 = [$2];")
    .replace(/\bvector\s*<\s*int\s*>\s+([A-Za-z_]\w*)\s*;/g, "let $1 = [];")
    .replace(/\b(?:unordered_map|map)\s*<[^;]+>\s+([A-Za-z_]\w*)\s*;/g, "const $1 = new Map();")
    .replace(/\b([A-Za-z_]\w*)\s*\.\s*push_back\s*\(/g, "$1.push(")
    .replace(/\breturn\s+vector\s*<\s*int\s*>\s*\{\s*([^}]*)\s*\}\s*;/g, "return [$1];")
    .replace(/\breturn\s+\{\s*([^}]*)\s*\}\s*;/g, "return [$1];");

  for (const mapName of mapNames) {
    js = translateMapCalls(js, mapName);
    js = translateMapIndexing(js, mapName);
  }

  return js
    .replace(/\bfor\s*\(\s*(?:const\s+)?(?:long\s+long|size_t|int|auto)\s+/g, "for (let ")
    .replace(/\b(?:const\s+)?(?:long\s+long|size_t|int|auto|double|float|bool)\s+([A-Za-z_]\w*)\s*=/g, "let $1 =")
    .replace(/\b(?:const\s+)?(?:long\s+long|size_t|int|auto|double|float|bool)\s+([A-Za-z_]\w*)\s*;/g, "let $1;")
    .replace(/\belse\s+if\b/g, "else if");
}

function collectMapNames(body: string): string[] {
  return Array.from(body.matchAll(/\b(?:unordered_map|map)\s*<[^;]+>\s+([A-Za-z_]\w*)/g)).map(
    (match) => match[1]
  );
}

function translateMapCalls(source: string, mapName: string): string {
  const escaped = escapeRegExp(mapName);
  return source
    .replace(
      new RegExp(`\\b${escaped}\\s*\\.\\s*find\\s*\\(([^;]+?)\\)\\s*!=\\s*${escaped}\\s*\\.\\s*end\\s*\\(\\s*\\)`, "g"),
      `${mapName}.has($1)`
    )
    .replace(
      new RegExp(`\\b${escaped}\\s*\\.\\s*find\\s*\\(([^;]+?)\\)\\s*==\\s*${escaped}\\s*\\.\\s*end\\s*\\(\\s*\\)`, "g"),
      `!${mapName}.has($1)`
    )
    .replace(new RegExp(`\\b${escaped}\\s*\\.\\s*count\\s*\\(`, "g"), `${mapName}.has(`);
}

function translateMapIndexing(source: string, mapName: string): string {
  const accessPattern = new RegExp(`\\b${escapeRegExp(mapName)}\\b\\s*\\[`, "g");
  let cursor = 0;
  let output = "";
  let match: RegExpExecArray | null;

  while ((match = accessPattern.exec(source)) !== null) {
    const accessStart = match.index;
    const bracketStart = source.indexOf("[", accessStart + mapName.length);
    const bracketEnd = findMatchingDelimiter(source, bracketStart, "[", "]");
    const key = source.slice(bracketStart + 1, bracketEnd).trim();
    const afterBracket = skipWhitespace(source, bracketEnd + 1);

    output += source.slice(cursor, accessStart);

    if (source[afterBracket] === "=" && source[afterBracket + 1] !== "=") {
      const statementEnd = findStatementEnd(source, afterBracket + 1);
      const value = source.slice(afterBracket + 1, statementEnd).trim();
      output += `${mapName}.set(${key}, ${value});`;
      cursor = statementEnd + 1;
      accessPattern.lastIndex = cursor;
    } else {
      output += `${mapName}.get(${key})`;
      cursor = bracketEnd + 1;
      accessPattern.lastIndex = cursor;
    }
  }

  return output + source.slice(cursor);
}

function skipWhitespace(source: string, index: number): number {
  let cursor = index;
  while (cursor < source.length && /\s/.test(source[cursor])) cursor += 1;
  return cursor;
}

function findStatementEnd(source: string, start: number): number {
  let parenDepth = 0;
  let bracketDepth = 0;
  let braceDepth = 0;
  let quote: string | null = null;
  let lineComment = false;
  let blockComment = false;

  for (let i = start; i < source.length; i += 1) {
    const char = source[i];
    const next = source[i + 1];

    if (lineComment) {
      if (char === "\n") lineComment = false;
      continue;
    }

    if (blockComment) {
      if (char === "*" && next === "/") {
        blockComment = false;
        i += 1;
      }
      continue;
    }

    if (quote) {
      if (char === "\\") {
        i += 1;
      } else if (char === quote) {
        quote = null;
      }
      continue;
    }

    if (char === "/" && next === "/") {
      lineComment = true;
      i += 1;
      continue;
    }

    if (char === "/" && next === "*") {
      blockComment = true;
      i += 1;
      continue;
    }

    if (char === "\"" || char === "'") {
      quote = char;
      continue;
    }

    if (char === "(") parenDepth += 1;
    if (char === ")") parenDepth -= 1;
    if (char === "[") bracketDepth += 1;
    if (char === "]") bracketDepth -= 1;
    if (char === "{") braceDepth += 1;
    if (char === "}") braceDepth -= 1;

    if (char === ";" && parenDepth === 0 && bracketDepth === 0 && braceDepth === 0) {
      return i;
    }
  }

  throw new Error("Could not parse map assignment.");
}

function findMatchingDelimiter(
  source: string,
  start: number,
  open: string,
  close: string
): number {
  if (start < 0 || source[start] !== open) {
    throw new Error(`Could not parse C++ near ${open}${close}.`);
  }

  let depth = 0;
  let quote: string | null = null;
  let lineComment = false;
  let blockComment = false;

  for (let i = start; i < source.length; i += 1) {
    const char = source[i];
    const next = source[i + 1];

    if (lineComment) {
      if (char === "\n") lineComment = false;
      continue;
    }

    if (blockComment) {
      if (char === "*" && next === "/") {
        blockComment = false;
        i += 1;
      }
      continue;
    }

    if (quote) {
      if (char === "\\") {
        i += 1;
      } else if (char === quote) {
        quote = null;
      }
      continue;
    }

    if (char === "/" && next === "/") {
      lineComment = true;
      i += 1;
      continue;
    }

    if (char === "/" && next === "*") {
      blockComment = true;
      i += 1;
      continue;
    }

    if (char === "\"" || char === "'") {
      quote = char;
      continue;
    }

    if (char === open) depth += 1;
    if (char === close) {
      depth -= 1;
      if (depth === 0) return i;
    }
  }

  throw new Error(`Could not find matching ${close}.`);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
