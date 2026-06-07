"use client";

import { useCallback, useMemo, useRef, useState } from "react";

import { FILENAMES, LANGS, LANG_LABELS, type Lang } from "@/lib/two-sum-constants";
import { createEditorKeyDownHandler, getBracketHighlights } from "@/lib/two-sum-editor";

type CodeEditorProps = {
  code: string;
  lang: Lang;
  onCodeChange: (nextCode: string) => void;
  onLangChange: (lang: Lang) => void;
};

export function CodeEditor({ code, lang, onCodeChange, onLangChange }: CodeEditorProps) {
  const [selectionRange, setSelectionRange] = useState({ start: 0, end: 0 });
  const backdropRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const updateSelectionAndScroll = useCallback((textarea: HTMLTextAreaElement) => {
    setSelectionRange({
      start: textarea.selectionStart,
      end: textarea.selectionEnd,
    });
    if (backdropRef.current) {
      backdropRef.current.scrollTop = textarea.scrollTop;
      backdropRef.current.scrollLeft = textarea.scrollLeft;
    }
  }, []);

  const handleScroll = useCallback((textarea: HTMLTextAreaElement) => {
    if (backdropRef.current) {
      backdropRef.current.scrollTop = textarea.scrollTop;
      backdropRef.current.scrollLeft = textarea.scrollLeft;
    }
  }, []);

  const handleEditorKeyDown = useMemo(
    () => createEditorKeyDownHandler({ lang, onCodeChange }),
    [lang, onCodeChange],
  );

  const bracketHighlights = getBracketHighlights(
    code,
    lang,
    selectionRange.start,
    selectionRange.end,
  );

  const backdropContent = useMemo(() => {
    const textToRender = code.endsWith("\n") ? code + " " : code;

    if (!bracketHighlights) {
      return textToRender;
    }

    const [first, second] = [...bracketHighlights].sort((a, b) => a - b);
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
  }, [bracketHighlights, code]);

  return (
    <div className="twosum-editor">
      <div className="twosum-editor-bar">
        <div className="twosum-editor-filename">
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
            onChange={(e) => onLangChange(e.target.value as Lang)}
          >
            {LANGS.map((option) => (
              <option key={option} value={option}>
                {LANG_LABELS[option]}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="twosum-editor-container">
        <div className="twosum-editor-backdrop" ref={backdropRef}>
          {backdropContent}
        </div>
        <textarea
          ref={textareaRef}
          className="twosum-textarea"
          value={code}
          onChange={(e) => {
            onCodeChange(e.target.value);
            updateSelectionAndScroll(e.target);
          }}
          onKeyDown={handleEditorKeyDown}
          onScroll={(e) => handleScroll(e.currentTarget)}
          onSelect={(e) => updateSelectionAndScroll(e.currentTarget)}
          onKeyUp={(e) => updateSelectionAndScroll(e.currentTarget)}
          onMouseUp={(e) => updateSelectionAndScroll(e.currentTarget)}
          spellCheck={false}
          aria-label="Solution code"
        />
      </div>
    </div>
  );
}
