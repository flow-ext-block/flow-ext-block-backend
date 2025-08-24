import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entity/user.entity';
import { CreateUserDto, UserResponseDto } from './dto/create-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * 새로운 사용자를 생성합니다. (회원가입)
   * @param createUserDto - 사용자 생성에 필요한 데이터
   */
  async create(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    const { username, password } = createUserDto;

    // 아이디 중복 확인
    const existingUser = await this.userRepository.findOne({
      where: { username },
    });
    if (existingUser) {
      throw new ConflictException('이미 사용 중인 아이디입니다.');
    }

    const user = this.userRepository.create({ username, password });
    const savedUser = await this.userRepository.save(user);

    return {
      id: savedUser.id,
      username: savedUser.username,
    };
  }

  /**
   * 아이디가 사용 가능한지 확인.
   * @param username - 확인할 아이디
   */
  async checkUsername(username: string): Promise<{ available: boolean }> {
    const user = await this.userRepository.findOne({ where: { username } });
    if (user) {
      // 아이디가 이미 존재하면 ConflictException 발생
      throw new ConflictException('이미 사용 중인 아이디입니다.');
    }
    // 아이디가 존재하지 않으면 사용 가능
    return { available: true };
  }

  async login(loginUserDto: LoginUserDto): Promise<UserResponseDto> {
    const { username, password } = loginUserDto;

    // 아이디로 사용자 찾기
    const user = await this.userRepository.findOne({ where: { username } });
    if (!user) {
      throw new UnauthorizedException(
        '아이디 또는 비밀번호가 올바르지 않습니다.',
      );
    }

    // bcrypt.compare로 비밀번호 비교
    const isPasswordMatching = await bcrypt.compare(password, user.password);
    if (!isPasswordMatching) {
      throw new UnauthorizedException(
        '아이디 또는 비밀번호가 올바르지 않습니다.',
      );
    }

    return {
      id: user.id,
      username: user.username,
    };
  }
}
