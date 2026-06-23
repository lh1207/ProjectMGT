import { Module } from "@nestjs/common";
import { ProjectsModule } from "../projects/projects.module";
import { IssuesController } from "./issues.controller";
import { IssuesService } from "./issues.service";
import { ScrumListener } from "./scrum.listener";
import { SprintsController } from "./sprints.controller";
import { SprintsService } from "./sprints.service";

@Module({
  imports: [ProjectsModule],
  controllers: [IssuesController, SprintsController],
  providers: [IssuesService, SprintsService, ScrumListener],
  exports: [IssuesService, SprintsService],
})
export class ScrumModule {}
