import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExtensionsService } from './extensions.service';
import { ExtensionsController } from './extensions.controller';
import { Extension } from './entity/extentions.entity';
import { ExtensionSettings } from './entity/extension-settings.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Extension, ExtensionSettings])],
  controllers: [ExtensionsController],
  providers: [ExtensionsService],
})
export class ExtensionsModule {}
