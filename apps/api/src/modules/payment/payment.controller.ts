import { Body, Controller, Get, Headers, Param, Post } from "@nestjs/common";
import { OrderService } from "../order/order.service";
import { PaymentService } from "./payment.service";

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

  @Post("wechat/notify")
  wechatNotify(
    @Body() body: unknown,
    @Headers() headers: Record<string, string | string[] | undefined>
  ) {
    return this.paymentService.handleWechatNotify(body, headers);
  }
}
