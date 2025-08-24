import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { UsersModule } from './users/users.module';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TypeOrmConfigService } from './config/typeorm.config';
import { ExtensionsModule } from './extensions/extensions.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    // ConfigModule 설정
    ConfigModule.forRoot({
      isGlobal: true, // 앱 전역에서 ConfigService를 사용할 수 있도록 설정
      envFilePath: '.env', // .env 파일 경로 지정
    }),
    ScheduleModule.forRoot(),
    // TypeOrmModule 설정
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule], // TypeOrmModule에서 ConfigService를 사용하기 위해 필요
      useClass: TypeOrmConfigService,
    }),

    // 기존 모듈들
    UsersModule,
    ExtensionsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
