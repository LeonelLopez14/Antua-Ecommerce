import { Test, TestingModule } from '@nestjs/testing';
import { AddressesController } from './addresses.controller';

describe('AddressesController', () => {
  let controller: AddressesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AddressesController],
    })
      // Cada dependencia (repositorios, servicios) se reemplaza por un mock vacío:
      // esta prueba solo verifica que la clase se pueda construir.
      .useMocker(() => ({}))
      .compile();

    controller = module.get<AddressesController>(AddressesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
