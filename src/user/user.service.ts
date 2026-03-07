import {
  Injectable,
  ConflictException,
  NotFoundException,
  OnModuleInit,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { plainToInstance } from 'class-transformer';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { User, UserDocument } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserRo } from './dto/user.ro';
import { SignupDto } from '../auth/dto/signup.dto';
import { SignupRo } from '../auth/dto/signup.ro';

@Injectable()
export class UserService implements OnModuleInit {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    private readonly configService: ConfigService,
  ) { }

  async onModuleInit() {
    await this.createSuperUserFromEnv();
  }

  private async createSuperUserFromEnv() {
    const superUsername = this.configService.get<string>('SUPER_USER_USERNAME');
    const superPassword = this.configService.get<string>('SUPER_USER_PASSWORD');
    const superEmail = this.configService.get<string>('SUPER_USER_EMAIL');
    const superFirstName = this.configService.get<string>(
      'SUPER_USER_FIRST_NAME',
    );
    const superLastName = this.configService.get<string>(
      'SUPER_USER_LAST_NAME',
    );

    if (
      !superUsername ||
      !superPassword ||
      !superEmail ||
      !superFirstName ||
      !superLastName
    ) {
      console.log(
        'Super user credentials not found in environment variables. Required: SUPER_USER_USERNAME, SUPER_USER_PASSWORD, SUPER_USER_EMAIL, SUPER_USER_FIRST_NAME, SUPER_USER_LAST_NAME',
      );
      return;
    }

    const existingUser = await this.userModel
      .findOne({ username: superUsername })
      .exec();

    if (!existingUser) {
      const hashedPassword = await bcrypt.hash(superPassword, 10);
      const superUser = new this.userModel({
        username: superUsername,
        password: hashedPassword,
        email: superEmail,
        firstName: superFirstName,
        lastName: superLastName,
        isAdmin: true,
      });
      await superUser.save();
      console.log(`Super user "${superUsername}" created successfully`);
    } else if (!existingUser.isAdmin) {
      existingUser.isAdmin = true;
      await existingUser.save();
      console.log(`User "${superUsername}" updated to super user`);
    }
  }

  async create(createUserDto: CreateUserDto): Promise<UserRo> {
    const existingUser = await this.userModel
      .findOne({ username: createUserDto.username })
      .exec();

    if (existingUser) {
      throw new ConflictException('نام کاربری قبلاً وجود دارد');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    const user = new this.userModel({
      ...createUserDto,
      password: hashedPassword,
    });

    const savedUser = await user.save();
    return plainToInstance(UserRo, savedUser.toObject(), {
      excludeExtraneousValues: true,
    });
  }

  async findAll(): Promise<UserRo[]> {
    const users = await this.userModel.find().exec();
    return plainToInstance(
      UserRo,
      users.map((u) => u.toObject()),
      {
        excludeExtraneousValues: true,
      },
    );
  }

  async findOne(id: string): Promise<UserRo> {
    const user = await this.userModel.findById(id).exec();
    if (!user) {
      throw new NotFoundException(`کاربر با شناسه ${id} یافت نشد`);
    }
    return plainToInstance(UserRo, user.toObject(), {
      excludeExtraneousValues: true,
    });
  }

  async findByUsername(username: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ username }).exec();
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email }).exec();
  }

  async signup(signupDto: SignupDto): Promise<SignupRo> {
    const existingEmail = await this.userModel
      .findOne({ email: signupDto.email })
      .exec();

    if (existingEmail) {
      throw new ConflictException('ایمیل قبلاً وجود دارد');
    }

    const existingUsername = await this.userModel
      .findOne({ username: signupDto.username })
      .exec();

    if (existingUsername) {
      throw new ConflictException('نام کاربری قبلاً وجود دارد');
    }

    const hashedPassword = await bcrypt.hash(signupDto.password, 10);

    const user = new this.userModel({
      firstName: signupDto.firstName,
      lastName: signupDto.lastName,
      email: signupDto.email,
      username: signupDto.username,
      password: hashedPassword,
    });

    const savedUser = await user.save();
    return plainToInstance(SignupRo, savedUser.toObject(), {
      excludeExtraneousValues: true,
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<UserRo> {
    const user = await this.userModel.findById(id).exec();
    if (!user) {
      throw new NotFoundException(`کاربر با شناسه ${id} یافت نشد`);
    }

    if (updateUserDto.username && updateUserDto.username !== user.username) {
      const existingUser = await this.userModel
        .findOne({ username: updateUserDto.username })
        .exec();
      if (existingUser) {
        throw new ConflictException('نام کاربری قبلاً وجود دارد');
      }
    }

    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    Object.assign(user, updateUserDto);
    const savedUser = await user.save();
    return plainToInstance(UserRo, savedUser.toObject(), {
      excludeExtraneousValues: true,
    });
  }

  async remove(id: string): Promise<void> {
    const user = await this.userModel.findById(id).exec();
    if (!user) {
      throw new NotFoundException(`کاربر با شناسه ${id} یافت نشد`);
    }

    if (user.isAdmin) {
      const adminCount = await this.userModel
        .countDocuments({ isAdmin: true })
        .exec();
      if (adminCount <= 1) {
        throw new BadRequestException('امکان حذف آخرین کاربر ادمین وجود ندارد');
      }
    }

    await this.userModel.findByIdAndDelete(id).exec();
  }

  async findByIdInternal(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }

  async generatePasswordResetToken(email: string): Promise<string | null> {
    const user = await this.userModel.findOne({ email }).exec();
    if (!user) {
      return null;
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = new Date(Date.now() + 3600000);
    await user.save();

    return resetToken;
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await this.userModel
      .findOne({
        resetPasswordToken: hashedToken,
        resetPasswordExpires: { $gt: new Date() },
      })
      .exec();

    if (!user) {
      throw new BadRequestException('توکن بازنشانی نامعتبر یا منقضی شده است');
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
  }
}
