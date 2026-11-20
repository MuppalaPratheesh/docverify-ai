import { prisma } from '../../src/lib/prisma';
import { resetTransactionalData } from '../helpers/db';

beforeEach(async () => {
  await resetTransactionalData();
});

afterAll(async () => {
  await prisma.$disconnect();
});
