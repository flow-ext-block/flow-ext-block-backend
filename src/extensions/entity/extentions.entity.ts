import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum ExtensionType {
  FIXED = 'FIXED',
  CUSTOM = 'CUSTOM',
}

@Index('uniq_extensions_ext_active', ['ext'], {
  unique: true,
  where: '"deletedAt" IS NULL', // 활성 행만 유니크 보장
})
@Entity('extensions')
export class Extension {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 20, nullable: false })
  ext: string;

  @Column({ type: 'enum', enum: ExtensionType, nullable: false })
  type: ExtensionType;

  @Column({ type: 'boolean', default: false })
  blocked: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  activeAt: Date;

  @DeleteDateColumn({ nullable: true })
  deletedAt?: Date | null;
}
