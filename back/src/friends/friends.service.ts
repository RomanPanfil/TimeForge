import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { MailerService } from '@nestjs-modules/mailer';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class FriendsService {
    constructor(
        private prisma: PrismaService,
        private mailerService: MailerService,
    ) {}

    async sendFriendRequest(senderId: number, receiverEmail: string) {
        console.log('senderId:', senderId, 'receiverEmail:', receiverEmail);

        if (!senderId || typeof senderId !== 'number') {
            throw new BadRequestException('Неверный senderId');
        }
        if (!receiverEmail || typeof receiverEmail !== 'string') {
            throw new BadRequestException('Неверный receiverEmail');
        }

        const sender = await this.prisma.user.findUnique({ where: { id: senderId } });
        if (!sender) {
            throw new BadRequestException('Отправитель не найден');
        }

        const receiver = await this.prisma.user.findUnique({ where: { email: receiverEmail } });

        if (receiver) {
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

            await this.sendInvitationEmail(sender, receiver.email, null);
            return friendship;
        } else {
            const token = uuidv4();
            const invitation = await this.prisma.invitation.create({
                data: {
                    senderId,
                    email: receiverEmail,
                    token,
                    status: 'pending',
                },
            });

            await this.sendInvitationEmail(sender, receiverEmail, token);
            return invitation;
        }
    }

    async confirmInvitation(token: string, userId: number) {
        const invitation = await this.prisma.invitation.findUnique({ where: { token } });
        if (!invitation || invitation.status !== 'pending') {
            throw new BadRequestException('Приглашение не найдено или уже обработано');
        }

        const sender = await this.prisma.user.findUnique({ where: { id: invitation.senderId } });
        if (!sender) {
            throw new BadRequestException('Отправитель не найден');
        }

        // Создаём запрос на дружбу со статусом pending
        const friendship = await this.prisma.friendship.create({
            data: {
                senderId: invitation.senderId,
                receiverId: userId,
                status: 'pending', // Изменили с 'accepted' на 'pending'
            },
        });

        // Обновляем статус приглашения
        await this.prisma.invitation.update({
            where: { id: invitation.id },
            data: { status: 'processed' }, // Новый статус, чтобы отметить, что приглашение использовано
        });

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
                sender: { select: { id: true, email: true, name: true, avatar: true } },
                receiver: { select: { id: true, email: true, name: true,  avatar: true } },
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

    private async sendInvitationEmail(sender: any, receiverEmail: string, token: string | null) {
        const baseUrl = process.env.BASE_URL; // Значение по умолчанию
        const inviteUrl = token ? `${baseUrl}/login?invite=${token}` : `${baseUrl}/friends/requests`;

        try {
            await this.mailerService.sendMail({
                to: receiverEmail,
                subject: `Приглашение в друзья от ${sender.name || sender.email}`,
                template: 'invitation',
                context: {
                    recipientName: receiverEmail,
                    senderName: sender.name || sender.email,
                    inviteUrl: inviteUrl,
                },
            });
            console.log(`Invitation email sent to ${receiverEmail}`);
        } catch (error) {
            console.error('Ошибка при отправке приглашения:', error);
            throw error;
        }
    }
}