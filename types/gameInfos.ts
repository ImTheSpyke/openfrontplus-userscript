import { Turn, UnitType, Client } from "./openfront";
import * as Maps from "./Maps";

export type gameID = string;
type gameMap = Maps.gameMap;
type difficulty = "Medium" | string
type gameType = "Public" | string
type gameMode = "Team" | string
type gameMapSize = "Normal" | string
type playerTeams = string | "Duos" | "Quads"


type gameStartInfos_config = {
  "gameMap": gameMap,
    "difficulty": difficulty,
    "donateGold": boolean,
    "donateTroops": boolean,
    "gameType": gameType,
    "gameMode": gameMode,
    "gameMapSize": gameMapSize,
    "disableNPCs": boolean,
    "bots": number
    "infiniteGold": boolean,
    "infiniteTroops": boolean,
    "instantBuild": boolean,
    "maxPlayers": number,
    "disabledUnits": Array<UnitType> | any, // not sure
    "playerTeams": playerTeams
}

export type Message_Prestart = {
    type: "prestart",
    gameMap: gameMap,
    gameMapSize: gameMapSize,
}

export type Message_Start = {
  "type": "start",
  "turns": Array<Turn>
  "gameStartInfo": {
    "gameID": gameID
    "config": gameStartInfos_config,
    "players": Array<Client>
  }
}