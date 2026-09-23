import assert from "node:assert/strict";
import test from "node:test";
import { archiveRequestSchema, decideArchive } from "../src/archive_decision.js";

test("a delivery past its learner deadline is ready with learner PII patterns", () => {
  const input = archiveRequestSchema.parse({
    course: {
      courseId: "math-301",
      deliveryId: "fall-final",
      deliveredAt: "2026-08-20T12:00:00.000Z"
    },
    learner: {
      learnerId: "student-7781",
      archiveDeadline: "2026-09-01T12:00:00.000Z",
      documentPdf: "https://documents.example.edu/fall-final.pdf"
    },
    educatorReport: {
      requestedBy: "teacher@example.edu",
      includeLearnerEmail: false
    }
  });

  const decision = decideArchive(input, new Date("2026-09-02T12:00:00.000Z"));

  assert.equal(decision.state, "ready_for_redaction");
  assert.equal(decision.archiveKey, "math-301/fall-final");
  assert.deepEqual(decision.patterns, [
    "student-7781",
    "[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}"
  ]);
});
