import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, IsNull, Not, Repository } from 'typeorm';
import { Extension, ExtensionType } from './entity/extentions.entity';
import {
  AddCustomExtensionDto,
  AddFixedExtentionsDto,
} from './dto/add-custom-extentions.dto';

import { ExtensionSettings } from './entity/extension-settings.entity';

const SETTINGS_ROW_ID = 1;
const DEFAULT_CUSTOM_LIMIT = 200;
const EXT_REGEX = /^[a-z0-9]+(\.[a-z0-9]+)*$/;
function normalizeExt(ext: string) {
  return ext?.toLowerCase().replace(/^\./, '').trim();
}
export async function insertExtensionUniqueOrThrow(
  em: EntityManager,
  ext: string,
  type: ExtensionType,
  blocked: boolean,
) {
  const res = await em
    .createQueryBuilder()
    .insert()
    .into(Extension)
    .values({ ext, type, blocked, activeAt: () => 'CURRENT_TIMESTAMP' })
    .orIgnore() // ON CONFLICT DO NOTHING
    .returning(['id']) // PG에서는 returning 사용 가능
    .execute();

  const inserted = Array.isArray(res.raw) && res.raw.length > 0;
  if (!inserted) {
    const row = await em.findOne(Extension, {
      where: { ext },
      select: ['id', 'type'],
    });
    if (row?.type === ExtensionType.FIXED) {
      throw new ConflictException({
        message: `'${ext}'은(는) 고정 확장자에 이미 존재합니다. 고정 목록에서 차단을 설정하세요.`,
        code: 'DUPLICATE_IN_FIXED',
        ext: ext,
        fixedId: row.id,
      });
    }
    throw new ConflictException({
      message: `'${ext}' 확장자는 이미 존재합니다.`,
      code: 'DUPLICATE_IN_CUSTOM',
      ext: ext,
      customId: row?.id,
    });
  }

  // 여기 오면 새로 삽입된 것
  const rawRows = res.raw as Array<{ id: number }>;
  const newId = rawRows[0].id;

  return await em.findOne(Extension, {
    where: { id: newId },
    select: ['id', 'ext', 'type', 'blocked', 'createdAt'],
  });
}

@Injectable()
export class ExtensionsService {
  constructor(
    @InjectRepository(Extension)
    private readonly extensionRepository: Repository<Extension>,
  ) {}

  // ---- 커스텀 확장자 관련 로직  -----

  async addCustomExtension(dto: AddCustomExtensionDto) {
    const extNorm = normalizeExt(dto.ext);
    if (!extNorm || extNorm.length > 20 || !EXT_REGEX.test(extNorm)) {
      throw new BadRequestException('유효한 확장자를 입력하세요.');
    }

    // 트랜잭션으로 커스텀 한도 검사
    return this.extensionRepository.manager.transaction(async (em) => {
      // 설정 레코드 잠금
      const settingsRepo = em.getRepository(ExtensionSettings);
      let settings = await settingsRepo.findOne({
        where: { id: 1 },
        lock: { mode: 'pessimistic_write' },
      });
      if (!settings) {
        settings = await settingsRepo.save(
          settingsRepo.create({ id: 1, customLimit: 200 }),
        );
      }

      // 현재 커스텀 개수만 카운트
      const customCount = await em.count(Extension, {
        where: { type: ExtensionType.CUSTOM },
      });
      if (customCount >= settings.customLimit) {
        throw new BadRequestException(
          `커스텀 확장자는 최대 ${settings.customLimit}개까지 추가할 수 있습니다.`,
        );
      }
      // 동일 ext의 소프트삭제 레코드가 있으면 "복구"로 처리 (새 행 생성 금지)
      const soft = await em.findOne(Extension, {
        withDeleted: true,
        where: { ext: extNorm, deletedAt: Not(IsNull()) },
        order: { deletedAt: 'DESC' },
        select: ['id', 'type', 'deletedAt'],
      });

      if (soft) {
        // 활성 중복은 0단계에서 걸렀으므로 restore 가능
        await em.restore(Extension, soft.id);
        await em.update(
          Extension,
          { id: soft.id },
          {
            type: ExtensionType.CUSTOM,
            blocked: true,
            activeAt: () => 'CURRENT_TIMESTAMP',
          },
        );
        const restored = await em.findOne(Extension, {
          where: { id: soft.id },
          select: ['id', 'ext', 'type', 'blocked', 'createdAt'],
        });
        return restored!;
      }
      // 충돌-무시 삽입 시도 → 실패 시 헬퍼가 409로 분기
      await insertExtensionUniqueOrThrow(
        em,
        extNorm,
        ExtensionType.CUSTOM,
        true, // custom 추가시 blocked 기본값
      );
    });
  }

  async deleteCustomExtension(id: number) {
    const res = await this.extensionRepository.softDelete({
      id,
      type: ExtensionType.CUSTOM,
    });
    if (res.affected === 0) {
      throw new NotFoundException(`id=${id} 커스텀 확장자를 찾을 수 없습니다.`);
    }
  }
  async deleteAllCustomExtensions(): Promise<void> {
    await this.extensionRepository.manager.transaction(async (em) => {
      await em
        .createQueryBuilder()
        .softDelete()
        .from(Extension)
        .where('"type" = :type', { type: ExtensionType.CUSTOM })
        .andWhere('"deletedAt" IS NULL') // 활성만
        .execute();
    });
  }

  async getCustomExtensions() {
    // 커스텀 목록과 설정을 병렬 조회
    const itemsPromise = this.extensionRepository.find({
      where: { type: ExtensionType.CUSTOM },
      order: { activeAt: 'ASC', id: 'ASC' },
      select: ['id', 'ext'], // 필요한 필드만
    });

    const settingsRepo =
      this.extensionRepository.manager.getRepository(ExtensionSettings);
    const settingsPromise = settingsRepo.findOne({
      where: { id: SETTINGS_ROW_ID },
    });

    const [items, settings] = await Promise.all([
      itemsPromise,
      settingsPromise,
    ]);

    // 설정 행이 없으면 기본값으로 생성
    const limit = settings?.customLimit ?? DEFAULT_CUSTOM_LIMIT;
    if (!settings) {
      await settingsRepo.save(
        settingsRepo.create({
          id: SETTINGS_ROW_ID,
          customLimit: DEFAULT_CUSTOM_LIMIT,
        }),
      );
    }

    return {
      items: items.map((item) => ({ id: item.id, ext: item.ext })),
      count: items.length,
      limit, // DB에서 읽은 값(없으면 기본 200)
    };
  }

  // ----- 고정 확장자 관련 로직 -----

  async getFixedExtensions() {
    const items = await this.extensionRepository.find({
      where: { type: ExtensionType.FIXED },
      order: { ext: 'ASC' },
    });
    return {
      items: items.map((item) => ({
        id: item.id,
        ext: item.ext,
        blocked: item.blocked,
      })),
      updatedAt: new Date().toISOString(),
    };
  }

  async updateFixedExtension(id: number, blocked: boolean) {
    const result = await this.extensionRepository.update(
      { id, type: ExtensionType.FIXED },
      { blocked },
    );
    if (result.affected === 0) {
      throw new NotFoundException(`id=${id} 고정 확장자를 찾을 수 없습니다.`);
    }
  }

  async addFixedExtensions(dto: AddFixedExtentionsDto) {
    // ext 중복(커스텀/고정 전체) 검사
    const reqExts = dto.items.map((i) => i.ext);
    const existing = await this.extensionRepository.find({
      where: reqExts.map((ext) => ({ ext })),
      select: ['ext'],
    });

    if (existing.length > 0) {
      const duplicated = existing.map((e) => e.ext);
      throw new ConflictException(
        `이미 존재하는 확장자: ${duplicated.join(', ')}`,
      );
    }

    // 트랜잭션으로 일괄 저장
    const saved = await this.extensionRepository.manager.transaction(
      async (em) => {
        const entities = dto.items.map((i) =>
          em.create(Extension, {
            ext: i.ext,
            type: ExtensionType.FIXED,
            blocked: i.blocked ?? true,
          }),
        );
        return em.save(entities);
      },
    );

    return saved;
  }
}
