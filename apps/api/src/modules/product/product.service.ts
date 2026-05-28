import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, ProductReviewStatus, ProductStatus, StoreStatus } from "@prisma/client";
import { PrismaService } from "../../infra/prisma/prisma.service";

function money(value: unknown) {
  return Number(value ?? 0);
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
    .slice(0, 8);
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

  async listProducts(keyword?: string) {
    const normalizedKeyword = keyword?.trim();
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

    return products.flatMap((product, index) => {
      const firstSku = product.skus[0];
      if (!firstSku) {
        return [];
      }

      const stock = firstSku.storeSkus.reduce((sum, item) => sum + item.stock, 0);
      if (stock <= 0) {
        return [];
      }
      const price = money(firstSku.salePrice);
      const storeNames = Array.from(
        new Set(firstSku.storeSkus.map((item) => item.store.name).filter(Boolean))
      );

      return [
        {
          id: product.id,
          skuId: firstSku.id,
          slug: product.slug,
          name: product.name,
          categoryId: product.categoryId,
          categoryName: product.category?.name ?? "",
          price,
          originPrice: Math.round(price * 1.32 * 10) / 10,
          settlePrice: money(firstSku.defaultSettlePrice),
          sales: 0,
          stock,
          tags: ["新人首单", "30-60分钟送达"],
          specs: product.skus.map((sku) => sku.name),
          color: firstSku.name.includes("黑") ? "黑色" : "白色",
          description: product.description ?? "",
          coverUrl: assetUrl(product.coverUrl),
          detailImageUrls: jsonStringArray(product.detailImageUrls).map(assetUrl).filter(Boolean),
          imageTone: productTone(index),
          storeNames,
          nearestStoreName: storeNames[0] ?? "附近门店",
          skus: product.skus.map((sku) => ({
            id: sku.id,
            code: sku.code,
            name: sku.name,
            price: money(sku.salePrice),
            settlePrice: money(sku.defaultSettlePrice),
            stock: sku.storeSkus.reduce((sum, item) => sum + item.stock, 0)
          }))
        }
      ];
    });
  }

  async getProduct(id: string) {
    const products = await this.listProducts();
    const product = products.find(
      (item) => item.id === id || item.skuId === id || item.slug === id
    );

    if (!product) {
      throw new NotFoundException("商品不存在或已下架");
    }

    return product;
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

    return storeSkus.map((storeSku, index) => ({
      id: storeSku.id,
      storeSkuId: storeSku.id,
      productId: storeSku.sku.productId,
      skuId: storeSku.skuId,
      name: storeSku.sku.product.name,
      skuName: storeSku.sku.name,
      categoryId: storeSku.sku.product.categoryId,
      categoryName: storeSku.sku.product.category?.name ?? "未分类",
      description: storeSku.sku.product.description ?? "",
      coverUrl: assetUrl(storeSku.sku.product.coverUrl),
      detailImageUrls: jsonStringArray(storeSku.sku.product.detailImageUrls)
        .map(assetUrl)
        .filter(Boolean),
      salePrice: money(storeSku.sku.salePrice),
      settlePrice: money(storeSku.settlePrice),
      stock: storeSku.stock,
      status: storeSku.sku.status,
      reviewStatus: storeSku.sku.product.reviewStatus,
      reviewStatusText: reviewStatusText(storeSku.sku.product.reviewStatus),
      reviewRemark: storeSku.sku.product.reviewRemark ?? "",
      visibleToUser:
        storeSku.stock > 0 &&
        storeSku.sku.status === ProductStatus.ON_SALE &&
        storeSku.sku.product.status === ProductStatus.ON_SALE &&
        storeSku.sku.product.reviewStatus === ProductReviewStatus.APPROVED,
      available:
        storeSku.stock > 0 &&
        storeSku.sku.status === ProductStatus.ON_SALE &&
        storeSku.sku.product.status === ProductStatus.ON_SALE &&
        storeSku.sku.product.reviewStatus === ProductReviewStatus.APPROVED,
      imageTone: productTone(index)
    }));
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
      coverUrl?: string;
      detailImageUrls?: string[];
    }
  ) {
    const store = await this.resolveMerchantStore(storeCode);
    const name = dto.name?.trim();
    const salePrice = Number(dto.salePrice);
    const settlePrice = Number(dto.settlePrice ?? dto.salePrice);
    const stock = Math.max(0, Number(dto.stock ?? 0));

    if (!name) {
      throw new BadRequestException("商品名称不能为空");
    }
    if (!Number.isFinite(salePrice) || salePrice <= 0) {
      throw new BadRequestException("销售价必须大于 0");
    }
    if (!Number.isFinite(settlePrice) || settlePrice <= 0) {
      throw new BadRequestException("结算价必须大于 0");
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
        description: dto.description?.trim() || "商家新增门店现货商品",
        coverUrl: dto.coverUrl?.trim() || null,
        detailImageUrls: normalizeImageUrls(dto.detailImageUrls),
        reviewStatus: ProductReviewStatus.PENDING,
        reviewRemark: "商家提交商品资料，待后台审核",
        reviewedAt: null,
        skus: {
          create: {
            code: `SKU-MERCHANT-${Date.now()}-${Math.floor(Math.random() * 90 + 10)}`,
            name: dto.skuName?.trim() || "默认规格",
            salePrice: decimal(salePrice),
            defaultSettlePrice: decimal(settlePrice),
            stock,
            storeSkus: {
              create: {
                storeId: store.id,
                stock,
                settlePrice: decimal(settlePrice)
              }
            }
          }
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
    const contentChanged =
      (salePrice !== undefined && decimal(salePrice) !== decimal(money(existing.sku.salePrice))) ||
      (dto.skuName !== undefined &&
        (dto.skuName.trim() || existing.sku.name) !== existing.sku.name) ||
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

      if (salePrice !== undefined || dto.skuName !== undefined || nextStatus !== undefined) {
        await tx.sku.update({
          where: { id: existing.skuId },
          data: {
            ...(salePrice !== undefined ? { salePrice: decimal(salePrice) } : {}),
            ...(dto.skuName !== undefined ? { name: dto.skuName.trim() || existing.sku.name } : {}),
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

        return {
          id: product.id,
          productId: product.id,
          skuId: sku.id,
          storeSkuId: firstStoreSku?.id ?? "",
          name: product.name,
          categoryId: product.categoryId,
          categoryName: product.category?.name ?? "未分类",
          price: money(sku.salePrice),
          originPrice: Math.round(money(sku.salePrice) * 1.32 * 10) / 10,
          settlePrice: money(firstStoreSku?.settlePrice ?? sku.defaultSettlePrice),
          sales: 0,
          stock,
          tags: ["门店现货", "同城闪送"],
          specs: [sku.name],
          status: sku.status,
          reviewStatus: product.reviewStatus,
          reviewStatusText: reviewStatusText(product.reviewStatus),
          reviewRemark: product.reviewRemark ?? "",
          visibleToUser:
            stock > 0 &&
            product.status === ProductStatus.ON_SALE &&
            sku.status === ProductStatus.ON_SALE &&
            product.reviewStatus === ProductReviewStatus.APPROVED,
          coverUrl: assetUrl(product.coverUrl),
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
      coverUrl: assetUrl(storeSku.sku.product.coverUrl),
      detailImageUrls: jsonStringArray(storeSku.sku.product.detailImageUrls)
        .map(assetUrl)
        .filter(Boolean),
      salePrice: money(storeSku.sku.salePrice),
      settlePrice: money(storeSku.settlePrice),
      stock: storeSku.stock,
      status: storeSku.sku.status,
      reviewStatus: storeSku.sku.product.reviewStatus,
      reviewStatusText: reviewStatusText(storeSku.sku.product.reviewStatus),
      reviewRemark: storeSku.sku.product.reviewRemark ?? "",
      visibleToUser:
        storeSku.stock > 0 &&
        storeSku.sku.status === ProductStatus.ON_SALE &&
        storeSku.sku.product.status === ProductStatus.ON_SALE &&
        storeSku.sku.product.reviewStatus === ProductReviewStatus.APPROVED,
      available:
        storeSku.stock > 0 &&
        storeSku.sku.status === ProductStatus.ON_SALE &&
        storeSku.sku.product.status === ProductStatus.ON_SALE &&
        storeSku.sku.product.reviewStatus === ProductReviewStatus.APPROVED,
      imageTone: productTone(0)
    };
  }

  private async resolveMerchantStore(storeCode?: string) {
    const requestedCode = (storeCode || "").trim();

    if (!requestedCode) {
      throw new BadRequestException("请先登录已审核通过的商家门店");
    }

    const requestedStore = await this.prisma.store.findUnique({ where: { code: requestedCode } });

    if (requestedStore) {
      if (requestedStore.status !== StoreStatus.OPEN) {
        throw new BadRequestException("门店未通过审核或已暂停，暂不能管理商品");
      }
      return requestedStore;
    }

    throw new BadRequestException("商家门店不存在，请先提交入驻申请并等待审核");
  }
}
