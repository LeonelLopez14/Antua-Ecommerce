import { Coupon } from 'src/coupons/entities/coupon.entity';
import { couponRuleErrors, couponStatus } from './admin-coupons.service';
import { normalizeCouponCode } from './admin-coupon.dto';

const day = 86_400_000;
const now = new Date('2026-11-15T12:00:00Z');

function coupon(overrides: Partial<Coupon>): Coupon {
  return Object.assign(new Coupon(), {
    is_active: true,
    valid_from: new Date(now.getTime() - day),
    valid_until: new Date(now.getTime() + day),
    usage_limit: null,
    times_used: 0,
    ...overrides,
  });
}

describe('cupones', () => {
  it('normaliza el código', () => {
    expect(normalizeCouponCode(' verano 20 ')).toBe('VERANO20');
  });

  it('valida el porcentaje y las fechas', () => {
    const base = {
      discount_type: 'percentage',
      discount_value: 10,
      valid_from: now,
      valid_until: new Date(now.getTime() + day),
    };
    expect(couponRuleErrors(base)).toEqual([]);
    expect(couponRuleErrors({ ...base, discount_value: 120 })).toHaveLength(1);
    expect(couponRuleErrors({ ...base, discount_value: 0.5 })).toHaveLength(1);
    expect(
      couponRuleErrors({
        ...base,
        discount_type: 'fixed',
        discount_value: 1500,
      }),
    ).toEqual([]);
    expect(
      couponRuleErrors({ ...base, valid_until: new Date('2099-01-01') }),
    ).toEqual(['Las fechas tienen que estar entre 1971 y 2037.']);
    expect(couponRuleErrors({ ...base, valid_until: now })).toEqual([
      'La fecha de fin tiene que ser posterior a la de inicio.',
    ]);
  });

  it('calcula el estado', () => {
    expect(couponStatus(coupon({}), now)).toBe('active');
    expect(couponStatus(coupon({ is_active: false }), now)).toBe('inactive');
    expect(
      couponStatus(coupon({ valid_from: new Date(now.getTime() + day) }), now),
    ).toBe('scheduled');
    expect(
      couponStatus(coupon({ valid_until: new Date(now.getTime() - 1) }), now),
    ).toBe('expired');
    expect(couponStatus(coupon({ usage_limit: 3, times_used: 3 }), now)).toBe(
      'exhausted',
    );
  });
});
