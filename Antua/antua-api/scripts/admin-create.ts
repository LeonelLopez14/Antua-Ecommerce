/**
 * Crea un administrador (o asciende a uno existente con --promote). Es la ÚNICA forma
 * de obtener el rol admin: la web no puede asignarlo.
 *
 *   pnpm admin:create                       # pide nombre, email y contraseña
 *   ADMIN_EMAIL=… ADMIN_PASSWORD=… pnpm admin:create
 *   ADMIN_EMAIL=… pnpm admin:create --promote   # convierte en admin una cuenta existente
 *
 * La contraseña nunca va en el código ni en el repo, y no se muestra mientras se escribe.
 */
import * as bcrypt from 'bcrypt';
import { createInterface } from 'node:readline';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import dataSource from '../src/database/data-source';
import { User, UserRole } from '../src/users/entities/user.entity';
import { RegisterDto } from '../src/auth/dto/register.dto';

const BCRYPT_ROUNDS = 10;

function ask(question: string, hidden = false): Promise<string> {
  if (!process.stdin.isTTY) {
    throw new Error(
      'Sin terminal, pasá ADMIN_EMAIL, ADMIN_NAME y ADMIN_PASSWORD como variables de entorno.',
    );
  }
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  if (hidden) {
    // Reemplaza el eco de cada tecla por nada (la contraseña no queda en pantalla).
    const output = rl as unknown as { _writeToOutput: (text: string) => void };
    output._writeToOutput = (text: string) => {
      if (text.includes(question)) process.stdout.write(question);
    };
  }
  return new Promise((resolve) =>
    rl.question(question, (answer) => {
      rl.close();
      if (hidden) process.stdout.write('\n');
      resolve(answer.trim());
    }),
  );
}

/** Usa las mismas reglas que el registro (RegisterDto): política de contraseñas incluida. */
function validate(fullName: string, email: string, password: string): string[] {
  const dto = plainToInstance(RegisterDto, {
    full_name: fullName,
    email,
    password,
  });
  return validateSync(dto).flatMap((error) =>
    Object.values(error.constraints ?? {}),
  );
}

async function main(): Promise<void> {
  const promote = process.argv.includes('--promote');
  const email = (
    process.env.ADMIN_EMAIL ?? (await ask('Email: '))
  ).toLowerCase();

  await dataSource.initialize();
  try {
    const users = dataSource.getRepository(User);
    const existing = await users.findOneBy({ email });

    if (existing) {
      if (!promote) {
        throw new Error(
          `Ya existe una cuenta con ${email}. Para darle el rol admin, corré de nuevo con --promote.`,
        );
      }
      await users.update(existing.id, { role: UserRole.ADMIN });
      console.log(`Listo: la cuenta ${existing.id} ahora es administradora.`);
      return;
    }

    const fullName = process.env.ADMIN_NAME ?? (await ask('Nombre completo: '));
    const password =
      process.env.ADMIN_PASSWORD ?? (await ask('Contraseña: ', true));
    const errors = validate(fullName, email, password);
    if (errors.length > 0)
      throw new Error(`Datos inválidos:\n- ${errors.join('\n- ')}`);

    const user = await users.save(
      users.create({
        full_name: fullName,
        email,
        password_hash: await bcrypt.hash(password, BCRYPT_ROUNDS),
        role: UserRole.ADMIN,
      }),
    );
    console.log(`Listo: administrador creado con id ${user.id}.`);
  } finally {
    await dataSource.destroy();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
