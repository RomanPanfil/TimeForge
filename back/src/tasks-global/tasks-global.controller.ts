import { Controller, Get, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { GetUser } from '../auth/get-user.decorator';
import { TasksService } from '../tasks/tasks.service';

@Controller('tasks')
@UseGuards(AuthGuard('jwt'))
export class TasksGlobalController {
    constructor(private tasksService: TasksService) {}

    @Get('/my-tasks')
    getAssignedTasks(
        @GetUser() user: any,
        @Query('page', ParseIntPipe) page: number = 1,
        @Query('limit', ParseIntPipe) limit: number = 10,
        @Query('filter') filter?: string,
    ) {
        return this.tasksService.getAssignedTasks(user.userId, page, limit, filter);
    }
}