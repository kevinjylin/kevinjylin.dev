export const COOKIE_BITE_TOTAL = 3;

export type SubmissionStatus =
  | {
      kind: "accepted";
      passed: number;
      total: number;
    }
  | {
      kind: "wrong-answer";
      passed: number;
      total: number;
    };

export function getSubmissionStatus(results: Array<{ pass: boolean }>): SubmissionStatus {
  const total = results.length;
  const passed = results.filter((result) => result.pass).length;

  if (passed === total) {
    return { kind: "accepted", passed, total };
  }

  return { kind: "wrong-answer", passed, total };
}

export function getNextCookieBiteCount(currentBites: number): number {
  return Math.min(COOKIE_BITE_TOTAL, currentBites + 1);
}
