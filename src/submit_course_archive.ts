function samplePdf(): string {
  const content = "BT /F1 12 Tf 72 720 Td (Learner learner-2048) Tj ET\n";
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}endstream`
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (const [index, object] of objects.entries()) {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  }
  const xrefOffset = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${offsets.length}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.from(pdf).toString("base64");
}

const response = await fetch("http://localhost:3000/course-archives", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    course: {
      courseId: "typescript-101",
      deliveryId: "spring-cohort",
      deliveredAt: "2026-03-01T09:00:00.000Z"
    },
    learner: {
      learnerId: "learner-2048",
      archiveDeadline: "2026-04-01T09:00:00.000Z",
      documentPdf: samplePdf()
    },
    educatorReport: {
      requestedBy: "instructor@example.edu",
      includeLearnerEmail: false
    }
  })
});

console.log(JSON.stringify(await response.json(), null, 2));
if (!response.ok) process.exitCode = 1;
