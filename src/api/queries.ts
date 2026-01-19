export const GET_REPORT_DATA = `
query GetReportData($code: String!) {
  reportData {
    report(code: $code) {
      startTime
      endTime
      zone {
        id
        name
      }
      fights(killType: Kills) {
        id
        name
        startTime
        endTime
        gameZone {
          name
        }
      }
      masterData {
        actors(type: "Player") {
          id
          name
          type
          subType
        }
      }
    }
  }
}
`;

export const GET_DAMAGE_DONE = `
query GetDamageDone($code: String!, $startTime: Float!, $endTime: Float!) {
  reportData {
    report(code: $code) {
      table(dataType: DamageDone, startTime: $startTime, endTime: $endTime)
    }
  }
}
`;

export const GET_HEALING_DONE = `
query GetHealingDone($code: String!, $startTime: Float!, $endTime: Float!) {
  reportData {
    report(code: $code) {
      table(dataType: Healing, startTime: $startTime, endTime: $endTime)
    }
  }
}
`;

export const GET_DAMAGE_TAKEN = `
query GetDamageTaken($code: String!, $startTime: Float!, $endTime: Float!) {
  reportData {
    report(code: $code) {
      table(dataType: DamageTaken, startTime: $startTime, endTime: $endTime)
    }
  }
}
`;

export const GET_BUFFS = `
query GetBuffs($code: String!, $startTime: Float!, $endTime: Float!) {
  reportData {
    report(code: $code) {
      table(dataType: Buffs, startTime: $startTime, endTime: $endTime)
    }
  }
}
`;

export const GET_DEBUFFS = `
query GetDebuffs($code: String!, $startTime: Float!, $endTime: Float!) {
  reportData {
    report(code: $code) {
      table(dataType: Debuffs, hostilityType: Enemies, startTime: $startTime, endTime: $endTime)
    }
  }
}
`;

export const GET_DISPELS = `
query GetDispels($code: String!, $startTime: Float!, $endTime: Float!) {
  reportData {
    report(code: $code) {
      table(dataType: Dispels, startTime: $startTime, endTime: $endTime)
    }
  }
}
`;

export const GET_CASTS_BY_FIGHT = `
query GetCastsByFight($code: String!, $fightIDs: [Int], $abilityID: Float) {
  reportData {
    report(code: $code) {
      table(dataType: Casts, fightIDs: $fightIDs, abilityID: $abilityID)
    }
  }
}
`;

export const GET_CASTS_BY_TIME = `
query GetCastsByTime($code: String!, $startTime: Float!, $endTime: Float!, $abilityID: Float) {
  reportData {
    report(code: $code) {
      table(dataType: Casts, startTime: $startTime, endTime: $endTime, abilityID: $abilityID)
    }
  }
}
`;

// Get combatant info for a specific fight (includes gear stats like frost resistance)
export const GET_COMBATANT_INFO = `
query GetCombatantInfo($code: String!, $fightIDs: [Int]!) {
  reportData {
    report(code: $code) {
      playerDetails(fightIDs: $fightIDs)
    }
  }
}
`;

// Get all fights including wipes (for checking gear on specific bosses)
export const GET_ALL_FIGHTS = `
query GetAllFights($code: String!) {
  reportData {
    report(code: $code) {
      fights {
        id
        name
        kill
        encounterID
        startTime
        endTime
      }
    }
  }
}
`;

// Get buffs by player for specific ability IDs
export const GET_BUFFS_BY_ABILITY = `
query GetBuffsByAbility($code: String!, $startTime: Float!, $endTime: Float!, $abilityID: Float!) {
  reportData {
    report(code: $code) {
      table(dataType: Buffs, startTime: $startTime, endTime: $endTime, abilityID: $abilityID)
    }
  }
}
`;

// Get damage taken by ability for specific fights
export const GET_DAMAGE_TAKEN_BY_ABILITY = `
query GetDamageTakenByAbility($code: String!, $fightIDs: [Int]!, $abilityID: Float!) {
  reportData {
    report(code: $code) {
      table(dataType: DamageTaken, fightIDs: $fightIDs, abilityID: $abilityID)
    }
  }
}
`;

// Get damage events for specific ability (includes resist info)
export const GET_DAMAGE_EVENTS = `
query GetDamageEvents($code: String!, $fightIDs: [Int]!, $startTime: Float!, $endTime: Float!) {
  reportData {
    report(code: $code) {
      events(fightIDs: $fightIDs, dataType: DamageTaken, hostilityType: Friendlies, startTime: $startTime, endTime: $endTime, limit: 10000) {
        data
        nextPageTimestamp
      }
      masterData {
        actors(type: "Player") {
          id
          name
          type
        }
      }
    }
  }
}
`;

// Get buffs table for specific fights
export const GET_BUFFS_BY_FIGHT = `
query GetBuffsByFight($code: String!, $fightIDs: [Int]!) {
  reportData {
    report(code: $code) {
      table(dataType: Buffs, fightIDs: $fightIDs)
    }
  }
}
`;

// Get raw combatant info events (contains gear and stats)
export const GET_COMBATANT_INFO_EVENTS = `
query GetCombatantInfoEvents($code: String!, $fightIDs: [Int]!) {
  reportData {
    report(code: $code) {
      events(fightIDs: $fightIDs, dataType: CombatantInfo, limit: 500) {
        data
      }
    }
  }
}
`;
