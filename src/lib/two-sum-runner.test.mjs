import assert from "node:assert/strict";
import test from "node:test";

import { TESTS, runCppTests } from "./two-sum-runner.ts";

test("runs a correct standalone C++ vector solution against every case", () => {
  const { error, results } = runCppTests(`#include <vector>
using namespace std;

vector<int> twoSum(vector<int>& nums, int target) {
    for (int i = 0; i < nums.size(); i++) {
        for (int j = i + 1; j < nums.size(); j++) {
            if (nums[i] + nums[j] == target) {
                return {i, j};
            }
        }
    }
    return {};
}
`);

  assert.equal(error, null);
  assert.equal(results.length, TESTS.length);
  assert.equal(results.filter((result) => result.pass).length, TESTS.length);
});

test("supports a common unordered_map C++ solution inside class Solution", () => {
  const { error, results } = runCppTests(`#include <vector>
#include <unordered_map>
using namespace std;

class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        unordered_map<int, int> seen;
        for (int i = 0; i < nums.size(); i++) {
            int complement = target - nums[i];
            if (seen.count(complement)) {
                return {seen[complement], i};
            }
            seen[nums[i]] = i;
        }
        return {};
    }
};
`);

  assert.equal(error, null);
  assert.equal(results.length, TESTS.length);
  assert.equal(results.filter((result) => result.pass).length, TESTS.length);
});

test("reports failures from incorrect C++ output without hiding the test results", () => {
  const { error, results } = runCppTests(`vector<int> twoSum(vector<int>& nums, int target) {
    return {0, 0};
}
`);

  assert.equal(error, null);
  assert.equal(results.length, TESTS.length);
  assert.ok(results.some((result) => !result.pass));
});

test("returns visible failures for the unfinished C++ starter", () => {
  const { error, results } = runCppTests(`#include <vector>
using namespace std;

vector<int> twoSum(vector<int>& nums, int target) {
    // return the indices of the two numbers that add to target
}
`);

  assert.equal(error, null);
  assert.equal(results.length, TESTS.length);
  assert.equal(results.filter((result) => result.pass).length, 0);
});
