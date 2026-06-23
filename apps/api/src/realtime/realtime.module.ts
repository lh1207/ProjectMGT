import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { CommonModule } from "../common/common.module";
import { RealtimeGateway } from "./realtime.gateway";

@Module({
  imports: [AuthModule, CommonModule],
  providers: [RealtimeGateway],
})
export class RealtimeModule {}
