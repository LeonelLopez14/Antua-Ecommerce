import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { SubscribeDto } from './dto/subscribe.dto';
import { NewsletterService } from './newsletter.service';

@Controller('newsletter')
export class NewsletterController {
  constructor(private readonly newsletter: NewsletterService) {}

  // La misma respuesta para un email nuevo o uno ya suscripto: no revela quién está en la lista.
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('subscribe')
  @HttpCode(200)
  async subscribe(@Body() dto: SubscribeDto) {
    await this.newsletter.subscribe(dto.email);
    return { message: 'Listo, te sumamos a la lista.' };
  }
}
