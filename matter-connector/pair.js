// pair.mjs: run once to give this computer permission to control the lamp.
// Usage: node pair.mjs 12345678901
import { Environment, Logger } from "@matter/main";
import { GeneralCommissioning } from "@matter/main/clusters";
import { ManualPairingCodeCodec } from "@matter/main/types";
import { CommissioningController } from "@project-chip/matter.js";

Logger.level = "notice"; // show some progress while pairing

// 1. Read the pairing code from the command line and keep only the digits.
const code = process.argv[2]?.replace(/\D/g, "");
if (!code) {
  console.error("Usage: node pair.mjs <11-digit pairing code>");
  process.exit(1);
}

// 2. Tell matter.js where to keep its keys (a folder next to this file).
const env = Environment.default;
env.vars.set("storage.path", new URL("./matter-storage", import.meta.url).pathname);

// 3. Start a Matter controller. That's the role your computer plays.
const controller = new CommissioningController({
  environment: { environment: env, id: "lamp-bridge" },
  autoConnect: false,
  adminFabricLabel: "My lamp bridge", // the name the IKEA app shows for this connection
});
await controller.start();

// 4. Find the lamp on the network and pair with it.
const { shortDiscriminator, passcode } = ManualPairingCodeCodec.decode(code);
console.log("Looking for the lamp…");
const nodeId = await controller.commissionNode({
  commissioning: {
    regulatoryLocation: GeneralCommissioning.RegulatoryLocationType.IndoorOutdoor,
    regulatoryCountryCode: "NL",
  },
  discovery: {
    identifierData: { shortDiscriminator },
    discoveryCapabilities: { onIpNetwork: true },
  },
  passcode,
});

console.log("Paired! The lamp is node", nodeId.toString());
await controller.close();
process.exit(0);