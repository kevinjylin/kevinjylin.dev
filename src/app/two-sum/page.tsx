"use client";

import Link from "next/link";
import { useState } from "react";

const STARTER = `function twoSum(nums, target) {
  // return the indices of the two numbers that add to target
}
`;

type TestCase = {
  nums: number[];
  target: number;
  expected: [number, number];
};

const TESTS: TestCase[] = [
  { nums: [2, 7, 11, 15], target: 9, expected: [0, 1] },
  { nums: [3, 2, 4], target: 6, expected: [1, 2] },
  { nums: [3, 3], target: 6, expected: [0, 1] },
  { nums: [-1, -2, -3, -4, -5], target: -8, expected: [2, 4] },
  { nums: [0, 4, 3, 0], target: 0, expected: [0, 3] },
];

type Result = {
  test: TestCase;
  got: unknown;
  pass: boolean;
  error: string | null;
};

function sameIndices(got: unknown, expected: [number, number], nums: number[], target: number): boolean {
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

export default function TwoSumPage() {
  const [code, setCode] = useState(STARTER);
  const [results, setResults] = useState<Result[] | null>(null);
  const [topError, setTopError] = useState<string | null>(null);

  const run = () => {
    setTopError(null);
    type TwoSumFn = (nums: number[], target: number) => unknown;
    let fn: TwoSumFn;
    try {
      const candidate = new Function(`${code}\n;return twoSum;`)() as unknown;
      if (typeof candidate !== "function") throw new Error("twoSum is not a function");
      fn = candidate as TwoSumFn;
    } catch (e) {
      setTopError(e instanceof Error ? e.message : String(e));
      setResults(null);
      return;
    }

    const out: Result[] = TESTS.map((t) => {
      try {
        const got = fn(t.nums.slice(), t.target);
        return { test: t, got, pass: sameIndices(got, t.expected, t.nums, t.target), error: null };
      } catch (e) {
        return { test: t, got: null, pass: false, error: e instanceof Error ? e.message : String(e) };
      }
    });
    setResults(out);
  };

  const reset = () => {
    setCode(STARTER);
    setResults(null);
    setTopError(null);
  };

  const passCount = results?.filter((r) => r.pass).length ?? 0;

  return (
    <main className="page-shell">
      <div className="page-frame">
        <div className="intro-offset">
          <Link href="/" className="site-icon" aria-label="Back home">
            <svg
              className="agent-graph"
              viewBox="0 0 64 64"
              width="56"
              height="56"
              aria-hidden="true"
              focusable="false"
            >
              <g transform="translate(-2 1.5)">
                <path className="agent-graph__link agent-graph__link--one" d="M20 22L34 14L48 25" />
                <path className="agent-graph__link agent-graph__link--two" d="M20 22L30 38L48 25" />
                <path className="agent-graph__link agent-graph__link--three" d="M30 38L44 47" />
                <circle className="agent-graph__node agent-graph__node--one" cx="20" cy="22" r="5" />
                <circle className="agent-graph__node agent-graph__node--two" cx="34" cy="14" r="4" />
                <circle className="agent-graph__node agent-graph__node--three" cx="48" cy="25" r="5" />
                <circle className="agent-graph__node agent-graph__node--four" cx="30" cy="38" r="5" />
                <circle className="agent-graph__node agent-graph__node--five" cx="44" cy="47" r="4" />
              </g>
            </svg>
          </Link>

          <section className="intro">
            <h1>Two Sum</h1>

            <div className="intro-copy">
              <p>
                Given an array of integers <code>nums</code> and an integer <code>target</code>,
                return the indices of the two numbers such that they add up to <code>target</code>.
              </p>
              <p>
                You may assume that each input has exactly one solution, and you may not use the
                same element twice. Write your solution below and run it against the test cases.
              </p>
            </div>
          </section>

          <section className="twosum">
            <div className="twosum-editor">
              <div className="twosum-editor-bar">
                <span>solution.js</span>
              </div>
              <textarea
                className="twosum-textarea"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                spellCheck={false}
                aria-label="Solution code"
              />
            </div>

            <div className="twosum-actions">
              <button type="button" className="twosum-button twosum-button--primary" onClick={run}>
                Run tests
              </button>
              <button type="button" className="twosum-button" onClick={reset}>
                Reset
              </button>
              {results ? (
                <span className="twosum-summary">
                  {passCount} / {results.length} passed
                </span>
              ) : null}
            </div>

            {topError ? (
              <pre className="twosum-error">SyntaxError: {topError}</pre>
            ) : null}

            {results ? (
              <ul className="twosum-results">
                {results.map((r, i) => (
                  <li
                    key={i}
                    className={`twosum-result ${r.pass ? "twosum-result--pass" : "twosum-result--fail"}`}
                  >
                    <div className="twosum-result-head">
                      <span className="twosum-badge">{r.pass ? "PASS" : "FAIL"}</span>
                      <code>
                        twoSum([{r.test.nums.join(", ")}], {r.test.target})
                      </code>
                    </div>
                    <div className="twosum-result-body">
                      <span>expected: [{r.test.expected.join(", ")}]</span>
                      <span>
                        got:{" "}
                        {r.error ? (
                          <em>{r.error}</em>
                        ) : (
                          <code>{JSON.stringify(r.got)}</code>
                        )}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        </div>
      </div>
    </main>
  );
}
