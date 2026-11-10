// daily: the last 7 daily star gains, oldest first. Compares the last two days with the two days before.
export function twoDayGains(daily) {
  return { now: daily[5] + daily[6], before: daily[3] + daily[4] };
}

// A breakout gained enough in two days and is at least `accelerate` times faster than before.
export function isBreakout(daily, { minGain, accelerate }) {
  const { now, before } = twoDayGains(daily);
  return now >= minGain && now >= accelerate * before;
}
