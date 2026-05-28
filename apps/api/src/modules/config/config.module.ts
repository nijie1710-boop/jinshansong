import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { ConfigController, PublicConfigController } from "./config.controller";
import { ConfigService } from "./config.service";

@Module({
  imports: [AuthModule],
  controllers: [ConfigController, PublicConfigController],
  providers: [ConfigService],
  exports: [ConfigService]
})
export class ConfigModule {}
