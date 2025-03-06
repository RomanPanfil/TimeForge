import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class FriendsService {
    constructor(
        private prisma: PrismaService,
        private mailerService: MailerService,
    ) {}

    async sendFriendRequest(senderId: number, receiverEmail: string) {
        console.log('senderId:', senderId, 'receiverEmail:', receiverEmail); // Логирование входных данных

        if (!senderId || typeof senderId !== 'number') {
            throw new BadRequestException('Неверный senderId');
        }
        if (!receiverEmail || typeof receiverEmail !== 'string') {
            throw new BadRequestException('Неверный receiverEmail');
        }

        const sender = await this.prisma.user.findUnique({ where: { id: senderId } });
        const receiver = await this.prisma.user.findUnique({ where: { email: receiverEmail } });

        if (!sender || !receiver) {
            throw new BadRequestException('Пользователь не найден');
        }
        if (senderId === receiver.id) {
            throw new BadRequestException('Нельзя отправить запрос самому себе');
        }

        const existingRequest = await this.prisma.friendship.findUnique({
            where: {
                senderId_receiverId: { senderId, receiverId: receiver.id },
            },
        });
        if (existingRequest) {
            throw new BadRequestException('Запрос уже отправлен или дружба установлена');
        }

        const friendship = await this.prisma.friendship.create({
            data: {
                senderId,
                receiverId: receiver.id,
                status: 'pending',
            },
        });

        await this.sendInvitationEmail(sender, receiver);
        return friendship;
    }

    async getFriendRequests(userId: number) {
        return this.prisma.friendship.findMany({
            where: { receiverId: userId, status: 'pending' },
            include: { sender: { select: { id: true, email: true, name: true } } },
        });
    }

    async getFriends(userId: number) {
        const friendships = await this.prisma.friendship.findMany({
            where: {
                OR: [
                    { senderId: userId, status: 'accepted' },
                    { receiverId: userId, status: 'accepted' },
                ],
            },
            include: {
                sender: { select: { id: true, email: true, name: true } },
                receiver: { select: { id: true, email: true, name: true } },
            },
        });

        return friendships.map(f => f.senderId === userId ? f.receiver : f.sender);
    }

    async respondToFriendRequest(userId: number, requestId: number, accept: boolean) {
        const request = await this.prisma.friendship.findUnique({
            where: { id: requestId },
        });
        if (!request || request.receiverId !== userId || request.status !== 'pending') {
            throw new UnauthorizedException('Запрос не найден или недоступен');
        }

        return this.prisma.friendship.update({
            where: { id: requestId },
            data: { status: accept ? 'accepted' : 'rejected' },
        });
    }

    private async sendInvitationEmail(sender: any, receiver: any) {
        try {
            await this.mailerService.sendMail({
                to: receiver.email,
                subject: `Приглашение в друзья от ${sender.name || sender.email}`,
                text: `Здравствуйте, ${receiver.name || receiver.email},\n\n${sender.name || sender.email} хочет добавить вас в друзья в TimeForge.\nПерейдите в приложение, чтобы принять или отклонить запрос.\n\nС уважением,\nTimeForge`,
            });
            console.log(`Invitation email sent to ${receiver.email}`);
        } catch (error) {
            console.error('Ошибка при отправке приглашения:', error);
        }
    }
}