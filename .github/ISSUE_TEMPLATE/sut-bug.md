---
name: SUT defect (found by automation)
about: A real bug in the Conduit app under test, surfaced by the hybrid suite's API oracle
title: "[SUT BUG] "
labels: sut-defect
---

> Filed by the framework's AI debug loop (`/debug-failure`) or a human after triage.
> The test asserts **correct** behaviour; the app is wrong. The failing spec should be
> annotated `test.fixme`/`test.fail` with a link back to this issue — never weakened.

## Summary
<one sentence: what the app does wrong>

## Layer
- [ ] Backend API
- [ ] Frontend UI

## Reproduce via API (browser-independent)
```bash
TOKEN=...   # obtain via POST $API_BASE_URL/users/login
curl -s -X <METHOD> "$API_BASE_URL/<path>" \
  -H "Authorization: Token $TOKEN" -H 'Content-Type: application/json' \
  -d '<body>' | jq .
```

## Expected vs Actual
| | |
|---|---|
| **Expected** (RealWorld API spec) | <...> |
| **Actual** (observed) | <...> |

## Oracle evidence
The API read-back that proves the UI action did not persist correctly:
```
<request + response showing the discrepancy>
```

## Affected specs / blast radius
- `<file>:<line>` (<project>)

## Trace
```
npx playwright show-trace <path-to-trace.zip>
```

## Suggested handling
Keep the assertion correct; mark the spec:
```ts
test.fixme(true, 'SUT bug: <link to this issue>');
```
