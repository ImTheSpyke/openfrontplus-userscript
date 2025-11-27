import * as Openfront from "./openfront";
export { Openfront }

export type LOGS = {
    attacks: log_attack[],
    players: player[],
    debug: any
}

export type log_attack = {
    turn: number,
    attacker: string,
    troops: number,
    troopsTxt: string,
    victim: string,
}

export type player = {
    id: string,
    username: string | null,
    connected: boolean
}
