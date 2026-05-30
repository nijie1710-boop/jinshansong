import { Body, Controller, Get, Headers, Param, Post, Query } from "@nestjs/common";
import { ProductStatus } from "@prisma/client";
import { AuthService } from "../auth/auth.service";
import { ProductService } from "./product.service";

type ProductQueryDto = {
  keyword?: string;
  latitude?: string;
  longitude?: string;
  radiusKm?: string;
};

@Controller()
export class ProductController {
  constructor(
    private readonly productService: ProductService,
    private readonly authService: AuthService
  ) {}

  @Get("categories")
  listCategories() {
    return this.productService.listCategories();
  }

  @Get("products")
  listProducts(@Query() query: ProductQueryDto) {
    return this.productService.listProducts(query);
  }

  @Get("products/:id")
  getProduct(@Param("id") id: string, @Query() query: ProductQueryDto) {
    return this.productService.getProduct(id, query);
  }

  @Get("admin/products")
  async listAdminProducts(@Headers("x-admin-token") adminToken?: string) {
    await this.authService.assertAdmin(adminToken);
    return this.productService.listAdminProducts();
  }

  @Post("admin/products/:productId/approve")
  async approveProduct(
    @Param("productId") productId: string,
    @Body() body: { remark?: string },
    @Headers("x-admin-token") adminToken?: string
  ) {
    await this.authService.assertAdmin(adminToken);
    return this.productService.approveProduct(productId, body);
  }

  @Post("admin/products/:productId/reject")
  async rejectProduct(
    @Param("productId") productId: string,
    @Body() body: { remark?: string },
    @Headers("x-admin-token") adminToken?: string
  ) {
    await this.authService.assertAdmin(adminToken);
    return this.productService.rejectProduct(productId, body);
  }

  @Get("merchant/products")
  async listMerchantProducts(
    @Headers("x-merchant-token") merchantToken?: string,
    @Headers("x-store-code") storeCode?: string
  ) {
    const resolvedStoreCode = await this.authService.resolveMerchantStoreCode(
      merchantToken,
      storeCode
    );
    return this.productService.listMerchantProducts(resolvedStoreCode);
  }

  @Post("merchant/products")
  async createMerchantProduct(
    @Headers("x-merchant-token") merchantToken: string | undefined,
    @Headers("x-store-code") storeCode: string | undefined,
    @Body()
    body: {
      categoryId?: string;
      name: string;
      skuName?: string;
      description?: string;
      salePrice: number;
      settlePrice?: number;
      stock: number;
      imageUrl?: string;
      skus?: {
        skuName?: string;
        salePrice?: number;
        settlePrice?: number;
        stock?: number;
        imageUrl?: string;
      }[];
      coverUrl?: string;
      detailImageUrls?: string[];
    }
  ) {
    const resolvedStoreCode = await this.authService.resolveMerchantStoreCode(
      merchantToken,
      storeCode
    );
    return this.productService.createMerchantProduct(resolvedStoreCode, body);
  }

  @Post("merchant/products/:storeSkuId/update")
  async updateMerchantProduct(
    @Param("storeSkuId") storeSkuId: string,
    @Headers("x-merchant-token") merchantToken: string | undefined,
    @Headers("x-store-code") storeCode: string | undefined,
    @Body()
    body: {
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
    const resolvedStoreCode = await this.authService.resolveMerchantStoreCode(
      merchantToken,
      storeCode
    );
    return this.productService.updateMerchantProduct(resolvedStoreCode, storeSkuId, body);
  }
}
