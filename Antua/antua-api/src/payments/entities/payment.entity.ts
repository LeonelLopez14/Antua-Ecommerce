import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('payments')
export class Payment {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar', length: 30 })
    status: string;
}