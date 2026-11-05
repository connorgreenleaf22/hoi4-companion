// Source coefficients use JavaScript's round-trip decimal representation, without display rounding.
// Compact calculator/aggregate formatting stays separate in its existing call sites.
export const sourceNumber=(value:number)=>String(value);
