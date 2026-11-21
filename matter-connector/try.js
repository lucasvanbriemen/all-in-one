import { level, color, EVEN_IF_OFF, disconnect } from "./lamp.js";

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

// Set the colour while the lamp is still off, so it doesn't flash the last colour it had.
await color.enhancedMoveToHueAndSaturation({ enhancedHue: Math.round((0 / 360) * 65535), saturation: 254, transitionTime: 0, ...EVEN_IF_OFF });

console.log("Turning on");
// moveToLevelWithOnOff turns the lamp on by itself, no separate onOff.on() needed.
await level.moveToLevelWithOnOff({ level: 254, transitionTime: 5, ...EVEN_IF_OFF });
await wait(2500);

await color.enhancedMoveToHueAndSaturation({ enhancedHue: Math.round((180 / 360) * 65535), saturation: 254, transitionTime: 20, ...EVEN_IF_OFF });
await wait(2500);

await level.moveToLevelWithOnOff({ level: 0, transitionTime: 5, ...EVEN_IF_OFF });
await wait(1500);


console.log("Done");
await disconnect();
process.exit(0);