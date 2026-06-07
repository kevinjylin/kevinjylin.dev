"use client";

import Link from "next/link";
import { useRef, useState } from "react";
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

const LANGS: Lang[] = ["js", "python", "cpp"];

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

const EDITOR_INDENT = "\t";
const OPENER_TO_CLOSER: Record<string, string> = {
  "(": ")",
  "[": "]",
  "{": "}",
};
const CLOSERS = new Set(Object.values(OPENER_TO_CLOSER));
const QUOTES = new Set(["'", '"', "`"]);

interface CharState {
  isNormal: boolean;
}

const MATCHING_BRACKET: Record<string, string> = {
  "(": ")",
  "[": "]",
  "{": "}",
  ")": "(",
  "]": "[",
  "}": "{",
};
const OPEN_BRACKETS = new Set(["(", "[", "{"]);
const CLOSE_BRACKETS = new Set([")", "]", "}"]);

function parseCodeStates(text: string, lang: Lang): CharState[] {
  const states: CharState[] = [];
  let i = 0;
  const len = text.length;

  let inLineComment = false;
  let inBlockComment = false;
  let inString: string | null = null; // '"', "'", '`', or '"""', "'''"

  while (i < len) {
    const char = text[i];
    const nextChar = text[i + 1] || "";

    // Check comments / string closures
    if (inLineComment) {
      states.push({ isNormal: false });
      if (char === "\n") {
        inLineComment = false;
      }
      i++;
      continue;
    }

    if (inBlockComment) {
      states.push({ isNormal: false });
      if (char === "*" && nextChar === "/") {
        states.push({ isNormal: false }); // for '/'
        inBlockComment = false;
        i += 2;
      } else {
        i++;
      }
      continue;
    }

    if (inString) {
      states.push({ isNormal: false });

      // Check for escape character inside string
      if (char === "\\") {
        // Skip next character as it's escaped
        if (i + 1 < len) {
          states.push({ isNormal: false });
        }
        i += 2;
        continue;
      }

      // Check if string ends
      if (inString === '"""') {
        if (char === '"' && text.slice(i, i + 3) === '"""') {
          states.push({ isNormal: false }, { isNormal: false }); // for the other two quotes
          inString = null;
          i += 3;
        } else {
          i++;
        }
      } else if (inString === "'''") {
        if (char === "'" && text.slice(i, i + 3) === "'''") {
          states.push({ isNormal: false }, { isNormal: false });
          inString = null;
          i += 3;
        } else {
          i++;
        }
      } else {
        // Normal single/double quotes or backtick
        if (char === inString) {
          inString = null;
        }
        i++;
      }
      continue;
    }

    // Currently in normal code. Let's check if we enter comment or string
    // Single line comments
    if (lang !== "python" && char === "/" && nextChar === "/") {
      inLineComment = true;
      states.push({ isNormal: false }, { isNormal: false });
      i += 2;
      continue;
    }
    if (lang === "python" && char === "#") {
      inLineComment = true;
      states.push({ isNormal: false });
      i++;
      continue;
    }

    // Block comments
    if (lang !== "python" && char === "/" && nextChar === "*") {
      inBlockComment = true;
      states.push({ isNormal: false }, { isNormal: false });
      i += 2;
      continue;
    }

    // Python triple strings
    if (lang === "python" && char === '"' && text.slice(i, i + 3) === '"""') {
      inString = '"""';
      states.push({ isNormal: false }, { isNormal: false }, { isNormal: false });
      i += 3;
      continue;
    }
    if (lang === "python" && char === "'" && text.slice(i, i + 3) === "'''") {
      inString = "'''";
      states.push({ isNormal: false }, { isNormal: false }, { isNormal: false });
      i += 3;
      continue;
    }

    // Standard strings
    if (char === '"' || char === "'" || (lang === "js" && char === "`")) {
      inString = char;
      states.push({ isNormal: false });
      i++;
      continue;
    }

    // Normal code character
    states.push({ isNormal: true });
    i++;
  }

  return states;
}

function findMatchingBracketIndex(
  text: string,
  index: number,
  states: CharState[]
): number {
  if (index < 0 || index >= text.length) return -1;
  if (!states[index]?.isNormal) return -1;

  const char = text[index];
  const isOpen = OPEN_BRACKETS.has(char);
  const isClose = CLOSE_BRACKETS.has(char);

  if (!isOpen && !isClose) return -1;

  const matchChar = MATCHING_BRACKET[char];
  let depth = 0;

  if (isOpen) {
    for (let i = index + 1; i < text.length; i++) {
      if (!states[i]?.isNormal) continue;
      if (text[i] === char) {
        depth++;
      } else if (text[i] === matchChar) {
        if (depth === 0) {
          return i;
        }
        depth--;
      }
    }
  } else {
    for (let i = index - 1; i >= 0; i--) {
      if (!states[i]?.isNormal) continue;
      if (text[i] === char) {
        depth++;
      } else if (text[i] === matchChar) {
        if (depth === 0) {
          return i;
        }
        depth--;
      }
    }
  }

  return -1;
}

function findContainingBrackets(
  text: string,
  cursorIndex: number,
  states: CharState[]
): [number, number] | null {
  for (let i = cursorIndex - 1; i >= 0; i--) {
    if (!states[i]?.isNormal) continue;
    const char = text[i];
    if (OPEN_BRACKETS.has(char)) {
      const matchIdx = findMatchingBracketIndex(text, i, states);
      if (matchIdx !== -1 && matchIdx >= cursorIndex) {
        return [i, matchIdx];
      }
    }
  }
  return null;
}

const PYODIDE_CDN_URL = "https://cdn.jsdelivr.net/pyodide/v0.27.5/full/pyodide.mjs";

type SubmissionStats = {
  runtimeMs: number;
  memoryMb: number;
  runtimeBeats: number;
  memoryBeats: number;
};

function generateStats(lang: Lang): SubmissionStats {
  const baseRuntime = lang === "cpp" ? 0 : lang === "js" ? 60 : 32;
  const runtimeJitter = lang === "cpp" ? 6 : 24;
  return {
    runtimeMs: baseRuntime + Math.floor(Math.random() * runtimeJitter),
    memoryMb: Math.round((40 + Math.random() * 6) * 10) / 10,
    runtimeBeats: Math.round((80 + Math.random() * 19.99) * 100) / 100,
    memoryBeats: Math.round((65 + Math.random() * 33) * 100) / 100,
  };
}

interface PyodideInterface {
  runPythonAsync(code: string): Promise<unknown>;
}

interface PyodideResult {
  toJs?(): unknown[];
}

// `new Function` keeps the dynamic import out of the bundler's static-analysis path,
// so Next/webpack doesn't try to resolve the CDN URL at build time.
async function loadPyodideFromCDN(): Promise<PyodideInterface> {
  const dynamicImport = new Function("url", "return import(url)") as (
    url: string,
  ) => Promise<{ loadPyodide(): Promise<PyodideInterface> }>;
  const pyodideModule = await dynamicImport(PYODIDE_CDN_URL);
  return pyodideModule.loadPyodide();
}

async function runPythonTests(pyodide: PyodideInterface, code: string): Promise<Result[]> {
  await pyodide.runPythonAsync(code);

  const results: Result[] = [];
  for (const test of TESTS) {
    try {
      const raw = (await pyodide.runPythonAsync(
        `two_sum(${JSON.stringify(test.nums)}, ${test.target})`,
      )) as PyodideResult | null;
      const got =
        raw && typeof raw === "object" && typeof raw.toJs === "function"
          ? Array.from(raw.toJs())
          : raw;
      results.push({
        test,
        got,
        pass: sameIndices(got, test.expected, test.nums, test.target),
        error: null,
      });
    } catch (e) {
      results.push({ test, got: null, pass: false, error: String(e) });
    }
  }
  return results;
}

export default function TwoSumPage() {
  const [lang, setLang] = useState<Lang>("cpp");
  const [code, setCode] = useState(STARTERS.cpp);
  const [results, setResults] = useState<Result[] | null>(null);
  const [submissionStatus, setSubmissionStatus] = useState<SubmissionStatus | null>(null);
  const [submissionStats, setSubmissionStats] = useState<SubmissionStats | null>(null);
  const [cookieBites, setCookieBites] = useState(0);
  const [cookieDismissed, setCookieDismissed] = useState(false);
  const [topError, setTopError] = useState<string | null>(null);
  const [pyLoading, setPyLoading] = useState(false);
  const pyodideRef = useRef<PyodideInterface | null>(null);

  const [selectionRange, setSelectionRange] = useState({ start: 0, end: 0 });
  const backdropRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const updateSelectionAndScroll = (textarea: HTMLTextAreaElement) => {
    setSelectionRange({
      start: textarea.selectionStart,
      end: textarea.selectionEnd,
    });
    if (backdropRef.current) {
      backdropRef.current.scrollTop = textarea.scrollTop;
      backdropRef.current.scrollLeft = textarea.scrollLeft;
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget;
    if (backdropRef.current) {
      backdropRef.current.scrollTop = textarea.scrollTop;
      backdropRef.current.scrollLeft = textarea.scrollLeft;
    }
  };

  const codeStates = parseCodeStates(code, lang);
  let highlightIdx1 = -1;
  let highlightIdx2 = -1;

  if (selectionRange.start === selectionRange.end) {
    const cursorPos = selectionRange.start;
    const charAtCursor = code[cursorPos] || "";
    const matchForCursor =
      OPEN_BRACKETS.has(charAtCursor) || CLOSE_BRACKETS.has(charAtCursor)
        ? findMatchingBracketIndex(code, cursorPos, codeStates)
        : -1;

    if (matchForCursor !== -1) {
      highlightIdx1 = cursorPos;
      highlightIdx2 = matchForCursor;
    } else {
      const charBeforeCursor = code[cursorPos - 1] || "";
      const matchForBeforeCursor =
        OPEN_BRACKETS.has(charBeforeCursor) || CLOSE_BRACKETS.has(charBeforeCursor)
          ? findMatchingBracketIndex(code, cursorPos - 1, codeStates)
          : -1;

      if (matchForBeforeCursor !== -1) {
        highlightIdx1 = cursorPos - 1;
        highlightIdx2 = matchForBeforeCursor;
      } else {
        const containing = findContainingBrackets(code, cursorPos, codeStates);
        if (containing) {
          highlightIdx1 = containing[0];
          highlightIdx2 = containing[1];
        }
      }
    }
  }

  const renderBackdropContent = () => {
    const textToRender = code.endsWith("\n") ? code + " " : code;

    if (highlightIdx1 === -1 || highlightIdx2 === -1) {
      return textToRender;
    }

    const idxs = [highlightIdx1, highlightIdx2].sort((a, b) => a - b);
    const [first, second] = idxs;

    const part1 = textToRender.slice(0, first);
    const char1 = textToRender[first];
    const part2 = textToRender.slice(first + 1, second);
    const char2 = textToRender[second];
    const part3 = textToRender.slice(second + 1);

    return (
      <>
        {part1}
        <span className="twosum-bracket-highlight">{char1}</span>
        {part2}
        <span className="twosum-bracket-highlight">{char2}</span>
        {part3}
      </>
    );
  };

  const switchLang = (l: Lang) => {
    setLang(l);
    setCode(STARTERS[l]);
    setSelectionRange({ start: 0, end: 0 });
    setResults(null);
    setSubmissionStatus(null);
    setSubmissionStats(null);
    setTopError(null);
  };

  const showResults = (nextResults: Result[]) => {
    const nextStatus = getSubmissionStatus(nextResults);
    setSubmissionStatus(nextStatus);
    setResults(nextResults);

    if (nextStatus.kind === "accepted") {
      setSubmissionStats(generateStats(lang));
      setCookieBites(0);
      setCookieDismissed(false);
    } else {
      setSubmissionStats(null);
    }
  };

  const run = async () => {
    setTopError(null);
    setResults(null);
    setSubmissionStatus(null);
    setSubmissionStats(null);

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
          pyodideRef.current = await loadPyodideFromCDN();
        } catch (e) {
          setTopError(
            `Failed to load Python runtime: ${e instanceof Error ? e.message : String(e)}`,
          );
          setPyLoading(false);
          return;
        }
        setPyLoading(false);
      }

      try {
        const pythonResults = await runPythonTests(pyodideRef.current, code);
        showResults(pythonResults);
      } catch (e) {
        setTopError(String(e));
      }
    }
  };

  const reset = () => {
    setCode(STARTERS[lang]);
    setSelectionRange({ start: 0, end: 0 });
    setResults(null);
    setSubmissionStatus(null);
    setSubmissionStats(null);
    setCookieBites(0);
    setCookieDismissed(false);
    setTopError(null);
  };

  const handleEditorKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    const isCommentShortcut = event.key === "/" && (event.metaKey || event.ctrlKey);

    if (!isCommentShortcut && (event.altKey || event.ctrlKey || event.metaKey)) {
      return;
    }

    const textarea = event.currentTarget;
    const { selectionStart, selectionEnd, value } = textarea;

    const applyEdit = (
      nextValue: string,
      nextStart: number,
      nextEnd = nextStart,
      replacementRange?: { start: number; end: number; text: string },
    ) => {
      if (replacementRange) {
        textarea.focus();
        textarea.setSelectionRange(replacementRange.start, replacementRange.end);
        let success = false;
        try {
          success = document.execCommand("insertText", false, replacementRange.text);
        } catch (e) {
          success = false;
        }
        if (success) {
          requestAnimationFrame(() => {
            textarea.setSelectionRange(nextStart, nextEnd);
          });
          return;
        }
      }

      setCode(nextValue);
      requestAnimationFrame(() => {
        textarea.setSelectionRange(nextStart, nextEnd);
      });
    };

    if (isCommentShortcut) {
      event.preventDefault();

      const lineStart = value.lastIndexOf("\n", selectionStart - 1) + 1;
      let lineEnd = value.indexOf("\n", selectionEnd);
      if (lineEnd === -1) {
        lineEnd = value.length;
      }

      const blockText = value.slice(lineStart, lineEnd);
      const lines = blockText.split("\n");

      const commentPrefix = lang === "python" ? "# " : "// ";
      const commentRegex = lang === "python" ? /^[ \t]*#[ \t]?/ : /^[ \t]*\/\/[ \t]?/;

      let shouldComment = false;
      for (const line of lines) {
        if (line.trim().length > 0 && !commentRegex.test(line)) {
          shouldComment = true;
          break;
        }
      }

      let currentPos = lineStart;
      const newLines: string[] = [];
      let newSelectionStart = selectionStart;
      let newSelectionEnd = selectionEnd;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        let newLine = line;
        let diff = 0;
        let modOffset = 0;

        if (line.trim().length === 0) {
          newLines.push(line);
          currentPos += line.length + 1;
          continue;
        }

        if (shouldComment) {
          const match = line.match(/^([ \t]*)/);
          const leading = match ? match[1] : "";
          newLine = leading + commentPrefix + line.slice(leading.length);
          diff = commentPrefix.length;
          modOffset = leading.length;
        } else {
          const match = lang === "python"
            ? line.match(/^([ \t]*)(\#[ \t]?)/)
            : line.match(/^([ \t]*)(\/\/ ?)/);
          if (match) {
            const leading = match[1];
            const prefix = match[2];
            newLine = leading + line.slice(leading.length + prefix.length);
            diff = -prefix.length;
            modOffset = leading.length;
          }
        }

        newLines.push(newLine);

        const modPos = currentPos + modOffset;

        if (selectionStart > modPos) {
          newSelectionStart += diff;
          if (newSelectionStart < modPos) {
            newSelectionStart = modPos;
          }
        }
        if (selectionEnd > modPos) {
          newSelectionEnd += diff;
          if (newSelectionEnd < modPos) {
            newSelectionEnd = modPos;
          }
        }

        currentPos += line.length + 1;
      }

      const nextBlockText = newLines.join("\n");
      const nextValue = value.slice(0, lineStart) + nextBlockText + value.slice(lineEnd);
      applyEdit(nextValue, newSelectionStart, newSelectionEnd, {
        start: lineStart,
        end: lineEnd,
        text: nextBlockText,
      });
      return;
    }

    if (event.key === "Backspace" && selectionStart === selectionEnd) {
      const before = value[selectionStart - 1] ?? "";
      const after = value[selectionStart] ?? "";

      const isMatchingPair =
        (before === "(" && after === ")") ||
        (before === "[" && after === "]") ||
        (before === "{" && after === "}") ||
        (before === "'" && after === "'") ||
        (before === '"' && after === '"') ||
        (before === "`" && after === "`");

      if (isMatchingPair) {
        event.preventDefault();
        applyEdit(
          value.slice(0, selectionStart - 1) + value.slice(selectionStart + 1),
          selectionStart - 1,
          selectionStart - 1,
          { start: selectionStart - 1, end: selectionStart + 1, text: "" },
        );
        return;
      }
    }

    if (event.key === "Enter") {
      event.preventDefault();

      const lineStart = value.lastIndexOf("\n", selectionStart - 1) + 1;
      const linePrefix = value.slice(lineStart, selectionStart);
      const currentIndent = linePrefix.match(/^[ \t]*/)?.[0] ?? "";
      const before = value[selectionStart - 1] ?? "";
      const after = value[selectionStart] ?? "";
      const closingForBefore = OPENER_TO_CLOSER[before];

      let extraIndent = "";
      if (lang === "python" && linePrefix.trim().endsWith(":")) {
        extraIndent = EDITOR_INDENT;
      }

      if (selectionStart === selectionEnd && closingForBefore) {
        if (after === closingForBefore) {
          const insertion = `\n${currentIndent}${EDITOR_INDENT}\n${currentIndent}`;
          const nextValue = value.slice(0, selectionStart) + insertion + value.slice(selectionEnd);
          const nextCaret = selectionStart + 1 + currentIndent.length + EDITOR_INDENT.length;
          applyEdit(nextValue, nextCaret, nextCaret, {
            start: selectionStart,
            end: selectionEnd,
            text: insertion,
          });
          return;
        } else {
          const insertion = `\n${currentIndent}${EDITOR_INDENT}`;
          const nextValue = value.slice(0, selectionStart) + insertion + value.slice(selectionEnd);
          const nextCaret = selectionStart + insertion.length;
          applyEdit(nextValue, nextCaret, nextCaret, {
            start: selectionStart,
            end: selectionEnd,
            text: insertion,
          });
          return;
        }
      }

      const insertion = `\n${currentIndent}${extraIndent}`;
      const nextValue = value.slice(0, selectionStart) + insertion + value.slice(selectionEnd);
      const nextCaret = selectionStart + insertion.length;
      applyEdit(nextValue, nextCaret, nextCaret, {
        start: selectionStart,
        end: selectionEnd,
        text: insertion,
      });
      return;
    }

    if (event.key === "Tab") {
      event.preventDefault();
      const isShift = event.shiftKey;

      const lineStart = value.lastIndexOf("\n", selectionStart - 1) + 1;
      let lineEnd = value.indexOf("\n", selectionEnd);
      if (lineEnd === -1) {
        lineEnd = value.length;
      }

      if (selectionStart === selectionEnd && !isShift) {
        const nextValue =
          value.slice(0, selectionStart) + EDITOR_INDENT + value.slice(selectionEnd);
        const nextCaret = selectionStart + EDITOR_INDENT.length;
        applyEdit(nextValue, nextCaret, nextCaret, {
          start: selectionStart,
          end: selectionEnd,
          text: EDITOR_INDENT,
        });
        return;
      }

      const blockText = value.slice(lineStart, lineEnd);
      const lines = blockText.split("\n");

      let currentPos = lineStart;
      const newLines: string[] = [];
      let newSelectionStart = selectionStart;
      let newSelectionEnd = selectionEnd;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        let newLine = line;
        let diff = 0;

        if (!isShift) {
          const shouldIndentLine = line.length > 0 || selectionStart === selectionEnd;
          if (shouldIndentLine) {
            newLine = EDITOR_INDENT + line;
            diff = EDITOR_INDENT.length;
          }
        } else {
          if (line.startsWith("\t")) {
            newLine = line.slice(1);
            diff = -1;
          } else if (line.startsWith(" ")) {
            const match = line.match(/^( {1,4})/);
            const removeCount = match ? match[1].length : 0;
            newLine = line.slice(removeCount);
            diff = -removeCount;
          }
        }

        newLines.push(newLine);

        if (selectionStart > currentPos) {
          newSelectionStart += diff;
          if (newSelectionStart < currentPos) {
            newSelectionStart = currentPos;
          }
        }
        if (selectionEnd > currentPos) {
          newSelectionEnd += diff;
          if (newSelectionEnd < currentPos) {
            newSelectionEnd = currentPos;
          }
        }

        currentPos += line.length + 1;
      }

      const nextBlockText = newLines.join("\n");
      const nextValue = value.slice(0, lineStart) + nextBlockText + value.slice(lineEnd);
      applyEdit(nextValue, newSelectionStart, newSelectionEnd, {
        start: lineStart,
        end: lineEnd,
        text: nextBlockText,
      });
      return;
    }

    if (event.key in OPENER_TO_CLOSER) {
      const closer = OPENER_TO_CLOSER[event.key];
      const after = value[selectionStart] ?? "";
      const isAfterWordChar = /^[a-zA-Z0-9]$/.test(after);

      if (selectionStart !== selectionEnd) {
        event.preventDefault();
        const selected = value.slice(selectionStart, selectionEnd);
        const nextValue =
          value.slice(0, selectionStart) +
          event.key +
          selected +
          closer +
          value.slice(selectionEnd);
        applyEdit(nextValue, selectionStart + 1, selectionEnd + 1, {
          start: selectionStart,
          end: selectionEnd,
          text: event.key + selected + closer,
        });
        return;
      }

      if (!isAfterWordChar) {
        event.preventDefault();
        const nextValue =
          value.slice(0, selectionStart) + event.key + closer + value.slice(selectionEnd);
        applyEdit(nextValue, selectionStart + 1, selectionStart + 1, {
          start: selectionStart,
          end: selectionEnd,
          text: event.key + closer,
        });
        return;
      }
    }

    if (QUOTES.has(event.key)) {
      const charBefore = value[selectionStart - 1] ?? "";
      const charAfter = value[selectionStart] ?? "";
      const isBeforeWordChar = /^[a-zA-Z0-9]$/.test(charBefore);

      if (selectionStart !== selectionEnd) {
        event.preventDefault();
        const selected = value.slice(selectionStart, selectionEnd);
        const nextValue =
          value.slice(0, selectionStart) +
          event.key +
          selected +
          event.key +
          value.slice(selectionEnd);
        applyEdit(nextValue, selectionStart + 1, selectionEnd + 1, {
          start: selectionStart,
          end: selectionEnd,
          text: event.key + selected + event.key,
        });
        return;
      }

      if (charAfter === event.key) {
        event.preventDefault();
        textarea.setSelectionRange(selectionStart + 1, selectionStart + 1);
        return;
      }

      if (!isBeforeWordChar) {
        event.preventDefault();
        const nextValue =
          value.slice(0, selectionStart) + event.key + event.key + value.slice(selectionEnd);
        applyEdit(nextValue, selectionStart + 1, selectionStart + 1, {
          start: selectionStart,
          end: selectionEnd,
          text: event.key + event.key,
        });
        return;
      }
    }

    if (CLOSERS.has(event.key) && selectionStart === selectionEnd) {
      const after = value[selectionStart] ?? "";
      if (after === event.key) {
        event.preventDefault();
        textarea.setSelectionRange(selectionStart + 1, selectionStart + 1);
      }
      return;
    }
  };

  const isRunning = pyLoading;
  const bitesLeft = COOKIE_BITE_TOTAL - cookieBites;
  const firstFailed = results?.find((r) => !r.pass) ?? null;
  const showCookiePopup = submissionStatus?.kind === "accepted" && !cookieDismissed;

  return (
    <main className="page-shell" id="main-content" tabIndex={-1}>
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
                <circle
                  className="agent-graph__node agent-graph__node--one"
                  cx="20"
                  cy="22"
                  r="5"
                />
                <circle
                  className="agent-graph__node agent-graph__node--two"
                  cx="34"
                  cy="14"
                  r="4"
                />
                <circle
                  className="agent-graph__node agent-graph__node--three"
                  cx="48"
                  cy="25"
                  r="5"
                />
                <circle
                  className="agent-graph__node agent-graph__node--four"
                  cx="30"
                  cy="38"
                  r="5"
                />
                <circle
                  className="agent-graph__node agent-graph__node--five"
                  cx="44"
                  cy="47"
                  r="4"
                />
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
                  <label htmlFor="twosum-lang-select" className="sr-only">
                    Language
                  </label>
                  <select
                    id="twosum-lang-select"
                    className="twosum-lang-select"
                    value={lang}
                    onChange={(e) => switchLang(e.target.value as Lang)}
                  >
                    {LANGS.map((l) => (
                      <option key={l} value={l}>
                        {LANG_LABELS[l]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="twosum-editor-container">
                <div className="twosum-editor-backdrop" ref={backdropRef}>
                  {renderBackdropContent()}
                </div>
                <textarea
                  ref={textareaRef}
                  className="twosum-textarea"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value);
                    updateSelectionAndScroll(e.target);
                  }}
                  onKeyDown={handleEditorKeyDown}
                  onScroll={handleScroll}
                  onSelect={(e) => updateSelectionAndScroll(e.currentTarget)}
                  onKeyUp={(e) => updateSelectionAndScroll(e.currentTarget)}
                  onMouseUp={(e) => updateSelectionAndScroll(e.currentTarget)}
                  spellCheck={false}
                  aria-label="Solution code"
                />
              </div>
            </div>

            <div className="twosum-actions">
              <button
                type="button"
                className="twosum-button twosum-button--primary"
                onClick={() => {
                  void run();
                }}
                disabled={isRunning}
              >
                {isRunning ? "Loading Python..." : "Submit"}
              </button>
              <button type="button" className="twosum-button" onClick={reset} disabled={isRunning}>
                Reset
              </button>
            </div>

            {topError ? <pre className="twosum-error">{topError}</pre> : null}

            {submissionStatus ? (
              <div
                className={`lc-result lc-result--${
                  submissionStatus.kind === "accepted" ? "accepted" : "wrong"
                }`}
                aria-live="polite"
              >
                <div className="lc-result__topbar">
                  <span className="lc-result__tab lc-result__tab--active">
                    {submissionStatus.kind === "accepted" ? "Accepted" : "Wrong Answer"}
                  </span>
                  <span className="lc-result__runtime-chip">
                    Runtime {submissionStats ? `${submissionStats.runtimeMs} ms` : "—"}
                  </span>
                </div>

                <div className="lc-result__header">
                  <span className="lc-result__icon" aria-hidden="true">
                    {submissionStatus.kind === "accepted" ? "✓" : "✕"}
                  </span>
                  <h2 className="lc-result__title">
                    {submissionStatus.kind === "accepted" ? "Accepted" : "Wrong Answer"}
                  </h2>
                  <span className="lc-result__sub">
                    {submissionStatus.passed} / {submissionStatus.total} testcases passed
                  </span>
                </div>

                {submissionStatus.kind === "accepted" && submissionStats ? (
                  <div className="lc-result__stats">
                    <div className="lc-stat">
                      <div className="lc-stat__head">
                        <span className="lc-stat__label">Runtime</span>
                        <span className="lc-stat__value">{submissionStats.runtimeMs} ms</span>
                      </div>
                      <div className="lc-stat__beats">
                        Beats <strong>{submissionStats.runtimeBeats.toFixed(2)}%</strong> of users
                        with {LANG_LABELS[lang]}
                      </div>
                      <div className="lc-stat__bar">
                        <span
                          className="lc-stat__bar-fill"
                          style={{ width: `${submissionStats.runtimeBeats}%` }}
                        />
                      </div>
                    </div>

                    <div className="lc-stat">
                      <div className="lc-stat__head">
                        <span className="lc-stat__label">Memory</span>
                        <span className="lc-stat__value">{submissionStats.memoryMb} MB</span>
                      </div>
                      <div className="lc-stat__beats">
                        Beats <strong>{submissionStats.memoryBeats.toFixed(2)}%</strong> of users
                        with {LANG_LABELS[lang]}
                      </div>
                      <div className="lc-stat__bar">
                        <span
                          className="lc-stat__bar-fill"
                          style={{ width: `${submissionStats.memoryBeats}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ) : null}

                {submissionStatus.kind === "wrong-answer" && firstFailed ? (
                  <div className="lc-result__detail">
                    <div className="lc-detail-row">
                      <div className="lc-detail-row__label">Input</div>
                      <pre className="lc-detail-row__value">
                        nums = [{firstFailed.test.nums.join(",")}]{"\n"}target ={" "}
                        {firstFailed.test.target}
                      </pre>
                    </div>
                    <div className="lc-detail-row">
                      <div className="lc-detail-row__label">Output</div>
                      <pre className="lc-detail-row__value lc-detail-row__value--wrong">
                        {firstFailed.error ? firstFailed.error : JSON.stringify(firstFailed.got)}
                      </pre>
                    </div>
                    <div className="lc-detail-row">
                      <div className="lc-detail-row__label">Expected</div>
                      <pre className="lc-detail-row__value">
                        [{firstFailed.test.expected.join(",")}]
                      </pre>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </section>
        </div>
      </div>

      {showCookiePopup ? (
        <div className="cookie-popup" role="dialog" aria-label="You earned a cookie">
          <button
            type="button"
            className="cookie-popup__close"
            onClick={() => setCookieDismissed(true)}
            aria-label="Close"
          >
            ×
          </button>
          <p className="cookie-popup__eyebrow">surprise!</p>
          <h2 className="cookie-popup__title">here&apos;s a cookie 🍪</h2>
          <button
            type="button"
            className={`cookie-button cookie-button--bites-${cookieBites}`}
            onClick={() => setCookieBites((c) => getNextCookieBiteCount(c))}
            disabled={cookieBites === COOKIE_BITE_TOTAL}
            aria-label={
              bitesLeft > 0 ? `Eat the cookie. ${bitesLeft} bites left.` : "Cookie fully eaten."
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
          <p className="cookie-popup__note">
            {bitesLeft > 0
              ? `click the cookie ${bitesLeft} more ${bitesLeft === 1 ? "time" : "times"}.`
              : "nom nom. delicious."}
          </p>
        </div>
      ) : null}
    </main>
  );
}
