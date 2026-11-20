import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { ApplicationStatus, ReviewDecision } from '@prisma/client';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';

const app = createApp();

function uniqueEmail(prefix: string): string {
  return `${prefix}.${Date.now()}.${Math.floor(Math.random() * 10_000)}@example.com`;
}

function createSyntheticPdf(filePath: string): void {
  fs.writeFileSync(filePath, '%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n');
}

describe('Reviewer dashboard workflow', () => {
  const createdEmails: string[] = [];
  const tempFiles: string[] = [];

  afterAll(async () => {
    for (const filePath of tempFiles) {
      try {
        fs.unlinkSync(filePath);
      } catch {
        // ignore
      }
    }

    if (createdEmails.length > 0) {
      const users = await prisma.user.findMany({
        where: { email: { in: createdEmails } },
        select: { id: true },
      });
      const userIds = users.map((user) => user.id);
      if (userIds.length > 0) {
        const applications = await prisma.application.findMany({
          where: { applicantId: { in: userIds } },
          select: { id: true },
        });
        const applicationIds = applications.map((item) => item.id);
        if (applicationIds.length > 0) {
          await prisma.reviewAction.deleteMany({
            where: { applicationId: { in: applicationIds } },
          });
          await prisma.documentRequest.deleteMany({
            where: { applicationId: { in: applicationIds } },
          });
          await prisma.document.deleteMany({
            where: { applicationId: { in: applicationIds } },
          });
          await prisma.application.deleteMany({ where: { id: { in: applicationIds } } });
        }
        await prisma.auditLog.deleteMany({
          where: {
            OR: [{ actorId: { in: userIds } }, { entityId: { in: userIds } }],
          },
        });
        await prisma.user.deleteMany({ where: { id: { in: userIds } } });
      }
    }

    await prisma.$disconnect();
  });

  it('supports queue filtering, decisions, document requests and history', async () => {
    const applicantEmail = uniqueEmail('review-applicant');
    const password = 'SecurePass1';
    createdEmails.push(applicantEmail);

    const applicant = request.agent(app);
    await applicant.post('/api/auth/register').send({
      name: 'Review Flow Applicant',
      email: applicantEmail,
      password,
    });

    const created = await applicant.post('/api/applications').send({
      notes: 'Ready for manual review',
    });
    const applicationId = created.body.data.application.id as string;

    const types = await applicant.get('/api/document-types');
    const transcript = types.body.data.documentTypes.find(
      (type: { code: string }) => type.code === 'TRANSCRIPT',
    );
    const language = types.body.data.documentTypes.find(
      (type: { code: string }) => type.code === 'LANGUAGE_CERTIFICATE',
    );

    const pdfPath = path.join(os.tmpdir(), `reviewer-synth-${Date.now()}.pdf`);
    createSyntheticPdf(pdfPath);
    tempFiles.push(pdfPath);

    await applicant
      .post(`/api/applications/${applicationId}/documents`)
      .field('documentTypeId', transcript.id)
      .attach('file', pdfPath);

    await applicant.post(`/api/applications/${applicationId}/submit`);

    const reviewer = request.agent(app);
    const login = await reviewer.post('/api/auth/login').send({
      email: process.env.SEED_REVIEWER_EMAIL ?? 'reviewer@docverify.local',
      password: process.env.SEED_REVIEWER_PASSWORD ?? 'DevReviewerPass123!',
    });
    expect(login.status).toBe(200);

    const forbiddenApplicant = await applicant.get('/api/reviewer/applications');
    expect(forbiddenApplicant.status).toBe(403);

    const queue = await reviewer.get('/api/reviewer/applications?status=SUBMITTED');
    expect(queue.status).toBe(200);
    expect(
      queue.body.data.applications.some(
        (item: { id: string }) => item.id === applicationId,
      ),
    ).toBe(true);

    const search = await reviewer.get(
      `/api/reviewer/applications?q=${encodeURIComponent('Review Flow Applicant')}`,
    );
    expect(search.status).toBe(200);
    expect(search.body.data.applications.length).toBeGreaterThan(0);

    const detail = await reviewer.get(`/api/reviewer/applications/${applicationId}`);
    expect(detail.status).toBe(200);
    expect(detail.body.data.application.status).toBe(ApplicationStatus.UNDER_REVIEW);
    expect(detail.body.data.application.applicant.email).toBe(applicantEmail);

    const notes = await reviewer
      .patch(`/api/reviewer/applications/${applicationId}/notes`)
      .send({ reviewerNotes: 'Manual review in progress' });
    expect(notes.status).toBe(200);
    expect(notes.body.data.application.reviewerNotes).toBe('Manual review in progress');

    const requestDoc = await reviewer
      .post(`/api/reviewer/applications/${applicationId}/requests`)
      .send({
        documentTypeId: language.id,
        message: 'Please upload a synthetic language certificate for manual review.',
      });
    expect(requestDoc.status).toBe(201);
    expect(requestDoc.body.data.application.status).toBe(ApplicationStatus.NEEDS_INFORMATION);
    expect(requestDoc.body.data.request.status).toBe('OPEN');

    const applicantView = await applicant.get(`/api/applications/${applicationId}`);
    expect(applicantView.status).toBe(200);
    expect(applicantView.body.data.application.documentRequests.length).toBeGreaterThan(0);

    const replacementPath = path.join(os.tmpdir(), `reviewer-lang-${Date.now()}.pdf`);
    createSyntheticPdf(replacementPath);
    tempFiles.push(replacementPath);

    await applicant
      .post(`/api/applications/${applicationId}/documents`)
      .field('documentTypeId', language.id)
      .attach('file', replacementPath);

    const afterUpload = await reviewer.get(`/api/reviewer/applications/${applicationId}`);
    expect(afterUpload.status).toBe(200);
    const openRequests = afterUpload.body.data.application.documentRequests.filter(
      (item: { status: string }) => item.status === 'OPEN',
    );
    // Request resolves when replacement matches document type via upload flow.
    expect(
      afterUpload.body.data.application.documentRequests.some(
        (item: { status: string; documentType: { code: string } }) =>
          item.documentType.code === 'LANGUAGE_CERTIFICATE' && item.status === 'RESOLVED',
      ),
    ).toBe(true);
    expect(openRequests.length).toBe(0);

    const decision = await reviewer
      .post(`/api/reviewer/applications/${applicationId}/decisions`)
      .send({
        decision: ReviewDecision.APPROVED,
        comment: 'Manual approval after reviewing synthetic documents.',
      });
    expect(decision.status).toBe(201);
    expect(decision.body.data.application.status).toBe(ApplicationStatus.COMPLETED);
    expect(decision.body.data.application.reviewActions.length).toBeGreaterThan(0);

    const dashboard = await reviewer.get('/api/reviewer/dashboard');
    expect(dashboard.status).toBe(200);
    expect(dashboard.body.data.counts.total).toBeGreaterThan(0);

    const audit = await prisma.auditLog.findFirst({
      where: {
        action: 'REVIEW_DECISION_RECORDED',
        entityId: applicationId,
      },
      orderBy: { createdAt: 'desc' },
    });
    expect(audit).not.toBeNull();
  });
});
