import * as Types from "./types/index";

export class Map {

    private _name: Types.Openfront.Maps.Map["name"];
    private _codename: Types.Openfront.Maps.Map["name"];
    private _manifestUrl: string;

    constructor(name: Types.Openfront.Maps.gameMap) {
        this._name = name;
        this._codename = Map.getGameMapToCodenameMap(name) || "unknown";
        this._manifestUrl = `https://openfront.io/maps/${this._codename}manifest.json`;
    }


    static getGameMapToCodenameMap(gameMap: Types.Openfront.Maps.gameMap): Types.Openfront.Maps.Map["name"] | null {
        const  mapping: Record<Types.Openfront.Maps.Map["name"], Types.Openfront.Maps.gameMap> = {
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
        const key = Object.keys(mapping).find((k) => mapping[k as keyof typeof mapping].toLowerCase() === gameMap.toLowerCase());
        return key || null;
    }
}


/*
[...document.querySelectorAll("img")].map(x => x.src).filter(x => x.includes("/maps/"))

['https://openfront.io/maps/eastasia/thumbnail.webp?v=v0.26.17']
*/

/*
function getCurrentMap() {
    let mapImg = document.querySelector("img[src*='/maps/']");
    if (!mapImg) return null;
    let src = mapImg.getAttribute("src") || "";
    let match = src.match(/\/maps\/([^\/]+)\//);
    if (!match) return null;
    return match[1];
}
*/






