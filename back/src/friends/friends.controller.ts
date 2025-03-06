import { Controller, Post, Get, Patch, Body, Param, ParseIntPipe, UseGuards, Request, UnauthorizedException } from '@nestjs/common';
import { FriendsService } from './friends.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('friends')
@UseGuards(AuthGuard('jwt'))
export class FriendsController {
    constructor(private readonly friendsService: FriendsService) {}

    @Post('invite')
    async sendFriendRequest(@Request() req, @Body('email') email: string) {
        console.log('req.user:', req.user); // Логируем для отладки
        const senderId = req.user?.userId; // Изменили id на userId
        if (!senderId) {
            throw new UnauthorizedException('Пользователь не аутентифицирован');
        }
        return this.friendsService.sendFriendRequest(senderId, email);
    }

    @Get('requests')
    async getFriendRequests(@Request() req) {
        return this.friendsService.getFriendRequests(req.user.userId); // Изменили id на userId
    }

    @Get()
    async getFriends(@Request() req) {
        return this.friendsService.getFriends(req.user.userId); // Изменили id на userId
    }

    @Patch('respond/:id')
    async respondToFriendRequest(
        @Request() req,
        @Param('id', ParseIntPipe) requestId: number,
        @Body('accept') accept: boolean,
    ) {
        return this.friendsService.respondToFriendRequest(req.user.userId, requestId, accept); // Изменили id на userId
    }
}