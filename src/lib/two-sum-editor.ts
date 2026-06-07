import type { KeyboardEvent } from "react";

import type { Lang } from "@/lib/two-sum-constants";


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

export function getBracketHighlights(
  code: string,
  lang: Lang,
  selectionStart: number,
  selectionEnd: number,
): [number, number] | null {
  if (selectionStart !== selectionEnd) {
    return null;
  }

  const codeStates = parseCodeStates(code, lang);
  const cursorPos = selectionStart;
  const charAtCursor = code[cursorPos] || "";
  const matchForCursor =
    OPEN_BRACKETS.has(charAtCursor) || CLOSE_BRACKETS.has(charAtCursor)
      ? findMatchingBracketIndex(code, cursorPos, codeStates)
      : -1;

  if (matchForCursor !== -1) {
    return [cursorPos, matchForCursor];
  }

  const charBeforeCursor = code[cursorPos - 1] || "";
  const matchForBeforeCursor =
    OPEN_BRACKETS.has(charBeforeCursor) || CLOSE_BRACKETS.has(charBeforeCursor)
      ? findMatchingBracketIndex(code, cursorPos - 1, codeStates)
      : -1;

  if (matchForBeforeCursor !== -1) {
    return [cursorPos - 1, matchForBeforeCursor];
  }

  return findContainingBrackets(code, cursorPos, codeStates);
}

type EditorKeyDownOptions = {
  lang: Lang;
  onCodeChange: (nextCode: string) => void;
};

export function createEditorKeyDownHandler({ lang, onCodeChange }: EditorKeyDownOptions) {
  return (event: KeyboardEvent<HTMLTextAreaElement>) => {

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
        } catch {
          success = false;
        }
        if (success) {
          requestAnimationFrame(() => {
            textarea.setSelectionRange(nextStart, nextEnd);
          });
          return;
        }
      }

      onCodeChange(nextValue);
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
}

