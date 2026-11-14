export const isFlag = (label) =>
  ["contradicted", "contested"].includes(label) ||
  (label.startsWith("MULTI:") && /contradicted|contested/.test(label));
export function labelOf(pipeline) {
  if (!pipeline) return "ERROR";
  if (!pipeline.claims.length) return "unsupported";
  if (pipeline.claims.length === 1) return pipeline.claims[0].status;
  return (
    "MULTI:" +
    pipeline.claims
      .map((c) => c.status)
      .sort()
      .join(",")
  );
}
export function statusMetrics(rows, method = "pipelineLabel") {
  let correct = 0,
    tp = 0,
    fp = 0,
    tn = 0,
    fn = 0,
    errors = 0,
    positives = 0,
    negatives = 0;
  for (const r of rows) {
    const exp = r.reference.expectedStatus,
      pred = r[method];
    if (isFlag(exp)) positives++;
    else negatives++;
    if (pred === exp) correct++;
    if (pred === "ERROR") {
      errors++;
      if (isFlag(exp)) fn++;
      continue;
    }
    if (isFlag(exp)) {
      if (isFlag(pred)) tp++;
      else fn++;
    } else if (isFlag(pred)) fp++;
    else tn++;
  }
  return {
    n: rows.length,
    correct,
    accuracy: rows.length ? correct / rows.length : null,
    tp,
    fp,
    tn,
    fn,
    positives,
    negatives,
    errors,
    precision: tp + fp ? tp / (tp + fp) : null,
    recall: positives ? tp / positives : null,
    fpr: negatives ? fp / negatives : null,
  };
}
export function nuisanceMetrics(rows, method = "pipelineLabel") {
  const pairs = [];
  for (const base of rows.filter((r) => r.variant === "original"))
    for (const r of rows.filter(
      (r) =>
        r.slice === base.slice &&
        r.familyId === base.familyId &&
        r.variant !== "original",
    )) {
      const failed = base[method] === "ERROR" || r[method] === "ERROR";
      pairs.push({
        familyId: base.familyId,
        publisher: base.publisher,
        variant: r.variant,
        base: base[method],
        changed: r[method],
        failed,
        flip: !failed && base[method] !== r[method],
      });
    }
  const variants = {};
  for (const kind of [...new Set(pairs.map((p) => p.variant))]) {
    const p = pairs.filter((x) => x.variant === kind);
    variants[kind] = {
      pairs: p.length,
      completed: p.filter((x) => !x.failed).length,
      failed: p.filter((x) => x.failed).length,
      flips: p.filter((x) => x.flip).length,
    };
  }
  return {
    pairs: pairs.length,
    completed: pairs.filter((x) => !x.failed).length,
    failed: pairs.filter((x) => x.failed).length,
    flips: pairs.filter((x) => x.flip).length,
    byVariant: variants,
    failures: pairs.filter((p) => p.failed || p.flip),
  };
}
