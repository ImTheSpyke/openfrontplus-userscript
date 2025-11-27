
import * as gameInfos from "./gameInfos"
import * as Maps from "./Maps"

export { Maps}


type hash = number
export type Turn = {
    turnNumber: number, // 0.1s
    intents: Array<Intent>,
    hash?: hash
}

export type Client = {
  clientID: string,
  username: string,
  cosmetics: { [key: string]: any,
    flag?: string
  }
}

type TargetID = Client["clientID"] | null
type Tile = number | null
type Troops = number
type Emoji = 26 | number


export type Message = gameInfos.Message_Prestart
    | gameInfos.Message_Start
    | Message_Ping
    | Message_Join
    | Message_Turn
    | Message_Error


export type Message_Error = {
    type: "error",
    message: Buffer | any
}



export type Message_Ping = {
    type: "ping";
}

export type Message_Join = {
    type: "join",
    gameID: "3D7YSVMu",
    clientID: "aajjiThQ",
    lastTurn: 0,
    token: "c40aeb8d-8d43-43c8-ad76-08ec3102212c",
    username: "ImTheSpyke",
    cosmetics: {
        // "flag":"ch"
    }
}

export type UnitType = "Atom Bomb"
    | "City"
    | "Defense Post"
    | "Factory"
    | "Hydrogen Bomb"
    | "MIRV"
    | "Missile Silo"
    | "Port"
    | "SAM Launcher"
    | "Warship"

export type Message_Turn = {
    "type": "turn",
    "turn": Turn
}

export type Intent = Intent_Attack
    | Intent_BuildUnit
    | Intent_Spawn
    | Intent_breakAlliance
    | Intent_Boat
    | Intent_Emoji
    | Intent_MarkDisconnected
    | Intent_AllianceRequest
    | Intent_AllianceRequestReply
    | Intent_AllianceExtension
    | Intent_DonateTroops

type Intent_Attack = {
    clientID: Client["clientID"],
    type: 'attack',
    targetID: TargetID
    troops: Troops // 248319.53999999998
}

type Intent_BuildUnit = {
    clientID: Client["clientID"],
    tile: number // 2328752
    type: "build_unit"
    unit: UnitType
}

type Intent_AllianceExtension = {
  clientID: Client["clientID"],
  recipient: Client["clientID"]
  type: "allianceExtension",
}

type Intent_Spawn = {
  "clientID": Client["clientID"],
  "type": "spawn",
  "tile": Tile
}

type Intent_breakAlliance = {
  clientID: Client["clientID"],
  type: "breakAlliance",
  recipient: Client["clientID"],
}

type Intent_Boat = {
  clientID: Client["clientID"],
  targetID: TargetID
  type: "boat",
  troops: Troops,
  dst: Tile
  src: Tile
}

type Intent_Emoji = {
  clientID: Client["clientID"],
  recipient: Client["clientID"],
  type: "emoji",
  emoji: Emoji
}

type Intent_MarkDisconnected = {
  type: "mark_disconnected",
  clientID: Client["clientID"],
  isDisconnected: boolean
}

type Intent_AllianceRequest = {
  clientID: Client["clientID"],
  type: "allianceRequest",
  recipient: Client["clientID"]
}
type Intent_AllianceRequestReply = {
  clientID: Client["clientID"],
  requestor: Client["clientID"],
  type: "allianceRequestReply",
  accept: boolean
}

type Intent_DonateTroops = {
  clientID: Client["clientID"],
  type: "donate_troops",
  recipient: Client["clientID"],
  troops: Troops
}

export type IntentType = 'spawn'
    | 'allianceExtension'
    | 'allianceRequest'
    | 'allianceRequestReply'
    | 'attack'
    | 'boat'
    | 'breakAlliance'
    | 'build_unit'
    | 'cancel_attack'
    | 'delete_unit'
    | 'donate_gold'
    | 'donate_troops'
    | 'emoji'
    | 'mark_disconnected'
    | 'move_warship'
    | 'quick_chat'
    | 'targetPlayer'
    | 'upgrade_structure'



