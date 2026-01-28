// Western Electric Rules for detecting out-of-control conditions in control charts
// Reference: Western Electric Company (1956). Statistical Quality Control Handbook

export interface WEViolation {
  rule: number;
  description: string;
  points: number[];
}

export interface ChartDataPoint {
  sample: number;
  value: number;
  ucl: number;
  lcl: number;
  cl: number;
}

/**
 * Check Western Electric Rules for a control chart
 * @param data - Array of chart data points
 * @returns Array of violations found
 */
export function checkWesternElectricRules(data: ChartDataPoint[]): WEViolation[] {
  const violations: WEViolation[] = [];
  
  if (data.length < 2) return violations;

  const cl = data[0].cl;
  const ucl = data[0].ucl;
  const lcl = data[0].lcl;
  
  // Calculate sigma zones
  const sigma = (ucl - cl) / 3;
  const zone1Upper = cl + sigma;
  const zone2Upper = cl + 2 * sigma;
  const zone1Lower = cl - sigma;
  const zone2Lower = cl - 2 * sigma;

  // Rule 1: One point beyond 3σ (already handled by UCL/LCL)
  const rule1Points: number[] = [];
  data.forEach((point, i) => {
    if (point.value > ucl || point.value < lcl) {
      rule1Points.push(i + 1);
    }
  });
  if (rule1Points.length > 0) {
    violations.push({
      rule: 1,
      description: "En punkt utanför 3σ (kontrollgräns)",
      points: rule1Points
    });
  }

  // Rule 2: 9 consecutive points on same side of center line
  for (let i = 0; i <= data.length - 9; i++) {
    const segment = data.slice(i, i + 9);
    const allAbove = segment.every(p => p.value > cl);
    const allBelow = segment.every(p => p.value < cl);
    if (allAbove || allBelow) {
      violations.push({
        rule: 2,
        description: "9 punkter i rad på samma sida om centerlinjen",
        points: segment.map((_, j) => i + j + 1)
      });
      break; // Only report first occurrence
    }
  }

  // Rule 3: 6 consecutive points steadily increasing or decreasing
  for (let i = 0; i <= data.length - 6; i++) {
    const segment = data.slice(i, i + 6);
    let increasing = true;
    let decreasing = true;
    for (let j = 1; j < segment.length; j++) {
      if (segment[j].value <= segment[j - 1].value) increasing = false;
      if (segment[j].value >= segment[j - 1].value) decreasing = false;
    }
    if (increasing || decreasing) {
      violations.push({
        rule: 3,
        description: `6 punkter i rad ${increasing ? 'stigande' : 'fallande'}`,
        points: segment.map((_, j) => i + j + 1)
      });
      break;
    }
  }

  // Rule 4: 14 consecutive points alternating up and down
  for (let i = 0; i <= data.length - 14; i++) {
    const segment = data.slice(i, i + 14);
    let alternating = true;
    for (let j = 2; j < segment.length; j++) {
      const prevDirection = segment[j - 1].value > segment[j - 2].value;
      const currDirection = segment[j].value > segment[j - 1].value;
      if (prevDirection === currDirection) {
        alternating = false;
        break;
      }
    }
    if (alternating) {
      violations.push({
        rule: 4,
        description: "14 punkter i rad alternerande upp/ner",
        points: segment.map((_, j) => i + j + 1)
      });
      break;
    }
  }

  // Rule 5: 2 out of 3 consecutive points beyond 2σ on same side
  for (let i = 0; i <= data.length - 3; i++) {
    const segment = data.slice(i, i + 3);
    const aboveZone2 = segment.filter(p => p.value > zone2Upper).length;
    const belowZone2 = segment.filter(p => p.value < zone2Lower).length;
    if (aboveZone2 >= 2 || belowZone2 >= 2) {
      violations.push({
        rule: 5,
        description: "2 av 3 punkter utanför 2σ på samma sida",
        points: segment.map((_, j) => i + j + 1)
      });
      break;
    }
  }

  // Rule 6: 4 out of 5 consecutive points beyond 1σ on same side
  for (let i = 0; i <= data.length - 5; i++) {
    const segment = data.slice(i, i + 5);
    const aboveZone1 = segment.filter(p => p.value > zone1Upper).length;
    const belowZone1 = segment.filter(p => p.value < zone1Lower).length;
    if (aboveZone1 >= 4 || belowZone1 >= 4) {
      violations.push({
        rule: 6,
        description: "4 av 5 punkter utanför 1σ på samma sida",
        points: segment.map((_, j) => i + j + 1)
      });
      break;
    }
  }

  // Rule 7: 15 consecutive points within 1σ (stratification)
  for (let i = 0; i <= data.length - 15; i++) {
    const segment = data.slice(i, i + 15);
    const allWithinZone1 = segment.every(
      p => p.value >= zone1Lower && p.value <= zone1Upper
    );
    if (allWithinZone1) {
      violations.push({
        rule: 7,
        description: "15 punkter i rad inom 1σ (stratifiering)",
        points: segment.map((_, j) => i + j + 1)
      });
      break;
    }
  }

  // Rule 8: 8 consecutive points beyond 1σ on either side (mixture)
  for (let i = 0; i <= data.length - 8; i++) {
    const segment = data.slice(i, i + 8);
    const allOutsideZone1 = segment.every(
      p => p.value > zone1Upper || p.value < zone1Lower
    );
    if (allOutsideZone1) {
      violations.push({
        rule: 8,
        description: "8 punkter i rad utanför 1σ (blandning)",
        points: segment.map((_, j) => i + j + 1)
      });
      break;
    }
  }

  return violations;
}
