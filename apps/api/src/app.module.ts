import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { AuthModule } from "./auth/auth.module";
import { CommonModule } from "./common/common.module";
import { MilestoneModule } from "./milestone/milestone.module";
import { PrismaModule } from "./prisma/prisma.module";
import { ProjectsModule } from "./projects/projects.module";
import { RealtimeModule } from "./realtime/realtime.module";
import { RepoModule } from "./repo/repo.module";
import { ScrumModule } from "./scrum/scrum.module";
import { UsersModule } from "./users/users.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot(),
    PrismaModule,
    CommonModule,
    AuthModule,
    UsersModule,
    ProjectsModule,
    ScrumModule,
    RepoModule,
    MilestoneModule,
    RealtimeModule,
  ],
})
export class AppModule {}
