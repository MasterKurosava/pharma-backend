type OrderHistoryFieldConfig = {
  fieldName: string;
  message: string;
  getValue: (order: any) => unknown;
};

const simpleField = (fieldName: string, message: string): OrderHistoryFieldConfig => ({
  fieldName,
  message,
  getValue: (order) => order[fieldName] ?? null,
});

const relationField = (
  fieldName: string,
  message: string,
  config: { idKey: string; relationKey: string },
): OrderHistoryFieldConfig => ({
  fieldName,
  message,
  getValue: (order) => {
    const relation = order[config.relationKey];
    if (!relation) return null;

    return {
      id: order[config.idKey] ?? null,
      name: relation.name ?? null,
    };
  },
});

const userField = (
  fieldName: string,
  message: string,
  config: { idKey: string; relationKey: string },
): OrderHistoryFieldConfig => ({
  fieldName,
  message,
  getValue: (order) => {
    const user = order[config.relationKey];
    if (!user) return null;

    return {
      id: order[config.idKey] ?? null,
      name: user.name ?? null,
      email: user.email ?? null,
    };
  },
});

export const ORDER_HISTORY_FIELDS: OrderHistoryFieldConfig[] = [
  simpleField('address', 'Изменён адрес'),
  simpleField('description', 'Изменено описание'),
  simpleField('deliveryPrice', 'Изменена цена доставки'),
  simpleField('paidAmount', 'Изменена сумма оплаты'),
  simpleField('totalPrice', 'Изменена сумма заказа'),
  simpleField('remainingAmount', 'Изменён остаток к оплате'),
  relationField('deliveryCompanyId', 'Изменена служба доставки', {
    idKey: 'deliveryCompanyId',
    relationKey: 'deliveryCompany',
  }),
  relationField('deliveryTypeId', 'Изменён тип доставки', {
    idKey: 'deliveryTypeId',
    relationKey: 'deliveryType',
  }),
  relationField('paymentStatusId', 'Изменён статус оплаты', {
    idKey: 'paymentStatusId',
    relationKey: 'paymentStatus',
  }),
  relationField('orderStatusId', 'Изменён статус заказа', {
    idKey: 'orderStatusId',
    relationKey: 'orderStatus',
  }),
  relationField('assemblyStatusId', 'Изменён статус сборки', {
    idKey: 'assemblyStatusId',
    relationKey: 'assemblyStatus',
  }),
  relationField('storagePlaceId', 'Изменено место хранения', {
    idKey: 'storagePlaceId',
    relationKey: 'storagePlace',
  }),
  userField('responsibleUserId', 'Изменён ответственный', {
    idKey: 'responsibleUserId',
    relationKey: 'responsibleUser',
  }),
];

