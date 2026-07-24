# mastra-cancelon-repro

`@mastra/inngest` (1.8.1–1.8.3) registers workflow cancellation as `cancelOn: [{ event: "cancel.workflow.<workflowId>" }]` with no run-scoping condition. Cancelling one run of a workflow cancels every in-flight run of that workflow, because Inngest can't tell which run the cancel event was meant for.

## Static demonstration (no server required)

```sh
npm install
npm run show-bug
```

This builds the workflow with `@mastra/inngest`'s own `init()`/`createWorkflow()`/`createStep()` and calls `workflow.getFunctions()` — the same call `@mastra/inngest`'s `serve()` uses internally to collect functions for Inngest. It prints the resulting `cancelOn` config from `InngestFunction.opts`.

Expected output:

```
Inngest function id: workflow.repro-workflow
cancelOn (as registered by @mastra/inngest):
[
  {
    "event": "cancel.workflow.repro-workflow"
  }
]
FAIL (bug reproduced): cancelOn = [{"event":"cancel.workflow.repro-workflow"}] — no run-scoping `if` condition present. Sending a single `cancel.workflow.repro-workflow` event will cancel every in-flight run of this workflow, not just the run identified by `event.data.runId`.
```

### Expected vs actual `cancelOn`

Actual (current `@mastra/inngest` 1.8.1–1.8.3):

```json
[{ "event": "cancel.workflow.repro-workflow" }]
```

Expected (run-scoped):

```json
[
  {
    "event": "cancel.workflow.repro-workflow",
    "if": "async.data.runId == event.data.runId"
  }
]
```

## Behavioural reproduction (requires the Inngest dev server)

The static demonstration above is sufficient to prove the bug from the registered config alone. To see the actual cross-run cancellation in the Inngest dashboard:

1. Start the Inngest dev server: `npx inngest-cli dev` (or `npx inngest-cli@latest dev`), listening on `http://localhost:8288`.
2. In a separate terminal, start an app that registers `reproWorkflow` with a Mastra instance and serves it at `/inngest/api` via `@mastra/inngest`'s `serve()` (see the commented example at the bottom of `src/workflow.ts`), then run `npx inngest-cli dev -u http://localhost:<port>/inngest/api` or point the running dev server at your app's Inngest endpoint.
3. Trigger two runs of `repro-workflow` with distinct `runId` values, e.g. by sending a `workflow.repro-workflow` event twice with `data.runId: "run-1"` and `data.runId: "run-2"`.
4. Send a `cancel.workflow.repro-workflow` event with `data.runId: "run-1"` only.
5. Open the Inngest dev server UI (`http://localhost:8288`) and observe that both `run-1` and `run-2` are cancelled, even though the cancel event only named `run-1`.

## Files

- `src/workflow.ts` — the minimal workflow (one step, ~30s sleep) registered through `@mastra/inngest`'s `init()`.
- `src/show-bug.ts` — reads the registered Inngest function config and prints its `cancelOn`.
- `ENVINFO.txt` — `envinfo` output for this environment and the pinned package versions.

## Versions

- `@mastra/core`: `1.51.0`
- `@mastra/inngest`: `1.8.3`
- `inngest`: `^4.5.0` (resolves to `4.13.0` at install time)
- Node: `>=20`
