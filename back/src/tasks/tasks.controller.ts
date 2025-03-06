import { Controller, Post, Body, Get, Param, Patch, Delete, UseGuards, ParseIntPipe, Query, UseInterceptors, UploadedFile } from '@nestjs/common';
import { TasksService, multerOptions } from './tasks.service';
import { AuthGuard } from '@nestjs/passport';
import { GetUser } from '../auth/get-user.decorator';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('projects/:projectId/tasks')
@UseGuards(AuthGuard('jwt'))
export class TasksController {
    constructor(private tasksService: TasksService) {}

    @Post()
    createTask(
        @GetUser() user: any,
        @Param('projectId', ParseIntPipe) projectId: number,
        @Body() body: { name: string; description?: string; statusId?: number; assigneeId?: number },
    ) {
        return this.tasksService.createTask(user.userId, projectId, body.name, body.description, body.statusId, body.assigneeId);
    }

    @Get()
    getTasks(
        @GetUser() user: any,
        @Param('projectId', ParseIntPipe) projectId: number,
        @Query('page', ParseIntPipe) page: number = 1,
        @Query('limit', ParseIntPipe) limit: number = 10,
        @Query('filter') filter?: string,
    ) {
        return this.tasksService.getTasks(user.userId, projectId, page, limit, filter);
    }

    @Get(':id')
    getTask(
        @GetUser() user: any,
        @Param('projectId', ParseIntPipe) projectId: number,
        @Param('id', ParseIntPipe) id: number,
    ) {
        return this.tasksService.getTask(user.userId, id);
    }

    @Patch(':id')
    updateTask(
        @GetUser() user: any,
        @Param('projectId', ParseIntPipe) projectId: number,
        @Param('id', ParseIntPipe) id: number,
        @Body() body: { name?: string; description?: string; statusId?: number; assigneeId?: number },
    ) {
        return this.tasksService.updateTask(user.userId, id, body.name, body.description, body.statusId, body.assigneeId);
    }

    @Delete(':id')
    deleteTask(
        @GetUser() user: any,
        @Param('projectId', ParseIntPipe) projectId: number,
        @Param('id', ParseIntPipe) id: number,
    ) {
        return this.tasksService.deleteTask(user.userId, id);
    }

    @Post(':id/comments')
    @UseInterceptors(FileInterceptor('file', multerOptions))
    createComment(
        @GetUser() user: any,
        @Param('projectId', ParseIntPipe) projectId: number,
        @Param('id', ParseIntPipe) id: number,
        @Body() body: { content: string },
        @UploadedFile() file?: Express.Multer.File,
    ) {
        return this.tasksService.createComment(user.userId, id, body.content, file);
    }

    @Patch(':id/comments/:commentId')
    @UseInterceptors(FileInterceptor('file', multerOptions))
    updateComment(
        @GetUser() user: any,
        @Param('projectId', ParseIntPipe) projectId: number,
        @Param('id', ParseIntPipe) id: number,
        @Param('commentId', ParseIntPipe) commentId: number,
        @Body() body: { content: string },
        @UploadedFile() file?: Express.Multer.File,
    ) {
        return this.tasksService.updateComment(user.userId, commentId, body.content, file);
    }

    @Delete(':id/comments/:commentId')
    deleteComment(
        @GetUser() user: any,
        @Param('projectId', ParseIntPipe) projectId: number,
        @Param('id', ParseIntPipe) id: number,
        @Param('commentId', ParseIntPipe) commentId: number,
    ) {
        return this.tasksService.deleteComment(user.userId, commentId);
    }

    @Post(':id/images')
    @UseInterceptors(FileInterceptor('image', multerOptions))
    uploadImage(
        @GetUser() user: any,
        @Param('projectId', ParseIntPipe) projectId: number,
        @Param('id', ParseIntPipe) id: number,
        @UploadedFile() image: Express.Multer.File,
    ) {
        return this.tasksService.uploadImage(user.userId, id, image);
    }

    @Post(':id/files')
    @UseInterceptors(FileInterceptor('file', multerOptions))
    uploadFile(
        @GetUser() user: any,
        @Param('projectId', ParseIntPipe) projectId: number,
        @Param('id', ParseIntPipe) id: number,
        @UploadedFile() file: Express.Multer.File,
    ) {
        return this.tasksService.uploadFile(user.userId, id, file);
    }

    @Delete(':id/images')
    deleteImage(
        @GetUser() user: any,
        @Param('projectId', ParseIntPipe) projectId: number,
        @Param('id', ParseIntPipe) id: number,
        @Body() body: { filePath: string },
    ) {
        return this.tasksService.deleteImage(user.userId, id, body.filePath);
    }

    @Post(':id/time/start')
    startTimeTracking(
        @GetUser() user: any,
        @Param('projectId', ParseIntPipe) projectId: number,
        @Param('id', ParseIntPipe) id: number,
    ) {
        return this.tasksService.startTimeTracking(user.userId, id);
    }

    @Post(':id/time/stop')
    stopTimeTracking(
        @GetUser() user: any,
        @Param('projectId', ParseIntPipe) projectId: number,
        @Param('id', ParseIntPipe) id: number,
    ) {
        return this.tasksService.stopTimeTracking(user.userId, id);
    }

    @Patch(':id/time/:timeEntryId')
    updateTimeEntry(
        @GetUser() user: any,
        @Param('projectId', ParseIntPipe) projectId: number,
        @Param('id', ParseIntPipe) id: number,
        @Param('timeEntryId', ParseIntPipe) timeEntryId: number,
        @Body() body: { startTime: string; endTime?: string },
    ) {
        return this.tasksService.updateTimeEntry(user.userId, id, timeEntryId, body.startTime, body.endTime);
    }

    @Post('/statuses')
    createTaskStatus(
        @GetUser() user: any,
        @Param('projectId', ParseIntPipe) projectId: number,
        @Body() body: { name: string },
    ) {
        return this.tasksService.createTaskStatus(user.userId, projectId, body.name);
    }

    @Get('/statuses')
    getTaskStatuses(
        @GetUser() user: any,
        @Param('projectId', ParseIntPipe) projectId: number,
    ) {
        return this.tasksService.getTaskStatuses(user.userId, projectId);
    }

    @Patch('/statuses/:statusId')
    updateTaskStatus(
        @GetUser() user: any,
        @Param('projectId', ParseIntPipe) projectId: number,
        @Param('statusId', ParseIntPipe) statusId: number,
        @Body() body: { name: string },
    ) {
        return this.tasksService.updateTaskStatus(user.userId, projectId, statusId, body.name);
    }

    @Delete('/statuses/:statusId')
    deleteTaskStatus(
        @GetUser() user: any,
        @Param('projectId', ParseIntPipe) projectId: number,
        @Param('statusId', ParseIntPipe) statusId: number,
    ) {
        return this.tasksService.deleteTaskStatus(user.userId, projectId, statusId);
    }
}