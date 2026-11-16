import { Order } from 'src/orders/entities/order.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

/** Un pago informado por el proveedor. No guarda payloads: traen datos personales del pagador. */
@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn()
  id: number;

  // Un pedido puede tener varios intentos (rechazado y después aprobado).
  @ManyToOne(() => Order, (order) => order.payments)
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column({ type: 'varchar', length: 100 })
  method: string;

  // Id del pago en el proveedor. Único: el mismo aviso no puede crear dos filas.
  @Column({ type: 'varchar', length: 100, nullable: true, unique: true })
  transaction_ref: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  amount: number;

  @Column({ type: 'varchar', length: 3, nullable: true })
  currency: string;

  @CreateDateColumn()
  created_at: Date;

  @Column({ type: 'datetime', nullable: true })
  paid_at: Date | null;

  @Column({ type: 'varchar', length: 30 })
  status: string;
}
