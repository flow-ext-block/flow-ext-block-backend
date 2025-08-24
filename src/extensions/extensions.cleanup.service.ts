import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Extension } from './entity/extentions.entity';
import { ExtensionSettings } from './entity/extension-settings.entity';

@Injectable()
export class ExtensionsCleanupService {
  constructor(
    @InjectRepository(Extension) private readonly repo: Repository<Extension>,
    @InjectRepository(ExtensionSettings)
    private readonly settingsRepo: Repository<ExtensionSettings>,
  ) {}

  // 매일 02:00
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async purgeSoftDeleted(): Promise<number> {
    const settings = await this.settingsRepo.findOne({ where: { id: 1 } });
    const days = settings?.softDeleteRetentionDays ?? 90;

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const res = await this.repo
      .createQueryBuilder()
      .delete()
      .from(Extension)
      .where('"deletedAt" IS NOT NULL')
      .andWhere('"deletedAt" < :cutoff', { cutoff })
      .execute();

    return res.affected ?? 0;
  }
}
