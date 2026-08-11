#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const trusted = process.env.ATLAS_REPAIR_TRUSTED ?? process.cwd();
const planPath = process.env.ATLAS_REPAIR_PLAN ?? `${process.env.RUNNER_TEMP}/atlas-validated-plan.json`;
const policyPath = process.env.ATLAS_REPAIR_POLICY ?? `${trusted}/.github/atlas-autopilot.yml`;
const moduleRoot = process.env.ATLAS_REPAIR_MODULE_ROOT ?? trusted;
const { parseRepairConfig } = await import(pathToFileURL(`${moduleRoot}/atlas-pr-repair-plan.mjs`).href);
const { validateTreeSnapshot } = await import(pathToFileURL(`${moduleRoot}/atlas-pr-repair-execute.mjs`).href);
const plan = JSON.parse(readFileSync(planPath, "utf8"));
const policy = parseRepairConfig(readFileSync(policyPath, "utf8"));
const trackedFiles = execFileSync("git", ["diff", "HEAD", "--name-only", "-z"]).toString().split("\0").filter(Boolean);
const untrackedFiles = execFileSync("git", ["ls-files", "--others", "--exclude-standard", "-z"]).toString().split("\0").filter(Boolean);
const numstat = execFileSync("git", ["diff", "HEAD", "--numstat"]).toString().trim().split("\n").filter(Boolean).map((line) => line.split("\t"));
const untrackedContents = untrackedFiles.map((file) => [file, readFileSync(file)]);
const files = validateTreeSnapshot({ trackedFiles, untrackedFiles, numstat, untrackedContents }, plan, policy);
const output = process.env.ATLAS_REPAIR_CHANGED_FILES;
if (output) writeFileSync(output, JSON.stringify(files));
