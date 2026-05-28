import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, Put } from "@nestjs/common";
import { AddressService } from "./address.service";

@Controller("addresses")
export class AddressController {
  constructor(private readonly addressService: AddressService) {}

  @Get()
  listAddresses(@Headers("x-user-token") userToken?: string) {
    return this.addressService.listAddresses(userToken);
  }

  @Get(":id")
  getAddress(@Param("id") id: string, @Headers("x-user-token") userToken?: string) {
    return this.addressService.getAddress(userToken, id);
  }

  @Post()
  createAddress(
    @Headers("x-user-token") userToken: string | undefined,
    @Body()
    body: {
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
    return this.addressService.createAddress(userToken, body);
  }

  @Patch(":id")
  updateAddress(
    @Param("id") id: string,
    @Headers("x-user-token") userToken: string | undefined,
    @Body()
    body: {
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
    return this.addressService.updateAddress(userToken, id, body);
  }

  @Put(":id")
  updateAddressByPut(
    @Param("id") id: string,
    @Headers("x-user-token") userToken: string | undefined,
    @Body()
    body: {
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
    return this.addressService.updateAddress(userToken, id, body);
  }

  @Post(":id/update")
  updateAddressByPost(
    @Param("id") id: string,
    @Headers("x-user-token") userToken: string | undefined,
    @Body()
    body: {
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
    return this.addressService.updateAddress(userToken, id, body);
  }

  @Post(":id/default")
  setDefaultAddress(@Param("id") id: string, @Headers("x-user-token") userToken?: string) {
    return this.addressService.setDefaultAddress(userToken, id);
  }

  @Delete(":id")
  deleteAddress(@Param("id") id: string, @Headers("x-user-token") userToken?: string) {
    return this.addressService.deleteAddress(userToken, id);
  }
}
