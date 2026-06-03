import { Body, Controller, Get, Headers, Param, Post, Req } from "@nestjs/common";
import { OrderService } from "../order/order.service";
import { PaymentService } from "./payment.service";

type RawBodyRequest = { rawBody?: Buffer };

@Controller("payments")
export class PaymentController {
  constructor(
    private readonly orderService: OrderService,
    private readonly paymentService: PaymentService
  ) {}

  @Get("runtime")
  runtime() {
    return this.paymentService.runtimeStatus();
  }

  @Post(":orderId/mock-pay")
  mockPay(@Param("orderId") orderId: string, @Headers("x-user-token") userToken?: string) {
    return this.orderService.mockPay(orderId, userToken);
  }

  @Post(":orderId/wechat-jsapi")
  wechatJsapi(@Param("orderId") orderId: string, @Headers("x-user-token") userToken?: string) {
    return this.paymentService.createWechatJsapiPayment(orderId, userToken);
  }

  @Post("wechat/notify")
  wechatNotify(
    @Body() body: unknown,
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Req() request: RawBodyRequest
  ) {
    return this.paymentService.handleWechatNotify(body, headers, request.rawBody);
  }
}
