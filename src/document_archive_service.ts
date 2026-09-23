import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { archiveRequestSchema, decideArchive } from "./archive_decision.js";
import { InfraiError, redactLearnerPdf } from "./infrai_redaction.js";

async function readJson(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function send(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(JSON.stringify(body));
}

export const server = createServer(async (request, response) => {
  if (request.method !== "POST" || request.url !== "/course-archives") {
    send(response, 404, { error: "Route not found" });
    return;
  }

  try {
    const input = archiveRequestSchema.parse(await readJson(request));
    const decision = decideArchive(input, new Date());

    if (decision.state === "deadline_pending") {
      send(response, 202, {
        state: decision.state,
        archiveKey: decision.archiveKey,
        archiveDeadline: input.learner.archiveDeadline
      });
      return;
    }

    const redactedDocument = await redactLearnerPdf(
      input.learner.documentPdf,
      decision.patterns,
      decision.archiveKey
    );
    send(response, 201, {
      state: "archived",
      archiveKey: decision.archiveKey,
      redactedDocument,
      educatorReport: {
        requestedBy: input.educatorReport.requestedBy,
        piiRemoved: true
      }
    });
  } catch (error) {
    if (error instanceof InfraiError) {
      send(response, error.status >= 400 && error.status < 500 ? error.status : 502, {
        error: error.detail
      });
      return;
    }
    if (error instanceof SyntaxError || (error instanceof Error && error.name === "ZodError")) {
      send(response, 400, { error: "Request body did not match the archive schema" });
      return;
    }
    send(response, 500, { error: "Archive request could not be completed" });
  }
});

if (process.env.NODE_ENV !== "test") {
  const port = Number(process.env.PORT ?? 3000);
  server.listen(port, () => console.log(`Course archive service listening on ${port}`));
}
