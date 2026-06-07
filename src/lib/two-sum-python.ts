import { TESTS, sameIndices, type Result } from "@/lib/two-sum-runner";

const PYODIDE_CDN_URL = "https://cdn.jsdelivr.net/pyodide/v0.27.5/full/pyodide.mjs";

interface PyodideInterface {
  runPythonAsync(code: string): Promise<unknown>;
}

interface PyodideResult {
  toJs?(): unknown[];
}

// `new Function` keeps the dynamic import out of the bundler's static-analysis path,
// so Next/webpack doesn't try to resolve the CDN URL at build time.
export async function loadPyodideFromCDN(): Promise<PyodideInterface> {
  const dynamicImport = new Function("url", "return import(url)") as (
    url: string,
  ) => Promise<{ loadPyodide(): Promise<PyodideInterface> }>;
  const pyodideModule = await dynamicImport(PYODIDE_CDN_URL);
  return pyodideModule.loadPyodide();
}

export async function runPythonTests(pyodide: PyodideInterface, code: string): Promise<Result[]> {
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
