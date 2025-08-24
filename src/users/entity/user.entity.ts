import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  BeforeInsert,
} from 'typeorm';
import bcrypt from 'bcrypt';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: string;

  @Column({ type: 'varchar', length: 50, unique: true, nullable: false })
  username: string;

  @Column({ type: 'varchar', nullable: false })
  password: string;

  @CreateDateColumn()
  createdAt: Date;

  @BeforeInsert()
  async hashPassword() {
    // 입력받은 비밀번호(this.password)를 해싱하여 다시 저장
    this.password = await bcrypt.hash(this.password, 10);
  }
}
