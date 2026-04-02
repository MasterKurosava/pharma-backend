import { Prisma } from '@prisma/client';

export type DbClient = Prisma.TransactionClient;

export const ORDER_FULL_INCLUDE = Prisma.validator<Prisma.OrderInclude>()({
  country: true,
  storagePlace: true,
  items: {
    include: {
      product: true,
    },
    orderBy: [{ id: 'asc' }],
  },
});

export type FullOrder = Prisma.OrderGetPayload<{
  include: typeof ORDER_FULL_INCLUDE;
}>;
