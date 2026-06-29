import { Module } from "@nestjs/common";
import { ProjectsModule } from "../projects/projects.module";
import { IssuesController } from "./issues.controller";
import { IssuesService } from "./issues.service";
import { ScrumListener } from "./scrum.listener";
import { SprintsController } from "./sprints.controller";
import { SprintsService } from "./sprints.service";
import { AutoAssignListener } from "./auto-assign.listener";
import { AutoAssignService } from "./auto-assign.service";

@Module({
  imports: [ProjectsModule],
  controllers: [IssuesController, SprintsController],
  providers: [IssuesService, SprintsService, ScrumListener, AutoAssignService, AutoAssignListener],
  exports: [IssuesService, SprintsService],
})
export class ScrumModule {}
