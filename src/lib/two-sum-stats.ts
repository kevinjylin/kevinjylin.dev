import type { Lang } from "@/lib/two-sum-constants";

export type SubmissionStats = {
  memoryBeats: number;
  memoryMb: number;
  runtimeBeats: number;
  runtimeMs: number;
};

export function generateSubmissionStats(lang: Lang): SubmissionStats {
  const baseRuntime = lang === "cpp" ? 0 : lang === "js" ? 60 : 32;
  const runtimeJitter = lang === "cpp" ? 6 : 24;
  return {
    runtimeMs: baseRuntime + Math.floor(Math.random() * runtimeJitter),
    memoryMb: Math.round((40 + Math.random() * 6) * 10) / 10,
    runtimeBeats: Math.round((80 + Math.random() * 19.99) * 100) / 100,
    memoryBeats: Math.round((65 + Math.random() * 33) * 100) / 100,
  };
}
