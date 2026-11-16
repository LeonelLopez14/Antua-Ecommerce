import request from 'supertest';
import { DataSource } from 'typeorm';
import {
  buyAndDeliver,
  createProduct,
  createTestApp,
  registerUser,
  resetDatabase,
  TestApp,
} from './helpers';

describe('reseñas', () => {
  let app: TestApp;
  let db: DataSource;

  beforeAll(async () => {
    ({ app, db } = await createTestApp());
  });
  beforeEach(() => resetDatabase(db));
  afterAll(() => app.close());

  const server = () => app.getHttpServer();
  const auth = (token: string) => `Bearer ${token}`;

  const authorWithReview = async () => {
    const { product, variant } = await createProduct(db, 'a');
    const author = await registerUser(app, 'autora@antua.test');
    await buyAndDeliver(app, db, author.token, variant.id);
    const res = await request(server())
      .post(`/products/${product.slug}/reviews`)
      .set('Authorization', auth(author.token))
      .send({ rating: 4, comment: 'Rica' })
      .expect(201);
    return {
      product,
      variant,
      author,
      reviewId: (res.body as { id: number }).id,
    };
  };

  it('el listado público no expone el email ni el teléfono del autor', async () => {
    const { product } = await authorWithReview();
    const res = await request(server())
      .get(`/products/${product.slug}/reviews`)
      .expect(200);
    const [review] = res.body as { user: Record<string, unknown> }[];
    expect(Object.keys(review.user).sort()).toEqual(['full_name', 'id']);
    expect(JSON.stringify(res.body)).not.toContain('autora@antua.test');
  });

  it('mantiene las reglas: comprar y recibir, y una por producto', async () => {
    const { product, author } = await authorWithReview();
    const other = await registerUser(app, 'sin-compra@antua.test');

    await request(server())
      .post(`/products/${product.slug}/reviews`)
      .set('Authorization', auth(other.token))
      .send({ rating: 5 })
      .expect(403);
    await request(server())
      .post(`/products/${product.slug}/reviews`)
      .set('Authorization', auth(author.token))
      .send({ rating: 5 })
      .expect(409);
  });

  it('la autora puede editar y borrar su reseña', async () => {
    const { product, author, reviewId } = await authorWithReview();
    const url = `/products/${product.slug}/reviews/${reviewId}`;

    const edited = await request(server())
      .patch(url)
      .set('Authorization', auth(author.token))
      .send({ rating: 2, comment: 'Cambié de idea' })
      .expect(200);
    expect(edited.body).toMatchObject({
      rating: 2,
      comment: 'Cambié de idea',
    });

    await request(server())
      .delete(url)
      .set('Authorization', auth(author.token))
      .expect(204);
    const list = await request(server())
      .get(`/products/${product.slug}/reviews`)
      .expect(200);
    expect(list.body).toEqual([]);
  });

  it('otra persona no puede editarla ni borrarla', async () => {
    const { product, reviewId } = await authorWithReview();
    const other = await registerUser(app, 'otra@antua.test');
    const url = `/products/${product.slug}/reviews/${reviewId}`;

    await request(server())
      .patch(url)
      .set('Authorization', auth(other.token))
      .send({ rating: 1 })
      .expect(404);
    await request(server())
      .delete(url)
      .set('Authorization', auth(other.token))
      .expect(404);
    await request(server()).delete(url).expect(401);
  });

  it('valida la calificación al editar', async () => {
    const { product, author, reviewId } = await authorWithReview();
    await request(server())
      .patch(`/products/${product.slug}/reviews/${reviewId}`)
      .set('Authorization', auth(author.token))
      .send({ rating: 9 })
      .expect(400);
  });
});
