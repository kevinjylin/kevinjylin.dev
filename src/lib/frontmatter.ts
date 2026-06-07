export const frontmatterPattern = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

export type FrontmatterValue = boolean | number | string | string[];
export type FrontmatterRecord = Record<string, FrontmatterValue>;

function parseScalarValue(rawValue: string): boolean | number | string {
  const value = rawValue.trim();

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  if (/^-?\d+$/.test(value)) {
    return Number(value);
  }

  return value;
}

function parseArrayValue(rawValue: string): string[] {
  const inner = rawValue.slice(1, -1).trim();

  if (!inner) {
    return [];
  }

  return inner.split(",").map((segment) => {
    const value = parseScalarValue(segment);

    if (typeof value !== "string") {
      throw new Error(`Only string arrays are supported in frontmatter.`);
    }

    return value;
  });
}

export function parseFrontmatter(fileContents: string): FrontmatterRecord {
  const match = fileContents.match(frontmatterPattern);

  if (!match) {
    return {};
  }

  return match[1]
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .reduce<FrontmatterRecord>((accumulator, line) => {
      const separatorIndex = line.indexOf(":");

      if (separatorIndex === -1) {
        throw new Error(`Invalid frontmatter line: "${line}"`);
      }

      const key = line.slice(0, separatorIndex).trim();
      const rawValue = line.slice(separatorIndex + 1).trim();

      accumulator[key] =
        rawValue.startsWith("[") && rawValue.endsWith("]")
          ? parseArrayValue(rawValue)
          : parseScalarValue(rawValue);

      return accumulator;
    }, {});
}

export function stripFrontmatter(fileContents: string): string {
  return fileContents.replace(frontmatterPattern, "");
}

export function getRequiredString(data: FrontmatterRecord, key: string, filePath: string): string {
  const value = data[key];

  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Expected "${key}" to be a non-empty string in ${filePath}.`);
  }

  return value;
}

export function getOptionalString(
  data: FrontmatterRecord,
  key: string,
  filePath: string,
): string | undefined {
  const value = data[key];

  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new Error(`Expected "${key}" to be a string in ${filePath}.`);
  }

  return value.length > 0 ? value : undefined;
}

export function getRequiredNumber(data: FrontmatterRecord, key: string, filePath: string): number {
  const value = data[key];

  if (typeof value !== "number") {
    throw new Error(`Expected "${key}" to be a number in ${filePath}.`);
  }

  return value;
}

export function getRequiredBoolean(data: FrontmatterRecord, key: string, filePath: string): boolean {
  const value = data[key];

  if (typeof value !== "boolean") {
    throw new Error(`Expected "${key}" to be a boolean in ${filePath}.`);
  }

  return value;
}

export function getOptionalNumber(
  data: FrontmatterRecord,
  key: string,
  filePath: string,
): number | undefined {
  const value = data[key];

  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "number") {
    throw new Error(`Expected "${key}" to be a number in ${filePath}.`);
  }

  return value;
}

export function getRequiredStringArray(
  data: FrontmatterRecord,
  key: string,
  filePath: string,
): string[] {
  const value = data[key];

  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
    throw new Error(`Expected "${key}" to be a string array in ${filePath}.`);
  }

  return value;
}
