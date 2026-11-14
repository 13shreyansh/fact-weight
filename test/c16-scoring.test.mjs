import { test } from "node:test";
import assert from "node:assert/strict";
import {
  statusMetrics,
  nuisanceMetrics,
  labelOf,
} from "../eval/c16/scoring.mjs";
test("audit errors on positives count as missed flags; negative error remains in FPR denominator", () => {
  const rows = [
    { reference: { expectedStatus: "contradicted" }, pipelineLabel: "ERROR" },
    {
      reference: { expectedStatus: "supported" },
      pipelineLabel: "contradicted",
    },
    { reference: { expectedStatus: "unsupported" }, pipelineLabel: "ERROR" },
  ];
  const m = statusMetrics(rows);
  assert.equal(m.recall, 0);
  assert.equal(m.fpr, 0.5);
  assert.equal(m.errors, 2);
  assert.equal(m.correct, 0);
});
test("nuisance flips, consistently wrong answers and failed pairs are distinct", () => {
  const rows = [
    {
      slice: "main",
      familyId: "a",
      publisher: "P",
      variant: "original",
      pipelineLabel: "unsupported",
    },
    {
      slice: "main",
      familyId: "a",
      publisher: "P",
      variant: "rephrased",
      pipelineLabel: "supported",
    },
    {
      slice: "main",
      familyId: "a",
      publisher: "P",
      variant: "neutral-wrapper",
      pipelineLabel: "ERROR",
    },
    {
      slice: "main",
      familyId: "b",
      publisher: "P",
      variant: "original",
      pipelineLabel: "contradicted",
    },
    {
      slice: "main",
      familyId: "b",
      publisher: "P",
      variant: "rephrased",
      pipelineLabel: "contradicted",
    },
  ];
  const m = nuisanceMetrics(rows);
  assert.equal(m.pairs, 3);
  assert.equal(m.completed, 2);
  assert.equal(m.flips, 1);
  assert.equal(m.failed, 1);
});
test("multiple extracted claims cannot hide behind the first supported claim", () => {
  assert.equal(
    labelOf({ claims: [{ status: "supported" }, { status: "unsupported" }] }),
    "MULTI:supported,unsupported",
  );
});
