export const COOKIE_BITE_TOTAL = 5;

export type SubmissionStatus =
  | {
      kind: "accepted";
      message: "Accepted";
      passed: number;
      total: number;
    }
  | {
      kind: "wrong-answer";
      message: string;
      passed: number;
      total: number;
    };

export function getSubmissionStatus(results: Array<{ pass: boolean }>): SubmissionStatus {
  const total = results.length;
  const passed = results.filter((result) => result.pass).length;

  if (passed === total) {
    return {
      kind: "accepted",
      message: "Accepted",
      passed,
      total,
    };
  }

  return {
    kind: "wrong-answer",
    message: `Wrong Answer ${passed}/${total} test cases passed`,
    passed,
    total,
  };
}

export function getNextCookieBiteCount(currentBites: number): number {
  return Math.min(COOKIE_BITE_TOTAL, currentBites + 1);
}
