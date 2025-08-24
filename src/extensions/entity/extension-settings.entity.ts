import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('extension_settings')
export class ExtensionSettings {
  @PrimaryColumn({ type: 'int' })
  id: number; // 항상 1로 사용(싱글톤)

  @Column({ type: 'int', default: 200 })
  customLimit: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'int', default: 90 })
  softDeleteRetentionDays: number;
}
