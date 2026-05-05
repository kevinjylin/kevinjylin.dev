"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";

import {
  TESTS,
  runCppTests,
  runJavaScriptTests,
  sameIndices,
  type Result,
} from "@/lib/two-sum-runner";
import {
  COOKIE_BITE_TOTAL,
  getNextCookieBiteCount,
  getSubmissionStatus,
  type SubmissionStatus,
} from "@/lib/two-sum-submission";

type Lang = "js" | "python" | "cpp";

const STARTERS: Record<Lang, string> = {
  js: `function twoSum(nums, target) {
  // return the indices of the two numbers that add to target
}
`,
  python: `def two_sum(nums, target):
    # return the indices of the two numbers that add to target
    pass
`,
  cpp: `#include <vector>
#include <unordered_map>
using namespace std;

vector<int> twoSum(vector<int>& nums, int target) {
    // return the indices of the two numbers that add to target
}
`,
};

const FILENAMES: Record<Lang, string> = {
  js: "solution.js",
  python: "solution.py",
  cpp: "solution.cpp",
};

const LANG_LABELS: Record<Lang, string> = {
  js: "JavaScript",
  python: "Python",
  cpp: "C++",
};

interface PyodideInterface {
  runPythonAsync(code: string): Promise<unknown>;
}

interface PyodideResult {
  toJs?(): unknown[];
}

export default function TwoSumPage() {
  const router = useRouter();
  const [lang, setLang] = useState<Lang>("cpp");
  const [code, setCode] = useState(STARTERS.cpp);
  const [results, setResults] = useState<Result[] | null>(null);
  const [submissionStatus, setSubmissionStatus] = useState<SubmissionStatus | null>(null);
  const [cookieBites, setCookieBites] = useState(0);
  const [topError, setTopError] = useState<string | null>(null);
  const [pyLoading, setPyLoading] = useState(false);
  const pyodideRef = useRef<PyodideInterface | null>(null);
  const cookieReturnTimerRef = useRef<number | null>(null);

  const switchLang = (l: Lang) => {
    setLang(l);
    setCode(STARTERS[l]);
    setResults(null);
    setSubmissionStatus(null);
    setTopError(null);
  };

  const showResults = (nextResults: Result[]) => {
    const nextStatus = getSubmissionStatus(nextResults);
    setSubmissionStatus(nextStatus);

    if (nextStatus.kind === "accepted") {
      setResults(null);
      setCookieBites(0);
      return;
    }

    setResults(nextResults);
  };

  const run = async () => {
    setTopError(null);
    setResults(null);
    setSubmissionStatus(null);

    if (lang === "cpp") {
      const outcome = runCppTests(code);
      if (outcome.error) {
        setTopError(`C++ runner error: ${outcome.error}`);
        return;
      }
      showResults(outcome.results);
      return;
    }

    if (lang === "js") {
      const outcome = runJavaScriptTests(code);
      if (outcome.error) {
        setTopError(outcome.error);
        return;
      }
      showResults(outcome.results);
      return;
    }

    if (lang === "python") {
      if (!pyodideRef.current) {
        setPyLoading(true);
        try {
          const loadFromCDN = new Function(
            "url",
            "return import(url)"
          ) as (url: string) => Promise<{ loadPyodide(): Promise<PyodideInterface> }>;
          const pyodideModule = await loadFromCDN(
            "https://cdn.jsdelivr.net/pyodide/v0.27.5/full/pyodide.mjs"
          );
          pyodideRef.current = await pyodideModule.loadPyodide();
        } catch (e) {
          setTopError(`Failed to load Python runtime: ${e instanceof Error ? e.message : String(e)}`);
          setPyLoading(false);
          return;
        }
        setPyLoading(false);
      }

      const pyodide = pyodideRef.current;
      try {
        await pyodide.runPythonAsync(code);
      } catch (e) {
        setTopError(String(e));
        return;
      }

      const out: Result[] = [];
      for (const t of TESTS) {
        try {
          const raw = await pyodide.runPythonAsync(
            `two_sum(${JSON.stringify(t.nums)}, ${t.target})`
          ) as PyodideResult | null;
          const got = raw && typeof raw === "object" && typeof raw.toJs === "function"
            ? Array.from(raw.toJs())
            : raw;
          out.push({ test: t, got, pass: sameIndices(got, t.expected, t.nums, t.target), error: null });
        } catch (e) {
          out.push({ test: t, got: null, pass: false, error: String(e) });
        }
      }
      showResults(out);
    }
  };

  const reset = () => {
    setCode(STARTERS[lang]);
    setResults(null);
    setSubmissionStatus(null);
    setCookieBites(0);
    setTopError(null);
  };

  useEffect(() => {
    if (submissionStatus?.kind !== "accepted" || cookieBites !== COOKIE_BITE_TOTAL) {
      return;
    }

    cookieReturnTimerRef.current = window.setTimeout(() => {
      router.push("/");
    }, 1000);

    return () => {
      if (cookieReturnTimerRef.current !== null) {
        window.clearTimeout(cookieReturnTimerRef.current);
        cookieReturnTimerRef.current = null;
      }
    };
  }, [cookieBites, router, submissionStatus]);

  const handleEditorKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey) {
      return;
    }

    const textarea = event.currentTarget;
    const { selectionStart, selectionEnd, value } = textarea;
    const indent = "  ";
    const openerToCloser: Record<string, string> = {
      "(": ")",
      "[": "]",
      "{": "}",
    };

    const applyEdit = (nextValue: string, nextStart: number, nextEnd = nextStart) => {
      setCode(nextValue);
      requestAnimationFrame(() => {
        textarea.setSelectionRange(nextStart, nextEnd);
      });
    };

    if (event.key === "Enter") {
      event.preventDefault();

      const lineStart = value.lastIndexOf("\n", selectionStart - 1) + 1;
      const linePrefix = value.slice(lineStart, selectionStart);
      const currentIndent = linePrefix.match(/^[ \t]*/)?.[0] ?? "";
      const before = value[selectionStart - 1] ?? "";
      const closingForBefore = openerToCloser[before];
      const lineEndIndex = value.indexOf("\n", selectionStart);
      const restOfLine = value.slice(selectionStart, lineEndIndex === -1 ? value.length : lineEndIndex);

      if (selectionStart === selectionEnd && closingForBefore && (restOfLine.trim() === "")) {
        const insertion = `\n${currentIndent}${indent}\n${currentIndent}`;
        const nextValue = value.slice(0, selectionStart) + insertion + value.slice(selectionEnd);
        const nextCaret = selectionStart + 1 + currentIndent.length + indent.length;
        applyEdit(nextValue, nextCaret);
        return;
      }

      const insertion = `\n${currentIndent}`;
      const nextValue = value.slice(0, selectionStart) + insertion + value.slice(selectionEnd);
      const nextCaret = selectionStart + insertion.length;
      applyEdit(nextValue, nextCaret);
      return;
    }

    if (event.key === "Tab") {
      event.preventDefault();

      if (selectionStart === selectionEnd) {
        const nextValue = `${value.slice(0, selectionStart)}${indent}${value.slice(selectionEnd)}`;
        const nextCaret = selectionStart + indent.length;
        applyEdit(nextValue, nextCaret);
        return;
      }

      const selected = value.slice(selectionStart, selectionEnd);
      const lines = selected.split("\n");
      const indentedSelection = lines.map((line) => `${indent}${line}`).join("\n");
      const nextValue =
        value.slice(0, selectionStart) + indentedSelection + value.slice(selectionEnd);

      applyEdit(
        nextValue,
        selectionStart + indent.length,
        selectionEnd + indent.length * lines.length
      );
      return;
    }

    if (event.key in openerToCloser) {
      event.preventDefault();
      const closer = openerToCloser[event.key];

      if (selectionStart !== selectionEnd) {
        const selected = value.slice(selectionStart, selectionEnd);
        const nextValue =
          value.slice(0, selectionStart) +
          event.key +
          selected +
          closer +
          value.slice(selectionEnd);
        applyEdit(nextValue, selectionStart + 1, selectionEnd + 1);
        return;
      }

      const nextValue =
        value.slice(0, selectionStart) + event.key + closer + value.slice(selectionEnd);
      applyEdit(nextValue, selectionStart + 1);
      return;
    }

    if ([")", "]", "}"].includes(event.key) && selectionStart === selectionEnd) {
      const after = value[selectionStart] ?? "";
      if (after === event.key) {
        event.preventDefault();
        applyEdit(value, selectionStart + 1);
      }
      return;
    }
  };

  const isRunning = pyLoading;

  if (submissionStatus?.kind === "accepted") {
    const bitesLeft = COOKIE_BITE_TOTAL - cookieBites;

    return (
      <main className="page-shell twosum-cookie-shell">
        <section className="twosum-cookie-celebration" aria-live="polite">
          <p className="twosum-submission-status twosum-submission-status--accepted">
            {submissionStatus.message}
          </p>
          <h1>congrats! here&apos;s a cookie</h1>
          <button
            type="button"
            className={`cookie-button cookie-button--bites-${cookieBites}`}
            onClick={() => setCookieBites((current) => getNextCookieBiteCount(current))}
            disabled={cookieBites === COOKIE_BITE_TOTAL}
            aria-label={
              bitesLeft > 0
                ? `Eat the cookie. ${bitesLeft} bites left.`
                : "Cookie fully eaten."
            }
          >
            <span className="cookie-chip cookie-chip--one" />
            <span className="cookie-chip cookie-chip--two" />
            <span className="cookie-chip cookie-chip--three" />
            <span className="cookie-chip cookie-chip--four" />
            {Array.from({ length: COOKIE_BITE_TOTAL }, (_, index) => (
              <span
                key={index}
                className={`cookie-bite cookie-bite--${index + 1}${
                  cookieBites > index ? " cookie-bite--eaten" : ""
                }`}
              />
            ))}
          </button>
          <p className="twosum-cookie-note">
            {bitesLeft > 0
              ? `Click the cookie ${bitesLeft} more ${bitesLeft === 1 ? "time" : "times"}.`
              : "Cookie eaten."}
          </p>
        </section>
      </main>
    );
  }

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
                <div className="twosum-lang-tabs">
                  <span className="twosum-filename">{FILENAMES[lang]}</span>
                </div>
                <div>
                  <label htmlFor="twosum-lang-select" className="sr-only">Language</label>
                  <select
                    id="twosum-lang-select"
                    className="twosum-lang-select"
                    value={lang}
                    onChange={(e) => switchLang(e.target.value as Lang)}
                  >
                    {(["js", "python", "cpp"] as Lang[]).map((l) => (
                      <option key={l} value={l}>{LANG_LABELS[l]}</option>
                    ))}
                  </select>
                </div>
              </div>
              <textarea
                className="twosum-textarea"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={handleEditorKeyDown}
                spellCheck={false}
                aria-label="Solution code"
              />
            </div>

            <div className="twosum-actions">
              <button
                type="button"
                className="twosum-button twosum-button--primary"
                onClick={() => { void run(); }}
                disabled={isRunning}
              >
                {isRunning ? "Loading Python..." : "Submit"}
              </button>
              <button type="button" className="twosum-button" onClick={reset} disabled={isRunning}>
                Reset
              </button>
            </div>

            {topError ? (
              <pre className="twosum-error">{topError}</pre>
            ) : null}

            {submissionStatus?.kind === "wrong-answer" ? (
              <p className="twosum-submission-status twosum-submission-status--wrong">
                {submissionStatus.message}
              </p>
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
