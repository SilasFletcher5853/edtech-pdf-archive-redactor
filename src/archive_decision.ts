import { z } from "zod";

export const archiveRequestSchema = z.object({
  course: z.object({
    courseId: z.string().min(1),
    deliveryId: z.string().min(1),
    deliveredAt: z.string().datetime()
  }),
  learner: z.object({
    learnerId: z.string().min(1),
    archiveDeadline: z.string().datetime(),
    documentPdf: z.string().min(1)
  }),
  educatorReport: z.object({
    requestedBy: z.string().email(),
    includeLearnerEmail: z.boolean().default(false)
  })
});

export type ArchiveRequest = z.infer<typeof archiveRequestSchema>;

export type ArchiveDecision = {
  state: "ready_for_redaction" | "deadline_pending";
  archiveKey: string;
  patterns: string[];
};

export function decideArchive(input: ArchiveRequest, now: Date): ArchiveDecision {
  const deadlineReached = new Date(input.learner.archiveDeadline).getTime() <= now.getTime();
  const patterns = [input.learner.learnerId];

  if (!input.educatorReport.includeLearnerEmail) {
    patterns.push("[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}");
  }

  return {
    state: deadlineReached ? "ready_for_redaction" : "deadline_pending",
    archiveKey: `${input.course.courseId}/${input.course.deliveryId}`,
    patterns
  };
}
