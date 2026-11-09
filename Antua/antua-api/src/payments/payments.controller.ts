import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  ServiceUnavailableException,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { OptionalJwtAuthGuard } from 'src/auth/guards/optional-jwt-auth.guard';
import { PaymentsService } from './payments.service';
import { isValidWebhookSignature } from './webhook-signature';

type MaybeUserRequest = Request & { user?: { id: number } };

interface WebhookBody {
  type?: string;
}

const NUMERIC_ID = /^\d+$/;

@Controller()
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Get('payments/config')
  config() {
    return this.payments.getConfig();
  }

  // Ninguna de estas rutas recibe un monto: el total siempre sale del pedido guardado.
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post('orders/:id/payment')
  @UseGuards(OptionalJwtAuthGuard)
  start(
    @Param('id', ParseIntPipe) orderId: number,
    @Req() req: MaybeUserRequest,
    @Headers('x-order-token') accessToken: string | undefined,
  ) {
    return this.payments.startPayment(orderId, {
      userId: req.user?.id,
      accessToken,
    });
  }

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post('orders/:id/payment/retry')
  @UseGuards(OptionalJwtAuthGuard)
  retry(
    @Param('id', ParseIntPipe) orderId: number,
    @Req() req: MaybeUserRequest,
    @Headers('x-order-token') accessToken: string | undefined,
  ) {
    return this.payments.startPayment(orderId, {
      userId: req.user?.id,
      accessToken,
    });
  }

  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Get('orders/:id/payment')
  @UseGuards(OptionalJwtAuthGuard)
  status(
    @Param('id', ParseIntPipe) orderId: number,
    @Req() req: MaybeUserRequest,
    @Headers('x-order-token') accessToken: string | undefined,
    @Query('payment_id') paymentId: string | undefined,
  ) {
    return this.payments.getStatus(
      orderId,
      { userId: req.user?.id, accessToken },
      paymentId,
    );
  }

  // Lo llama Mercado Pago, no un navegador: la protección es la firma.
  @SkipThrottle()
  @Post('payments/webhook')
  @HttpCode(200)
  async webhook(
    @Headers('x-signature') signature: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
    @Query('data.id') dataId: string | undefined,
    @Body() body: WebhookBody,
  ) {
    const secret = this.payments.webhookSecret;
    if (!secret) {
      throw new ServiceUnavailableException('Pagos deshabilitados.');
    }
    if (!isValidWebhookSignature({ signature, requestId, dataId, secret })) {
      throw new UnauthorizedException('Firma invalida.');
    }

    // Otros tipos de aviso se confirman para que no se reintenten, sin procesarlos.
    if (body.type === 'payment' && dataId && NUMERIC_ID.test(dataId)) {
      await this.payments.syncPayment(dataId);
    }
    return { received: true };
  }
}
