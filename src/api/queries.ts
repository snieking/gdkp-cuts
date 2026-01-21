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

export const GET_CASTS_BY_TIME = `
query GetCastsByTime($code: String!, $startTime: Float!, $endTime: Float!, $abilityID: Float) {
  reportData {
    report(code: $code) {
      table(dataType: Casts, startTime: $startTime, endTime: $endTime, abilityID: $abilityID)
    }
  }
}
`;
