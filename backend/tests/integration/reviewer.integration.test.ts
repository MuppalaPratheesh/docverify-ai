import { ApplicationStatus, ReviewDecision } from '@prisma/client';
import { createApp } from '../../src/app';
import { prisma } from '../../src/lib/prisma';
import {
  getActiveDocumentType,
  loginAs,
  registerApplicant,
  TEST_PASSWORDS,
  uniqueEmail,
} from '../helpers/fixtures';
import { cleanupFiles, createSyntheticPdf } from '../helpers/syntheticFiles';

const app = createApp();

async function createSubmittedApplication(applicantEmail: string) {
  await registerApplicant(app, {
    email: applicantEmail,
    name: 'Review Flow Applicant',
  });
  const { session: applicant } = await loginAs(app, {
    email: applicantEmail,
    password: TEST_PASSWORDS.strong,
  });

  const created = await applicant.post('/api/applications').send({
    notes: 'Ready for manual review',
  });
  const applicationId = created.body.data.application.id as string;
  const transcript = await getActiveDocumentType('TRANSCRIPT');
  const pdfPath = createSyntheticPdf();

  await applicant
    .post(`/api/applications/${applicationId}/documents`)
    .field('documentTypeId', transcript.id)
    .attach('file', pdfPath);

  const submit = await applicant.post(`/api/applications/${applicationId}/submit`);
  expect(submit.status).toBe(200);
  expect(submit.body.data.application.status).toBe(ApplicationStatus.SUBMITTED);

  return { applicant, applicationId, pdfPath };
}

describe('Reviewer integration', () => {
  const tempFiles: string[] = [];

  afterAll(() => {
    cleanupFiles(tempFiles);
  });

  it('allows a reviewer to access authorized submitted applications', async () => {
    const email = uniqueEmail('review-access');
    const { applicationId, pdfPath } = await createSubmittedApplication(email);
    tempFiles.push(pdfPath);

    const { session: reviewer, response: login } = await loginAs(app, 'reviewer');
    expect(login.status).toBe(200);

    const queue = await reviewer.get('/api/reviewer/applications?status=SUBMITTED');
    expect(queue.status).toBe(200);
    expect(
      queue.body.data.applications.some((item: { id: string }) => item.id === applicationId),
    ).toBe(true);

    const detail = await reviewer.get(`/api/reviewer/applications/${applicationId}`);
    expect(detail.status).toBe(200);
    expect(detail.body.data.application.status).toBe(ApplicationStatus.UNDER_REVIEW);
    expect(detail.body.data.application.applicant.email).toBe(email);
  });

  it('allows a reviewer to record a decision', async () => {
    const email = uniqueEmail('review-decision');
    const { applicationId, pdfPath } = await createSubmittedApplication(email);
    tempFiles.push(pdfPath);

    const { session: reviewer } = await loginAs(app, 'reviewer');
    await reviewer.get(`/api/reviewer/applications/${applicationId}`);

    const decision = await reviewer
      .post(`/api/reviewer/applications/${applicationId}/decisions`)
      .send({
        decision: ReviewDecision.APPROVED,
        comment: 'Manual approval of synthetic documents.',
      });

    expect(decision.status).toBe(201);
    expect(decision.body.data.application.status).toBe(ApplicationStatus.COMPLETED);

    const actions = await prisma.reviewAction.findMany({
      where: { applicationId },
    });
    expect(actions.some((action) => action.decision === ReviewDecision.APPROVED)).toBe(true);
  });

  it('allows a reviewer to request additional documents', async () => {
    const email = uniqueEmail('review-request');
    const { applicationId, pdfPath } = await createSubmittedApplication(email);
    tempFiles.push(pdfPath);

    const language = await getActiveDocumentType('LANGUAGE_CERTIFICATE');
    const { session: reviewer } = await loginAs(app, 'reviewer');
    await reviewer.get(`/api/reviewer/applications/${applicationId}`);

    const requestDoc = await reviewer
      .post(`/api/reviewer/applications/${applicationId}/requests`)
      .send({
        documentTypeId: language.id,
        message: 'Please upload a synthetic language certificate for manual review.',
      });

    expect(requestDoc.status).toBe(201);
    expect(requestDoc.body.data.application.status).toBe(ApplicationStatus.NEEDS_INFORMATION);
    expect(requestDoc.body.data.request.status).toBe('OPEN');

    const stored = await prisma.documentRequest.findFirstOrThrow({
      where: { applicationId },
    });
    expect(stored.documentTypeId).toBe(language.id);
  });

  it('lets an applicant upload a replacement after a document request', async () => {
    const email = uniqueEmail('review-replace');
    const { applicant, applicationId, pdfPath } = await createSubmittedApplication(email);
    tempFiles.push(pdfPath);

    const language = await getActiveDocumentType('LANGUAGE_CERTIFICATE');
    const { session: reviewer } = await loginAs(app, 'reviewer');
    await reviewer.get(`/api/reviewer/applications/${applicationId}`);

    await reviewer.post(`/api/reviewer/applications/${applicationId}/requests`).send({
      documentTypeId: language.id,
      message: 'Please upload a synthetic language certificate for manual review.',
    });

    const replacementPath = createSyntheticPdf();
    tempFiles.push(replacementPath);

    const upload = await applicant
      .post(`/api/applications/${applicationId}/documents`)
      .field('documentTypeId', language.id)
      .attach('file', replacementPath);

    expect(upload.status).toBe(201);

    const requests = await prisma.documentRequest.findMany({ where: { applicationId } });
    expect(
      requests.some(
        (item) =>
          item.documentTypeId === language.id && item.status === 'RESOLVED',
      ),
    ).toBe(true);
  });

  it('blocks applicants from accessing reviewer APIs', async () => {
    const email = uniqueEmail('applicant-reviewer');
    await registerApplicant(app, { email });
    const { session } = await loginAs(app, { email, password: TEST_PASSWORDS.strong });

    const forbidden = await session.get('/api/reviewer/applications');
    expect(forbidden.status).toBe(403);
  });

  it('rejects decisions on completed applications', async () => {
    const email = uniqueEmail('already-done');
    const { applicationId, pdfPath } = await createSubmittedApplication(email);
    tempFiles.push(pdfPath);

    const { session: reviewer } = await loginAs(app, 'reviewer');
    await reviewer.get(`/api/reviewer/applications/${applicationId}`);
    await reviewer.post(`/api/reviewer/applications/${applicationId}/decisions`).send({
      decision: ReviewDecision.APPROVED,
      comment: 'First decision',
    });

    const second = await reviewer
      .post(`/api/reviewer/applications/${applicationId}/decisions`)
      .send({
        decision: ReviewDecision.REJECTED,
        comment: 'Second decision should fail',
      });

    expect(second.status).toBe(400);
  });
});
