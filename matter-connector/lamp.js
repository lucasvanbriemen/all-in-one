import { Environment, Logger } from "@matter/main";
import { OnOff, LevelControl, ColorControl } from "@matter/main/clusters";
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

const results = await Promise.allSettled(controller.getCommissionedNodes().map(connectNode));

results.forEach((result, i) => {
  const nodeId = controller.getCommissionedNodes()[i];
  if (result.status === "rejected") {
    console.warn(`Skipping node ${nodeId}: ${result.reason.message}`);
    return;
  }

  const lights = result.value.getDevices().filter(d => d.getClusterClient(ColorControl.Complete));
  for (const light of lights) {
    const id = `${nodeId}-${light.number}`;
    lamps[id] = {
      id,
      onOff: light.getClusterClient(OnOff.Complete),
      level: light.getClusterClient(LevelControl.Complete),
      color: light.getClusterClient(ColorControl.Complete),
    };
  }
});

console.log(`Found ${Object.keys(lamps).length} lamp(s): ${Object.keys(lamps).join(", ")}`);

// Add this to colour and brightness commands so they also work while the lamp is off.
export const EVEN_IF_OFF = {
  optionsMask: { executeIfOff: true },
  optionsOverride: { executeIfOff: true },
};

export async function disconnect() {
  await controller.close();
}
