import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { CategoryStatus, ProductReviewStatus, ProductStatus } from "@prisma/client";
import { PrismaService } from "../../infra/prisma/prisma.service";

function statusText(status: CategoryStatus) {
  return status === CategoryStatus.ENABLED ? "启用" : "停用";
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

@Injectable()
export class CategoryService {
  constructor(private readonly prisma: PrismaService) {}

  async listAdminCategories() {
    const categories = await this.prisma.category.findMany({
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
      iconRaw: category.icon ?? "",
      sort: category.sort,
      status: category.status,
      statusText: statusText(category.status),
      count: category._count.products,
      createdAt: category.createdAt.toISOString(),
      updatedAt: category.updatedAt.toISOString()
    }));
  }

  async createCategory(dto: {
    name?: string;
    icon?: string;
    sort?: number;
    status?: CategoryStatus;
  }) {
    const name = dto.name?.trim();
    if (!name) {
      throw new BadRequestException("分类名称不能为空");
    }

    await this.prisma.category.create({
      data: {
        name,
        icon: dto.icon?.trim() || null,
        sort: Number.isFinite(Number(dto.sort)) ? Number(dto.sort) : 0,
        status: this.normalizeStatus(dto.status)
      }
    });

    return this.listAdminCategories();
  }

  async updateCategory(
    id: string,
    dto: { name?: string; icon?: string; sort?: number; status?: CategoryStatus }
  ) {
    const existing = await this.prisma.category.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException("分类不存在");
    }

    await this.prisma.category.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() || existing.name } : {}),
        ...(dto.icon !== undefined ? { icon: dto.icon.trim() || null } : {}),
        ...(dto.sort !== undefined && Number.isFinite(Number(dto.sort))
          ? { sort: Number(dto.sort) }
          : {}),
        ...(dto.status !== undefined ? { status: this.normalizeStatus(dto.status) } : {})
      }
    });

    return this.listAdminCategories();
  }

  private normalizeStatus(status?: CategoryStatus) {
    return status === CategoryStatus.DISABLED ? CategoryStatus.DISABLED : CategoryStatus.ENABLED;
  }
}
