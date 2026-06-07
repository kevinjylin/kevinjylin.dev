import type { Result } from "@/lib/two-sum-runner";
import { LANG_LABELS, type Lang } from "@/lib/two-sum-constants";
import type { SubmissionStats } from "@/lib/two-sum-stats";
import type { SubmissionStatus } from "@/lib/two-sum-submission";

type SubmissionResultProps = {
  firstFailed: Result | null;
  lang: Lang;
  stats: SubmissionStats | null;
  status: SubmissionStatus;
};

export function SubmissionResult({ firstFailed, lang, stats, status }: SubmissionResultProps) {
  const isAccepted = status.kind === "accepted";

  return (
    <div className={`lc-result lc-result--${isAccepted ? "accepted" : "wrong"}`} aria-live="polite">
      <div className="lc-result__topbar">
        <span className="lc-result__tab lc-result__tab--active">
          {isAccepted ? "Accepted" : "Wrong Answer"}
        </span>
        <span className="lc-result__runtime-chip">
          Runtime {stats ? `${stats.runtimeMs} ms` : "—"}
        </span>
      </div>

      <div className="lc-result__header">
        <span className="lc-result__icon" aria-hidden="true">
          {isAccepted ? "✓" : "✕"}
        </span>
        <h2 className="lc-result__title">{isAccepted ? "Accepted" : "Wrong Answer"}</h2>
        <span className="lc-result__sub">
          {status.passed} / {status.total} testcases passed
        </span>
      </div>

      {isAccepted && stats ? (
        <div className="lc-result__stats">
          <div className="lc-stat">
            <div className="lc-stat__head">
              <span className="lc-stat__label">Runtime</span>
              <span className="lc-stat__value">{stats.runtimeMs} ms</span>
            </div>
            <div className="lc-stat__beats">
              Beats <strong>{stats.runtimeBeats.toFixed(2)}%</strong> of users with{" "}
              {LANG_LABELS[lang]}
            </div>
            <div className="lc-stat__bar">
              <span className="lc-stat__bar-fill" style={{ width: `${stats.runtimeBeats}%` }} />
            </div>
          </div>

          <div className="lc-stat">
            <div className="lc-stat__head">
              <span className="lc-stat__label">Memory</span>
              <span className="lc-stat__value">{stats.memoryMb} MB</span>
            </div>
            <div className="lc-stat__beats">
              Beats <strong>{stats.memoryBeats.toFixed(2)}%</strong> of users with{" "}
              {LANG_LABELS[lang]}
            </div>
            <div className="lc-stat__bar">
              <span className="lc-stat__bar-fill" style={{ width: `${stats.memoryBeats}%` }} />
            </div>
          </div>
        </div>
      ) : null}

      {status.kind === "wrong-answer" && firstFailed ? (
        <div className="lc-result__detail">
          <div className="lc-detail-row">
            <div className="lc-detail-row__label">Input</div>
            <pre className="lc-detail-row__value">
              nums = [{firstFailed.test.nums.join(",")}]{"\n"}target = {firstFailed.test.target}
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
            <pre className="lc-detail-row__value">[{firstFailed.test.expected.join(",")}]</pre>
          </div>
        </div>
      ) : null}
    </div>
  );
}
