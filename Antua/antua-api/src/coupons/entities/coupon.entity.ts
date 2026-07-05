import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('coupons')
export class Coupon {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar', length: 50, unique: true })
    code: string;
}