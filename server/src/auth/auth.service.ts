import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { User } from '../entities/user.entity.js';
import { RegisterDto, LoginDto } from '../dto/auth.dto.js';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto): Promise<{ user: Partial<User>; accessToken: string }> {
    const email = registerDto.email.toLowerCase().trim();
    const username = registerDto.username.toLowerCase().trim();

    const existingEmail = await this.userRepository.findOne({ where: { email } });
    if (existingEmail) {
      throw new ConflictException('Email address is already in use');
    }

    const existingUsername = await this.userRepository.findOne({ where: { username } });
    if (existingUsername) {
      throw new ConflictException('Username is already taken');
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    const user = this.userRepository.create({
      fullName: registerDto.fullName.trim(),
      username,
      phone: registerDto.phone?.trim() || '',
      email,
      password: hashedPassword,
    });

    const savedUser = await this.userRepository.save(user);
    const accessToken = this.generateToken(savedUser);
    const { password: _p, ...safeUser } = savedUser;

    return { user: safeUser, accessToken };
  }

  async login(loginDto: LoginDto): Promise<{ user: Partial<User>; accessToken: string }> {
    const rawIdentifier = loginDto.identifier || loginDto.email;
    if (!rawIdentifier) {
      throw new UnauthorizedException('Username, email, or mobile number is required');
    }

    const identifier = rawIdentifier.trim().toLowerCase();

    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('LOWER(user.email) = :identifier', { identifier })
      .orWhere('LOWER(user.username) = :identifier', { identifier })
      .orWhere('user.phone = :rawPhone', { rawPhone: rawIdentifier.trim() })
      .getOne();

    if (!user || !user.password) {
      throw new NotFoundException('No account found with this username, email, or phone number. Please register first.');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Incorrect password. Please try again.');
    }

    const accessToken = this.generateToken(user);
    const { password: _p, ...safeUser } = user;

    return { user: safeUser, accessToken };
  }

  private generateToken(user: User): string {
    return this.jwtService.sign({
      sub: user.id,
      email: user.email,
      username: user.username,
    });
  }
}
