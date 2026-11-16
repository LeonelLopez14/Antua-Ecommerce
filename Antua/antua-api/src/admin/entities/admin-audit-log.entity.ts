import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from 'src/users/entities/user.entity';

/** Una fila por cada escritura del panel. Nunca guarda contraseñas, tokens ni datos de pago. */
@Entity('admin_audit_log')
@Index(['entity', 'entity_id'])
export class AdminAuditLog {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'admin_id' })
  admin: User | null;

  @Column({ type: 'varchar', length: 50 })
  action: string; // ej: "product.update", "order.status"

  @Column({ type: 'varchar', length: 50 })
  entity: string; // ej: "product", "order"

  @Column({ type: 'int', nullable: true })
  entity_id: number | null;

  // Resumen de qué cambió (campos y valores no sensibles).
  @Column({ type: 'json', nullable: true })
  changes: Record<string, unknown> | null;

  @CreateDateColumn()
  @Index()
  created_at: Date;
}
