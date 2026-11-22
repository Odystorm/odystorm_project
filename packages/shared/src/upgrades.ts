export interface HangarUpgradeTier {
  id: string;
  tool: string;
  description: string;
  shipLevel: number; // Mining rate ($ODY / sec) & weapon tier (2..16)
  farmPeriodHours: number; // Mining duration in hours (2..9)
  shipCost: number; // Cost to upgrade Mining Ship to this level
  energyCost: number; // Cost to upgrade Energy Core to this duration (shipCost / 2)
}

export const HANGAR_UPGRADES: readonly HangarUpgradeTier[] = [
  {
    id: 'adaptive-shields',
    tool: 'Adaptive Shields',
    description: 'Energy-efficient deflectors stabilizing deep-sector mining.',
    shipLevel: 2,
    farmPeriodHours: 2,
    shipCost: 80_000,
    energyCost: 40_000,
  },
  {
    id: 'cargo-expander',
    tool: 'Cargo Expander',
    description: 'Pressurized ore bays increasing $ODY extraction throughput.',
    shipLevel: 3,
    farmPeriodHours: 2.5,
    shipCost: 160_000,
    energyCost: 80_000,
  },
  {
    id: 'neural-interface',
    tool: 'Neural Interface',
    description: 'Direct pilot-to-hull telemetry link for faster targeting.',
    shipLevel: 4,
    farmPeriodHours: 3,
    shipCost: 240_000,
    energyCost: 120_000,
  },
  {
    id: 'cryo-sleep-pods',
    tool: 'Cryo Sleep Pods',
    description: 'Sustains crew operations across extended orbital shifts.',
    shipLevel: 5,
    farmPeriodHours: 3.5,
    shipCost: 360_000,
    energyCost: 180_000,
  },
  {
    id: 'hyperspace-scanner',
    tool: 'Hyperspace Scanner',
    description: 'Long-range spectral array pinpointing high-yield veins.',
    shipLevel: 6,
    farmPeriodHours: 4,
    shipCost: 400_000,
    energyCost: 200_000,
  },
  {
    id: 'robotic-harvesters',
    tool: 'Robotic Harvesters',
    description: 'Autonomous drone swarm accelerating ore collection.',
    shipLevel: 7,
    farmPeriodHours: 4.5,
    shipCost: 450_000,
    energyCost: 225_000,
  },
  {
    id: 'ai-copilot',
    tool: 'AI Co-Pilot',
    description: 'Tactical combat & trajectory optimization processor.',
    shipLevel: 8,
    farmPeriodHours: 5,
    shipCost: 500_000,
    energyCost: 250_000,
  },
  {
    id: 'nano-alloy-armor',
    tool: 'Nano Alloy Armor',
    description: 'Self-sealing composite plating built for meteor storms.',
    shipLevel: 9,
    farmPeriodHours: 5.5,
    shipCost: 600_000,
    energyCost: 300_000,
  },
  {
    id: 'solar-sails',
    tool: 'Solar Sails',
    description: 'Photonic collectors trickle-charging auxiliary capacitors.',
    shipLevel: 10,
    farmPeriodHours: 6,
    shipCost: 650_000,
    energyCost: 325_000,
  },
  {
    id: 'fusion-reactor',
    tool: 'Fusion Reactor',
    description: 'High-density deuterium core powering tri-barrel cannons.',
    shipLevel: 11,
    farmPeriodHours: 6.5,
    shipCost: 700_000,
    energyCost: 350_000,
  },
  {
    id: 'graviton-field-generator',
    tool: 'Graviton Field Generator',
    description: 'Localized gravity wells pulling $ODY shards toward hull.',
    shipLevel: 12,
    farmPeriodHours: 7,
    shipCost: 750_000,
    energyCost: 375_000,
  },
  {
    id: 'quantum-drive',
    tool: 'Quantum Drive',
    description: 'Phase-locked propulsion for rapid sector maneuvers.',
    shipLevel: 13,
    farmPeriodHours: 7.5,
    shipCost: 800_000,
    energyCost: 400_000,
  },
  {
    id: 'warp-stabilizer',
    tool: 'Warp Stabilizer',
    description: 'Maintains field coherence during high-intensity extraction.',
    shipLevel: 14,
    farmPeriodHours: 8,
    shipCost: 850_000,
    energyCost: 425_000,
  },
  {
    id: 'plasma-thrusters',
    tool: 'Plasma Thrusters',
    description: 'Superheated ion vectored thrusters maximizing agility.',
    shipLevel: 15,
    farmPeriodHours: 8.5,
    shipCost: 900_000,
    energyCost: 450_000,
  },
  {
    id: 'advanced-life-support',
    tool: 'Advanced Life Support',
    description: 'Closed-loop flagship biosphere unlocking peak fleet output.',
    shipLevel: 16,
    farmPeriodHours: 9,
    shipCost: 1_000_000,
    energyCost: 500_000,
  },
] as const;

export const OFFICER_RANKS: readonly string[] = [
  'Cadet',
  'Ensign',
  'Lieutenant Junior Grade',
  'Lieutenant',
  'Lieutenant Commander',
  'Commander',
  'Captain',
  'Commodore',
  'Rear Admiral',
  'Vice Admiral',
  'Admiral',
  'Fleet Admiral',
  'Chief of Operations',
  'Supreme Commander',
  'Galaxy Overlord',
  'Master of the Universe',
] as const;

export function getOfficerRank(shipLevel: number): string {
  const clamped = Math.max(1, Math.min(OFFICER_RANKS.length, Math.floor(shipLevel || 1)));
  return OFFICER_RANKS[clamped - 1];
}

export function getNextShipUpgrade(currentShipLevel: number): HangarUpgradeTier | null {
  return HANGAR_UPGRADES.find((tier) => tier.shipLevel === currentShipLevel + 1) ?? null;
}

export function getNextEnergyUpgrade(currentEnergyHours: number): HangarUpgradeTier | null {
  if (currentEnergyHours <= 1) {
    return HANGAR_UPGRADES[0];
  }
  const currentIndex = HANGAR_UPGRADES.findIndex(
    (tier) => Math.abs(tier.farmPeriodHours - currentEnergyHours) < 0.001
  );
  if (currentIndex === -1 || currentIndex + 1 >= HANGAR_UPGRADES.length) {
    return null;
  }
  return HANGAR_UPGRADES[currentIndex + 1];
}

export function calculateMiningReward(durationHours: number, shipLevel: number): number {
  const totalSeconds = Math.floor(durationHours * 3600);
  return Math.max(0, totalSeconds * Math.max(1, Math.floor(shipLevel)));
}

export interface ShipCombatStats {
  barrels: 1 | 2 | 3 | 4;
  fireCooldownMs: number;
  projectileDamage: number;
  maxHull: number;
  moveSpeed: number;
  rewardMultiplier: number;
  weaponLabel: string;
}

export function getShipCombatStats(shipLevel: number, energyHours: number): ShipCombatStats {
  const lvl = Math.max(1, Math.min(16, Math.floor(shipLevel || 1)));
  const hrs = Math.max(1, Math.min(9, Number(energyHours || 1)));

  const barrels: 1 | 2 | 3 | 4 =
    lvl >= 14 ? 4 : lvl >= 10 ? 3 : lvl >= 5 ? 2 : 1;

  const weaponLabel =
    barrels === 4
      ? 'Quad Quantum Lance'
      : barrels === 3
      ? 'Tri-Pulse Cannon'
      : barrels === 2
      ? 'Twin Ion Blaster'
      : 'Pulse Laser Mk.I';

  const fireCooldownMs = Math.max(115, 240 - (lvl - 1) * 8);
  const projectileDamage = 10 + (lvl - 1) * 2;
  const maxHull = 3 + Math.floor((hrs - 1) / 1.5);
  const moveSpeed = 340 + (lvl - 1) * 8;
  const rewardMultiplier = Number((1 + (lvl - 1) * 0.12).toFixed(2));

  return {
    barrels,
    fireCooldownMs,
    projectileDamage,
    maxHull,
    moveSpeed,
    rewardMultiplier,
    weaponLabel,
  };
}
