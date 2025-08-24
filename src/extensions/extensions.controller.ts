import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ExtensionsService } from './extensions.service';
import {
  AddCustomExtensionDto,
  AddFixedExtentionsDto,
} from './dto/add-custom-extentions.dto';
import { UpdateFixedExtensionDto } from './dto/update-fixed-extentions.dto';

@Controller('extensions')
export class ExtensionsController {
  constructor(private readonly extensionsService: ExtensionsService) {}

  // ---- Custom Extensions API -----
  @Get('custom')
  getCustomExtensions() {
    return this.extensionsService.getCustomExtensions();
  }

  @Post('custom')
  @HttpCode(HttpStatus.CREATED)
  addCustomExtension(@Body() dto: AddCustomExtensionDto) {
    return this.extensionsService.addCustomExtension(dto);
  }

  @Delete('custom/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteCustomExtension(@Param('id') id: number) {
    return this.extensionsService.deleteCustomExtension(id);
  }

  @Delete('custom')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAllCustomExtensions() {
    await this.extensionsService.deleteAllCustomExtensions();
  }

  // ---- Fixed Extensions API -----

  @Get('fixed')
  getFixedExtensions() {
    return this.extensionsService.getFixedExtensions();
  }

  @Post('fixed')
  @HttpCode(HttpStatus.CREATED)
  addFixedExtensions(@Body() dto: AddFixedExtentionsDto) {
    return this.extensionsService.addFixedExtensions(dto);
  }

  @Patch('fixed/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  updateFixedExtension(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateFixedExtensionDto,
  ) {
    return this.extensionsService.updateFixedExtension(id, dto.blocked);
  }
}
