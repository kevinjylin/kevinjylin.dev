export type Lang = "js" | "python" | "cpp";

export const LANGS: Lang[] = ["js", "python", "cpp"];

export const STARTERS: Record<Lang, string> = {
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

export const FILENAMES: Record<Lang, string> = {
  js: "solution.js",
  python: "solution.py",
  cpp: "solution.cpp",
};

export const LANG_LABELS: Record<Lang, string> = {
  js: "JavaScript",
  python: "Python",
  cpp: "C++",
};
