import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum ExtensionType {
  FIXED = 'FIXED',
  CUSTOM = 'CUSTOM',
}

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
