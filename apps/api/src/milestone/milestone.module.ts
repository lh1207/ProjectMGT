import { Module } from "@nestjs/common";
import { MilestoneController } from "./milestone.controller";
import { MilestoneListener } from "./milestone.listener";
import { MilestoneService } from "./milestone.service";

@Module({
  controllers: [MilestoneController],
  providers: [MilestoneService, MilestoneListener],
  exports: [MilestoneService],
})
export class MilestoneModule {}
