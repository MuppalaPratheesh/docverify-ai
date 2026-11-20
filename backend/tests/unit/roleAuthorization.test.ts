import { UserRole } from '@prisma/client';
import type { NextFunction, Request, Response } from 'express';
import { requireRoles } from '../../src/middleware/authMiddleware';
import {
  assertCanManageAdminResources,
  assertCanRecordReview,
  applicantOwnsResource,
} from '../../src/services/authorizationService';
import { AppError } from '../../src/middleware/errorHandler';
import { authUser } from '../helpers/fixtures';

describe('Role authorization', () => {
  it('allows ADMIN through requireRoles(ADMIN)', () => {
    const middleware = requireRoles(UserRole.ADMIN);
    const req = { user: authUser('admin-1', UserRole.ADMIN) } as Request;
    const next = jest.fn() as NextFunction;

    middleware(req, {} as Response, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('rejects APPLICANT from ADMIN-only routes', () => {
    const middleware = requireRoles(UserRole.ADMIN);
    const req = { user: authUser('app-1', UserRole.APPLICANT) } as Request;
    const next = jest.fn() as NextFunction;

    middleware(req, {} as Response, next);

    expect(next).toHaveBeenCalledTimes(1);
    const error = (next as jest.Mock).mock.calls[0][0] as AppError;
    expect(error).toBeInstanceOf(AppError);
    expect(error.statusCode).toBe(403);
  });

  it('rejects unauthenticated requests', () => {
    const middleware = requireRoles(UserRole.REVIEWER);
    const req = {} as Request;
    const next = jest.fn() as NextFunction;

    middleware(req, {} as Response, next);

    const error = (next as jest.Mock).mock.calls[0][0] as AppError;
    expect(error.statusCode).toBe(401);
  });

  it('allows REVIEWER and ADMIN to record review decisions', () => {
    expect(() => assertCanRecordReview(authUser('r1', UserRole.REVIEWER))).not.toThrow();
    expect(() => assertCanRecordReview(authUser('a1', UserRole.ADMIN))).not.toThrow();
  });

  it('blocks APPLICANT from recording review decisions', () => {
    expect(() => assertCanRecordReview(authUser('p1', UserRole.APPLICANT))).toThrow(AppError);
  });

  it('allows only ADMIN to manage admin resources', () => {
    expect(() =>
      assertCanManageAdminResources(authUser('a1', UserRole.ADMIN)),
    ).not.toThrow();
    expect(() =>
      assertCanManageAdminResources(authUser('r1', UserRole.REVIEWER)),
    ).toThrow(AppError);
    expect(() =>
      assertCanManageAdminResources(authUser('p1', UserRole.APPLICANT)),
    ).toThrow(AppError);
  });

  it('detects applicant ownership correctly', () => {
    const applicant = authUser('owner-1', UserRole.APPLICANT);
    expect(applicantOwnsResource(applicant, 'owner-1')).toBe(true);
    expect(applicantOwnsResource(applicant, 'other-id')).toBe(false);
    expect(applicantOwnsResource(authUser('r1', UserRole.REVIEWER), 'r1')).toBe(false);
  });
});
