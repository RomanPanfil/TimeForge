import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class ProjectsService {
    constructor(private prisma: PrismaService) {}

    async createProject(userId: number, name: string, description?: string, deadline?: string) {
        return this.prisma.project.create({
            data: {
                name,
                description,
                deadline: deadline ? new Date(deadline) : undefined,
                ownerId: userId,
            },
        });
    }

    async getProjects(userId: number, page: number = 1, limit: number = 10, filter?: string) {
        const skip = (page - 1) * limit;
        const where: Prisma.ProjectWhereInput = {
            ownerId: userId,
            ...(filter && { name: { contains: filter, mode: 'insensitive' as const } }),
        };

        const [projects, total] = await Promise.all([
            this.prisma.project.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.project.count({ where }),
        ]);

        return {
            data: projects,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async getProject(userId: number, projectId: number, taskPage: number = 1, taskLimit: number = 5, taskFilter?: string, allTasks: boolean = false) {
        const project = await this.prisma.project.findUnique({
            where: { id: projectId },
            include: {
                owner: { select: { id: true, email: true, name: true } },
                statuses: true, // Включаем статусы проекта
            },
        });
        if (!project || project.ownerId !== userId) {
            throw new UnauthorizedException('Проект не найден или доступ запрещён');
        }

        const where: Prisma.TaskWhereInput = {
            projectId,
            ...(taskFilter && { name: { contains: taskFilter, mode: 'insensitive' as const } }),
        };

        let tasks, totalTasks;
        if (allTasks) {
            tasks = await this.prisma.task.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                include: { assignee: { select: { id: true, email: true, name: true } }, status: true },
            });
            totalTasks = tasks.length;
        } else {
            const skip = (taskPage - 1) * taskLimit;
            [tasks, totalTasks] = await Promise.all([
                this.prisma.task.findMany({
                    where,
                    skip,
                    take: taskLimit,
                    orderBy: { createdAt: 'desc' },
                    include: { assignee: { select: { id: true, email: true, name: true } }, status: true },
                }),
                this.prisma.task.count({ where }),
            ]);
        }

        return {
            ...project,
            tasks: allTasks
                ? { data: tasks, total: totalTasks }
                : {
                    data: tasks,
                    total: totalTasks,
                    page: taskPage,
                    limit: taskLimit,
                    totalPages: Math.ceil(totalTasks / taskLimit),
                },
        };
    }

    async updateProject(userId: number, projectId: number, name?: string, description?: string, deadline?: string) {
        const project = await this.getProject(userId, projectId);
        return this.prisma.project.update({
            where: { id: projectId },
            data: {
                name: name !== undefined ? name : project.name,
                description: description !== undefined ? description : project.description,
                deadline: deadline ? new Date(deadline) : project.deadline,
            },
        });
    }

    async deleteProject(userId: number, projectId: number) {
        await this.getProject(userId, projectId);
        return this.prisma.project.delete({
            where: { id: projectId },
        });
    }
}