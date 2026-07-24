// Minimal Mastra workflow wired through @mastra/inngest, following the
// documented setup in mastra-ai/mastra's examples/inngest:
// https://github.com/mastra-ai/mastra/tree/main/examples/inngest
//
// This is the smallest possible workflow: one step that sleeps ~30s, which
// is long enough for a live reproduction to overlap two runs and cancel one
// of them mid-flight.

import { init } from "@mastra/inngest";
import { Inngest } from "inngest";
import { z } from "zod";

// The Inngest client. In a live reproduction this points at a local
// `inngest-cli dev` server; for the static demonstration in show-bug.ts it
// is never sent an event or contacted at all.
export const inngest = new Inngest({
  id: "mastra",
  baseUrl: "http://localhost:8288",
  isDev: true,
});

const { createWorkflow, createStep } = init(inngest);

const sleepStep = createStep({
  id: "sleep-step",
  description: "Sleeps for ~30s so overlapping runs can be observed",
  inputSchema: z.object({}),
  outputSchema: z.object({}),
  execute: async () => {
    await new Promise((resolve) => setTimeout(resolve, 30_000));
    return {};
  },
});

// `.then()`/`.commit()` are declared on the base `Workflow` class and
// return that base type, not the `InngestWorkflow` subclass — so the chain
// result is typed without `getFunctions()`. Both methods mutate and return
// `this` at runtime, so keep the original `InngestWorkflow`-typed reference
// instead of exporting the chain's return value.
const workflow = createWorkflow({
  id: "repro-workflow",
  inputSchema: z.object({}),
  outputSchema: z.object({}),
});
workflow.then(sleepStep).commit();

export const reproWorkflow = workflow;

// In a real app this workflow is registered with a Mastra instance and
// exposed over HTTP via:
//
//   import { serve as inngestServe } from "@mastra/inngest";
//
//   new Mastra({
//     workflows: { reproWorkflow },
//     server: {
//       apiRoutes: [
//         {
//           path: "/inngest/api",
//           method: "ALL",
//           createHandler: async ({ mastra }) => inngestServe({ mastra, inngest }),
//         },
//       ],
//     },
//   });
//
// `inngestServe` collects each workflow's `getFunctions()` output (the same
// values this repro inspects directly) and hands them to Inngest's own
// `serve()`. The bug lives entirely in what `getFunctions()` returns, so
// this repro reads it directly instead of standing up an HTTP server.
