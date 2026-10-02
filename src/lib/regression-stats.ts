// Ordinary least squares regression with t/F-tests (no external deps)

function logGamma(z: number): number {
  const c = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
  let x = z, y = z;
  let tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (let j = 0; j < 6; j++) ser += c[j] / ++y;
  return -tmp + Math.log((2.5066282746310005 * ser) / x);
}

function betacf(a: number, b: number, x: number): number {
  const MAXIT = 200, EPS = 3e-14, FPMIN = 1e-300;
  const qab = a + b, qap = a + 1, qam = a - 1;
  let c = 1, d = 1 - (qab * x) / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= MAXIT; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d; h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}

export function incBeta(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  if (x < (a + 1) / (a + b + 2)) return (bt * betacf(a, b, x)) / a;
  return 1 - (bt * betacf(b, a, 1 - x)) / b;
}

/** Two-sided p-value for t statistic */
export function tPValue(t: number, df: number): number {
  if (!isFinite(t)) return 0;
  return incBeta(df / (df + t * t), df / 2, 0.5);
}

/** Upper-tail p-value for F statistic */
export function fPValue(f: number, d1: number, d2: number): number {
  if (!isFinite(f) || f <= 0) return f > 0 ? 0 : 1;
  return incBeta(d2 / (d2 + d1 * f), d2 / 2, d1 / 2);
}

/** Critical t (two-sided, alpha) via bisection */
export function tCritical(alpha: number, df: number): number {
  let lo = 0, hi = 100;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    if (tPValue(mid, df) > alpha) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

function invert(m: number[][]): number[][] | null {
  const n = m.length;
  const a = m.map((row, i) => [...row, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);
  for (let i = 0; i < n; i++) {
    let p = i;
    for (let r = i + 1; r < n; r++) if (Math.abs(a[r][i]) > Math.abs(a[p][i])) p = r;
    if (Math.abs(a[p][i]) < 1e-12) return null;
    [a[i], a[p]] = [a[p], a[i]];
    const piv = a[i][i];
    for (let j = 0; j < 2 * n; j++) a[i][j] /= piv;
    for (let r = 0; r < n; r++) {
      if (r === i) continue;
      const f = a[r][i];
      for (let j = 0; j < 2 * n; j++) a[r][j] -= f * a[i][j];
    }
  }
  return a.map((row) => row.slice(n));
}

export interface Coefficient {
  name: string;
  estimate: number;
  se: number;
  t: number;
  p: number;
  vif?: number;
}

export interface RegressionResult {
  n: number;
  k: number;
  coefficients: Coefficient[];
  r2: number;
  adjR2: number;
  s: number;
  f: number;
  fP: number;
  dfResid: number;
  fitted: number[];
  residuals: number[];
  stdResiduals: number[];
  xtxInv: number[][];
}

/** xs: array of predictor columns (each length n) */
export function olsRegression(y: number[], xs: number[][], names: string[]): RegressionResult | null {
  const n = y.length;
  const k = xs.length;
  if (k === 0 || xs.some((c) => c.length !== n) || n < k + 2) return null;

  const X = Array.from({ length: n }, (_, i) => [1, ...xs.map((c) => c[i])]);
  const p = k + 1;
  const xtx = Array.from({ length: p }, (_, a) =>
    Array.from({ length: p }, (_, b) => X.reduce((s, row) => s + row[a] * row[b], 0))
  );
  const inv = invert(xtx);
  if (!inv) return null;
  const xty = Array.from({ length: p }, (_, a) => X.reduce((s, row, i) => s + row[a] * y[i], 0));
  const beta = inv.map((row) => row.reduce((s, v, j) => s + v * xty[j], 0));

  const fitted = X.map((row) => row.reduce((s, v, j) => s + v * beta[j], 0));
  const residuals = y.map((v, i) => v - fitted[i]);
  const yMean = y.reduce((a, b) => a + b, 0) / n;
  const sst = y.reduce((s, v) => s + (v - yMean) ** 2, 0);
  const sse = residuals.reduce((s, e) => s + e * e, 0);
  const dfResid = n - p;
  const mse = sse / dfResid;
  const s = Math.sqrt(mse);
  const r2 = sst === 0 ? 0 : 1 - sse / sst;
  const adjR2 = 1 - ((1 - r2) * (n - 1)) / dfResid;
  const f = ((sst - sse) / k) / mse;
  const fP = fPValue(f, k, dfResid);

  const coefficients: Coefficient[] = beta.map((b, j) => {
    const se = Math.sqrt(Math.max(0, mse * inv[j][j]));
    const t = se === 0 ? Infinity : b / se;
    return { name: j === 0 ? "Konstant" : names[j - 1], estimate: b, se, t, p: tPValue(t, dfResid) };
  });

  // VIF for each predictor (only if k >= 2)
  if (k >= 2) {
    xs.forEach((col, j) => {
      const others = xs.filter((_, i) => i !== j);
      const sub = olsRegression(col, others, others.map((_, i) => `x${i}`));
      coefficients[j + 1].vif = sub ? (sub.r2 >= 1 ? Infinity : 1 / (1 - sub.r2)) : undefined;
    });
  }

  const stdResiduals = residuals.map((e, i) => {
    const h = X[i].reduce((acc, v, a) => acc + v * X[i].reduce((s2, w, b) => s2 + inv[a][b] * w, 0), 0);
    return e / (s * Math.sqrt(Math.max(1e-12, 1 - h)));
  });

  return { n, k, coefficients, r2, adjR2, s, f, fP, dfResid, fitted, residuals, stdResiduals, xtxInv: inv };
}

/** Prediction with confidence and prediction intervals */
export function predict(res: RegressionResult, xVals: number[], alpha = 0.05) {
  const x0 = [1, ...xVals];
  const yhat = res.coefficients.reduce((s, c, j) => s + c.estimate * x0[j], 0);
  const h = x0.reduce((acc, v, a) => acc + v * x0.reduce((s2, w, b) => s2 + res.xtxInv[a][b] * w, 0), 0);
  const tc = tCritical(alpha, res.dfResid);
  const ci = tc * res.s * Math.sqrt(h);
  const pi = tc * res.s * Math.sqrt(1 + h);
  return { yhat, ciLow: yhat - ci, ciHigh: yhat + ci, piLow: yhat - pi, piHigh: yhat + pi };
}

/** Standard normal inverse (Acklam) for normal probability plot */
export function normInv(p: number): number {
  const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
  const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
  const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
  const pl = 0.02425;
  if (p < pl) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  if (p > 1 - pl) {
    const q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  const q = p - 0.5, r = q * q;
  return ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}
