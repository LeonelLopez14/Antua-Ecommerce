import { Entity, PrimaryGeneratedColumn, OneToOne } from "typeorm";
import { User } from "../../users/entities/user.entity";

@Entity('cart')
export class Cart {
    @PrimaryGeneratedColumn()
    id: number;

    @OneToOne(() => User, (user) => user.cart)
    user: User;
}