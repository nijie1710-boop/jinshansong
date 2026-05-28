export enum OrderStatus {
  Created = "CREATED",
  Paid = "PAID",
  WaitingStoreAccept = "WAITING_STORE_ACCEPT",
  Transferred = "TRANSFERRED",
  StoreAccepted = "STORE_ACCEPTED",
  ReadyForPickup = "READY_FOR_PICKUP",
  RiderPickedUp = "RIDER_PICKED_UP",
  Delivering = "DELIVERING",
  Completed = "COMPLETED",
  Exception = "EXCEPTION",
  Cancelled = "CANCELLED",
  Refunded = "REFUNDED"
}

export enum PayStatus {
  Unpaid = "UNPAID",
  Paid = "PAID",
  Refunded = "REFUNDED"
}

export enum PickStatus {
  NotReady = "NOT_READY",
  Ready = "READY",
  PickedUp = "PICKED_UP"
}

export enum RiskStatus {
  Normal = "NORMAL",
  Warning = "WARNING",
  Blocked = "BLOCKED"
}

export enum CommissionType {
  Store = "STORE",
  Rider = "RIDER",
  Promoter = "PROMOTER"
}

export enum SettlementType {
  Store = "STORE",
  Rider = "RIDER",
  Promoter = "PROMOTER"
}

export enum PromotionCode {
  NewUserFirstOrder = "NEW_USER_FIRST_ORDER",
  ReferralCoupon = "REFERRAL_COUPON",
  OrderDiscount = "ORDER_DISCOUNT",
  FreeDelivery = "FREE_DELIVERY"
}
