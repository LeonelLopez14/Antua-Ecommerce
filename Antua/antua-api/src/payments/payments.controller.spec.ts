import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsController } from './payments.controller';

describe('PaymentsController', () => {
  let controller: PaymentsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
    })
      // Cada dependencia (repositorios, servicios) se reemplaza por un mock vacío:
      // esta prueba solo verifica que la clase se pueda construir.
      .useMocker(() => ({}))
      .compile();

    controller = module.get<PaymentsController>(PaymentsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
