import * as bcrypt from 'bcrypt';
import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { plainToInstance } from 'class-transformer';
import { UserService } from '../user/user.service';
import { EmailService } from '../email/email.service';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { LoginRo } from './dto/login.ro';
import { SignupRo } from './dto/signup.ro';
import { ProfileRo } from './dto/profile.ro';
import { ForgetPasswordDto } from './dto/forget-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ForgetPasswordRo } from './dto/forget-password.ro';
import { ResetPasswordRo } from './dto/reset-password.ro';

export interface JwtPayload {
  sub: string;
  username: string;
  email: string;
  role: string;
  organizationId: string | null;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
  ) { }

  async validateUser(username: string, password: string): Promise<any> {
    const user = await this.userService.findByUsername(username);
    if (user) {
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return null;
      const userObj = user.toObject();
      const { password: _, ...result } = userObj;
      return result;
    }
    return null;
  }

  async login(loginDto: LoginDto): Promise<LoginRo> {
    const user = await this.validateUser(loginDto.username, loginDto.password);
    if (!user) {
      throw new UnauthorizedException('نام کاربری یا رمز عبور نادرست است');
    }

    const payload: JwtPayload = {
      sub: user._id.toString(),
      username: user.username,
      email: user.email,
      role: user.role,
      organizationId: user.organization?.toString() ?? null,
    };

    return plainToInstance(
      LoginRo,
      { access_token: this.jwtService.sign(payload) },
      { excludeExtraneousValues: true },
    );
  }

  async getProfile(userId: string): Promise<ProfileRo> {
    const user = await this.userService.findOne(userId);
    return plainToInstance(ProfileRo, user, { excludeExtraneousValues: true });
  }

  async signup(signupDto: SignupDto): Promise<SignupRo> {
    return await this.userService.signup(signupDto);
  }

  async forgetPassword(forgetPasswordDto: ForgetPasswordDto): Promise<ForgetPasswordRo> {
    const resetToken = await this.userService.generatePasswordResetToken(
      forgetPasswordDto.email,
    );

    const response: ForgetPasswordRo = {
      message: 'If the email exists, a password reset link has been sent',
    };

    if (resetToken) {
      try {
        await this.emailService.sendPasswordResetEmail(
          forgetPasswordDto.email,
          resetToken,
        );
      } catch (error) {
        this.logger.error('Failed to send password reset email', error);
      }
    }

    if (this.configService.get<string>('NODE_ENV') !== 'production' && resetToken) {
      response.resetToken = resetToken;
    }

    return plainToInstance(ForgetPasswordRo, response, {
      excludeExtraneousValues: true,
    });
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<ResetPasswordRo> {
    await this.userService.resetPassword(
      resetPasswordDto.token,
      resetPasswordDto.newPassword,
    );

    return plainToInstance(
      ResetPasswordRo,
      { message: 'Password has been reset successfully' },
      { excludeExtraneousValues: true },
    );
  }
}
