# Leadership Assessment Benchmark

This benchmark is a regression test set for assessment scoring and classification changes.

Run it after every scoring, question-selection, or result-classification update:

```bash
node benchmark/run-benchmark.js
```

The benchmark loads the actual browser scoring code from `app.js`, applies the synthetic respondent answer fixtures in `benchmark/respondents.json`, and fails if the current model output no longer matches the expected behavior.

## Fixture Coverage

The 15 synthetic respondents cover:

- Clear single-style respondents
- Dual-style respondents
- High-in-two, low-in-two, neutral-elsewhere patterns
- All-neutral response pattern
- High-everywhere varied pattern
- High-everywhere straight-line pattern
- Low-everywhere varied pattern
- Low-everywhere straight-line pattern
- Mostly neutral with a real signal
- Inconsistent within-style answers resolved by another stronger style

## Interpretation

Benchmark cases are not real participants. They are controlled edge cases used to protect the scoring logic from regressions.

Some cases assert an exact style result. Other cases assert only that a result is interpretable or that exactly one style is returned. This keeps the benchmark strict where the intended output is clear and flexible where the main concern is avoiding a known failure mode, such as withholding a result from an honest broad-positive respondent.
