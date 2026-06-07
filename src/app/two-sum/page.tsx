"use client";

import Link from "next/link";
import { useRef, useState } from "react";

import { AgentGraphIcon } from "@/components/agent-graph-icon";
import { CodeEditor } from "@/components/two-sum/code-editor";
import { CookiePopup } from "@/components/two-sum/cookie-popup";
import { SubmissionResult } from "@/components/two-sum/submission-result";
import { STARTERS, type Lang } from "@/lib/two-sum-constants";
import { loadPyodideFromCDN, runPythonTests } from "@/lib/two-sum-python";
import { runCppTests, runJavaScriptTests, type Result } from "@/lib/two-sum-runner";
import { generateSubmissionStats, type SubmissionStats } from "@/lib/two-sum-stats";
import { getSubmissionStatus, type SubmissionStatus } from "@/lib/two-sum-submission";

export default function TwoSumPage() {
  const [lang, setLang] = useState<Lang>("cpp");
  const [code, setCode] = useState(STARTERS.cpp);
  const [editorKey, setEditorKey] = useState(0);
  const [firstFailed, setFirstFailed] = useState<Result | null>(null);
  const [submissionStatus, setSubmissionStatus] = useState<SubmissionStatus | null>(null);
  const [submissionStats, setSubmissionStats] = useState<SubmissionStats | null>(null);
  const [cookieBites, setCookieBites] = useState(0);
  const [cookieDismissed, setCookieDismissed] = useState(false);
  const [topError, setTopError] = useState<string | null>(null);
  const [pyLoading, setPyLoading] = useState(false);
  const pyodideRef = useRef<Awaited<ReturnType<typeof loadPyodideFromCDN>> | null>(null);

  const clearSubmission = () => {
    setFirstFailed(null);
    setSubmissionStatus(null);
    setSubmissionStats(null);
  };

  const switchLang = (nextLang: Lang) => {
    setLang(nextLang);
    setCode(STARTERS[nextLang]);
    setEditorKey((key) => key + 1);
    clearSubmission();
    setTopError(null);
  };

  const showResults = (nextResults: Result[]) => {
    const nextStatus = getSubmissionStatus(nextResults);
    setSubmissionStatus(nextStatus);
    setFirstFailed(nextResults.find((result) => !result.pass) ?? null);

    if (nextStatus.kind === "accepted") {
      setSubmissionStats(generateSubmissionStats(lang));
      setCookieBites(0);
      setCookieDismissed(false);
    } else {
      setSubmissionStats(null);
    }
  };

  const run = async () => {
    setTopError(null);
    clearSubmission();

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
  };

  const reset = () => {
    setCode(STARTERS[lang]);
    setEditorKey((key) => key + 1);
    clearSubmission();
    setCookieBites(0);
    setCookieDismissed(false);
    setTopError(null);
  };

  const isRunning = pyLoading;
  const showCookiePopup = submissionStatus?.kind === "accepted" && !cookieDismissed;

  return (
    <main className="page-shell" id="main-content" tabIndex={-1}>
      <div className="page-frame">
        <div className="intro-offset">
          <Link href="/" className="site-icon" aria-label="Back home">
            <AgentGraphIcon />
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
            <CodeEditor
              key={editorKey}
              code={code}
              lang={lang}
              onCodeChange={setCode}
              onLangChange={switchLang}
            />

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
              <SubmissionResult
                status={submissionStatus}
                stats={submissionStats}
                lang={lang}
                firstFailed={firstFailed}
              />
            ) : null}
          </section>
        </div>
      </div>

      {showCookiePopup ? (
        <CookiePopup
          bites={cookieBites}
          onBite={setCookieBites}
          onDismiss={() => setCookieDismissed(true)}
        />
      ) : null}
    </main>
  );
}
