import { Injectable, UnauthorizedException } from "@nestjs/common";
import { verifySessionToken } from "../../infra/auth/session-token";
import { PrismaService } from "../../infra/prisma/prisma.service";

const DEMO_USER_PHONE = "13800000000";

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureDemoUser() {
    return this.prisma.user.upsert({
      where: { phone: DEMO_USER_PHONE },
      update: {},
      create: {
        phone: DEMO_USER_PHONE,
        nickname: "金泽快送用户"
      }
    });
  }

  async resolveUser(userToken?: string) {
    if (!userToken) {
      return this.ensureDemoUser();
    }

    const userId = userToken.startsWith("demo-user:")
      ? userToken.replace("demo-user:", "")
      : userToken.startsWith("wechat-user:")
        ? userToken.replace("wechat-user:", "")
        : verifySessionToken(userToken, "user").sub;
    if (!userId) {
      throw new UnauthorizedException("用户登录状态无效");
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException("用户不存在或登录已过期");
    }

    return user;
  }
}
