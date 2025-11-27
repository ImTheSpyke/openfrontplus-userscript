// ==UserScript==
// @name            OpenfrontIO+ (Beta)
// @namespace       http://openfront.io/
// @version         0.3.0-beta
// @description     A userscript to take Openfront to the next step for Players and Casters !
// @author          ImTheSpyke
// @match           *://openfront.io/*
// @icon            https://openfront.io/images/Favicon.43987b30b9ee70769cb8.svg
// @grant           none
// @downloadURL     https://raw.githubusercontent.com/ImTheSpyke/openfrontplus-userscript/main/userscripts/betaa/openfrontplus.user.js
// @updateURL       https://raw.githubusercontent.com/ImTheSpyke/openfrontplus-userscript/main/userscripts/beta/openfrontplus.meta.js
// ==/UserScript==


(async function() {
    'use strict';

    function getGameID() {
        // https://openfront.io/#join=e65NkFyD
        const match = window.location.hash.match(/join=([a-zA-Z0-9]+)/);
        return match ? match[1] : null;
    }


    async function loadScript() {



    function injectOverlayCanvas() {
  if (window.OpenFrontPlus_overlay?.initialized) return false;
  if (!window.OpenFrontPlus_overlay) window.OpenFrontPlus_overlay = {};
  window.OpenFrontPlus_overlay.initialized = true;

  const canvasId = 'of-overlay-pinned-zoom';
  const gameCanvas = document.querySelector('canvas');
  if (!gameCanvas) { delete window.OpenFrontPlus_overlay.initialized; return false; }

  const findTransform = (cands) => {
    for (const s of cands) {
      const el = document.querySelector(s);
      if (!el) continue;
      if (el.transformHandler) return el.transformHandler;
      if (el.transform) return el.transform;
    }
    return null;
  };
  const transformHandler = findTransform(['emoji-table','build-menu','player-info-overlay','unit-display','leader-board','game-left-sidebar']);
  const gameView = (() => {
    for (const s of ['unit-display','player-info-overlay','leader-board','game-left-sidebar']) {
      const el = document.querySelector(s);
      if (el && el.game) return el.game;
    }
    return null;
  })();

  const overlay = document.createElement('canvas');
  overlay.id = canvasId;

  Object.assign(overlay.style, { position: 'absolute', pointerEvents: 'none', zIndex: 9999, left: 0, top: 0 });
  document.body.appendChild(overlay);
  const ctx = overlay.getContext('2d');

  // drawList items:
  // { id, center:[x,y], radius (tiles, outer), fillColor, borderColor, borderWidth (tiles), 
  //   text: string|null, textColor, textSize (tiles), font, decay:[keepS,fadeS], createdAt }
  const drawList = [];
  let lastRect = null;

  function updateOverlayRect() {
    const r = gameCanvas.getBoundingClientRect();
    if (lastRect && r.left === lastRect.left && r.top === lastRect.top && r.width === lastRect.width && r.height === lastRect.height) return r;
    lastRect = r;
    overlay.style.left = (r.left + window.scrollX) + 'px';
    overlay.style.top = (r.top + window.scrollY) + 'px';
    overlay.style.width = r.width + 'px';
    overlay.style.height = r.height + 'px';
    overlay.width = Math.max(0, Math.round(r.width));
    overlay.height = Math.max(0, Math.round(r.height));
    return r;
  }

  function worldToOverlayPos(tile, rect) {
    try {
      if (transformHandler && typeof transformHandler.worldToScreenCoordinates === 'function') {
        if (typeof transformHandler.updateCanvasBoundingRect === 'function') transformHandler.updateCanvasBoundingRect();
        const s = transformHandler.worldToScreenCoordinates({ x: tile.x, y: tile.y });
        return { x: Math.round(s.x - rect.left), y: Math.round(s.y - rect.top) };
      }
    } catch (e) {}
    return { x: Math.round(overlay.width / 2), y: Math.round(overlay.height / 2) };
  }

  function worldToPixels(worldUnits) {
    if (transformHandler && typeof transformHandler.scale === 'number') return worldUnits * transformHandler.scale;
    try {
      if (gameView && typeof gameView.width === 'function' && gameView.width() > 0) return worldUnits * (overlay.width / gameView.width());
    } catch (e) {}
    return worldUnits * Math.max(6, Math.min(overlay.width, overlay.height) * 0.06);
  }

  let raf = null;
  function frame() {
    const rect = updateOverlayRect();
    ctx.clearRect(0, 0, overlay.width, overlay.height);
    if (!rect) { raf = requestAnimationFrame(frame); return; }
    const now = performance.now();

    for (let i = drawList.length - 1; i >= 0; i--) {
      const it = drawList[i];
      const age = Math.max(0, now - it.createdAt);
      const keepMs = (it.decay?.[0] || 0) * 1000;
      const fadeMs = (it.decay?.[1] || 0) * 1000;
      const lifeMs = keepMs + fadeMs;
      if (lifeMs > 0 && age >= lifeMs) { drawList.splice(i, 1); continue; }

      let alpha = 1;
      if (age > keepMs && fadeMs > 0) alpha = 1 - ((age - keepMs) / fadeMs);
      alpha = Math.max(0, Math.min(1, alpha));

      const pos = worldToOverlayPos({ x: it.center[0], y: it.center[1] }, rect);
      const outerR = Math.max(0, worldToPixels(it.radius));               // outer edge in px
      const bwPx = Math.max(0, worldToPixels(it.borderWidth || 0));      // border width in px (scaled with map)

      // border INSIDE math
      const fillR = Math.max(0, outerR - bwPx);
      const strokeR = Math.max(0, outerR - bwPx / 2);

      ctx.save();
      ctx.globalAlpha = alpha;

      // circle fill
      if (it.fillColor && fillR > 0) {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, fillR, 0, Math.PI * 2);
        ctx.fillStyle = it.fillColor;
        ctx.fill();
        ctx.closePath();
      }

      // circle border (inside)
      if (bwPx > 0 && it.borderColor) {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, strokeR, 0, Math.PI * 2);
        ctx.lineWidth = bwPx;
        ctx.strokeStyle = it.borderColor;
        ctx.stroke();
        ctx.closePath();
      }

      // centered text (optional)
      if (it.text) {
        // text size specified in tiles -> pixels
        const textPx = Math.max(8, Math.round(worldToPixels(it.textSize ?? Math.max(0.4, it.radius * 0.5))));
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `${it.fontWeight ?? ''} ${textPx}px ${it.font ?? 'sans-serif'}`;
        if (it.textOutline) {
          // outline uses a fraction of textPx as line width to remain consistent with zoom
          ctx.lineWidth = Math.max(1, Math.round(textPx * 0.12));
          ctx.strokeStyle = it.textOutlineColor ?? 'rgba(0,0,0,0.6)';
          ctx.strokeText(it.text, pos.x, pos.y);
        }
        ctx.fillStyle = it.textColor ?? 'white';
        ctx.fillText(it.text, pos.x, pos.y);
      }

      ctx.restore();
    }

    raf = requestAnimationFrame(frame);
  }

  // hooks
  const onChange = () => updateOverlayRect();
  window.addEventListener('resize', onChange);
  window.addEventListener('scroll', onChange, true);
  const mo = new MutationObserver(onChange);
  mo.observe(document.body, { subtree: true, childList: true, attributes: true });

  updateOverlayRect();
  raf = requestAnimationFrame(frame);

  // API: add / convenience / clear / destroy
  function addDraw(spec = {}) {
    const s = {
      center: Array.isArray(spec.center) ? [Number(spec.center[0]) || 0, Number(spec.center[1]) || 0] : [0, 0],
      radius: Number(spec.radius) || 1,
      fillColor: spec.fillColor ?? 'rgba(255,0,0,0.5)',
      borderColor: spec.borderColor ?? 'rgba(255,255,255,0.9)',
      borderWidth: (typeof spec.borderWidth !== 'undefined') ? Number(spec.borderWidth) : 0.15, // tiles
      text: (typeof spec.text === 'string') ? spec.text : null,
      textColor: spec.textColor ?? 'white',
      textSize: (typeof spec.textSize !== 'undefined') ? Number(spec.textSize) : undefined, // tiles (optional)
      textOutline: !!spec.textOutline,
      textOutlineColor: spec.textOutlineColor ?? 'rgba(0,0,0,0.6)',
      font: spec.font ?? 'sans-serif',
      fontWeight: spec.fontWeight ?? '',
      decay: Array.isArray(spec.decay) ? spec.decay.map(n => Number(n) || 0) : [0, 0],
      id: (Date.now() + Math.random()).toString(36),
      createdAt: performance.now()
    };
    drawList.push(s);
    return s.id;
  }

  // convenience: borderWidth and textSize are in world units (tiles)
  function drawCircleAtCoordinates(x, y, worldRadius = 1, color = 'rgba(255,0,0,0.5)', decay = [0, 1], borderWidthTiles = 0.15, text = null, textSizeTiles = undefined) {
    return addDraw({
      center: [x, y],
      radius: worldRadius,
      fillColor: color,
      borderColor: 'rgba(255,255,255,0.9)',
      borderWidth: borderWidthTiles,
      decay,
      text,
      textSize: textSizeTiles
    });
  }

  function clearDrawList() { drawList.length = 0; }

  function destroy() {
    if (raf) cancelAnimationFrame(raf);
    window.removeEventListener('resize', onChange);
    window.removeEventListener('scroll', onChange, true);
    mo.disconnect();
    const el = document.getElementById(canvasId); if (el) el.remove();
    delete window.OpenFrontPlus_overlay.addDraw;
    delete window.OpenFrontPlus_overlay.drawCircleAtCoordinates;
    delete window.OpenFrontPlus_overlay.clearDrawList;
    delete window.OpenFrontPlus_overlay.destroy;
    delete window.OpenFrontPlus_overlay.initialized;
    drawList.length = 0;
  }

  window.OpenFrontPlus_overlay.addDraw = addDraw;
  window.OpenFrontPlus_overlay.drawCircleAtCoordinates = drawCircleAtCoordinates;
  window.OpenFrontPlus_overlay.clearDrawList = clearDrawList;
  window.OpenFrontPlus_overlay.destroy = destroy;

  console.log('Overlay ready. Use OpenFrontPlus_overlay.addDraw(spec) or drawCircleAtCoordinates(...).');
  console.warn('Overlay canvas injected.');
  return true;
}




    /******************/
    /*     UTILS      */
    /******************/


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
    

    function getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(";").shift();
        return null;
    }

    
    function numToKMB(num) {
        if(num >= 1_000_000_000) {
            return (num / 1_000_000_000).toFixed(1) + "B";
        } else if(num >= 1_000_000) {
            return (num / 1_000_000).toFixed(1) + "M";
        } else if(num >= 1_000) {
            return (num / 1_000).toFixed(1) + "k";
        } else {
            return num.toFixed(0);
        }
    }
    function KMBToNum(num) {
        if(num.endsWith("B")) {
            return Number(num.slice(0, -1)) * 1_000_000_000;
        } else if(num.endsWith("M")) {
            return Number(num.slice(0, -1)) * 1_000_000;
        } else if(num.endsWith("k")) {
            return Number(num.slice(0, -1)) * 1_000;
        } else {
            return Number(num);
        }
    }

    function formatTime(msTime, format="HH:mm:ss") {
        // 1000 -> "00:01" 
        // 60000 -> "01:00"
        // 3600000 -> "01:00:00"

        let hours = Math.floor(msTime / 3600000).toString().padStart(2, '0');
        let minutes = Math.floor((msTime % 3600000) / 60000).toString().padStart(2, '0');
        let seconds = Math.floor((msTime % 60000) / 1000).toString().padStart(2, '0');

        let toFormatString = format.replace('HH', hours).replace('mm', minutes).replace('ss', seconds);
        return toFormatString;
    }
    
    /***************/
    /***************/
    /***************/




    function getWorkerID(numberOfWorkers=20) {
        let gameID = getGameID();
        if(!gameID) return 0;
        return simpleHash(gameID) % numberOfWorkers;
    }

    function getFakeUUID() {
        let myUUID = getCookie('player_persistent_id');
        // change last letter to another letter to avoid "real" UUID detection
        let changeTo = {
            "a":"b","b":"c","c":"d","d":"e","e":"f","f":"a",
            "0":"1","1":"2","2":"3","3":"4","4":"5","5":"6","6":"7","7":"8","8":"9","9":"0"
        }
        let lastChar = myUUID.slice(-1);
        myUUID = myUUID.slice(0, -1) + (changeTo[lastChar] || "z");
        return myUUID;
    }

    const socket = new WebSocket(`${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/w${getWorkerID()}`);

    const connect_payload = {
        "type":"join",
        "gameID":getGameID(),
        "clientID":"abcdefgh",
        "lastTurn":0,
        "token": getFakeUUID(),
        "username": localStorage.getItem("username") || "Anonymous",
        "cosmetics":{}
    }


    class OpenfrontUI {
        constructor() {

        }

        qs(source, selector) {
            return source.querySelector(selector);
        }
        qsa(source, selector) {
            return source.querySelectorAll(selector);
        }
        tryToNumber(str) {
            let n = Number(str);
            if(isNaN(n)) return 0;
            return n;
        }


        getScoreboard() {
            
        }

        getMiddlePlayerMenu() {
            let player_menu = this.qs(document,"player-panel > div > div > div > div > div > div > div:nth-child(2)")
            if(!player_menu) return null;

            let player_alliance_elem = this.qs(player_menu, "div:nth-child(8) > div:nth-child(2) ul")

            return {
                getUsername: () => { return this.qs(player_menu, "div h2").textContent.trim()},
                getFlag: () => { return this.qs(player_menu, "div img").getAttribute("src") },
                getGold: () => { return KMBToNum(player_menu.querySelector("div.mb-1.flex.justify-between.gap-2 > div:nth-child(1) > span.tabular-nums").textContent.trim())},
                getTroops: () => { return KMBToNum(player_menu.querySelector("div.mb-1.flex.justify-between.gap-2 > div:nth-child(2) > span.tabular-nums").textContent.trim())},
                getBetrayals: () => { return this.tryToNumber(this.qs(player_menu, "div:nth-child(5) > div:nth-child(2)").textContent.trim()) },
                getTrading: () => { return this.qs(player_menu, "div:nth-child(6) > div:nth-child(2) span").textContent.trim() == "Active" },
                getAlliances: () => {
                    let firstElem = player_alliance_elem.children?.[0].textContent.trim() ?? "None";
                    if(firstElem == "None") {
                        return [];
                    }
                    let alliances = Array.from(player_menu.querySelector("div:nth-child(8) > div:nth-child(2) ul").children).map(x => {
                        return {
                            name: x.querySelector("span.truncate").textContent.trim(),
                            expiresIn: x.querySelector("span.expire")?.textContent?.trim() ?? "0"
                        }
                    })
                    return alliances
                },

            }
        }

        getRightPlayerMenu() {

        }
        
    }

    const OFUI = new OpenfrontUI();





    class OpenfrontPlus {
        constructor() {
            this.players = []; // { id, username, connected, cosmetics }
            this.attacks = [];
            this.buildUnits = [];
            this.allianceIntents = [];
            this.alliances = []
            this.size = {
                width: 0,
                height: 0
            }
            this._mapCodename = null;


            setInterval(() => {
                // Clear expired alliances and update texts

                console.log("[OpenfrontPlus] Updating alliances");

                this.alliances = this.alliances.filter(alliance => {
                    if(Date.now() > alliance.expiresAt) return false; // Remove expired alliances
                    alliance.expiresText = formatTime((alliance.expiresAt - Date.now()), "mm:ss");
                    return true;
                })
            }, 1000)

            /*
            setInterval(() => {

                let _sams = this.getBuilds().filter(x => x.unit === "SAM Launcher");

                for(let i = 0; i < _sams.length; i++) {
                    let sam = _sams[i];
                    window.OpenFrontPlus_overlay.addDraw({
                        center: [sam.x, sam.y],
                        radius: 60,
                        fillColor: 'rgba(0, 255, 0, 0.1)',
                        borderColor: 'rgba(0, 255, 0, 0.8)',
                        borderWidth: 2,
                        decay: [0.5, 0.5], // keep 2s, fade 1.5s
                        text: "",
                        textColor:'white',
                        textSize: 10, // tiles
                        textOutline:false,
                    });
                }
            }, 1000)
            */
        }

        destroyBuilds(x, y, radius) {
            // circle radius, remove every _sam in range
            this.buildUnits = this.buildUnits.filter(unit => {
                return (unit.x - x) * (unit.x - x) + (unit.y - y) * (unit.y - y) > radius * radius;
            });
        }

        async loadMap(gameMap) {
            if(!gameMap) {
                console.error("[OpenfrontPlus] No game map provided to loadMap");
                return;
            }
            this._mapCodename = OpenfrontPlus.getGameMapToCodenameMap(gameMap);
            let manifestURL = `https://openfront.io/maps/${this._mapCodename}/manifest.json`;

            let response = await fetch(manifestURL);
            if(!response.ok) {
                console.error(`[OpenfrontPlus] Failed to fetch map manifest from ${manifestURL}`);
                return;
            }

            let manifest = await response.json();
            this.size.width = manifest.map.width;
            this.size.height = manifest.map.height;
            console.error(`[OpenfrontPlus] Loaded map ${this._mapCodename} with size ${this.size.width}x${this.size.height}`);
        }

        static getGameMapToCodenameMap(gameMap) {
            const  mapping = {
                "map": "Map",
                "world": "World",
                "giantworldmap": "Giant World Map",
                "europe": "Europe",
                "mena": "MENA",
                "northamerica": "North America",
                "oceania": "Oceania",
                "blacksea": "Black Sea",
                "africa": "Africa",
                "asia": "Asia",
                "mars": "Mars",
                "southamerica": "South America",
                "britannia": "Britannia",
                "gatewaytotheatlantic": "Gateway to the Atlantic",
                "australia": "Australia",
                "random": "Random",
                "iceland": "Iceland",
                "pangaea": "Pangaea",
                "eastasia": "East Asia",
                "betweentwoseas": "Between Two Seas",
                "faroeislands": "Faroe Islands",
                "deglaciatedantarctica": "Deglaciated Antarctica",
                "europeclassic": "Europe (classic)",
                "falklandislands": "Falkland Islands",
                "baikal": "Baikal",
                "halkidiki": "Halkidiki",
                "straitofgibraltar": "Strait of Gibraltar",
                "italia": "Italia",
                "japan": "Japan",
                "yenisei": "Yenisei",
                "pluto": "Pluto",
                "montreal": "Montreal",
                "achiran": "Achiran",
                "baikalnukewars": "Baikal (Nuke Wars)"
            }

            // If the value is found, return the key
            const key = Object.keys(mapping).find(k => mapping[k].toLowerCase() === gameMap.toLowerCase());
            return key || null;
        }

        setMapSize(width, height) {
            this.size.width = width;
            this.size.height = height;
        }

        tileToCoordinates(tile, width, height) {
            if (tile < 0 || tile >= width * height) {
                console.error("[OpenfrontPlus] Tile index out of bounds");
                return { x: 0, y: 0 };
            }

            const x = tile % width;
            const y = Math.floor(tile / width);

            return { x, y };
        }

        addAttack(attackData) {
            this.attacks.push(attackData);
        }
        addBuildUnit(turn, builder, unit, tile) {
            let coords = this.tileToCoordinates(tile, this.size.width, this.size.height);
            this.buildUnits.push({
                turn: turn,
                builder: builder,
                unit: unit,
                tile: tile,
                x: coords.x,
                y: coords.y
            });
            if([ "Atom Bomb", "Hydrogen Bomb", "MIRV"].includes(unit) == false) {
                this.displayBuild(tile, unit);
            }
        }
        processAllianceIntent(intent) {
            this.allianceIntents.push(intent);

            if(intent.type == "allianceRequest" || intent.type == "allianceExtension") {
                // Nothing, just a request
            }

            if(intent.type == "allianceRequestReply") {
                if(!intent.accept) {
                    return; // Alliance declined
                }
                const allianceDuration = 1000 * 60 * 5; // 5min
                let expiresAt = Date.now() + allianceDuration;
                this.alliances.push({
                    players: [
                        OFP.getPlayerFromID(intent.clientID) ?? { username: "Unknown", clientID: intent.clientID, bot: true },
                        OFP.getPlayerFromID(intent.recipient) ?? { username: "Unknown", clientID: intent.requestor, bot: true }
                    ],
                    expiresAt: expiresAt,
                    expiresText: formatTime(allianceDuration, "mm:ss")
                });
            }

            if(intent.type == "breakAlliance") {
                this.alliances = this.alliances.filter(alliance => {

                    let isThisTheirAlliance = (alliance.players[0].clientID == intent.clientID || alliance.players[1].clientID == intent.recipient)
                        || (alliance.players[0].clientID == intent.recipient || alliance.players[1].clientID == intent.clientID);
                    if(isThisTheirAlliance) {
                        return false; // Remove the alliance because they broke it
                    }
                    return true; // Keep all the other alliances
                })
            }
        }

        areAlly(player1, player2) {
            return this.alliances.some(alliance => {
                return alliance.players.includes(player1) && alliance.players.includes(player2);
            })
        }

        getAlliances() {
            return this.alliances;
        }

        getAlliancesByPlayerID(playerID) {
            return this.alliances.filter(alliance => {
                return alliance.players.some(player => player.id == playerID);
            });
        }
        getAllianceByUsername(username) {
            return this.alliances.filter(alliance => {
                return alliance.players.some(player => player.username == username);
            });
        }


        updatePlayer(playerID, updateData) {
            if(!updateData) {
                throw new Error("No data provided to updatePlayer.");
            }
            let playerIndex = this.players.findIndex(p => p.id === playerID);
            if (playerIndex === -1) {
                this.players.push({ id: playerID, ...updateData });
            } else {
                this.players[playerIndex] = { ...this.players[playerIndex], ...updateData };
            }
        }

        getAttacks() {
            return this.attacks;
        }

        getBuilds() {
            return this.buildUnits;
        }

        getPlayers() {
            return this.players;
        }

        getPlayerFromID(playerID) {
            return this.players.find(p => p.id === playerID);
        }
        getPlayerFromUsername(username) {
            return this.players.find(p => p.username === username);
        }

        hydrogenBomb(tile, text="") {
            let coords = this.tileToCoordinates(tile, this.size.width, this.size.height);

            window.OpenFrontPlus_overlay?.addDraw?.({
                center: [coords.x, coords.y],
                radius: 100,
                fillColor: 'rgba(255, 0, 0, 0.0)',
                borderColor: 'rgba(200, 0, 0, 1)',
                borderWidth: 2,
                decay: [3, 25], // keep 2s, fade 1.5s
                text: text,
                textColor:'white',
                textSize: 10,
                textOutline:true,
            });

            window.OpenFrontPlus_overlay?.addDraw?.({
                center: [coords.x, coords.y],
                radius: 100-23,
                fillColor: 'rgba(255, 0, 0, 0.5)',
                borderColor: 'rgba(200, 0, 0, 1)',
                borderWidth: 1,
                decay: [3, 25], // keep 2s, fade 1.5s
                text: "",
                textColor:'white',
                textSize: 10,
                textOutline:true,
            });

            this.displayGrowingCircle(coords.x, coords.y, 100, 150, 'rgba(255, 0, 0, 1)', 1000, "");

            this.destroyBuilds(coords.x, coords.y, 100);
        }

        atomBomb(tile, text="") {
            let coords = this.tileToCoordinates(tile, this.size.width, this.size.height);

            // Outer circle
            window.OpenFrontPlus_overlay?.addDraw?.({
                center: [coords.x, coords.y],
                radius: 30,
                fillColor: 'rgba(255, 143, 69, 0.0)',
                borderColor: 'rgba(255, 100, 0, 1)',
                borderWidth: 2,
                decay: [3, 25], // keep 2s, fade 1.5s
                text: text,
                textColor:'white',
                textSize: 10, // tiles
                textOutline:true,
            });

            window.OpenFrontPlus_overlay?.addDraw?.({
                center: [coords.x, coords.y],
                radius: 15,
                fillColor: 'rgba(255, 100, 0, 0.5)',
                borderColor: 'rgba(255, 100, 0, 1)',
                borderWidth: 1,
                decay: [3, 25], // keep 2s, fade 1.5s
                text: "",
                textColor:'white',
                textSize: 10, // tiles
                textOutline:true,
            });
            
            this.displayGrowingCircle(coords.x, coords.y, 30, 100, 'rgba(255, 0, 0, 1)', 1000, "");

            this.destroyBuilds(coords.x, coords.y, 30);
        }

        MIRV(tile, text="") {
            let coords = this.tileToCoordinates(tile, this.size.width, this.size.height);
            
            window.OpenFrontPlus_overlay?.addDraw?.({
                center: [coords.x, coords.y],
                radius: 30,
                fillColor: 'rgba(0, 0, 0, 0.5)',
                borderColor: 'rgba(255, 81, 81, 0.5)',
                borderWidth: 15,
                decay: [3, 25], // keep 2s, fade 1.5s
                text: text,
                textColor:'white',
                textSize: 10, // tiles
                textOutline:true,
            });
        }

        displayCircle(x, y, size, color='rgba(255, 255, 0, 1)', decay=[0.1,0.25], text="") {
            window.OpenFrontPlus_overlay?.addDraw?.({
                center: [x, y],
                radius: size,
                fillColor: 'rgba(0, 0, 0, 0.0)',
                borderColor: color,
                borderWidth: 2,
                decay: [decay[0], decay[1]], // keep 2s, fade 1.5s
                text: text,
                textColor:'white',
                textSize: 20, // tiles
                textOutline:true,
            });
        }

        async displayGrowingCircle(x, y, sizeMin, sizeMax, color='rgba(255, 255, 0, 1)', timeMs, unit) {
            let stepAmount = (sizeMax - sizeMin)
            for(let i = sizeMin; i <= sizeMax; i++) {
                this.displayCircle(x, y, i, color, [Math.max((timeMs/1000) / stepAmount, 0.02)*2, 0.1], unit);
                await this.wait(timeMs / stepAmount);
            }
        }

        wait(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

        async displayBuild(tile, build_unit) {
            let unit_name = {
                "SAM Launcher": "SAM",
                "Defense Post": "🛡️",
                "Missile Silo": "🚀",
                "Warship": "⛵",
                "City": "🏢",
                "Port": "⚓",
                "Factory": "🏭",
            }[build_unit]
            let coords = this.tileToCoordinates(tile, this.size.width, this.size.height);
            let color = 'rgba(0, 0, 0, 1)';
            if(build_unit == "Warship") color = 'rgba(0, 0, 255, 1)';
            this.displayGrowingCircle(coords.x, coords.y, 1, 60, color, 3000, unit_name);
        }

        
        
    }

    const OFP = new OpenfrontPlus();


    setInterval(() => {
        if(socket.readyState !== WebSocket.OPEN) {
            console.warn("[OpenfrontPlus] WebSocket not open, skipping ping");
            return;
        }
        socket.send(JSON.stringify({"type":"ping"}));
    }, 5000);

    console.warn("connect_payload:", connect_payload);
    // When the connection opens

    // When a message is received
    socket.addEventListener("message", (event) => {
        if(typeof event.data !== "string") return;
        let msg = JSON.parse(event.data);
        if(msg.type == 'start') {
            
            processStart(msg);
        } else if(msg.type === 'turn') {
            processTurn(msg.turn);
        }
    });

    socket.addEventListener("open", () => {
        console.warn(`[OpenfrontPlus] Connected to WebSocket on worker ${getWorkerID()}`);
        socket.send(JSON.stringify(connect_payload))
    });

    // When the connection closes
    socket.addEventListener("close", () => {
        console.warn("[OpenfrontPlus] Connection closed");
    });

    // On error
    socket.addEventListener("error", (err) => {
        console.error("[OpenfrontPlus] WebSocket error:", err);
    });


    function processStart(startMsg) {

        console.warn("[OpenfrontPlus] Game started:", startMsg);
        OFP.loadMap(startMsg.gameStartInfo?.config?.gameMap ?? null);

        startMsg.gameStartInfo.players.forEach((player) => {
            OFP.updatePlayer(player.clientID, {
                id: player.clientID,
                username: player.username,
                cosmetics: player.cosmetics,
                connected: true
            });
        });
    }

    function processTurn(turnData) {

        // console.log("Processsing turn:",turnData)

        turnData.intents.forEach((intent) => {
            processIntent(intent);
            
            if(intent.type == "attack") {
                OFP.addAttack({
                    turn: turnData.turnNumber,
                    attacker: intent.clientID,
                    troops: intent.troops,
                    troopsTxt: numToKMB(intent.troops),
                    victim: intent.targetID
                })
            }

            if(intent.type == "build_unit") {
            
                OFP.addBuildUnit(turnData.turnNumber, intent.clientID, intent.unit, intent.tile);
            }


        });

    }

    function processIntent(intent) {
        //console.log("[OpenfrontPlus] Processing intent:", intent);
        if(intent.type == "mark_disconnected") {
            OFP.updatePlayer(intent.clientID, { connected: !intent.isDisconnected });
        }

        if(intent.type == "build_unit") {
            

            if(intent.unit == "Atom Bomb") {
                console.error("Atom Bomb intent detected at tile", intent.tile);
                OFP.atomBomb(intent.tile, OFP.getPlayerFromID(intent.clientID).username);
            }
            if(intent.unit == "Hydrogen Bomb") {
                console.error("Hydrogen Bomb intent detected at tile", intent.tile);
                OFP.hydrogenBomb(intent.tile, OFP.getPlayerFromID(intent.clientID).username);
            }
            if(intent.unit == "MIRV Bomb") {
                console.error("MIRV Bomb intent detected at tile", intent.tile);
                OFP.MIRV(intent.tile, OFP.getPlayerFromID(intent.clientID).username);
            }
        }

        if(
            intent.type == "allianceRequest"
            || intent.type == "allianceRequestReply"
            || intent.type == "allianceExtension"
            || intent.type == "breakAlliance"
        ) {
            OFP.processAllianceIntent(intent);
        }


    }


    
    
    let result = injectOverlayCanvas()
    console.log('Overlay injection result:', result);
    while(result === false) {
        console.warn('Retrying overlay injection in 1 second...');
        await new Promise(res => setTimeout(res, 1000));
        result = injectOverlayCanvas()
    }



    window.OpenFrontPlus= OFP;
    window.OFUI = OFUI;


}


    let old_url = ""

    setInterval(() => {
        if(window.location.href !== old_url) {
            old_url = window.location.href
            executeOnURLChange()
        }
    }, 5)

    function executeOnURLChange() {
        loadScript()
    }


})();