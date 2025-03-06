import { Module } from '@nestjs/common';
import { TasksGlobalController } from './tasks-global.controller';
import { TasksService } from '../tasks/tasks.service';
import { PrismaService } from '../prisma.service';

@Module({
    controllers: [TasksGlobalController],
    providers: [TasksService, PrismaService],
})
export class TasksGlobalModule {}