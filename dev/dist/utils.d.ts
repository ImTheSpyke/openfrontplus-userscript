declare function simpleHash(str: string): number;
declare function timePrefix(): string;
declare function tileToCoordinates(tile: number, width: number, height: number): {
    x: number;
    y: number;
};
declare const _default: {
    simpleHash: typeof simpleHash;
    timePrefix: typeof timePrefix;
    tileToCoordinates: typeof tileToCoordinates;
};
export default _default;
