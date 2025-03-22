import { Injectable, UnauthorizedException, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Prisma } from '@prisma/client';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { unlink } from 'fs/promises';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class TasksService {
    constructor(
        private prisma: PrismaService,
        private mailerService: MailerService,
    ) {}

    async createTask(userId: number, projectId: number, name: string, description?: string, statusId?: number, assigneeId?: number) {
        const project = await this.prisma.project.findUnique({ where: { id: projectId } });
        if (!project || project.ownerId !== userId) {
            throw new UnauthorizedException('Проект не найден или доступ запрещён');
        }
        if (assigneeId) {
            const assignee = await this.prisma.user.findUnique({ where: { id: assigneeId } });
            if (!assignee) throw new UnauthorizedException('Исполнитель не найден');
        }
        if (statusId) {
            const status = await this.prisma.taskStatus.findUnique({ where: { id: statusId } });
            if (!status || status.projectId !== projectId) throw new UnauthorizedException('Статус не найден или не принадлежит проекту');
        } else {
            const defaultStatus = await this.prisma.taskStatus.findFirst({ where: { name: 'К выполнению', projectId } });
            if (!defaultStatus) throw new UnauthorizedException('Статус по умолчанию не найден');
            statusId = defaultStatus.id;
        }

        const task = await this.prisma.task.create({
            data: {
                name,
                description,
                statusId,
                projectId,
                assigneeId,
            },
        });

        if (assigneeId) {
            await this.sendAssignmentEmail(task.id, projectId, assigneeId, name, description || '');
        }

        return task;
    }

    async getTasks(userId: number, projectId: number, page: number = 1, limit: number = 10, filter?: string) {
        const project = await this.prisma.project.findUnique({ where: { id: projectId } });
        if (!project || project.ownerId !== userId) {
            throw new UnauthorizedException('Проект не найден или доступ запрещён');
        }

        const skip = (page - 1) * limit;
        const where: Prisma.TaskWhereInput = {
            projectId,
            ...(filter && { name: { contains: filter, mode: 'insensitive' as const } }),
        };

        const [tasks, total] = await Promise.all([
            this.prisma.task.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: { assignee: { select: { id: true, email: true, name: true } }, status: true },
            }),
            this.prisma.task.count({ where }),
        ]);

        return {
            data: tasks,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async getTask(userId: number, taskId: number) {
        const task = await this.prisma.task.findUnique({
            where: { id: taskId },
            include: {
                project: true,
                assignee: { select: { id: true, email: true, name: true } },
                status: true,
                comments: {
                    include: {
                        user: { select: { id: true, email: true, name: true } },
                    },
                    orderBy: { createdAt: 'asc' },
                },
                timeEntries: {
                    include: {
                        user: { select: { id: true, email: true, name: true } },
                    },
                },
            },
        });
        if (!task || task.project.ownerId !== userId) {
            throw new UnauthorizedException('Задача не найдена или доступ запрещён');
        }
        return task;
    }

    async updateTask(userId: number, taskId: number, name?: string, description?: string, statusId?: number, assigneeId?: number) {
        const task = await this.prisma.task.findUnique({
            where: { id: taskId },
            include: { project: true },
        });
        if (!task || task.project.ownerId !== userId) {
            throw new UnauthorizedException('Задача не найдена или доступ запрещён');
        }
        if (assigneeId) {
            const assignee = await this.prisma.user.findUnique({ where: { id: assigneeId } });
            if (!assignee) throw new UnauthorizedException('Исполнитель не найден');
        }
        if (statusId) {
            const status = await this.prisma.taskStatus.findUnique({ where: { id: statusId } });
            if (!status || status.projectId !== task.projectId) throw new UnauthorizedException('Статус не найден или не принадлежит проекту');
        }

        const updatedTask = await this.prisma.task.update({
            where: { id: taskId },
            data: {
                name: name !== undefined ? name : task.name,
                description: description !== undefined ? description : task.description,
                statusId: statusId !== undefined ? statusId : task.statusId,
                assigneeId: assigneeId !== undefined ? assigneeId : task.assigneeId,
            },
        });

        if (assigneeId && assigneeId !== task.assigneeId) {
            await this.sendAssignmentEmail(taskId, task.projectId, assigneeId, updatedTask.name, updatedTask.description || '');
        }

        return updatedTask;
    }

    async deleteTask(userId: number, taskId: number) {
        const task = await this.prisma.task.findUnique({
            where: { id: taskId },
            include: { project: true },
        });
        if (!task || task.project.ownerId !== userId) {
            throw new UnauthorizedException('Задача не найдена или доступ запрещён');
        }

        if (task.description) {
            console.log(`Task description: ${task.description}`);
            const imagePaths: string[] = [];
            const filePaths: string[] = [];

            const imgRegex = /<img[^>]*src=["'](.*?)["']/gi;
            let imgMatch;
            while ((imgMatch = imgRegex.exec(task.description)) !== null) {
                const fullSrc = imgMatch[1];
                console.log(`Found image path in description: ${fullSrc}`);
                const filePath = fullSrc.replace(/^https?:\/\/[^\/]+/, '');
                if (filePath && filePath.startsWith('/uploads/')) {
                    imagePaths.push(filePath);
                }
            }

            const linkRegex = /<a[^>]*href=["'](.*?)["'][^>]*>.*?<\/a>/gi;
            let linkMatch;
            while ((linkMatch = linkRegex.exec(task.description)) !== null) {
                const fullHref = linkMatch[1];
                console.log(`Found file path in description: ${fullHref}`);
                const filePath = fullHref.replace(/^https?:\/\/[^\/]+/, '');
                if (filePath && filePath.startsWith('/uploads/')) {
                    filePaths.push(filePath);
                }
            }

            console.log(`Extracted image paths: ${JSON.stringify(imagePaths)}`);
            console.log(`Extracted file paths: ${JSON.stringify(filePaths)}`);

            const allPaths = [...imagePaths, ...filePaths];
            for (const filePath of allPaths) {
                const fullPath = join(process.cwd(), filePath.slice(1));
                console.log(`Attempting to delete file: ${fullPath}`);
                try {
                    await unlink(fullPath);
                    console.log(`Successfully deleted file: ${fullPath}`);
                } catch (error) {
                    console.error(`Failed to delete file ${fullPath}:`, error);
                }
            }
        } else {
            console.log('No description found for this task.');
        }

        console.log(`Deleting comments for task ID: ${taskId}`);
        await this.prisma.comment.deleteMany({
            where: { taskId },
        });

        console.log(`Deleting task with ID: ${taskId}`);
        return this.prisma.task.delete({
            where: { id: taskId },
        });
    }

    async getUsers() {
        return this.prisma.user.findMany({
            select: { id: true, email: true, name: true },
        });
    }

    // async getUsers(userId: number) {
    //     const friends = await this.prisma.friendship.findMany({
    //         where: {
    //             OR: [
    //                 { senderId: userId, status: 'accepted' },
    //                 { receiverId: userId, status: 'accepted' },
    //             ],
    //         },
    //         include: {
    //             sender: { select: { id: true, email: true, name: true } },
    //             receiver: { select: { id: true, email: true, name: true } },
    //         },
    //     });
    //     return friends.map(f => f.senderId === userId ? f.receiver : f.sender);
    // }

    async getAssignedTasks(userId: number, page: number = 1, limit: number = 10, filter?: string) {
        const skip = (page - 1) * limit;
        const where: Prisma.TaskWhereInput = {
            assigneeId: userId,
            ...(filter && { name: { contains: filter, mode: 'insensitive' as const } }),
        };

        const [tasks, total] = await Promise.all([
            this.prisma.task.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: { project: { select: { id: true, name: true } }, status: true },
            }),
            this.prisma.task.count({ where }),
        ]);

        return {
            data: tasks,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async createTaskStatus(userId: number, projectId: number, name: string) {
        const project = await this.prisma.project.findUnique({ where: { id: projectId } });
        if (!project || project.ownerId !== userId) {
            throw new UnauthorizedException('Проект не найден или доступ запрещён');
        }
        const existingStatus = await this.prisma.taskStatus.findFirst({ where: { name, projectId } });
        if (existingStatus) {
            throw new UnauthorizedException('Статус с таким именем уже существует в проекте');
        }

        return this.prisma.taskStatus.create({
            data: {
                name,
                projectId,
            },
        });
    }

    async getTaskStatuses(userId: number, projectId: number) {
        const project = await this.prisma.project.findUnique({ where: { id: projectId } });
        if (!project || project.ownerId !== userId) {
            throw new UnauthorizedException('Проект не найден или доступ запрещён');
        }
        return this.prisma.taskStatus.findMany({
            where: { projectId },
            orderBy: { createdAt: 'asc' },
        });
    }

    async updateTaskStatus(userId: number, projectId: number, statusId: number, name: string) {
        const project = await this.prisma.project.findUnique({ where: { id: projectId } });
        if (!project || project.ownerId !== userId) {
            throw new UnauthorizedException('Проект не найден или доступ запрещён');
        }
        const status = await this.prisma.taskStatus.findUnique({ where: { id: statusId } });
        if (!status || status.projectId !== projectId) {
            throw new UnauthorizedException('Статус не найден или не принадлежит проекту');
        }
        const existingStatus = await this.prisma.taskStatus.findFirst({
            where: { name, projectId, NOT: { id: statusId } },
        });
        if (existingStatus) {
            throw new UnauthorizedException('Статус с таким именем уже существует в проекте');
        }

        return this.prisma.taskStatus.update({
            where: { id: statusId },
            data: { name },
        });
    }

    async deleteTaskStatus(userId: number, projectId: number, statusId: number) {
        const project = await this.prisma.project.findUnique({ where: { id: projectId } });
        if (!project || project.ownerId !== userId) {
            throw new UnauthorizedException('Проект не найден или доступ запрещён');
        }
        const status = await this.prisma.taskStatus.findUnique({ where: { id: statusId } });
        if (!status || status.projectId !== projectId) {
            throw new UnauthorizedException('Статус не найден или не принадлежит проекту');
        }

        const tasksUsingStatus = await this.prisma.task.count({
            where: { statusId, projectId },
        });
        if (tasksUsingStatus > 0) {
            throw new UnauthorizedException('Нельзя удалить статус, который используется в задачах');
        }

        return this.prisma.taskStatus.delete({
            where: { id: statusId },
        });
    }

    async createComment(userId: number, taskId: number, content: string, file?: Express.Multer.File) {
        const task = await this.prisma.task.findUnique({
            where: { id: taskId },
            include: { project: true },
        });
        if (!task || task.project.ownerId !== userId) {
            throw new UnauthorizedException('Задача не найдена или доступ запрещён');
        }

        let filePath: string | null = null;
        if (file) {
            filePath = `/uploads/${file.filename}`;
        }

        return this.prisma.comment.create({
            data: {
                content,
                taskId,
                userId,
                filePath,
            },
        });
    }

    async updateComment(userId: number, commentId: number, content: string, file?: Express.Multer.File) {
        const comment = await this.prisma.comment.findUnique({
            where: { id: commentId },
            include: { task: { include: { project: true } } },
        });
        if (!comment || comment.task.project.ownerId !== userId || comment.userId !== userId) {
            throw new UnauthorizedException('Комментарий не найден или доступ запрещён');
        }

        let filePath: string | null = comment.filePath;
        if (file) {
            filePath = `/uploads/${file.filename}`;
        }

        return this.prisma.comment.update({
            where: { id: commentId },
            data: { content, filePath },
        });
    }

    async deleteComment(userId: number, commentId: number) {
        const comment = await this.prisma.comment.findUnique({
            where: { id: commentId },
            include: { task: { include: { project: true } } },
        });
        if (!comment || comment.task.project.ownerId !== userId || comment.userId !== userId) {
            throw new UnauthorizedException('Комментарий не найден или доступ запрещён');
        }

        return this.prisma.comment.delete({
            where: { id: commentId },
        });
    }

    async uploadImage(userId: number, taskId: number, image: Express.Multer.File) {
        const task = await this.prisma.task.findUnique({
            where: { id: taskId },
            include: { project: true },
        });
        if (!task || task.project.ownerId !== userId) {
            throw new UnauthorizedException('Задача не найдена или доступ запрещён');
        }

        const filePath = `/uploads/${image.filename}`;
        return { url: filePath };
    }

    async uploadFile(userId: number, taskId: number, file: Express.Multer.File) {
        const task = await this.prisma.task.findUnique({
            where: { id: taskId },
            include: { project: true },
        });
        if (!task || task.project.ownerId !== userId) {
            throw new UnauthorizedException('Задача не найдена или доступ запрещён');
        }

        const filePath = `/uploads/${file.filename}`;
        return { url: filePath, originalName: file.originalname };
    }

    async deleteImage(userId: number, taskId: number, filePath: string) {
        const task = await this.prisma.task.findUnique({
            where: { id: taskId },
            include: { project: true },
        });
        if (!task || task.project.ownerId !== userId) {
            throw new UnauthorizedException('Задача не найдена или доступ запрещён');
        }

        const fullPath = join(process.cwd(), filePath.slice(1));
        try {
            await unlink(fullPath);
            if (task.description) {
                const updatedDescription = task.description.replace(
                    new RegExp(`<img[^>]*src=["']${filePath}["'][^>]*>`, 'gi'),
                    ''
                ).trim();
                await this.prisma.task.update({
                    where: { id: taskId },
                    data: { description: updatedDescription || null },
                });
            }
            return { message: 'Файл и ссылка на него успешно удалены' };
        } catch (error) {
            console.error('Ошибка при удалении файла:', error);
            throw new NotFoundException('Файл не найден или не удалось удалить');
        }
    }

    async startTimeTracking(userId: number, taskId: number) {
        const task = await this.prisma.task.findUnique({
            where: { id: taskId },
            include: { project: true },
        });
        if (!task || task.project.ownerId !== userId) {
            throw new UnauthorizedException('Задача не найдена или доступ запрещён');
        }

        const activeEntry = await this.prisma.timeEntry.findFirst({
            where: {
                taskId,
                userId,
                endTime: null,
            },
        });
        if (activeEntry) {
            throw new BadRequestException('Трекер времени уже запущен для этой задачи');
        }

        return this.prisma.timeEntry.create({
            data: {
                taskId,
                userId,
                startTime: new Date(),
            },
        });
    }

    async stopTimeTracking(userId: number, taskId: number) {
        const task = await this.prisma.task.findUnique({
            where: { id: taskId },
            include: { project: true },
        });
        if (!task || task.project.ownerId !== userId) {
            throw new UnauthorizedException('Задача не найдена или доступ запрещён');
        }

        const activeEntry = await this.prisma.timeEntry.findFirst({
            where: {
                taskId,
                userId,
                endTime: null,
            },
        });
        if (!activeEntry) {
            throw new BadRequestException('Нет активного трекера времени для этой задачи');
        }

        return this.prisma.timeEntry.update({
            where: { id: activeEntry.id },
            data: {
                endTime: new Date(),
            },
        });
    }

    async updateTimeEntry(userId: number, taskId: number, timeEntryId: number, startTime: string, endTime?: string) {
        const task = await this.prisma.task.findUnique({
            where: { id: taskId },
            include: { project: true },
        });
        if (!task || task.project.ownerId !== userId) {
            throw new UnauthorizedException('Задача не найдена или доступ запрещён');
        }

        const timeEntry = await this.prisma.timeEntry.findUnique({
            where: { id: timeEntryId },
        });
        if (!timeEntry || timeEntry.taskId !== taskId || timeEntry.userId !== userId) {
            throw new UnauthorizedException('Запись времени не найдена или доступ запрещён');
        }

        return this.prisma.timeEntry.update({
            where: { id: timeEntryId },
            data: {
                startTime: new Date(startTime),
                endTime: endTime ? new Date(endTime) : timeEntry.endTime,
            },
        });
    }

    private async sendAssignmentEmail(taskId: number, projectId: number, assigneeId: number, taskName: string, taskDescription: string) {
        const assignee = await this.prisma.user.findUnique({ where: { id: assigneeId } });
        const project = await this.prisma.project.findUnique({ where: { id: projectId } });
        if (!assignee || !project) return;

        const baseUrl = process.env.BASE_URL || 'http://localhost:3000'; // Берем из .env или используем значение по умолчанию
        const taskUrl = `${baseUrl}/projects/${projectId}/tasks/${taskId}`;

        try {
            await this.mailerService.sendMail({
                to: assignee.email,
                subject: `Назначена задача: ${taskName}`,
                template: 'task-assigned',
                context: {
                    assigneeName: assignee.name || assignee.email,
                    projectName: project.name,
                    taskName,
                    taskDescription,
                    taskUrl,
                },
            });
            console.log(`Email sent to ${assignee.email} for task ${taskId}`);
        } catch (error) {
            console.error('Ошибка при отправке email:', error);
            throw error; // Рекомендую пробросить ошибку дальше для обработки на уровне вызова
        }
    }
}

export const multerOptions = {
    storage: diskStorage({
        destination: './uploads',
        filename: (req: any, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
            const ext = extname(file.originalname);
            cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
        },
    }),
    fileFilter: (req: any, file: Express.Multer.File, cb: (error: Error | null, acceptFile: boolean) => void) => {
        const allowedTypes = [
            'image/png',
            'image/jpeg',
            'application/pdf',
            'text/plain',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/csv',
            'application/zip',
            'application/x-rar-compressed',
            'application/rar',
            'application/octet-stream',
        ];
        const allowedExtensions = /\.(png|jpeg|jpg|pdf|txt|xls|xlsx|csv|zip|rar)$/i;

        if (allowedTypes.includes(file.mimetype) || allowedExtensions.test(file.originalname)) {
            cb(null, true);
        } else {
            cb(new BadRequestException('Недопустимый тип файла. Разрешены PNG, JPEG, PDF, TXT, XLS, XLSX, CSV, ZIP, RAR'), false);
        }
    },
    limits: {
        fileSize: 5 * 1024 * 1024,
    },
};