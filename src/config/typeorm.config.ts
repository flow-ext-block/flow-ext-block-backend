import { TypeOrmModuleOptions, TypeOrmOptionsFactory } from '@nestjs/typeorm';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { User } from 'src/users/entity/user.entity';
import { Extension } from 'src/extensions/entity/extentions.entity';
import { ExtensionSettings } from 'src/extensions/entity/extension-settings.entity';

@Injectable()
export class TypeOrmConfigService implements TypeOrmOptionsFactory {
  constructor(private readonly configService: ConfigService) {}

  createTypeOrmOptions(): TypeOrmModuleOptions {
    return {
      type: 'postgres',
      host: this.configService.get<string>('DB_HOST'),
      port: this.configService.get<number>('DB_PORT'),
      username: this.configService.get<string>('DB_USERNAME'),
      password: this.configService.get<string>('DB_PASSWORD'),
      database: this.configService.get<string>('DB_DATABASE'),
      entities: [User, Extension, ExtensionSettings],
      ssl: { rejectUnauthorized: false },
      synchronize: true, // DB 스키마를 자동으로 동기화합니다.
      logging: true, // SQL 쿼리를 콘솔에 로깅합니다.
    };
  }
}
