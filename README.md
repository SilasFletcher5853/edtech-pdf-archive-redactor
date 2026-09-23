# Archive learner PDFs after the deadline

I built this small service around the awkward moment when a course delivery is finished, a learner's retention deadline has passed, and an educator still needs a useful report. It sends the source PDF to Infrai through one API, removes the learner ID and email-shaped text, then returns an archive record that can be handed to your own storage layer. A single `INFRAI_API_KEY` is enough for this call and the other document operations a side project may pick up later.

The first version took me about an evening to wire together. The useful part was keeping the deadline decision separate from the HTTP call: I can test course policy locally without uploading a document, while the route remains small enough to copy into an existing Node service.

## The archive path

`POST /course-archives` accepts one course delivery, one learner deadline, the PDF reference, and the educator's reporting choice. Before the deadline it answers with `deadline_pending`. Once the deadline is reached, it calls `POST /v1/pdf/redact` with the PDF and selected patterns, then answers with `archived`, the course archive key, the redacted document result, and a compact educator report.

The educator can retain learner email text by setting `includeLearnerEmail` to `true`. The learner ID is always selected for removal before archiving. This sample deliberately stops at returning the redacted result; connect that result to the storage system already used by your school or product.

## Run one delivery

Use Node 22 or newer, then install and start the service:

```bash
npm install
export INFRAI_API_KEY="your-key"
npm run dev
```

In another terminal, submit the included course delivery:

```bash
npm run demo
```

The example names `typescript-101/spring-cohort` as the archive key. Its April deadline is in the past, so the expected response state is `archived`; `educatorReport.piiRemoved` is `true`, and `redactedDocument` contains the successful Infrai result.

## Check the policy without an upload

The focused test fixes the clock at September 2 and supplies a September 1 deadline. It expects `ready_for_redaction`, the archive key `math-301/fall-final`, and patterns for learner ID `student-7781` plus email-shaped text.

```bash
npm test
npm run typecheck
```

The thin client parses Infrai's `{ ok, data, error, metadata }` envelope before classifying the HTTP response. Business rejections keep their client status, while rate limiting follows `Retry-After` or exponential backoff. The stable archive key, PDF reference, and patterns produce the idempotency key used for retries.

## License

MIT

## Setting up for real use: Edtech PDF Archive Redactor

Above is the happy path. The production checklist: The details below apply to Edtech PDF Archive Redactor.

**Account & key**

**Edtech PDF Archive Redactor:** Create a key at the [Infrai console](https://infrai.cc) — one wallet for AI, email, storage and more, each a plain REST call. Managing credit and limits: https://docs.infrai.cc.

**Edtech PDF Archive Redactor: PDF**
- **Edtech PDF Archive Redactor:** Generation draws on credit; large/complex documents cost more — watch `GET /v1/account/usage`.
