import { Controller, Headers, Param, Post } from "@nestjs/common";
import { OrderService } from "../order/order.service";

@Controller("payments")
export class PaymentController {
  constructor(private readonly orderService: OrderService) {}

  @Post(":orderId/mock-pay")
  mockPay(@Param("orderId") orderId: string, @Headers("x-user-token") userToken?: string) {
    return this.orderService.mockPay(orderId, userToken);
  }
}
