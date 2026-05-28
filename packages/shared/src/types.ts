export interface MoneyBreakdown {
  goodsAmount: string;
  storeSettleAmount: string;
  deliveryFeeCost: string;
  deliveryFeeCharged: string;
  userDiscountAmount: string;
  storeCommission: string;
  riderBonus: string;
  promoterCommission: string;
  payableAmount: string;
  platformIncome: string;
  netProfit: string;
}

export interface PageResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
