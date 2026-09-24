/**
 * Estimated winning bid from BC's Interior market pricing system, November
 * 2010 specification (Timber Pricing Branch, "Specifications: The Interior
 * Market Pricing System", §2–4; Legislative Library of BC, bcdocs2011/469332).
 *
 * The equation gives real $/m³ of coniferous cruise volume, then scales by
 * CPI ÷ 109.3. Only the terms a VRI stand record can feed are included; the
 * flags for partial cutting, cable or helicopter yarding, fire damage, decked
 * volume, Fort Nelson–Peace, 2009 auctions, highway haul and cruise-based
 * sales are all 0. The game uses the result only to rank lots against each
 * other; the market inputs are assumptions, not published parameters.
 */
export const INTERIOR_BID_2010 = {
  constant: 32.85, sellingPrice: 0.152, exchangeRate: -11.86, logConiferM3PerHa: 1.50,
  hembal: -18.91, cedar: 37.08, logVolume: 1.71, logVolumePerTree: 8.70, decay: -19.10,
  slopePct: -0.0209, cycleHours: -1.01, danb: 0.871, totalAttack: -5.56, baseCpi: 109.3,
};
/** District average number of bidders, 2010 specification appendix 1. */
export const PRINCE_GEORGE_DANB = 3.6;

export interface BidLot {
  coniferM3: number; coniferM3PerHa: number; m3PerTree: number;
  /** Fractions of coniferous volume. */
  hembal: number; cedar: number; decay: number; beetleAttack: number;
  slopePct: number; cycleHours: number; danb: number;
}
export interface BidMarket {
  /** Coniferous lumber value per m³ of log: recovery (fbm/m³) × lumber value ($/fbm). */
  sellingPriceIndex: number; usdPerCad: number; cpi: number;
}

/** Nominal estimated winning bid, $/m³ of coniferous volume (minimum 0.25). */
export function estimatedWinningBid(lot: BidLot, market: BidMarket): number {
  const c = INTERIOR_BID_2010, cpif = market.cpi / c.baseCpi;
  const real = c.constant
    + c.sellingPrice * market.sellingPriceIndex / cpif
    + c.exchangeRate * market.usdPerCad
    + c.logConiferM3PerHa * Math.log(lot.coniferM3PerHa)
    + c.hembal * lot.hembal + c.cedar * lot.cedar
    + c.logVolume * Math.log(lot.coniferM3 / 1000)
    + c.logVolumePerTree * Math.log(lot.m3PerTree)
    + c.decay * lot.decay + c.slopePct * lot.slopePct + c.cycleHours * lot.cycleHours
    + c.danb * lot.danb + c.totalAttack * lot.beetleAttack;
  return Math.max(0.25, real) * cpif;
}
