/**
 * Diagrama entidad-relación (Mermaid) generado a partir de las entidades de TypeORM: lo que se ve
 * en los README es lo que hay en el código, no un dibujo a mano.
 *
 *   pnpm --filter antua-api docs:er            # actualiza el bloque en README.md y README.en.md
 *   pnpm --filter antua-api docs:er --check    # sale con error si el bloque está desactualizado
 *   pnpm --filter antua-api docs:er --print    # solo lo muestra
 *
 * No se conecta a ninguna base: arma la metadata de las entidades en memoria.
 * Escribe entre las marcas <!-- er:start --> y <!-- er:end --> de cada README.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { DataSource } from 'typeorm';
import type { EntityMetadata } from 'typeorm';

const READMES = [
  join(__dirname, '..', '..', '..', 'README.md'),
  join(__dirname, '..', '..', '..', 'README.en.md'),
];
const START = '<!-- er:start -->';
const END = '<!-- er:end -->';

/** Tipo de columna corto y legible: varchar(155) → varchar, enum → enum. */
function columnType(type: unknown): string {
  if (typeof type === 'string') return type.split('(')[0].replace(/\s+/g, '_');
  // Columnas sin tipo explícito (ids, claves foráneas): el tipo de TypeScript, traducido al de MySQL.
  const fromJs: Record<string, string> = {
    Number: 'int',
    String: 'varchar',
    Boolean: 'boolean',
    Date: 'datetime',
  };
  if (typeof type === 'function') return fromJs[type.name] ?? type.name;
  return 'unknown';
}

export function renderErDiagram(entities: EntityMetadata[]): string {
  const sorted = [...entities].sort((a, b) =>
    a.tableName.localeCompare(b.tableName),
  );
  const lines = ['erDiagram'];
  for (const entity of sorted) {
    lines.push(`  ${entity.tableName} {`);
    for (const column of entity.columns) {
      const keys = [
        column.isPrimary ? 'PK' : '',
        column.relationMetadata ? 'FK' : '',
        !column.isPrimary &&
        entity.indices.some((i) => i.isUnique && i.columns.includes(column))
          ? 'UK'
          : '',
      ]
        .filter(Boolean)
        .join(',');
      lines.push(
        `    ${columnType(column.type)} ${column.databaseName}${keys ? ` ${keys}` : ''}`,
      );
    }
    lines.push('  }');
  }
  // Una línea por relación, desde el lado que tiene la clave foránea: muchos a uno (o{) y uno a
  // uno (o|, por ejemplo el carrito de un usuario).
  const relations = sorted.flatMap((entity) =>
    entity.relations
      .filter((relation) => relation.isManyToOne || relation.isOneToOneOwner)
      .map((relation) => {
        const parent = relation.inverseEntityMetadata.tableName;
        const optional = relation.isNullable ? 'o' : '|';
        const many = relation.isManyToOne ? 'o{' : 'o|';
        const columns = relation.joinColumns.map((c) => c.databaseName);
        return `  ${parent} |${optional}--${many} ${entity.tableName} : "${columns.join(', ')}"`;
      }),
  );
  return [...lines, ...relations.sort()].join('\n');
}

async function main() {
  const dataSource = new DataSource({
    type: 'mysql',
    // Solo para armar la metadata: nunca se conecta.
    database: 'sin_conexion',
    entities: [join(__dirname, '..', 'src', '**', '*.entity.{ts,js}')],
  });
  // buildMetadatas es interno en TypeORM, pero es justo lo que hace falta: metadata sin conexión.
  await (
    dataSource as unknown as { buildMetadatas(): Promise<void> }
  ).buildMetadatas();
  const block = `${START}\n\`\`\`mermaid\n${renderErDiagram(dataSource.entityMetadatas)}\n\`\`\`\n${END}`;

  if (process.argv.includes('--print')) {
    process.stdout.write(`${block}\n`);
    return;
  }
  const stale: string[] = [];
  for (const file of READMES) {
    const text = readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
    const start = text.indexOf(START);
    const end = text.indexOf(END);
    if (start < 0 || end < start)
      throw new Error(`Faltan las marcas ${START} / ${END} en ${file}`);
    const updated = text.slice(0, start) + block + text.slice(end + END.length);
    if (updated === text) continue;
    stale.push(file);
    if (!process.argv.includes('--check')) writeFileSync(file, updated);
  }
  if (process.argv.includes('--check') && stale.length) {
    throw new Error(
      `El diagrama ER está desactualizado en: ${stale.join(', ')}. Corré: pnpm --filter antua-api docs:er`,
    );
  }
  process.stdout.write(
    `Diagrama ER: ${dataSource.entityMetadatas.length} tablas. ${stale.length ? `Actualizado: ${stale.length} README.` : 'Sin cambios.'}\n`,
  );
}

if (require.main === module) {
  main().catch((error: unknown) => {
    process.stderr.write(`${String(error)}\n`);
    process.exitCode = 1;
  });
}
