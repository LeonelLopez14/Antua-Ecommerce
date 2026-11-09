import { Test, TestingModule } from '@nestjs/testing';
import { CartController } from './cart.controller';

describe('CartController', () => {
  let controller: CartController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CartController],
    })
      // Cada dependencia (repositorios, servicios) se reemplaza por un mock vacío:
      // esta prueba solo verifica que la clase se pueda construir.
      .useMocker(() => ({}))
      .compile();

    controller = module.get<CartController>(CartController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
