import { Module } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { PrismaService } from '../prisma.service';
import { JwtService } from '@nestjs/jwt';

@Module({
  controllers: [ProjectsController],
  providers: [ProjectsService, PrismaService, JwtService],
})
export class ProjectsModule {}