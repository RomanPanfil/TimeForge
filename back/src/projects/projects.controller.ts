import { Controller, Post, Body, Get, Param, Patch, Delete, UseGuards, ParseIntPipe, Query } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { AuthGuard } from '@nestjs/passport';
import { GetUser } from '../auth/get-user.decorator';

@Controller('projects')
@UseGuards(AuthGuard('jwt'))
export class ProjectsController {
    constructor(private projectsService: ProjectsService) {}

    @Post()
    createProject(
        @GetUser() user: any,
        @Body() body: { name: string; description?: string; deadline?: string },
    ) {
        return this.projectsService.createProject(user.userId, body.name, body.description, body.deadline);
    }

    @Get()
    getProjects(
        @GetUser() user: any,
        @Query('page', ParseIntPipe) page: number = 1,
        @Query('limit', ParseIntPipe) limit: number = 10,
        @Query('filter') filter?: string,
    ) {
        return this.projectsService.getProjects(user.userId, page, limit, filter);
    }

    @Get(':id')
    getProject(
        @GetUser() user: any,
        @Param('id', ParseIntPipe) id: number,
        @Query('taskPage', ParseIntPipe) taskPage: number = 1,
        @Query('taskLimit', ParseIntPipe) taskLimit: number = 5,
        @Query('taskFilter') taskFilter?: string,
        @Query('allTasks') allTasks?: string, // Новый параметр как строка, преобразуем ниже
    ) {
        const allTasksBool = allTasks === 'true'; // Преобразуем строку 'true' в boolean
        return this.projectsService.getProject(user.userId, id, taskPage, taskLimit, taskFilter, allTasksBool);
    }

    @Patch(':id')
    updateProject(
        @GetUser() user: any,
        @Param('id', ParseIntPipe) id: number,
        @Body() body: { name?: string; description?: string; deadline?: string },
    ) {
        return this.projectsService.updateProject(user.userId, id, body.name, body.description, body.deadline);
    }

    @Delete(':id')
    deleteProject(@GetUser() user: any, @Param('id', ParseIntPipe) id: number) {
        return this.projectsService.deleteProject(user.userId, id);
    }
}