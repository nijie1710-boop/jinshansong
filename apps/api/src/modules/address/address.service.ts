import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../infra/prisma/prisma.service";
import { UserService } from "../user/user.service";

@Injectable()
export class AddressService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userService: UserService
  ) {}

  async listAddresses(userToken?: string) {
    const user = await this.userService.resolveUser(userToken);
    const addresses = await this.prisma.address.findMany({
      where: { userId: user.id },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }]
    });

    if (addresses.length > 0) {
      return addresses;
    }

    const address = await this.prisma.address.create({
      data: {
        userId: user.id,
        name: "张先生",
        phone: "13888888888",
        city: "福州市",
        district: "台江区",
        detail: "工业路193号宝龙广场1号楼1503室",
        latitude: "26.060888",
        longitude: "119.303888",
        isDefault: true
      }
    });

    return [address];
  }

  async getAddress(userToken: string | undefined, id: string) {
    const user = await this.userService.resolveUser(userToken);
    const address = await this.prisma.address.findFirst({ where: { id, userId: user.id } });

    if (!address) {
      throw new NotFoundException("收货地址不存在");
    }

    return address;
  }

  async createAddress(
    userToken: string | undefined,
    dto: {
      name: string;
      phone: string;
      city: string;
      district: string;
      detail: string;
      latitude?: string;
      longitude?: string;
      isDefault?: boolean;
    }
  ) {
    const user = await this.userService.resolveUser(userToken);
    this.assertAddressPayload(dto);
    const addressCount = await this.prisma.address.count({ where: { userId: user.id } });
    const shouldBeDefault = dto.isDefault ?? addressCount === 0;

    if (shouldBeDefault) {
      await this.prisma.address.updateMany({
        where: { userId: user.id },
        data: { isDefault: false }
      });
    }

    return this.prisma.address.create({
      data: {
        userId: user.id,
        name: dto.name,
        phone: dto.phone,
        city: dto.city,
        district: dto.district,
        detail: dto.detail,
        latitude: dto.latitude,
        longitude: dto.longitude,
        isDefault: shouldBeDefault
      }
    });
  }

  async updateAddress(
    userToken: string | undefined,
    id: string,
    dto: {
      name?: string;
      phone?: string;
      city?: string;
      district?: string;
      detail?: string;
      latitude?: string;
      longitude?: string;
      isDefault?: boolean;
    }
  ) {
    const user = await this.userService.resolveUser(userToken);
    const existing = await this.prisma.address.findFirst({ where: { id, userId: user.id } });

    if (!existing) {
      throw new NotFoundException("收货地址不存在");
    }

    const data: Prisma.AddressUncheckedUpdateInput = {};
    if (dto.name !== undefined) {
      data.name = dto.name.trim();
    }
    if (dto.phone !== undefined) {
      data.phone = dto.phone.trim();
    }
    if (dto.city !== undefined) {
      data.city = dto.city.trim();
    }
    if (dto.district !== undefined) {
      data.district = dto.district.trim();
    }
    if (dto.detail !== undefined) {
      data.detail = dto.detail.trim();
    }
    if (dto.latitude !== undefined) {
      data.latitude = dto.latitude.trim() || null;
    }
    if (dto.longitude !== undefined) {
      data.longitude = dto.longitude.trim() || null;
    }

    if (dto.isDefault !== undefined) {
      data.isDefault = dto.isDefault;
    }

    if (dto.isDefault) {
      await this.prisma.address.updateMany({
        where: { userId: user.id },
        data: { isDefault: false }
      });
    }

    const merged = {
      name: String(data.name ?? existing.name),
      phone: String(data.phone ?? existing.phone),
      city: String(data.city ?? existing.city),
      district: String(data.district ?? existing.district),
      detail: String(data.detail ?? existing.detail)
    };
    this.assertAddressPayload(merged);

    return this.prisma.address.update({
      where: { id },
      data
    });
  }

  async setDefaultAddress(userToken: string | undefined, id: string) {
    const user = await this.userService.resolveUser(userToken);
    const existing = await this.prisma.address.findFirst({ where: { id, userId: user.id } });

    if (!existing) {
      throw new NotFoundException("收货地址不存在");
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.address.updateMany({
        where: { userId: user.id },
        data: { isDefault: false }
      });

      return tx.address.update({
        where: { id },
        data: { isDefault: true }
      });
    });
  }

  async deleteAddress(userToken: string | undefined, id: string) {
    const user = await this.userService.resolveUser(userToken);
    const existing = await this.prisma.address.findFirst({ where: { id, userId: user.id } });

    if (!existing) {
      throw new NotFoundException("收货地址不存在");
    }

    await this.prisma.address.delete({ where: { id } });
    const nextDefault = await this.prisma.address.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" }
    });

    if (existing.isDefault && nextDefault) {
      await this.prisma.address.update({
        where: { id: nextDefault.id },
        data: { isDefault: true }
      });
    }

    return { success: true };
  }

  private assertAddressPayload(dto: {
    name?: string;
    phone?: string;
    city?: string;
    district?: string;
    detail?: string;
  }) {
    if (
      !dto.name?.trim() ||
      !dto.phone?.trim() ||
      !dto.city?.trim() ||
      !dto.district?.trim() ||
      !dto.detail?.trim()
    ) {
      throw new BadRequestException("联系人、手机号、城市、区域和详细地址不能为空");
    }

    if (!/^1\d{10}$/.test(dto.phone.trim())) {
      throw new BadRequestException("手机号格式不正确");
    }
  }
}
