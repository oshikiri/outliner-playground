import { globSync, readFileSync } from "node:fs";
import { relative, resolve } from "node:path";

const SPEC_GLOBS = ["docs/specs/**/*.md"] as const;
const TEST_GLOBS = ["src/**/*.test.ts", "src/**/*.test.tsx"] as const;
const ID_PATTERN = /\[([A-Z]{2,}-[A-Z0-9]+-\d{3})]/g;

type IdMatches = Map<string, string[]>;
type DuplicateIdEntry = [string, string[]];

const strict = process.argv.includes("--strict");

const specMatches = collectIds(SPEC_GLOBS);
const testMatches = collectIds(TEST_GLOBS);

const specIds = new Set(specMatches.keys());
const testIds = new Set(testMatches.keys());

const specOnlyIds = [...specIds].filter((id) => !testIds.has(id)).sort();
const testOnlyIds = [...testIds].filter((id) => !specIds.has(id)).sort();
const duplicateSpecIds = findDuplicates(specMatches);

printSection("Spec IDs", specIds.size);
printSection("Test IDs", testIds.size);
printIdList("Spec IDs without tests", specOnlyIds, specMatches);
printIdList("Test IDs without spec", testOnlyIds, testMatches);
printDuplicateList("Duplicate spec IDs", duplicateSpecIds);

const hasIssues =
  specOnlyIds.length > 0 ||
  testOnlyIds.length > 0 ||
  duplicateSpecIds.length > 0;

if (hasIssues && strict) {
  process.exitCode = 1;
}

function collectIds(globs: readonly string[]): IdMatches {
  const matches: IdMatches = new Map();

  for (const pattern of globs) {
    const files = globSync(pattern, {
      exclude: ["node_modules/**", "dist/**"],
    });

    for (const file of files) {
      const absolutePath = resolve(file);
      const content = readFileSync(absolutePath, "utf8");

      for (const id of content.matchAll(ID_PATTERN)) {
        const value = id[1];
        if (value === undefined) {
          continue;
        }
        const list = matches.get(value) ?? [];
        list.push(relative(process.cwd(), absolutePath));
        matches.set(value, list);
      }
    }
  }

  return matches;
}

function findDuplicates(matches: IdMatches): DuplicateIdEntry[] {
  return [...matches.entries()]
    .filter(([, files]) => files.length > 1)
    .sort(([left], [right]) => left.localeCompare(right));
}

function printSection(label: string, count: number): void {
  console.log(`${label}: ${count}`);
}

function printIdList(label: string, ids: string[], matches: IdMatches): void {
  console.log(`\n${label}:`);
  if (ids.length === 0) {
    console.log("- none");
    return;
  }

  for (const id of ids) {
    const files = matches.get(id) ?? [];
    console.log(`- ${id} (${files.join(", ")})`);
  }
}

function printDuplicateList(
  label: string,
  duplicates: DuplicateIdEntry[],
): void {
  console.log(`\n${label}:`);
  if (duplicates.length === 0) {
    console.log("- none");
    return;
  }

  for (const [id, files] of duplicates) {
    console.log(`- ${id} (${files.join(", ")})`);
  }
}
