import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { TasksService } from '../tasks/tasks.service';
import { PrismaService } from '../prisma.service';

@Module({
    controllers: [UsersController],
    providers: [TasksService, PrismaService],
})
export class UsersModule {}