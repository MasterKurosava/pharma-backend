import { Prisma } from '@prisma/client';

export type DbClient = Prisma.TransactionClient;

export const ORDER_FULL_INCLUDE = Prisma.validator<Prisma.OrderInclude>()({
  storagePlace: true,
  product: true,
  actionStatus: true,
  stateStatus: true,
  assemblyStatus: true,
});

export type FullOrder = Prisma.OrderGetPayload<{
  include: typeof ORDER_FULL_INCLUDE;
}>;
