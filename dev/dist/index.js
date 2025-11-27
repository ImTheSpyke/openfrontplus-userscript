"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ws_1 = __importDefault(require("ws"));
const fs_1 = __importDefault(require("fs"));
const gameID = "PiUNqm6v";
function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
}
function timePrefix() {
    let d = new Date();
    return `[${d.toISOString()}]`;
}
/*
function tileToCoordinates(tile: number, width: number, height: number): { x: number; y: number } {
    if (tile < 0 || tile >= width * height) {
        throw new Error("Tile index out of bounds");
    }

    const x = tile % width;
    const y = Math.floor(tile / width);

    return { x, y };
}
    */
let workerID = simpleHash(gameID) % 20;
console.log("Worker ID:", workerID);
const URL = "wss://openfront.io/w" + workerID;
const ws = new ws_1.default(URL);
ws.on("open", () => {
    console.log("Connected to", URL);
    ws.send(JSON.stringify({ "type": "join", "gameID": gameID, "clientID": "aabjiThQ", "lastTurn": 0, "token": "c40aeb8d-8d43-43c8-ad76-08ec3102212c", "username": "ImTheSpyke", "cosmetics": { "flag": "ch" } }));
    pingInterval = setInterval(() => {
        ws.send(JSON.stringify({ "type": "ping" }));
    }, 5000);
});
let pingInterval = null;
function turnNumToTime(turnNum) {
    // turnNum = 0.1s
    const totalSeconds = Math.floor(turnNum / 10);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}m ${seconds}s`;
}
if (turnNumToTime(1490) !== "2m 29s") {
}
ws.on("message", (message) => {
    let msg = JSON.parse(message.toString());
    //console.log(`${msg.type} message received.`,msg);
    if (msg.type === "error") {
        console.error("Error message received:", Buffer.from(msg.message).toString());
    }
    if (msg.type === "turn") {
        // console.log(`[${turnNumToTime(msg.turn.turnNumber)}] Turn:`, JSON.stringify(msg,null,2));
        processTurn(msg.turn);
    }
    if (msg.type === "start") {
        console.log("Game started with", msg.gameStartInfo.players.length, "players.");
        msg.gameStartInfo.players.forEach((player) => {
            if (LOGS.players.findIndex(p => p.id === player.clientID) === -1) {
                LOGS.players.push({
                    id: player.clientID,
                    username: player.username,
                    connected: true
                });
            }
            else {
                const playerIndex = LOGS.players.findIndex(p => p.id === player.clientID);
                LOGS.players[playerIndex].connected = true;
                LOGS.players[playerIndex].username = player.username;
            }
        });
    }
    if (LOGS.debug.messageTypes.indexOf(msg.type) === -1) {
        LOGS.debug.messageTypes.push(msg.type);
    }
});
ws.on("close", () => {
    console.log("Connection closed");
    clearInterval(pingInterval);
});
ws.on("error", (err) => {
    console.error("WebSocket error:", err);
});
const LOGS = {
    "attacks": [],
    "players": [],
    "debug": {
        "units": [],
        messageTypes: [],
        builds: [],
        alliances: []
    }
};
console.log(LOGS);
function logToFilename(fileName, data) {
    fs_1.default.writeFileSync(`logs/${fileName}`, data);
}
function appendToFilename(fileName, data) {
    fs_1.default.appendFileSync(`logs/${fileName}`, data);
}
function numToKMB(num) {
    if (num >= 1_000_000_000) {
        return (num / 1_000_000_000).toFixed(1) + "B";
    }
    else if (num >= 1_000_000) {
        return (num / 1_000_000).toFixed(1) + "M";
    }
    else if (num >= 1_000) {
        return (num / 1_000).toFixed(1) + "k";
    }
    else {
        return num.toFixed(0);
    }
}
function getPlayerFromID(id) {
    return LOGS.players.find(p => p.id === id);
}
function processTurn(turnData) {
    // console.log(`${turnNumToTime(turnData.turnNumber)} - Processing turn ${turnData.turnNumber} with ${turnData.intents.length} intents.`);
    turnData.intents.forEach((intent) => {
        if (intent.type === "attack") {
            LOGS.attacks.push({
                turn: turnData.turnNumber,
                attacker: intent.clientID,
                troops: intent.troops,
                troopsTxt: numToKMB(intent.troops),
                victim: intent.targetID
            });
        }
        if (intent.type === "build_unit") {
            LOGS.debug.builds.push({
                turn: turnData.turnNumber,
                builder: intent.clientID,
                unit: intent.unit,
                tile: intent.tile
            });
        }
    });
    turnData.intents.forEach((intent) => {
        const playerIndex = LOGS.players.findIndex(p => p.id === intent.clientID);
        if (playerIndex === -1) {
            LOGS.players.push({
                id: intent.clientID,
                username: null,
                connected: true
            });
        }
        else {
            LOGS.players[playerIndex].connected = true;
        }
    });
    turnData.intents.forEach((intent) => {
        processIntent(intent);
        if (intent.type === "mark_disconnected") {
            const playerIndex = LOGS.players.findIndex(p => p.id === intent.clientID);
            if (playerIndex !== -1) {
                LOGS.players[playerIndex].connected = !intent.isDisconnected;
            }
        }
    });
    logToFilename("attacks.json", JSON.stringify(LOGS.attacks, null, 2));
    logToFilename("players.json", JSON.stringify(LOGS.players, null, 2));
    logToFilename("debug.json", JSON.stringify(LOGS.debug, null, 2));
}
function processIntent(intent) {
    appendToFilename("all_intents.log", `${timePrefix()} [${intent.type}] from ${intent.clientID}: ${JSON.stringify(intent)}\n`);
    if (intent.clientID == "WDj2e1K6") {
        console.log(`${timePrefix()} ${intent.type} intent from ${intent.clientID}`, intent);
    }
    if (intent.type == "allianceRequest") {
        let text = `${timePrefix()} [${intent.type}] ${intent.clientID} asked ${intent.recipient} (${getPlayerFromID(intent.clientID)?.username || "Unknown"} asked ${getPlayerFromID(intent.recipient)?.username || "Unknown"})`;
        console.log(text);
        appendToFilename("alliances.log", text + "\n");
    }
    else if (intent.type == "allianceRequestReply") {
        let text = `${timePrefix()} [${intent.type}] ${intent.clientID} accepted ${intent.requestor} (${getPlayerFromID(intent.clientID)?.username || "Unknown"} accepted ${getPlayerFromID(intent.requestor)?.username || "Unknown"})`;
        appendToFilename("alliances.log", text + "\n");
        if (intent.accept == true) {
            console.log(text);
            LOGS.debug.alliances.push({
                players: [
                    intent.clientID,
                    intent.requestor
                ],
                expiresAt: Date.now() + 1000 * 60 * 5,
                createdAt: Date.now(),
                createdAtText: (new Date()).toISOString()
            });
        }
        appendToFilename("alliances.log", `${timePrefix()} Alliances of now are: ${JSON.stringify(LOGS.debug.alliances)}\n`);
    }
    else if (intent.type == "breakAlliance") {
        appendToFilename("alliances.log", `${timePrefix()} [${intent.type}] ${intent.clientID} broke alliance with ${intent.recipient}\n`);
        LOGS.debug.alliances = LOGS.debug.alliances.filter((alliance) => {
            let isThisTheirAlliance = (alliance.players[0] == intent.clientID && alliance.players[1] == intent.recipient)
                || (alliance.players[0] == intent.recipient && alliance.players[1] == intent.clientID);
            return !isThisTheirAlliance;
        });
        appendToFilename("alliances.log", `${timePrefix()} Alliances of now are: ${JSON.stringify(LOGS.debug.alliances)}\n`);
    }
    else if (intent.type == "allianceExtension") {
        appendToFilename("alliances.log", `${timePrefix()} [${intent.type}] ${intent.clientID} extended alliance with ${intent.recipient}\n`);
        appendToFilename("alliances.log", `${timePrefix()} Alliances of now are: ${JSON.stringify(LOGS.debug.alliances)}\n`);
    }
}
function display(items, width = 3, gap = 2) {
    if (!Array.isArray(items))
        throw new TypeError("items must be an array");
    if (!Number.isInteger(width) || width <= 0)
        throw new TypeError("width must be a positive integer");
    const gapStr = typeof gap === "number" ? " ".repeat(Math.max(0, gap)) : String(gap);
    const rows = Math.ceil(items.length / width);
    // Build grid
    const grid = Array.from({ length: rows }, (_, r) => Array.from({ length: width }, (_, c) => {
        const idx = r * width + c;
        return idx < items.length ? String(items[idx]) : "";
    }));
    // Compute column widths
    const colWidths = Array.from({ length: width }, (_, c) => Math.max(...grid.map(row => (row[c] || "").length)));
    const padRight = (str, len) => str + " ".repeat(Math.max(0, len - str.length));
    // Build lines into a string
    const lines = grid.map(row => {
        let line = "";
        for (let c = 0; c < width; c++) {
            const cell = row[c] || "";
            const padded = padRight(cell, colWidths[c]);
            line += padded + (c === width - 1 ? "" : gapStr);
        }
        return line.trimEnd();
    });
    return lines.join("\n");
}
function formatTime(msTime, format = "HH:mm:ss") {
    // 1000 -> "00:01" 
    // 60000 -> "01:00"
    // 3600000 -> "01:00:00"
    let hours = Math.floor(msTime / 3600000).toString().padStart(2, '0');
    let minutes = Math.floor((msTime % 3600000) / 60000).toString().padStart(2, '0');
    let seconds = Math.floor((msTime % 60000) / 1000).toString().padStart(2, '0');
    let toFormatString = format.replace('HH', hours).replace('mm', minutes).replace('ss', seconds);
    return toFormatString;
}
function displayAllianceCountdown() {
    // Filter out expired alliances
    let now = Date.now();
    LOGS.debug.alliances = LOGS.debug.alliances.filter((alliance) => {
        if (alliance.expiresAt < now) {
            return false;
        }
        return true;
    });
    // Sort by expiresAt
    let now2 = Date.now();
    let to_display = LOGS.debug.alliances.map((alliance) => {
        let expiresIn = (alliance.expiresAt - now2);
        return `(${formatTime(expiresIn, "mm:ss")}) ${getPlayerFromID(alliance.players[0])?.username || "Unknown"} - ${getPlayerFromID(alliance.players[1])?.username || "Unknown"}`;
    });
    console.log("\n\n\n");
    let alliance_countdown = display(to_display, 6, 2);
    console.log(alliance_countdown);
    logToFilename("alliances_countdown.log", alliance_countdown);
}
setInterval(() => {
    displayAllianceCountdown();
}, 1000);
/*

  "type": "turn",
  "turn": {
    "turnNumber": 1490,
    "intents": [
      {
        "clientID": "KPeo8z5m",
        "type": "attack",
        "targetID": "af3ud7py",
        "troops": 140911.75
      },
      {
        "clientID": "Ahvq5vdn",
        "type": "attack",
        "targetID": "ehrmygu3",
        "troops": 197686.19999999998
      }
    ]
  }
}

*/
/*

// ==UserScript==
// @name         OpenfrontIO+
// @namespace    http://openfront.io/
// @version      2025-11-20
// @description  A
// @author       You
// @match        *://openfront.io/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    
    
    const tableUI = {
        toggleDisplay: (show) => {
            let table = document.querySelector("leader-board")
            let button = document.querySelector("game-left-sidebar > aside > div > div")
            let shouldShow = show == true && table.textContent.trim() == "" || show == false && table.textContent.trim() != ""
            if(shouldShow){
                button.click()
            }
        },
        expand: (expand) => {
            let button = document.querySelector("leader-board > button")
            let shouldClick = expand == true && button.textContent.trim() == "+" || expand == false && button.textContent.trim() == "-"
            if(shouldClick){
                button.click()
            }
            return shouldClick
        }
    }

    tableUI["expandAll"] = () => {
        tableUI.toggleDisplay(true)
        setTimeout(() => {
            tableUI.expand(true)
        }, 20)
    }


    function textFormatedToInt(goldStr) {
        // 100k -> 100000
        // 2.5M -> 2500000
        // 1.2B -> 1200000000
        
        let multipliers = {
            'K': 1e3,
            'M': 1e6,
            'B': 1e9,
        }
        let multiplier = multipliers[goldStr.slice(-1)]
        return parseInt(goldStr.slice(0, -1)) * multiplier
    }

    function getScoreboardPlayersDats() {
        let table = [...document.querySelector("leader-board > div > div").children]
        // remove first row (header)
        table.shift()

        let players = table.map(row => {
            let cols = [...row.children].map(col => col.textContent.trim())
            return {
                username: cols[1],
                percent: parseFloat(cols[2]).toFixed(1),
                gold: textFormatedToInt(cols[3]),
                troops: textFormatedToInt(cols[4]),
            }
        })
        return players
    }

    function

    // Your code here...
})();
*/ 
//# sourceMappingURL=index.js.map