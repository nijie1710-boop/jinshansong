import { BadRequestException, Injectable } from "@nestjs/common";
import { CouponStatus, FirstOrderStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../../infra/prisma/prisma.service";
import { UserService } from "../user/user.service";

type ConfigRecord = Record<string, unknown>;

function money(value: number) {
  return Math.round(value * 100) / 100;
}

function toNumber(value: unknown) {
  return Number(value ?? 0);
}

function jsonRecord(value: Prisma.JsonValue | null | undefined): ConfigRecord {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as ConfigRecord;
  }
  return {};
}

function numberFromConfig(config: ConfigRecord, key: string, fallback: number) {
  const value = config[key];
  return typeof value === "number" ? value : fallback;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

@Injectable()
export class CouponService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userService: UserService
  ) {}

  async listCoupons(userToken?: string) {
    const user = await this.userService.resolveUser(userToken);
    await this.expireUserCoupons(user.id);

    const [newUserConfig, orderDiscountConfig, deliveryConfig, coupons] = await Promise.all([
      this.promotionConfig("NEW_USER_FIRST_ORDER"),
      this.promotionConfig("ORDER_DISCOUNT"),
      this.systemConfig("delivery", { userDeliveryFee: 4, freeDeliveryThreshold: 19 }),
      this.prisma.coupon.findMany({
        where: { userId: user.id },
        orderBy: [{ status: "asc" }, { expiredAt: "asc" }]
      })
    ]);

    const list = [];
    if (Object.keys(newUserConfig).length > 0) {
      const amount = numberFromConfig(newUserConfig, "amount", 5);
      const available = user.isNewUser && user.firstOrderStatus === FirstOrderStatus.NOT_USED;
      list.push({
        id: "virtual-new-user-first-order",
        title: "新人首单立减",
        type: "NEW_USER_FIRST_ORDER",
        amount: money(amount),
        threshold: "无门槛",
        expires: "首单可用",
        status: available ? CouponStatus.UNUSED : CouponStatus.USED,
        statusText: available ? "可使用" : "已使用",
        usable: available,
        virtual: true
      });
    }

    for (const coupon of coupons) {
      list.push({
        id: coupon.id,
        title: coupon.type === "REFERRAL_COUPON" ? "老带新奖励券" : "用户优惠券",
        type: coupon.type,
        amount: toNumber(coupon.amount),
        threshold: "无门槛",
        expires: `${coupon.expiredAt.toISOString().slice(0, 10)} 前有效`,
        status: coupon.status,
        statusText: this.statusText(coupon.status),
        usable: coupon.status === CouponStatus.UNUSED,
        virtual: false
      });
    }

    if (Object.keys(deliveryConfig).length > 0) {
      const freeDeliveryThreshold = numberFromConfig(deliveryConfig, "freeDeliveryThreshold", 19);
      const deliveryAmount = numberFromConfig(deliveryConfig, "userDeliveryFee", 4);
      list.push({
        id: "activity-free-delivery",
        title: "满 19 免配送费",
        type: "FREE_DELIVERY",
        amount: money(deliveryAmount),
        threshold: `满 ${freeDeliveryThreshold} 元可用`,
        expires: "活动长期有效",
        status: CouponStatus.UNUSED,
        statusText: "自动生效",
        usable: true,
        virtual: true
      });
    }

    if (Object.keys(orderDiscountConfig).length > 0) {
      const tiers = Array.isArray(orderDiscountConfig.tiers) ? orderDiscountConfig.tiers : [];
      const maxDiscount = tiers.reduce((max, tier) => {
        if (!tier || typeof tier !== "object") {
          return max;
        }
        return Math.max(max, numberFromConfig(tier as ConfigRecord, "discount", 0));
      }, 0);
      if (maxDiscount > 0) {
        list.push({
          id: "activity-order-discount",
          title: "满减活动",
          type: "ORDER_DISCOUNT",
          amount: money(maxDiscount),
          threshold: "满 29 减 3，满 49 减 6",
          expires: "活动长期有效",
          status: CouponStatus.UNUSED,
          statusText: "自动生效",
          usable: true,
          virtual: true
        });
      }
    }

    return list;
  }

  async claimReferralCoupon(userToken?: string) {
    const user = await this.userService.resolveUser(userToken);
    const config = await this.promotionConfig("REFERRAL_COUPON");

    if (Object.keys(config).length === 0) {
      throw new BadRequestException("老带新奖励活动未开启");
    }

    const weeklyLimit = numberFromConfig(config, "weeklyLimit", 3);
    if (user.weeklyReferGetTimes >= weeklyLimit) {
      throw new BadRequestException("本周老带新奖励领取次数已达上限");
    }

    const amount = numberFromConfig(config, "amount", 2);
    const validDays = numberFromConfig(config, "validDays", 7);

    const coupon = await this.prisma.$transaction(async (tx) => {
      const created = await tx.coupon.create({
        data: {
          userId: user.id,
          type: "REFERRAL_COUPON",
          amount: money(amount).toFixed(2),
          expiredAt: addDays(new Date(), validDays)
        }
      });

      await tx.user.update({
        where: { id: user.id },
        data: {
          weeklyReferGetTimes: {
            increment: 1
          }
        }
      });

      return created;
    });

    return {
      id: coupon.id,
      title: "老带新奖励券",
      type: coupon.type,
      amount: toNumber(coupon.amount),
      threshold: "无门槛",
      expires: `${coupon.expiredAt.toISOString().slice(0, 10)} 前有效`,
      status: coupon.status,
      statusText: this.statusText(coupon.status),
      usable: true,
      virtual: false
    };
  }

  private async expireUserCoupons(userId: string) {
    await this.prisma.coupon.updateMany({
      where: {
        userId,
        status: CouponStatus.UNUSED,
        expiredAt: {
          lt: new Date()
        }
      },
      data: {
        status: CouponStatus.EXPIRED
      }
    });
  }

  private statusText(status: CouponStatus) {
    const labels: Record<CouponStatus, string> = {
      UNUSED: "可使用",
      USED: "已使用",
      EXPIRED: "已过期",
      CANCELLED: "已取消"
    };
    return labels[status];
  }

  private async promotionConfig(code: string) {
    const config = await this.prisma.promotionConfig.findUnique({ where: { code } });
    if (!config?.enabled) {
      return {};
    }
    return jsonRecord(config.config);
  }

  private async systemConfig(key: string, fallback: ConfigRecord) {
    const config = await this.prisma.systemConfig.findUnique({ where: { key } });
    return { ...fallback, ...jsonRecord(config?.value) };
  }
}
