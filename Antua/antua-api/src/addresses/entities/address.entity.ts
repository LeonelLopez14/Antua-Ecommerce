import { Entity, PrimaryGeneratedColumn, ManyToOne, Column } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('addresses')
export class Address {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => User, (user) => user.addresses)
    user: User;

    @Column({ type: 'varchar', length: 50, nullable: true })
    label: string; // ej: "Casa", "Trabajo"

    @Column({ type: 'varchar', length: 200 })
    street: string;

    @Column({ type: 'varchar', length: 200 })
    city: string;

    @Column({ type: 'varchar', length: 20 })
    postal_code: string;

    @Column({ type: 'varchar', length: 200 })
    country: string;

    @Column({ type: 'boolean', default: false })
    is_default: boolean;

}