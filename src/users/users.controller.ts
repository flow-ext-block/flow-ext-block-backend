import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto, UserResponseDto } from './dto/create-user.dto';
import { CheckUsernameDto } from './dto/check-username.dto';
import { LoginUserDto } from './dto/login-user.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * 회원가입 API
   * POST /users/signup
   */
  @Post('signup')
  @HttpCode(HttpStatus.CREATED) // 성공 시 201 Created 상태 코드 반환
  async signUp(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  /**
   * 로그인 API
   * POST /users/login
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginUserDto: LoginUserDto): Promise<UserResponseDto> {
    return this.usersService.login(loginUserDto);
  }

  /**
   * 아이디 중복 확인 API
   * POST /users/check-username
   */
  @Post('check-username')
  @HttpCode(HttpStatus.OK) // 성공 시 200 OK 상태 코드 반환
  async checkUsername(@Body() checkUsernameDto: CheckUsernameDto) {
    return this.usersService.checkUsername(checkUsernameDto.username);
  }
}
