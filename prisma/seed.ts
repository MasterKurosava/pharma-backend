import {
  DeliveryStatusCode,
  OrderStatusCode,
  PaymentStatusCode,
  Prisma,
  PrismaClient,
  ProductAvailabilityStatus,
} from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const systemRoles: Array<{ code: string; name: string }> = [
    { code: 'admin', name: 'Админ' },
    { code: 'manager', name: 'Менеджер' },
    { code: 'delivery_operator', name: 'Оператор доставки' },
    { code: 'assembler', name: 'Сборщик заказов' },
  ];

  for (const role of systemRoles) {
    await prisma.role.upsert({
      where: { code: role.code },
      update: { name: role.name, isSystem: true },
      create: {
        code: role.code,
        name: role.name,
        isSystem: true,
      },
    });
  }

  const [adminRole, managerRole] = await Promise.all([
    prisma.role.findUniqueOrThrow({
    where: { code: 'admin' },
    }),
    prisma.role.findUniqueOrThrow({
      where: { code: 'manager' },
    }),
  ]);

  const allowedRoleCodes = new Set(systemRoles.map((role) => role.code));
  const obsoleteSystemRoles = await prisma.role.findMany({
    where: {
      isSystem: true,
      code: { notIn: [...allowedRoleCodes] },
    },
    select: { id: true },
  });

  if (obsoleteSystemRoles.length > 0) {
    const obsoleteIds = obsoleteSystemRoles.map((role) => role.id);
    await prisma.user.updateMany({
      where: { roleId: { in: obsoleteIds } },
      data: { roleId: managerRole.id },
    });
    await prisma.role.deleteMany({
      where: { id: { in: obsoleteIds } },
    });
  }

  await prisma.user.upsert({
    where: { login: 'admin' },
    update: {
      email: 'admin@example.com',
      passwordHash: '$2b$10$sNIQIHClmgN1q9NWpCD.NOXkEBRprsHTkmez4muWTRFY2.DfXPtwK',
      firstName: 'Admin',
      lastName: 'User',
      roleId: adminRole.id,
      isActive: true,
      deletedAt: null,
    },
    create: {
      login: 'admin',
      email: 'admin@example.com',
      passwordHash: '$2b$10$sNIQIHClmgN1q9NWpCD.NOXkEBRprsHTkmez4muWTRFY2.DfXPtwK',
      firstName: 'Admin',
      lastName: 'User',
      roleId: adminRole.id,
      isActive: true,
    },
  });

  const existingMainStorage = await prisma.storagePlace.findFirst({
    where: { name: 'Основной склад' },
    select: { id: true },
  });
  const mainStorage = existingMainStorage
    ? await prisma.storagePlace.update({
        where: { id: existingMainStorage.id },
        data: {
          name: 'Основной склад',
          description: 'Базовое место хранения',
          isActive: true,
        },
      })
    : await prisma.storagePlace.create({
        data: {
          name: 'Основной склад',
          description: 'Базовое место хранения',
          isActive: true,
        },
      });

  const ensureCountry = async (code: string, name: string) => {
    const existing = await prisma.country.findFirst({
      where: {
        OR: [{ code }, { name }],
      },
      select: { id: true },
    });

    if (existing) {
      await prisma.country.update({
        where: { id: existing.id },
        data: { code, name, isActive: true },
      });
      return existing.id;
    }

    const created = await prisma.country.create({
      data: { code, name, isActive: true },
      select: { id: true },
    });
    return created.id;
  };

  const kzId = await ensureCountry('KZ', 'Казахстан');

  const existingOrderSource = await prisma.productOrderSource.findFirst({
    where: { name: 'Внешний поставщик' },
    select: { id: true },
  });
  const productOrderSource = existingOrderSource
    ? await prisma.productOrderSource.update({
        where: { id: existingOrderSource.id },
        data: {
          name: 'Внешний поставщик',
          color: '#7c3aed',
          isActive: true,
          deletedAt: null,
        },
      })
    : await prisma.productOrderSource.create({
        data: {
          name: 'Внешний поставщик',
          color: '#7c3aed',
          isActive: true,
        },
      });

  const manufacturerNames = [
    'Bayer',
    'Novartis',
    'Pfizer',
    'Sanofi',
    'Roche',
    'GSK',
    'Abbott',
    'AstraZeneca',
    'Merck',
    'Takeda',
  ];
  const substanceNames = [
    'Парацетамол',
    'Ибупрофен',
    'Амоксициллин',
    'Азитромицин',
    'Метформин',
    'Омепразол',
    'Лоратадин',
    'Цетиризин',
    'Аторвастатин',
    'Левофлоксацин',
  ];

  const manufacturerIds: number[] = [];
  for (let index = 0; index < manufacturerNames.length; index += 1) {
    const manufacturer = await prisma.manufacturer.findFirst({
      where: {
        OR: [{ name: manufacturerNames[index] }, { countryId: kzId, name: manufacturerNames[index] }],
      },
      select: { id: true },
    });
    if (manufacturer) {
      await prisma.manufacturer.update({
        where: { id: manufacturer.id },
        data: {
          name: manufacturerNames[index],
          countryId: kzId,
          isActive: true,
        },
      });
      manufacturerIds.push(manufacturer.id);
      continue;
    }

    const created = await prisma.manufacturer.create({
      data: {
        name: manufacturerNames[index],
        countryId: kzId,
        isActive: true,
      },
      select: { id: true },
    });
    manufacturerIds.push(created.id);
  }

  const substanceIds: number[] = [];
  for (const substanceName of substanceNames) {
    const substance = await prisma.activeSubstance.findFirst({
      where: { name: substanceName },
      select: { id: true },
    });
    if (substance) {
      await prisma.activeSubstance.update({
        where: { id: substance.id },
        data: { name: substanceName, isActive: true },
      });
      substanceIds.push(substance.id);
      continue;
    }
    const created = await prisma.activeSubstance.create({
      data: { name: substanceName, isActive: true },
      select: { id: true },
    });
    substanceIds.push(created.id);
  }

  const availabilityCycle: ProductAvailabilityStatus[] = [
    ProductAvailabilityStatus.IN_STOCK,
    ProductAvailabilityStatus.ON_REQUEST,
    ProductAvailabilityStatus.OUT_OF_STOCK,
  ];

  const productIds: number[] = [];
  for (let index = 0; index < 10; index += 1) {
    const productName = `Препарат ${index + 1}`;
    const availabilityStatus = availabilityCycle[index % availabilityCycle.length];
    const stockQuantity = availabilityStatus === ProductAvailabilityStatus.OUT_OF_STOCK ? 0 : 80 + index * 3;
    const reservedQuantity = 0;

    const existing = await prisma.product.findFirst({
      where: { name: productName },
      select: { id: true },
    });

    if (existing) {
      await prisma.product.update({
        where: { id: existing.id },
        data: {
          name: productName,
          description: `Демо-описание для ${productName}`,
          manufacturerId: manufacturerIds[index % manufacturerIds.length],
          activeSubstanceId: substanceIds[index % substanceIds.length],
          availabilityStatus,
          productOrderSourceId:
            availabilityStatus === ProductAvailabilityStatus.ON_REQUEST ? productOrderSource.id : null,
          stockQuantity,
          reservedQuantity,
          price: new Prisma.Decimal((1500 + index * 120).toFixed(2)),
          isActive: true,
        },
      });
      productIds.push(existing.id);
      continue;
    }

    const created = await prisma.product.create({
      data: {
        name: productName,
        description: `Демо-описание для ${productName}`,
        manufacturerId: manufacturerIds[index % manufacturerIds.length],
        activeSubstanceId: substanceIds[index % substanceIds.length],
        availabilityStatus,
        productOrderSourceId: availabilityStatus === ProductAvailabilityStatus.ON_REQUEST ? productOrderSource.id : null,
        stockQuantity,
        reservedQuantity,
        price: new Prisma.Decimal((1500 + index * 120).toFixed(2)),
        isActive: true,
      },
      select: { id: true },
    });
    productIds.push(created.id);
  }

  const clientPhones = Array.from({ length: 10 }, (_, index) => `+770100000${String(index + 1).padStart(2, '0')}`);

  const availabilityLabelByCode: Record<ProductAvailabilityStatus, string> = {
    [ProductAvailabilityStatus.OUT_OF_STOCK]: 'Нет в наличии',
    [ProductAvailabilityStatus.ON_REQUEST]: 'На заказ',
    [ProductAvailabilityStatus.IN_STOCK]: 'Есть',
  };

  for (let index = 0; index < 10; index += 1) {
    const marker = `SEED_ORDER_${String(index + 1).padStart(2, '0')}`;
    const existing = await prisma.order.findFirst({
      where: { description: marker },
      select: { id: true },
    });
    if (existing) {
      continue;
    }

    const product = await prisma.product.findUniqueOrThrow({
      where: { id: productIds[index % productIds.length] },
      include: {
        manufacturer: true,
        activeSubstance: true,
        orderSource: true,
      },
    });

    const quantity = 1 + (index % 3);
    const pricePerItem = new Prisma.Decimal(product.price);
    const lineTotal = pricePerItem.mul(quantity);
    const deliveryPrice = new Prisma.Decimal(index % 2 === 0 ? 0 : 1500);
    const itemsTotalPrice = lineTotal;
    const totalPrice = itemsTotalPrice.plus(deliveryPrice);
    const paidAmount = new Prisma.Decimal(0);
    const remainingAmount = totalPrice;

    await prisma.order.create({
      data: {
        clientPhone: clientPhones[index % clientPhones.length],
        countryId: kzId,
        city: index % 2 === 0 ? 'Алматы' : 'Астана',
        address: `Демо адрес ${index + 1}`,
        deliveryStatus: [
          DeliveryStatusCode.COLLECT_DOVAS,
          DeliveryStatusCode.COLLECT_PONY,
          DeliveryStatusCode.COLLECT_YANDEX,
          DeliveryStatusCode.COLLECT_PICKUP,
        ][
          index % 4
        ],
        deliveryPrice,
        itemsTotalPrice,
        totalPrice,
        paidAmount,
        remainingAmount,
        paymentStatus: PaymentStatusCode.UNPAID,
        orderStatus: OrderStatusCode.ORDER,
        storagePlaceId: mainStorage.id,
        description: marker,
        items: {
          create: [
            {
              productId: product.id,
              productNameSnapshot: product.name,
              productStatusNameSnapshot: availabilityLabelByCode[product.availabilityStatus],
              orderSourceNameSnapshot: product.orderSource?.name ?? null,
              manufacturerNameSnapshot: product.manufacturer.name,
              activeSubstanceNameSnapshot: product.activeSubstance.name,
              quantity,
              pricePerItem,
              lineTotal,
            },
          ],
        },
      },
    });
  }
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