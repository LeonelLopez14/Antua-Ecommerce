import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

/** Pedido de recuperación de contraseña. El token en sí nunca se guarda: solo su hash. */
@Entity('password_reset_tokens')
export class PasswordResetToken {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column({ type: 'char', length: 64 })
  token_hash: string;

  @Column({ type: 'datetime' })
  expires_at: Date;

  @Column({ type: 'datetime', nullable: true })
  used_at: Date | null;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  user: User;
}
