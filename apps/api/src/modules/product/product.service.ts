import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, ProductReviewStatus, ProductStatus, StoreStatus } from "@prisma/client";
import { PrismaService } from "../../infra/prisma/prisma.service";

function money(value: unknown) {
  return Number(value ?? 0);
}

const DEFAULT_PRODUCT_RADIUS_KM = 8;
const MAX_PRODUCT_RADIUS_KM = 30;

type ProductListQuery = {
  keyword?: string;
  latitude?: string | number;
  longitude?: string | number;
  radiusKm?: string | number;
};

type Coordinates = {
  latitude: number;
  longitude: number;
};

function finiteNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function coordinatesFromQuery(query?: ProductListQuery | string) {
  if (!query || typeof query === "string") {
    return null;
  }
  const latitude = finiteNumber(query.latitude);
  const longitude = finiteNumber(query.longitude);

  if (latitude === null || longitude === null) {
    return null;
  }
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
    return null;
  }

  return { latitude, longitude };
}

function radiusFromQuery(query?: ProductListQuery | string) {
  if (!query || typeof query === "string") {
    return DEFAULT_PRODUCT_RADIUS_KM;
  }
  const radius = finiteNumber(query.radiusKm);

  if (radius === null || radius <= 0) {
    return DEFAULT_PRODUCT_RADIUS_KM;
  }

  return Math.min(radius, MAX_PRODUCT_RADIUS_KM);
}

function roundDistance(value: number) {
  return Math.round(value * 10) / 10;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const radius = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return roundDistance(radius * c);
}

function storeDistanceKm(
  coordinates: Coordinates | null,
  store: { latitude: Prisma.Decimal | null; longitude: Prisma.Decimal | null }
) {
  if (!coordinates || !store.latitude || !store.longitude) {
    return null;
  }

  return haversineKm(
    coordinates.latitude,
    coordinates.longitude,
    Number(store.latitude),
    Number(store.longitude)
  );
}

function deliveryEtaMinutes(distanceKm: number | null) {
  if (distanceKm === null) {
    return 45;
  }

  return Math.min(75, Math.max(25, Math.round(25 + distanceKm * 6)));
}

function compareOptionalDistance(left: number | null, right: number | null) {
  if (left === null && right === null) return 0;
  if (left === null) return 1;
  if (right === null) return -1;
  return left - right;
}

function productTone(index: number) {
  const tones = [
    "linear-gradient(135deg, #f7f8fa, #ffffff)",
    "linear-gradient(135deg, #fff7ed, #ffffff)",
    "linear-gradient(135deg, #eef2ff, #ffffff)",
    "linear-gradient(135deg, #ecfdf5, #ffffff)"
  ];
  return tones[index % tones.length];
}

function categoryIconLabel(icon: string | null, name: string) {
  const labels: Record<string, string> = {
    cable: "线",
    plug: "头",
    battery: "宝",
    "phone-case": "壳",
    shield: "膜",
    earphone: "耳",
    more: "+"
  };

  return (icon ? labels[icon] : undefined) ?? name.slice(0, 1);
}

function apiPublicBaseUrl() {
  return (process.env.API_PUBLIC_BASE_URL || "http://localhost:3001").replace(/\/$/, "");
}

function assetUrl(value?: string | null) {
  if (!value) {
    return "";
  }
  if (value.startsWith("http://") || value.startsWith("https://") || value.startsWith("data:")) {
    return value;
  }
  if (value.startsWith("/uploads/")) {
    return `${apiPublicBaseUrl()}${value}`;
  }
  return "";
}

function jsonStringArray(value: Prisma.JsonValue | null | undefined) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function normalizeImageUrls(values?: string[]) {
  return (values ?? [])
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 12);
}

type MerchantSkuInput = {
  skuName?: string;
  salePrice?: number;
  settlePrice?: number;
  stock?: number;
  imageUrl?: string;
};

function normalizeSkuInputs(
  dto: {
    skuName?: string;
    salePrice: number;
    settlePrice?: number;
    stock: number;
    imageUrl?: string;
    skus?: MerchantSkuInput[];
  },
  fallbackName = "默认规格"
) {
  const rawItems =
    dto.skus && dto.skus.length > 0
      ? dto.skus
      : [
          {
            skuName: dto.skuName,
            salePrice: dto.salePrice,
            settlePrice: dto.settlePrice,
            stock: dto.stock,
            imageUrl: dto.imageUrl
          }
        ];

  const usedNames = new Set<string>();

  return rawItems.slice(0, 12).map((item, index) => {
    const name = item.skuName?.trim() || (index === 0 ? dto.skuName?.trim() : "") || fallbackName;
    const salePrice = Number(item.salePrice ?? dto.salePrice);
    const settlePrice = Number(
      item.settlePrice ?? item.salePrice ?? dto.settlePrice ?? dto.salePrice
    );
    const stock = Math.max(0, Number(item.stock ?? dto.stock ?? 0));
    const normalizedKey = name.toLowerCase();

    if (usedNames.has(normalizedKey)) {
      throw new BadRequestException(`SKU 规格名称重复：${name}`);
    }
    usedNames.add(normalizedKey);
    if (!Number.isFinite(salePrice) || salePrice <= 0) {
      throw new BadRequestException(`SKU ${name} 销售价必须大于 0`);
    }
    if (!Number.isFinite(settlePrice) || settlePrice <= 0) {
      throw new BadRequestException(`SKU ${name} 结算价必须大于 0`);
    }
    if (settlePrice > salePrice) {
      throw new BadRequestException(`SKU ${name} 结算价不能高于销售价`);
    }
    if (!Number.isFinite(stock)) {
      throw new BadRequestException(`SKU ${name} 库存格式不正确`);
    }

    return {
      name,
      salePrice,
      settlePrice,
      stock,
      imageUrl: item.imageUrl?.trim() || dto.imageUrl?.trim() || null
    };
  });
}

function arraysEqual(left: string[], right: string[]) {
  return left.length === right.length && left.every((item, index) => item === right[index]);
}

function reviewStatusText(status: ProductReviewStatus) {
  const textMap: Record<ProductReviewStatus, string> = {
    PENDING: "待审核",
    APPROVED: "审核通过",
    REJECTED: "已驳回"
  };
  return textMap[status];
}

function decimal(value: number) {
  return (Math.round(value * 100) / 100).toFixed(2);
}

function margin(salePrice: number, settlePrice: number) {
  return Math.round((salePrice - settlePrice) * 100) / 100;
}

function productVisibilityIssues(options: {
  stock: number;
  productStatus: ProductStatus;
  skuStatus: ProductStatus;
  reviewStatus: ProductReviewStatus;
}) {
  const issues: string[] = [];

  if (options.reviewStatus === ProductReviewStatus.PENDING) {
    issues.push("待后台审核");
  }
  if (options.reviewStatus === ProductReviewStatus.REJECTED) {
    issues.push("审核未通过");
  }
  if (options.productStatus === ProductStatus.OFF_SALE) {
    issues.push("商品已下架");
  }
  if (options.skuStatus === ProductStatus.OFF_SALE) {
    issues.push("规格已下架");
  }
  if (options.stock <= 0) {
    issues.push("门店库存为0");
  }

  return issues;
}

function visibilityStatusText(issues: string[]) {
  return issues.length > 0 ? issues.join("、") : "审核通过且有库存，用户端可见";
}

function slugifyName(name: string) {
  return `merchant-${Date.now()}-${
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 24) || "product"
  }`;
}

type PublicStoreSku = Prisma.StoreSkuGetPayload<{
  include: {
    store: true;
  };
}> & {
  distanceKm: number | null;
};

type PublicSku = Prisma.SkuGetPayload<{
  include: {
    storeSkus: {
      include: { store: true };
    };
  };
}>;

@Injectable()
export class ProductService {
  constructor(private readonly prisma: PrismaService) {}

  async listCategories() {
    const categories = await this.prisma.category.findMany({
      where: { status: "ENABLED" },
      include: {
        _count: {
          select: {
            products: {
              where: {
                status: ProductStatus.ON_SALE,
                reviewStatus: ProductReviewStatus.APPROVED
              }
            }
          }
        }
      },
      orderBy: [{ sort: "asc" }, { createdAt: "asc" }]
    });

    return categories.map((category) => ({
      id: category.id,
      name: category.name,
      icon: categoryIconLabel(category.icon, category.name),
      count: category._count.products
    }));
  }

  async listProducts(query?: ProductListQuery | string) {
    const normalizedKeyword =
      typeof query === "string" ? query.trim() : query?.keyword?.trim() || "";
    const coordinates = coordinatesFromQuery(query);
    const radiusKm = radiusFromQuery(query);
    const products = await this.prisma.product.findMany({
      where: {
        status: ProductStatus.ON_SALE,
        reviewStatus: ProductReviewStatus.APPROVED,
        ...(normalizedKeyword
          ? {
              OR: [
                { name: { contains: normalizedKeyword, mode: Prisma.QueryMode.insensitive } },
                {
                  description: {
                    contains: normalizedKeyword,
                    mode: Prisma.QueryMode.insensitive
                  }
                },
                {
                  category: {
                    name: {
                      contains: normalizedKeyword,
                      mode: Prisma.QueryMode.insensitive
                    }
                  }
                },
                {
                  skus: {
                    some: {
                      name: { contains: normalizedKeyword, mode: Prisma.QueryMode.insensitive }
                    }
                  }
                },
                {
                  skus: {
                    some: {
                      storeSkus: {
                        some: {
                          store: {
                            name: {
                              contains: normalizedKeyword,
                              mode: Prisma.QueryMode.insensitive
                            }
                          }
                        }
                      }
                    }
                  }
                }
              ]
            }
          : {})
      },
      include: {
        category: true,
        skus: {
          where: { status: ProductStatus.ON_SALE },
          include: {
            storeSkus: {
              where: {
                stock: { gt: 0 },
                store: { status: StoreStatus.OPEN }
              },
              include: { store: true }
            }
          },
          orderBy: { createdAt: "asc" }
        }
      },
      orderBy: [{ sort: "asc" }, { createdAt: "asc" }]
    });

    const mappedProducts = products.flatMap((product, index) => {
      const sellableSkus = product.skus
        .map((sku) => this.publicSkuView(sku, coordinates, radiusKm))
        .filter((item): item is NonNullable<typeof item> => Boolean(item));
      const firstSkuView = sellableSkus[0];
      if (!firstSkuView) {
        return [];
      }

      const stock = sellableSkus.reduce((sum, item) => sum + item.stock, 0);
      if (stock <= 0) {
        return [];
      }

      const price = money(firstSkuView.sku.salePrice);
      const storeNames = this.sortedStoreNames(sellableSkus.flatMap((item) => item.storeSkus));
      const nearestDistanceKm =
        sellableSkus
          .map((item) => item.nearestDistanceKm)
          .filter((value): value is number => value !== null)
          .sort((left, right) => left - right)[0] ?? null;

      return [
        {
          id: product.id,
          skuId: firstSkuView.sku.id,
          slug: product.slug,
          name: product.name,
          categoryId: product.categoryId,
          categoryName: product.category?.name ?? "",
          price,
          originPrice: Math.round(price * 1.32 * 10) / 10,
          settlePrice: money(firstSkuView.sku.defaultSettlePrice),
          sales: 0,
          stock,
          storeCount: storeNames.length,
          grossMargin: margin(price, money(firstSkuView.sku.defaultSettlePrice)),
          tags: [
            "新人首单",
            coordinates && nearestDistanceKm !== null ? `${nearestDistanceKm}km附近` : "附近门店",
            `${deliveryEtaMinutes(nearestDistanceKm)}分钟达`
          ],
          specs: sellableSkus.map((item) => item.sku.name),
          color: firstSkuView.sku.name.includes("黑") ? "黑色" : "白色",
          description: product.description ?? "",
          coverUrl: assetUrl(firstSkuView.sku.imageUrl) || assetUrl(product.coverUrl),
          detailImageUrls: jsonStringArray(product.detailImageUrls).map(assetUrl).filter(Boolean),
          imageTone: productTone(index),
          storeNames,
          nearestStoreName: firstSkuView.nearestStoreName ?? storeNames[0] ?? "附近门店",
          nearestStoreDistanceKm: nearestDistanceKm,
          deliveryEtaMinutes: deliveryEtaMinutes(nearestDistanceKm),
          matchedByLocation: Boolean(coordinates),
          serviceRadiusKm: coordinates ? radiusKm : undefined,
          skus: sellableSkus.map((item) => ({
            id: item.sku.id,
            code: item.sku.code,
            name: item.sku.name,
            imageUrl: assetUrl(item.sku.imageUrl) || assetUrl(product.coverUrl),
            price: money(item.sku.salePrice),
            settlePrice: money(item.sku.defaultSettlePrice),
            stock: item.stock,
            nearestStoreName: item.nearestStoreName,
            nearestStoreDistanceKm: item.nearestDistanceKm
          }))
        }
      ];
    });

    return coordinates
      ? mappedProducts.sort(
          (left, right) =>
            compareOptionalDistance(left.nearestStoreDistanceKm, right.nearestStoreDistanceKm) ||
            left.name.localeCompare(right.name, "zh-Hans-CN")
        )
      : mappedProducts;
  }

  async getProduct(id: string, query?: ProductListQuery | string) {
    const products = await this.listProducts(query);
    let product = products.find((item) => item.id === id || item.skuId === id || item.slug === id);

    if (!product && coordinatesFromQuery(query)) {
      product = (await this.listProducts()).find(
        (item) => item.id === id || item.skuId === id || item.slug === id
      );
    }

    if (!product) {
      throw new NotFoundException("商品不存在或已下架");
    }

    return product;
  }

  private publicSkuView(sku: PublicSku, coordinates: Coordinates | null, radiusKm: number) {
    const storeSkus = sku.storeSkus
      .map((storeSku) => ({
        ...storeSku,
        distanceKm: storeDistanceKm(coordinates, storeSku.store)
      }))
      .filter(
        (storeSku) =>
          !coordinates || storeSku.distanceKm === null || storeSku.distanceKm <= radiusKm
      )
      .sort(
        (left, right) =>
          compareOptionalDistance(left.distanceKm, right.distanceKm) ||
          left.store.name.localeCompare(right.store.name, "zh-Hans-CN")
      );
    const stock = storeSkus.reduce((sum, item) => sum + item.stock, 0);

    if (stock <= 0) {
      return null;
    }

    return {
      sku,
      storeSkus,
      stock,
      nearestStoreName: storeSkus[0]?.store.name ?? null,
      nearestDistanceKm: storeSkus[0]?.distanceKm ?? null
    };
  }

  private sortedStoreNames(storeSkus: PublicStoreSku[]) {
    const names = new Map<string, number | null>();

    for (const storeSku of storeSkus) {
      const existingDistance = names.get(storeSku.store.name);
      if (
        !names.has(storeSku.store.name) ||
        compareOptionalDistance(storeSku.distanceKm, existingDistance ?? null) < 0
      ) {
        names.set(storeSku.store.name, storeSku.distanceKm);
      }
    }

    return [...names.entries()]
      .sort(
        ([leftName, leftDistance], [rightName, rightDistance]) =>
          compareOptionalDistance(leftDistance, rightDistance) ||
          leftName.localeCompare(rightName, "zh-Hans-CN")
      )
      .map(([name]) => name);
  }

  async listMerchantProducts(storeCode?: string) {
    const store = await this.resolveMerchantStore(storeCode);
    const storeSkus = await this.prisma.storeSku.findMany({
      where: { storeId: store.id },
      include: {
        sku: {
          include: {
            product: {
              include: { category: true }
            }
          }
        }
      },
      orderBy: { updatedAt: "desc" }
    });

    return storeSkus.map((storeSku, index) => this.merchantProductView(storeSku, index));
  }

  async createMerchantProduct(
    storeCode: string | undefined,
    dto: {
      categoryId?: string;
      name: string;
      skuName?: string;
      description?: string;
      salePrice: number;
      settlePrice?: number;
      stock: number;
      imageUrl?: string;
      skus?: MerchantSkuInput[];
      coverUrl?: string;
      detailImageUrls?: string[];
    }
  ) {
    const store = await this.resolveMerchantStore(storeCode);
    const name = dto.name?.trim();
    const salePrice = Number(dto.salePrice);
    const settlePrice = Number(dto.settlePrice ?? dto.salePrice);
    const skuInputs = normalizeSkuInputs(dto);

    if (!name) {
      throw new BadRequestException("商品名称不能为空");
    }
    if (!Number.isFinite(salePrice) || salePrice <= 0) {
      throw new BadRequestException("销售价必须大于 0");
    }
    if (!Number.isFinite(settlePrice) || settlePrice <= 0) {
      throw new BadRequestException("结算价必须大于 0");
    }
    if (settlePrice > salePrice) {
      throw new BadRequestException("结算价不能高于销售价");
    }

    const category = dto.categoryId
      ? await this.prisma.category.findUnique({ where: { id: dto.categoryId } })
      : await this.prisma.category.findFirst({
          where: { status: "ENABLED" },
          orderBy: [{ sort: "asc" }, { createdAt: "asc" }]
        });

    const created = await this.prisma.product.create({
      data: {
        categoryId: category?.id,
        name,
        slug: slugifyName(name),
        description: dto.description?.trim() || "商户新增门店现货商品",
        coverUrl: dto.coverUrl?.trim() || null,
        detailImageUrls: normalizeImageUrls(dto.detailImageUrls),
        reviewStatus: ProductReviewStatus.PENDING,
        reviewRemark: "商户提交商品资料，待后台审核",
        reviewedAt: null,
        skus: {
          create: skuInputs.map((sku, index) => ({
            code: `SKU-MERCHANT-${Date.now()}-${index}-${Math.floor(Math.random() * 90 + 10)}`,
            name: sku.name,
            imageUrl: sku.imageUrl,
            salePrice: decimal(sku.salePrice),
            defaultSettlePrice: decimal(sku.settlePrice),
            stock: sku.stock,
            storeSkus: {
              create: {
                storeId: store.id,
                stock: sku.stock,
                settlePrice: decimal(sku.settlePrice)
              }
            }
          }))
        }
      },
      include: {
        skus: {
          include: { storeSkus: true }
        }
      }
    });

    const storeSkuId = created.skus[0]?.storeSkus[0]?.id;
    if (!storeSkuId) {
      throw new BadRequestException("商品创建失败");
    }

    return this.getMerchantProduct(store.id, storeSkuId);
  }

  async updateMerchantProduct(
    storeCode: string | undefined,
    storeSkuId: string,
    dto: {
      stock?: number;
      settlePrice?: number;
      salePrice?: number;
      skuName?: string;
      imageUrl?: string;
      description?: string;
      coverUrl?: string;
      detailImageUrls?: string[];
      status?: ProductStatus;
    }
  ) {
    const store = await this.resolveMerchantStore(storeCode);
    const existing = await this.prisma.storeSku.findFirst({
      where: { id: storeSkuId, storeId: store.id },
      include: {
        sku: {
          include: { product: true }
        }
      }
    });

    if (!existing) {
      throw new NotFoundException("门店商品不存在");
    }

    const stock = dto.stock === undefined ? undefined : Math.max(0, Number(dto.stock));
    const settlePrice = dto.settlePrice === undefined ? undefined : Number(dto.settlePrice);
    const salePrice = dto.salePrice === undefined ? undefined : Number(dto.salePrice);
    const nextStatus = dto.status === undefined ? undefined : dto.status;

    if (stock !== undefined && !Number.isFinite(stock)) {
      throw new BadRequestException("库存格式不正确");
    }
    if (settlePrice !== undefined && (!Number.isFinite(settlePrice) || settlePrice <= 0)) {
      throw new BadRequestException("结算价必须大于 0");
    }
    if (salePrice !== undefined && (!Number.isFinite(salePrice) || salePrice <= 0)) {
      throw new BadRequestException("销售价必须大于 0");
    }
    if (
      salePrice !== undefined &&
      settlePrice !== undefined &&
      Number.isFinite(salePrice) &&
      Number.isFinite(settlePrice) &&
      settlePrice > salePrice
    ) {
      throw new BadRequestException("结算价不能高于销售价");
    }
    if (
      salePrice !== undefined &&
      settlePrice === undefined &&
      money(existing.settlePrice) > salePrice
    ) {
      throw new BadRequestException("销售价不能低于当前结算价");
    }
    if (
      settlePrice !== undefined &&
      salePrice === undefined &&
      settlePrice > money(existing.sku.salePrice)
    ) {
      throw new BadRequestException("结算价不能高于当前销售价");
    }
    if (
      nextStatus !== undefined &&
      nextStatus !== ProductStatus.ON_SALE &&
      nextStatus !== ProductStatus.OFF_SALE
    ) {
      throw new BadRequestException("商品状态不正确");
    }

    const existingProduct = existing.sku.product;
    const nextDescription =
      dto.description === undefined ? undefined : dto.description.trim() || null;
    const nextCoverUrl = dto.coverUrl === undefined ? undefined : dto.coverUrl.trim() || null;
    const nextDetailImageUrls =
      dto.detailImageUrls === undefined ? undefined : normalizeImageUrls(dto.detailImageUrls);
    const nextSkuImageUrl = dto.imageUrl === undefined ? undefined : dto.imageUrl.trim() || null;
    const contentChanged =
      (salePrice !== undefined && decimal(salePrice) !== decimal(money(existing.sku.salePrice))) ||
      (dto.skuName !== undefined &&
        (dto.skuName.trim() || existing.sku.name) !== existing.sku.name) ||
      (nextSkuImageUrl !== undefined && nextSkuImageUrl !== (existing.sku.imageUrl ?? null)) ||
      (nextDescription !== undefined &&
        nextDescription !== (existingProduct.description ?? null)) ||
      (nextCoverUrl !== undefined && nextCoverUrl !== (existingProduct.coverUrl ?? null)) ||
      (nextDetailImageUrls !== undefined &&
        !arraysEqual(nextDetailImageUrls, jsonStringArray(existingProduct.detailImageUrls)));

    await this.prisma.$transaction(async (tx) => {
      if (stock !== undefined || settlePrice !== undefined) {
        await tx.storeSku.update({
          where: { id: storeSkuId },
          data: {
            ...(stock !== undefined ? { stock } : {}),
            ...(settlePrice !== undefined ? { settlePrice: decimal(settlePrice) } : {})
          }
        });
      }

      if (
        salePrice !== undefined ||
        dto.skuName !== undefined ||
        dto.imageUrl !== undefined ||
        nextStatus !== undefined
      ) {
        await tx.sku.update({
          where: { id: existing.skuId },
          data: {
            ...(salePrice !== undefined ? { salePrice: decimal(salePrice) } : {}),
            ...(dto.skuName !== undefined ? { name: dto.skuName.trim() || existing.sku.name } : {}),
            ...(dto.imageUrl !== undefined ? { imageUrl: nextSkuImageUrl } : {}),
            ...(nextStatus !== undefined ? { status: nextStatus } : {})
          }
        });
      }

      if (
        dto.description !== undefined ||
        dto.coverUrl !== undefined ||
        dto.detailImageUrls !== undefined ||
        nextStatus !== undefined ||
        contentChanged
      ) {
        await tx.product.update({
          where: { id: existing.sku.productId },
          data: {
            ...(dto.description !== undefined ? { description: nextDescription } : {}),
            ...(dto.coverUrl !== undefined ? { coverUrl: nextCoverUrl } : {}),
            ...(dto.detailImageUrls !== undefined ? { detailImageUrls: nextDetailImageUrls } : {}),
            ...(nextStatus !== undefined ? { status: nextStatus } : {}),
            ...(contentChanged
              ? {
                  reviewStatus: ProductReviewStatus.PENDING,
                  reviewRemark: "商品资料已修改，待后台重新审核",
                  reviewedAt: null
                }
              : {})
          }
        });
      }
    });

    return this.getMerchantProduct(store.id, storeSkuId);
  }

  async listAdminProducts() {
    const products = await this.prisma.product.findMany({
      include: {
        category: true,
        skus: {
          include: {
            storeSkus: {
              include: { store: true }
            }
          },
          orderBy: { createdAt: "asc" }
        }
      },
      orderBy: [{ reviewStatus: "asc" }, { updatedAt: "desc" }]
    });

    return products.flatMap((product, productIndex) =>
      product.skus.map((sku, skuIndex) => {
        const stock = sku.storeSkus.reduce((sum, item) => sum + item.stock, 0);
        const firstStoreSku = sku.storeSkus[0];
        const storeNames = Array.from(
          new Set(sku.storeSkus.map((item) => item.store.name).filter(Boolean))
        );
        const salePrice = money(sku.salePrice);
        const settlePrice = money(firstStoreSku?.settlePrice ?? sku.defaultSettlePrice);
        const visibilityIssues = productVisibilityIssues({
          stock,
          productStatus: product.status,
          skuStatus: sku.status,
          reviewStatus: product.reviewStatus
        });

        return {
          id: product.id,
          productId: product.id,
          skuId: sku.id,
          storeSkuId: firstStoreSku?.id ?? "",
          name: product.name,
          categoryId: product.categoryId,
          categoryName: product.category?.name ?? "未分类",
          price: salePrice,
          originPrice: Math.round(salePrice * 1.32 * 10) / 10,
          settlePrice,
          grossMargin: margin(salePrice, settlePrice),
          sales: 0,
          stock,
          tags: ["门店现货", "同城闪送"],
          specs: [sku.name],
          status: sku.status,
          reviewStatus: product.reviewStatus,
          reviewStatusText: reviewStatusText(product.reviewStatus),
          reviewRemark: product.reviewRemark ?? "",
          visibleToUser: visibilityIssues.length === 0,
          visibilityIssues,
          visibilityStatusText: visibilityStatusText(visibilityIssues),
          coverUrl: assetUrl(sku.imageUrl) || assetUrl(product.coverUrl),
          skuImageUrl: assetUrl(sku.imageUrl),
          detailImageUrls: jsonStringArray(product.detailImageUrls).map(assetUrl).filter(Boolean),
          storeNames,
          submittedAt: product.createdAt.toISOString(),
          updatedAt: product.updatedAt.toISOString(),
          reviewedAt: product.reviewedAt?.toISOString() ?? null,
          imageTone: productTone(productIndex + skuIndex)
        };
      })
    );
  }

  async approveProduct(productId: string, dto: { remark?: string }) {
    await this.prisma.product.update({
      where: { id: productId },
      data: {
        reviewStatus: ProductReviewStatus.APPROVED,
        reviewRemark: dto.remark?.trim() || "后台审核通过，用户端可见",
        reviewedAt: new Date()
      }
    });

    return this.listAdminProducts();
  }

  async rejectProduct(productId: string, dto: { remark?: string }) {
    await this.prisma.product.update({
      where: { id: productId },
      data: {
        reviewStatus: ProductReviewStatus.REJECTED,
        reviewRemark: dto.remark?.trim() || "商品资料需完善，请修改后重新提交",
        reviewedAt: new Date()
      }
    });

    return this.listAdminProducts();
  }

  private async getMerchantProduct(storeId: string, storeSkuId: string) {
    const storeSku = await this.prisma.storeSku.findFirst({
      where: { id: storeSkuId, storeId },
      include: {
        sku: {
          include: {
            product: {
              include: { category: true }
            }
          }
        }
      }
    });

    if (!storeSku) {
      throw new NotFoundException("门店商品不存在");
    }

    return this.merchantProductView(storeSku, 0);
  }

  private merchantProductView(
    storeSku: Prisma.StoreSkuGetPayload<{
      include: {
        sku: {
          include: {
            product: {
              include: { category: true };
            };
          };
        };
      };
    }>,
    index: number
  ) {
    const salePrice = money(storeSku.sku.salePrice);
    const settlePrice = money(storeSku.settlePrice);
    const visibilityIssues = productVisibilityIssues({
      stock: storeSku.stock,
      productStatus: storeSku.sku.product.status,
      skuStatus: storeSku.sku.status,
      reviewStatus: storeSku.sku.product.reviewStatus
    });

    return {
      id: storeSku.id,
      storeSkuId: storeSku.id,
      productId: storeSku.sku.productId,
      skuId: storeSku.skuId,
      name: storeSku.sku.product.name,
      skuName: storeSku.sku.name,
      categoryId: storeSku.sku.product.categoryId,
      categoryName: storeSku.sku.product.category?.name ?? "未分类",
      description: storeSku.sku.product.description ?? "",
      coverUrl: assetUrl(storeSku.sku.imageUrl) || assetUrl(storeSku.sku.product.coverUrl),
      skuImageUrl: assetUrl(storeSku.sku.imageUrl),
      detailImageUrls: jsonStringArray(storeSku.sku.product.detailImageUrls)
        .map(assetUrl)
        .filter(Boolean),
      salePrice,
      settlePrice,
      grossMargin: margin(salePrice, settlePrice),
      stock: storeSku.stock,
      status: storeSku.sku.status,
      reviewStatus: storeSku.sku.product.reviewStatus,
      reviewStatusText: reviewStatusText(storeSku.sku.product.reviewStatus),
      reviewRemark: storeSku.sku.product.reviewRemark ?? "",
      visibleToUser: visibilityIssues.length === 0,
      available: visibilityIssues.length === 0,
      visibilityIssues,
      visibilityStatusText: visibilityStatusText(visibilityIssues),
      imageTone: productTone(index)
    };
  }

  private async resolveMerchantStore(storeCode?: string) {
    const requestedCode = (storeCode || "").trim();

    if (!requestedCode) {
      throw new BadRequestException("请先登录已审核通过的商户门店");
    }

    const requestedStore = await this.prisma.store.findUnique({ where: { code: requestedCode } });

    if (requestedStore) {
      if (requestedStore.status !== StoreStatus.OPEN) {
        throw new BadRequestException("门店未通过审核或已暂停，暂不能管理商品");
      }
      return requestedStore;
    }

    throw new BadRequestException("商户门店不存在，请先提交入驻申请并等待审核");
  }
}
