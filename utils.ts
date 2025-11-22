
function simpleHash(str:string) {
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


function tileToCoordinates(tile: number, width: number, height: number): { x: number; y: number } {
    if (tile < 0 || tile >= width * height) {
        throw new Error("Tile index out of bounds");
    }

    const x = tile % width;
    const y = Math.floor(tile / width);

    return { x, y };
}

export default {
    simpleHash,
    timePrefix,
    tileToCoordinates
}