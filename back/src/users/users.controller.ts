import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { GetUser } from '../auth/get-user.decorator';
import { TasksService } from '../tasks/tasks.service';

@Controller('users')
@UseGuards(AuthGuard('jwt'))
export class UsersController {
    constructor(private tasksService: TasksService) {}

    @Get()
    getAllUsers(@GetUser() user: any) {
        return this.tasksService.getUsers();
    }
    // getAllUsers(@GetUser() user: any) {
    //     return this.tasksService.getUsers(user.id); // Передаём user.id
    // }
}