import assert from "node:assert/strict";
import test from "node:test";

import {
  COOKIE_BITE_TOTAL,
  getNextCookieBiteCount,
  getSubmissionStatus,
} from "./two-sum-submission.ts";

test("formats accepted status when every test passes", () => {
  const status = getSubmissionStatus(Array.from({ length: 5 }, () => ({ pass: true })));

  assert.deepEqual(status, {
    kind: "accepted",
    message: "Accepted",
    passed: 5,
    total: 5,
  });
});

test("formats wrong answer status with passed count", () => {
  const status = getSubmissionStatus([
    { pass: true },
    { pass: false },
    { pass: true },
    { pass: false },
    { pass: false },
  ]);

  assert.deepEqual(status, {
    kind: "wrong-answer",
    message: "Wrong Answer 2/5 test cases passed",
    passed: 2,
    total: 5,
  });
});

test("caps cookie bites after the fifth click", () => {
  let bites = 0;
  for (let i = 0; i < COOKIE_BITE_TOTAL + 3; i += 1) {
    bites = getNextCookieBiteCount(bites);
  }

  assert.equal(bites, 5);
});
