import { Environment } from "@matter/main";
import { GeneralCommissioning } from "@matter/main/clusters";
import { ManualPairingCodeCodec } from "@matter/main/types";
import { CommissioningController } from "@project-chip/matter.js";

const code = process.argv[2]?.replace(/\D/g, "");

const env = Environment.default;
env.vars.set("storage.path", new URL("./matter-storage", import.meta.url).pathname);

const controller = new CommissioningController({
  environment: { environment: env, id: "aio" },
  autoConnect: true,
  adminFabricLabel: "AIO",
});
await controller.start();

const { shortDiscriminator, passcode } = ManualPairingCodeCodec.decode(code);
await controller.commissionNode({
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

console.log("paired");
await controller.close();
process.exit(0);