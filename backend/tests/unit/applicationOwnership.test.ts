import { ApplicationStatus, UserRole } from '@prisma/client';
import { prisma } from '../../src/lib/prisma';
import { AppError } from '../../src/middleware/errorHandler';
import {
  assertCanAccessApplication,
  assertCanUploadDocument,
} from '../../src/services/authorizationService';
import { getSeedUserIds } from '../helpers/db';
import { authUser } from '../helpers/fixtures';

describe('Application ownership validation', () => {
  let applicationId: string;
  let ownerId: string;
  let otherApplicantId: string;
  let reviewerId: string;
  let adminId: string;

  beforeEach(async () => {
    const seeds = await getSeedUserIds();
    adminId = seeds.adminId;
    reviewerId = seeds.reviewerId;
    ownerId = seeds.applicantId;

    const other = await prisma.user.create({
      data: {
        name: 'Other Applicant',
        email: `other.owner.${Date.now()}@example.test`,
        passwordHash: 'not-used-in-this-test',
        role: UserRole.APPLICANT,
      },
    });
    otherApplicantId = other.id;

    const application = await prisma.application.create({
      data: {
        applicationNumber: `APP-OWN-${Date.now()}`,
        applicantId: ownerId,
        status: ApplicationStatus.DRAFT,
        notes: 'Ownership fixture',
      },
    });
    applicationId = application.id;
  });

  it('allows the owning applicant to access and upload', async () => {
    const owner = authUser(ownerId, UserRole.APPLICANT);

    await expect(assertCanAccessApplication(owner, applicationId)).resolves.toBeUndefined();
    await expect(assertCanUploadDocument(owner, applicationId)).resolves.toBeUndefined();
  });

  it('blocks another applicant from accessing or uploading', async () => {
    const other = authUser(otherApplicantId, UserRole.APPLICANT);

    await expect(assertCanAccessApplication(other, applicationId)).rejects.toMatchObject({
      statusCode: 403,
    });
    await expect(assertCanUploadDocument(other, applicationId)).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  it('allows reviewers to access applications but not upload documents', async () => {
    const reviewer = authUser(reviewerId, UserRole.REVIEWER);

    await expect(assertCanAccessApplication(reviewer, applicationId)).resolves.toBeUndefined();
    await expect(assertCanUploadDocument(reviewer, applicationId)).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  it('allows admins to access and upload', async () => {
    const admin = authUser(adminId, UserRole.ADMIN);

    await expect(assertCanAccessApplication(admin, applicationId)).resolves.toBeUndefined();
    await expect(assertCanUploadDocument(admin, applicationId)).resolves.toBeUndefined();
  });

  it('returns 404 for unknown applications', async () => {
    const owner = authUser(ownerId, UserRole.APPLICANT);

    await expect(
      assertCanAccessApplication(owner, 'nonexistent-application-id'),
    ).rejects.toBeInstanceOf(AppError);
  });
});
