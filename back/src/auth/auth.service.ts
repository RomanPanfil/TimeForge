import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
        private configService: ConfigService,
    ) {}

    async register(email: string, password: string, name?: string, avatar?: string, birthday?: string) {
        const hashedPassword = await bcrypt.hash(password, 10);
        const port = this.configService.get<number>('PORT') || 3003;
        const avatarUrl = avatar ? `http://localhost:${port}${avatar}` : undefined;

        const user = await this.prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name,
                avatar: avatarUrl,
                birthday: birthday ? new Date(birthday) : undefined,
            },
        });
        const payload = { email: user.email, sub: user.id };
        return {
            access_token: this.jwtService.sign(payload),
        };
    }

    async login(email: string, password: string) {
        const user = await this.prisma.user.findUnique({ where: { email } });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            throw new UnauthorizedException('Неверные данные');
        }
        const payload = { email: user.email, sub: user.id };
        return {
            access_token: this.jwtService.sign(payload),
        };
    }

    async getProfile(userId: number) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, email: true, name: true, avatar: true, birthday: true, role: true },
        });
        if (!user) {
            throw new UnauthorizedException('Пользователь не найден');
        }
        return user;
    }

    async updateProfile(userId: number, name?: string, avatar?: string, birthday?: string) {
        const port = this.configService.get<number>('PORT') || 3003;
        const avatarUrl = avatar ? `http://localhost:${port}${avatar}` : undefined;

        const updatedUser = await this.prisma.user.update({
            where: { id: userId },
            data: {
                name: name !== undefined ? name : undefined,
                avatar: avatarUrl !== undefined ? avatarUrl : undefined,
                birthday: birthday ? new Date(birthday) : undefined,
            },
            select: { id: true, email: true, name: true, avatar: true, birthday: true, role: true },
        });
        return updatedUser;
    }
}