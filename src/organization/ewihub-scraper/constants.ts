export const MAX_RETRIES = 10;

export const MIN_DELAY_MS = 300;
export const MAX_DELAY_MS = 800;
export const CONCURRENCY = 1;

export function randomDelay(min = MIN_DELAY_MS, max = MAX_DELAY_MS): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function humanSleep(min = MIN_DELAY_MS, max = MAX_DELAY_MS): Promise<void> {
  return new Promise((r) => setTimeout(r, randomDelay(min, max)));
}

export interface BrowserProfile {
  userAgent: string;
  secChUa: string;
  secChUaPlatform: string;
  secChUaMobile: string;
}

export const BROWSER_PROFILES: BrowserProfile[] = [
  {
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    secChUa: '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
    secChUaPlatform: '"Windows"',
    secChUaMobile: '?0',
  },
  {
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    secChUa: '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
    secChUaPlatform: '"macOS"',
    secChUaMobile: '?0',
  },
  {
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
    secChUa: '"Google Chrome";v="130", "Chromium";v="130", "Not_A Brand";v="99"',
    secChUaPlatform: '"Windows"',
    secChUaMobile: '?0',
  },
  {
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
    secChUa: '"Google Chrome";v="130", "Chromium";v="130", "Not_A Brand";v="99"',
    secChUaPlatform: '"macOS"',
    secChUaMobile: '?0',
  },
  {
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0',
    secChUa: '', // Firefox doesn't send sec-ch-ua
    secChUaPlatform: '',
    secChUaMobile: '',
  },
];

export function pickBrowserProfile(): BrowserProfile {
  return BROWSER_PROFILES[Math.floor(Math.random() * BROWSER_PROFILES.length)];
}

export const ATTR_ALIASES: Record<string, string> = {
  started: 'startedOn',
  'started on': 'startedOn',
  completed: 'completedOn',
  'completed on': 'completedOn',
  age: 'age',
  height: 'height',
  'dominant hand': 'dominantHand',
  dominanthand: 'dominantHand',
  handedness: 'dominantHand',
  bifocals: 'bifocals',
  'visual issue': 'visualIssue',
  visualissue: 'visualIssue',
  'computer time': 'computerTime',
  computertime: 'computerTime',
  'dual monitor': 'dualMonitor',
  dualmonitor: 'dualMonitor',
  'dual monitors': 'dualMonitor',
  laptop: 'laptop',
  'sit to stand': 'sitToStand',
  sittostand: 'sitToStand',
  'sit to stand desk': 'sitToStand',
  demographic: 'demographic',
  demographics: 'demographic',
  discomfort: 'discomfort',
  discomforts: 'discomfortAreas',
  'discomfort areas': 'discomfortAreas',
  discomfortareas: 'discomfortAreas',
  'adjustment result': 'adjustmentResult',
  adjustmentresult: 'adjustmentResult',
  action: 'actionNeeded',
  actions: 'actionNeeded',
  'action needed': 'actionNeeded',
  actionneeded: 'actionNeeded',
  equipment: 'equipmentNeeded',
  'equipment needed': 'equipmentNeeded',
  equipmentneeded: 'equipmentNeeded',
  result: 'result',
  issues: 'adjustmentResult',
};

export const BODY_PART_ALIASES: Record<string, string> = {
  'upper-back': 'upperBack',
  'mid-back': 'midBack',
  'lower-back': 'lowerBack',
  buttocks: 'buttocks',
  head: 'head',
  neck: 'neck',
  eyes: 'eyes',
  'left-shoulder': 'leftShoulder',
  'right-shoulder': 'rightShoulder',
  'left-upper-arm': 'leftUpperArm',
  'right-upper-arm': 'rightUpperArm',
  'left-elbow': 'leftElbow',
  'right-elbow': 'rightElbow',
  'left-lower-arm': 'leftLowerArm',
  'right-lower-arm': 'rightLowerArm',
  'left-wrist': 'leftWrist',
  'right-wrist': 'rightWrist',
  'left-hand': 'leftHand',
  'right-hand': 'rightHand',
  'left-thigh': 'leftThigh',
  'right-thigh': 'rightThigh',
  'left-knee': 'leftKnee',
  'right-knee': 'rightKnee',
  'left-lower-leg': 'leftLowerLeg',
  'right-lower-leg': 'rightLowerLeg',
  'left-foot-or-ankle': 'leftFootOrAnkle',
  'right-foot-or-ankle': 'rightFootOrAnkle',
};