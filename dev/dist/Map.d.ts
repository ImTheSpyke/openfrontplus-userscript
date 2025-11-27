import * as Types from "./types/index";
export declare class Map {
    private _name;
    private _codename;
    private _manifestUrl;
    constructor(name: Types.Openfront.Maps.gameMap);
    static getGameMapToCodenameMap(gameMap: Types.Openfront.Maps.gameMap): Types.Openfront.Maps.Map["name"] | null;
}
