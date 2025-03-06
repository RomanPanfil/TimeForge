import { Controller, Post, Body, HttpCode, Get, UseGuards, UseInterceptors, UploadedFile, Patch } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';
import { GetUser } from './get-user.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) {}

    @Post('register')
    @UseInterceptors(
        FileInterceptor('avatar', {
            storage: diskStorage({
                destination: './uploads',
                filename: (req, file, cb) => {
                    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
                    const fileExt = extname(file.originalname);
                    cb(null, `${uniqueSuffix}${fileExt}`);
                },
            }),
        }),
    )
    async register(
        @Body() body: { email: string; password: string; name?: string; birthday?: string },
        @UploadedFile() avatar: Express.Multer.File,
    ) {
        const avatarUrl = avatar ? `/uploads/${avatar.filename}` : undefined;
        return this.authService.register(body.email, body.password, body.name, avatarUrl, body.birthday);
    }

    @Post('login')
    @HttpCode(200)
    async login(@Body() body: { email: string; password: string }) {
        return this.authService.login(body.email, body.password);
    }

    @Get('me')
    @UseGuards(AuthGuard('jwt'))
    async getProfile(@GetUser() user: any) {
        return this.authService.getProfile(user.userId);
    }

    @Patch('me')
    @UseGuards(AuthGuard('jwt'))
    @UseInterceptors(
        FileInterceptor('avatar', {
            storage: diskStorage({
                destination: './uploads',
                filename: (req, file, cb) => {
                    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
                    const fileExt = extname(file.originalname);
                    cb(null, `${uniqueSuffix}${fileExt}`);
                },
            }),
        }),
    )
    async updateProfile(
        @GetUser() user: any,
        @Body() body: { name?: string; birthday?: string },
        @UploadedFile() avatar: Express.Multer.File,
    ) {
        const avatarUrl = avatar ? `/uploads/${avatar.filename}` : undefined;
        return this.authService.updateProfile(user.userId, body.name, avatarUrl, body.birthday);
    }
}