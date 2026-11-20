// Se importa PRIMERO en trust-proxy.e2e-spec.ts: AppModule valida el entorno al cargarse,
// así que TRUST_PROXY tiene que estar definido antes de importarlo.
process.env.TRUST_PROXY = '1';
