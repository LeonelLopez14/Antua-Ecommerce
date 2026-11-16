import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NewsletterSubscriber } from './entities/newsletter-subscriber.entity';

@Injectable()
export class NewsletterService {
  constructor(
    @InjectRepository(NewsletterSubscriber)
    private readonly subscribers: Repository<NewsletterSubscriber>,
  ) {}

  /** Idempotente: si el email ya estaba, no hace nada y responde lo mismo. */
  async subscribe(email: string): Promise<void> {
    // INSERT IGNORE y no el QueryBuilder: cuando la fila se ignora no hay id que TypeORM pueda leer.
    await this.subscribers.query(
      'INSERT IGNORE INTO newsletter_subscribers (email) VALUES (?)',
      [email.toLowerCase()],
    );
  }
}
