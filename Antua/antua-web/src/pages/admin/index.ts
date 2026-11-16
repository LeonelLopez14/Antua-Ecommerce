/**
 * Todo el panel en un solo módulo: App.tsx lo importa con lazy(), así Vite arma un único
 * chunk de administración que solo se descarga al entrar a /admin (nunca en la tienda).
 */
export { default as AdminLayout } from './AdminLayout'
export { default as Dashboard } from './Dashboard'
export { default as Products } from './Products'
export { default as ProductEditor } from './ProductEditor'
export { default as Tags } from './Tags'
export { default as Coupons } from './Coupons'
export { default as CouponEditor } from './CouponEditor'
export { default as Orders } from './Orders'
export { default as OrderDetail } from './OrderDetail'
export { default as Reviews } from './Reviews'
export { default as Users } from './Users'
export { default as Audit } from './Audit'
