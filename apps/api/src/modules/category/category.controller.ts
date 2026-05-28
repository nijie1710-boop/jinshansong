import { Body, Controller, Get, Headers, Param, Patch, Post } from "@nestjs/common";
import { CategoryStatus } from "@prisma/client";
import { AuthService } from "../auth/auth.service";
import { CategoryService } from "./category.service";

@Controller("admin/categories")
export class CategoryController {
  constructor(
    private readonly categoryService: CategoryService,
    private readonly authService: AuthService
  ) {}

  @Get()
  async listAdminCategories(@Headers("x-admin-token") adminToken?: string) {
    await this.authService.assertAdmin(adminToken);
    return this.categoryService.listAdminCategories();
  }

  @Post()
  async createCategory(
    @Body() body: { name?: string; icon?: string; sort?: number; status?: CategoryStatus },
    @Headers("x-admin-token") adminToken?: string
  ) {
    await this.authService.assertAdmin(adminToken);
    return this.categoryService.createCategory(body);
  }

  @Patch(":id")
  async updateCategory(
    @Param("id") id: string,
    @Body() body: { name?: string; icon?: string; sort?: number; status?: CategoryStatus },
    @Headers("x-admin-token") adminToken?: string
  ) {
    await this.authService.assertAdmin(adminToken);
    return this.categoryService.updateCategory(id, body);
  }
}
