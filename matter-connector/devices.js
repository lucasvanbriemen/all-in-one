import { Environment, Logger } from "@matter/main";
import { OnOff, LevelControl, ColorControl, GeneralCommissioning, BooleanState } from "@matter/main/clusters";
import { ManualPairingCodeCodec } from "@matter/main/types";
import { CommissioningController } from "@project-chip/matter.js";

Logger.level = "error";

// How long to wait for a paired lamp to come online at startup before skipping it.
const CONNECT_TIMEOUT_MS = 15_000;

const env = Environment.default;
env.vars.set("storage.path", new URL("./storage", import.meta.url).pathname);

const controller = new CommissioningController({
  environment: { environment: env, id: "aio" },
  autoConnect: true,
  adminFabricLabel: "AIO",
});
await controller.start();

// Connects to one paired node and resolves once it's ready, or rejects after the timeout
// (so one unplugged lamp doesn't block the whole server from starting).
async function connectNode(nodeId) {
  const node = await controller.getNode(nodeId);
  node.connect();
  if (!node.initialized) {
    await Promise.race([
      new Promise(resolve => node.events.initialized.on(resolve)),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timed out")), CONNECT_TIMEOUT_MS)),
    ]);
  }
  return node;
}

// All controllable lights, keyed by "<nodeId>-<endpoint>".
// One node (a bridge, a multi-zone strip) can expose several lights, so the endpoint is part of the id.
export const lamps = {};

function addNodeLamps(nodeId, node) {
  const devices = node.getDevices()
  return devices.map(device => {
    const id = `${nodeId}-${light.number}`;
    const type = typeOfDevice(light);
    lamps[id] = {
      id,
      type,
      onOff: light.getClusterClient(OnOff.Complete),
      level: light.getClusterClient(LevelControl.Complete),
      color: light.getClusterClient(ColorControl.Complete),
      state: {}
    };
    return id;
  });
}

const nodeIds = controller.getCommissionedNodes();
const results = await Promise.allSettled(nodeIds.map(connectNode));

results.forEach((result, i) => {
  const nodeId = nodeIds[i];
  if (result.status === "rejected") {
    console.warn(`Skipping node ${nodeId}: ${result.reason.message}`);
    return;
  }
  addNodeLamps(nodeId, result.value);
});

console.log(`Found ${Object.keys(lamps).length} lamp(s): ${Object.keys(lamps).join(", ")}`);

// Add this to colour and brightness commands so they also work while the lamp is off.
export const EVEN_IF_OFF = {
  optionsMask: { executeIfOff: true },
  optionsOverride: { executeIfOff: true },
};

// Pairs a new device using its 11-digit manual pairing code (dashes/spaces are fine),
// connects to it, and adds its lights to `lamps` right away. Returns the new lamp ids.
export async function pair(rawCode) {
  const code = String(rawCode ?? "").replace(/\D/g, "");
  const { shortDiscriminator, passcode } = ManualPairingCodeCodec.decode(code);

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

  const node = await connectNode(nodeId);
  return { nodeId: String(nodeId), lamps: addNodeLamps(nodeId, node) };
}

export async function disconnect() {
  await controller.close();
}

function typeOfDevice(endpoint) {
  const color = endpoint.getClusterClient(ColorControl.Complete);
  if (color?.supportedFeatures.hueSaturation) return "color_light";
  if (color?.supportedFeatures.colorTemperature) return "white_light";
  if (endpoint.getClusterClient(BooleanState.Complete)) return "contact_sensor";
}