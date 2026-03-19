import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const adminRole = await prisma.role.upsert({
    where: { code: 'admin' },
    update: {},
    create: {
      name: 'Администратор',
      code: 'admin',
      isSystem: true,
    },
  });

  await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      passwordHash: '$2b$10$CyOPxJoRoXmBYzDoznNhseb9zkot/eNBd1FNcPuUZCt65v0gcBytK',
      name: 'Admin',
      roleId: adminRole.id,
      isActive: true,
    },
  });

  await prisma.paymentStatus.upsert({
    where: { code: 'UNPAID' },
    update: { name: 'Не оплачен', isSystem: true },
    create: {
      code: 'UNPAID',
      name: 'Не оплачен',
      color: '#dc2626',
      isSystem: true,
    },
  });

  await prisma.paymentStatus.upsert({
    where: { code: 'PARTIALLY_PAID' },
    update: { name: 'Частично оплачен', isSystem: true },
    create: {
      code: 'PARTIALLY_PAID',
      name: 'Частично оплачен',
      color: '#f59e0b',
      isSystem: true,
    },
  });

  await prisma.paymentStatus.upsert({
    where: { code: 'PAID' },
    update: { name: 'Оплачен', isSystem: true },
    create: {
      code: 'PAID',
      name: 'Оплачен',
      color: '#16a34a',
      isSystem: true,
    },
  });

  await prisma.orderStatus.upsert({
    where: { code: 'NEW' },
    update: { name: 'Новый', isSystem: true },
    create: {
      code: 'NEW',
      name: 'Новый',
      color: '#2563eb',
      isSystem: true,
    },
  });

  await prisma.orderStatus.upsert({
    where: { code: 'IN_PROGRESS' },
    update: { name: 'В работе', isSystem: true },
    create: {
      code: 'IN_PROGRESS',
      name: 'В работе',
      color: '#f59e0b',
      isSystem: true,
    },
  });

  await prisma.orderStatus.upsert({
    where: { code: 'CANCELLED' },
    update: { name: 'Отменён', isSystem: true },
    create: {
      code: 'CANCELLED',
      name: 'Отменён',
      color: '#dc2626',
      isSystem: true,
    },
  });

  await prisma.orderStatus.upsert({
    where: { code: 'CLOSED' },
    update: { name: 'Закрыт', isSystem: true },
    create: {
      code: 'CLOSED',
      name: 'Закрыт',
      color: '#16a34a',
      isSystem: true,
    },
  });

  const assemblyNew = await prisma.assemblyStatus.findFirst({ where: { name: 'Новая' } });
  if (!assemblyNew) {
    await prisma.assemblyStatus.create({
      data: {
        name: 'Новая',
        color: '#2563eb',
      },
    });
  }

  const assemblyDone = await prisma.assemblyStatus.findFirst({ where: { name: 'Собрана' } });
  if (!assemblyDone) {
    await prisma.assemblyStatus.create({
      data: {
        name: 'Собрана',
        color: '#16a34a',
      },
    });
  }

  const mainStorage = await prisma.storagePlace.findFirst({ where: { name: 'Основной склад' } });
  if (!mainStorage) {
    await prisma.storagePlace.create({
      data: {
        name: 'Основной склад',
        description: 'Базовое место хранения',
        isActive: true,
      },
    });
  }

  await prisma.country.upsert({
    where: { id: 1 },
    update: { isActive: true },
    create: {
      id: 1,
      name: 'Казахстан',
      isActive: true,
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });