import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('newsletter_subscribers')
export class NewsletterSubscriber {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 155, unique: true })
  email: string;

  @CreateDateColumn()
  created_at: Date;
}
