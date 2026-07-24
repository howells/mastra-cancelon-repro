// Static demonstration of the bug: build the Inngest function config that
// @mastra/inngest registers for a workflow, and print its `cancelOn` entry.
//
// This does not talk to an Inngest server, does not trigger a workflow run,
// and does not need any external service. It calls the exact same
// `workflow.getFunctions()` that `@mastra/inngest`'s own `serve()` calls
// internally (see collectInngestFunctions in @mastra/inngest/dist/chunk-*.js)
// and reads the resulting `InngestFunction.opts`, which is the plain config
// object passed to Inngest's `client.createFunction()`.

import { reproWorkflow } from "./workflow.js";

const [fn] = reproWorkflow.getFunctions();

if (!fn) {
  throw new Error("Expected @mastra/inngest to register at least one Inngest function for the workflow");
}

// `InngestFunction.opts` is the exact config object that was passed to
// `inngest.createFunction(opts, handler)` inside @mastra/inngest's
// `getFunction()`. It is a public readonly property on the InngestFunction
// class (see inngest/dist/components/InngestFunction.d.ts).
const opts = (fn as unknown as { opts: Record<string, unknown> }).opts;

const cancelOn = opts.cancelOn as Array<{ event: string; if?: string }> | undefined;

console.log("Inngest function id:", opts.id);
console.log("cancelOn (as registered by @mastra/inngest):");
console.log(JSON.stringify(cancelOn, null, 2));

const hasRunScopedCondition = Array.isArray(cancelOn) && cancelOn.every((entry) => typeof entry.if === "string" && entry.if.length > 0);

if (hasRunScopedCondition) {
  console.log(
    "PASS: every cancelOn entry has a run-scoping `if` condition — this build does not reproduce the bug.",
  );
} else {
  console.log(
    `FAIL (bug reproduced): cancelOn = ${JSON.stringify(cancelOn)} — no run-scoping \`if\` condition present. ` +
      "Sending a single `cancel.workflow.repro-workflow` event will cancel every in-flight run of this workflow, " +
      "not just the run identified by `event.data.runId`.",
  );
}
