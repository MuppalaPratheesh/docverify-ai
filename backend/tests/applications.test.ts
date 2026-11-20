import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { ApplicationStatus, DocumentStatus } from '@prisma/client';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';

const app = createApp();

function uniqueEmail(prefix: string): string {
  return `${prefix}.${Date.now()}.${Math.floor(Math.random() * 10_000)}@example.com`;
}

function createSyntheticPdf(filePath: string): void {
  // Minimal PDF signature content for synthetic testing.
  fs.writeFileSync(filePath, '%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n');
}

describe('Applicant applications and document uploads', () => {
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
        const applicationIds = applications.map((application) => application.id);

        if (applicationIds.length > 0) {
          await prisma.documentRequest.deleteMany({
            where: { applicationId: { in: applicationIds } },
          });
          await prisma.document.deleteMany({ where: { applicationId: { in: applicationIds } } });
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

  it('supports create → upload → replace → submit and enforces ownership', async () => {
    const email = uniqueEmail('applicant-flow');
    const otherEmail = uniqueEmail('other-applicant');
    createdEmails.push(email, otherEmail);
    const password = 'SecurePass1';

    const agent = request.agent(app);
    const register = await agent.post('/api/auth/register').send({
      name: 'Flow Applicant',
      email,
      password,
    });
    expect(register.status).toBe(201);

    const create = await agent.post('/api/applications').send({
      notes: 'Synthetic transcript verification draft',
    });
    expect(create.status).toBe(201);
    expect(create.body.data.application.status).toBe(ApplicationStatus.DRAFT);

    const applicationId = create.body.data.application.id as string;

    const types = await agent.get('/api/document-types');
    expect(types.status).toBe(200);
    const transcript = types.body.data.documentTypes.find(
      (type: { code: string }) => type.code === 'TRANSCRIPT',
    );
    expect(transcript).toBeDefined();

    const pdfPath = path.join(os.tmpdir(), `docverify-synthetic-${Date.now()}.pdf`);
    createSyntheticPdf(pdfPath);
    tempFiles.push(pdfPath);

    const upload = await agent
      .post(`/api/applications/${applicationId}/documents`)
      .field('documentTypeId', transcript.id)
      .attach('file', pdfPath);

    expect(upload.status).toBe(201);
    expect(upload.body.data.document.status).toBe(DocumentStatus.ACTIVE);
    const originalDocumentId = upload.body.data.document.id as string;

    const replacementPath = path.join(os.tmpdir(), `docverify-replacement-${Date.now()}.pdf`);
    createSyntheticPdf(replacementPath);
    tempFiles.push(replacementPath);

    const replace = await agent
      .post(`/api/applications/${applicationId}/documents`)
      .field('documentTypeId', transcript.id)
      .field('replaceDocumentId', originalDocumentId)
      .attach('file', replacementPath);

    expect(replace.status).toBe(201);
    expect(replace.body.data.document.supersededDocumentId).toBe(originalDocumentId);

    const detail = await agent.get(`/api/applications/${applicationId}`);
    expect(detail.status).toBe(200);
    const documents = detail.body.data.application.documents as Array<{
      id: string;
      status: DocumentStatus;
    }>;
    const original = documents.find((document) => document.id === originalDocumentId);
    expect(original?.status).toBe(DocumentStatus.REPLACED);

    const download = await agent.get(
      `/api/documents/${replace.body.data.document.id}/download`,
    );
    expect(download.status).toBe(200);
    expect(download.headers['content-type']).toContain('application/pdf');

    const submit = await agent.post(`/api/applications/${applicationId}/submit`);
    expect(submit.status).toBe(200);
    expect(submit.body.data.application.status).toBe(ApplicationStatus.SUBMITTED);

    // Another applicant cannot access this application.
    const otherAgent = request.agent(app);
    await otherAgent.post('/api/auth/register').send({
      name: 'Other Applicant',
      email: otherEmail,
      password,
    });

    const forbidden = await otherAgent.get(`/api/applications/${applicationId}`);
    expect(forbidden.status).toBe(403);

    const forbiddenDownload = await otherAgent.get(
      `/api/documents/${replace.body.data.document.id}/download`,
    );
    expect(forbiddenDownload.status).toBe(403);
  });
});
