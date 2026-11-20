import {
  ApplicationStatus,
  DocumentStatus,
  UserRole,
} from '@prisma/client';
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

describe('Applications and documents integration', () => {
  const tempFiles: string[] = [];

  afterAll(() => {
    cleanupFiles(tempFiles);
  });

  it('creates an application for the authenticated applicant', async () => {
    const email = uniqueEmail('create-app');
    const { response: register } = await registerApplicant(app, { email });
    expect(register.status).toBe(201);

    const { session } = await loginAs(app, { email, password: TEST_PASSWORDS.strong });
    const create = await session.post('/api/applications').send({
      notes: 'Synthetic application draft',
    });

    expect(create.status).toBe(201);
    expect(create.body.data.application.status).toBe(ApplicationStatus.DRAFT);
    expect(create.body.data.application.applicationNumber).toMatch(/^APP-/);

    const stored = await prisma.application.findUniqueOrThrow({
      where: { id: create.body.data.application.id },
    });
    expect(stored.applicantId).toBe(register.body.data.user.id);
  });

  it('uploads a synthetic document and persists metadata', async () => {
    const email = uniqueEmail('upload-meta');
    await registerApplicant(app, { email });
    const { session } = await loginAs(app, { email, password: TEST_PASSWORDS.strong });

    const created = await session.post('/api/applications').send({ notes: 'Upload test' });
    const applicationId = created.body.data.application.id as string;
    const transcript = await getActiveDocumentType('TRANSCRIPT');
    const pdfPath = createSyntheticPdf();
    tempFiles.push(pdfPath);

    const upload = await session
      .post(`/api/applications/${applicationId}/documents`)
      .field('documentTypeId', transcript.id)
      .attach('file', pdfPath);

    expect(upload.status).toBe(201);
    expect(upload.body.data.document.status).toBe(DocumentStatus.ACTIVE);
    expect(upload.body.data.document.mimeType).toBe('application/pdf');
    expect(upload.body.data.document.originalFilename).toBeTruthy();
    expect(upload.body.data.document.passwordHash).toBeUndefined();

    const stored = await prisma.document.findUniqueOrThrow({
      where: { id: upload.body.data.document.id },
    });
    expect(stored.applicationId).toBe(applicationId);
    expect(stored.documentTypeId).toBe(transcript.id);
    expect(stored.fileSize).toBeGreaterThan(0);
    expect(stored.storedFilename).toBeTruthy();
    expect(stored.storagePath).toBeTruthy();
  });

  it('rejects unauthorized document download access', async () => {
    const ownerEmail = uniqueEmail('doc-owner');
    const otherEmail = uniqueEmail('doc-other');

    await registerApplicant(app, { email: ownerEmail });
    const { session: owner } = await loginAs(app, {
      email: ownerEmail,
      password: TEST_PASSWORDS.strong,
    });

    const created = await owner.post('/api/applications').send({ notes: 'Private docs' });
    const applicationId = created.body.data.application.id as string;
    const transcript = await getActiveDocumentType('TRANSCRIPT');
    const pdfPath = createSyntheticPdf();
    tempFiles.push(pdfPath);

    const upload = await owner
      .post(`/api/applications/${applicationId}/documents`)
      .field('documentTypeId', transcript.id)
      .attach('file', pdfPath);
    const documentId = upload.body.data.document.id as string;

    await registerApplicant(app, { email: otherEmail, name: 'Other Applicant' });
    const { session: other } = await loginAs(app, {
      email: otherEmail,
      password: TEST_PASSWORDS.strong,
    });

    const forbidden = await other.get(`/api/documents/${documentId}/download`);
    expect(forbidden.status).toBe(403);
  });

  it('prevents an applicant from viewing another applicant application', async () => {
    const ownerEmail = uniqueEmail('app-owner');
    const otherEmail = uniqueEmail('app-other');

    await registerApplicant(app, { email: ownerEmail });
    const { session: owner } = await loginAs(app, {
      email: ownerEmail,
      password: TEST_PASSWORDS.strong,
    });
    const created = await owner.post('/api/applications').send({ notes: 'Mine' });
    const applicationId = created.body.data.application.id as string;

    await registerApplicant(app, { email: otherEmail, name: 'Intruder' });
    const { session: other } = await loginAs(app, {
      email: otherEmail,
      password: TEST_PASSWORDS.strong,
    });

    const forbidden = await other.get(`/api/applications/${applicationId}`);
    expect(forbidden.status).toBe(403);
  });

  it('allows an applicant to upload a replacement document', async () => {
    const email = uniqueEmail('replace');
    await registerApplicant(app, { email });
    const { session } = await loginAs(app, { email, password: TEST_PASSWORDS.strong });

    const created = await session.post('/api/applications').send({ notes: 'Replace flow' });
    const applicationId = created.body.data.application.id as string;
    const transcript = await getActiveDocumentType('TRANSCRIPT');

    const originalPath = createSyntheticPdf();
    const replacementPath = createSyntheticPdf();
    tempFiles.push(originalPath, replacementPath);

    const original = await session
      .post(`/api/applications/${applicationId}/documents`)
      .field('documentTypeId', transcript.id)
      .attach('file', originalPath);
    expect(original.status).toBe(201);
    const originalId = original.body.data.document.id as string;

    const replacement = await session
      .post(`/api/applications/${applicationId}/documents`)
      .field('documentTypeId', transcript.id)
      .field('replaceDocumentId', originalId)
      .attach('file', replacementPath);

    expect(replacement.status).toBe(201);
    expect(replacement.body.data.document.supersededDocumentId).toBe(originalId);

    const previous = await prisma.document.findUniqueOrThrow({ where: { id: originalId } });
    expect(previous.status).toBe(DocumentStatus.REPLACED);
  });

  it('rejects document uploads with unsupported content', async () => {
    const email = uniqueEmail('bad-file');
    await registerApplicant(app, { email });
    const { session } = await loginAs(app, { email, password: TEST_PASSWORDS.strong });
    const created = await session.post('/api/applications').send({});
    const applicationId = created.body.data.application.id as string;
    const transcript = await getActiveDocumentType('TRANSCRIPT');

    const fakePath = createSyntheticPdf().replace(/\.pdf$/, '.txt');
    const fs = await import('node:fs');
    fs.writeFileSync(fakePath, 'not a document');
    tempFiles.push(fakePath);

    const upload = await session
      .post(`/api/applications/${applicationId}/documents`)
      .field('documentTypeId', transcript.id)
      .attach('file', fakePath);

    expect(upload.status).toBe(400);
  });

  it('blocks reviewers from creating applicant applications', async () => {
    const { session, response } = await loginAs(app, 'reviewer');
    expect(response.status).toBe(200);
    expect(response.body.data.user.role).toBe(UserRole.REVIEWER);

    const create = await session.post('/api/applications').send({ notes: 'Nope' });
    expect(create.status).toBe(403);
  });
});
