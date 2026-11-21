import { Environment, Logger } from "@matter/main";
import { OnOff, LevelControl, ColorControl } from "@matter/main/clusters";
import { CommissioningController } from "@project-chip/matter.js";

Logger.level = "error";

const env = Environment.default;
env.vars.set("storage.path", new URL("./storage", import.meta.url).pathname);

const controller = new CommissioningController({
  environment: { environment: env, id: "aio" },
  autoConnect: true,
  adminFabricLabel: "AIO",
});
await controller.start();

const [nodeId] = controller.getCommissionedNodes();

export const node = await controller.getNode(nodeId);
node.connect();
if (!node.initialized) {
  await new Promise(resolve => node.events.initialized.on(resolve));
}

const light = node.getDevices().find(d => d.getClusterClient(ColorControl.Complete));

export const onOff = light.getClusterClient(OnOff.Complete);
export const level = light.getClusterClient(LevelControl.Complete);
export const color = light.getClusterClient(ColorControl.Complete);

// Add this to colour and brightness commands so they also work while the lamp is off.
export const EVEN_IF_OFF = {
  optionsMask: { executeIfOff: true },
  optionsOverride: { executeIfOff: true },
};

export async function disconnect() {
  await controller.close();
}