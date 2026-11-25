import { OnOff, LevelControl, ColorControl, BooleanState } from "@matter/main/clusters";
import { colorUtils } from "./colors.js";

// Fades send many in-between values, so these are only reported once they've been stable for a moment.
const SETTLING_ATTRIBUTES = ["brightness", "currentHex", "mireds"];
const SETTLE_MS = 1000;

export class Device {
  constructor(nodeId, endpoint) {
    // One node (a bridge, a multi-zone strip) can expose several devices, so the endpoint is part of the id.
    this.id = `${nodeId}-${endpoint.number}`;
    this.onOff = endpoint.getClusterClient(OnOff.Complete);
    this.level = endpoint.getClusterClient(LevelControl.Complete);
    this.color = endpoint.getClusterClient(ColorControl.Complete);
    this.contact = endpoint.getClusterClient(BooleanState.Complete);
    this.type = this.detectType();
    this.state = {};
    this.onChange = null; // (device, attribute, value) => void
    this.settleTimers = {};
  }

  async trackState() {
    const { onOff, level, color, contact, state } = this;

    if (onOff) {
      state.isTurnedOn = await onOff.getOnOffAttribute();
      onOff.addOnOffAttributeListener(on => this.update("isTurnedOn", on));
    }

    if (level) {
      state.brightness = await level.getCurrentLevelAttribute();
      level.addCurrentLevelAttributeListener(brightness => this.update("brightness", brightness));
    }

    if (this.type === "color_light") {
      // Hue and saturation arrive separately, so remember both and rebuild the hex from them.
      let hue = await color.getEnhancedCurrentHueAttribute();
      let saturation = await color.getCurrentSaturationAttribute();
      const toHex = () => colorUtils.hueAndSaturationToHex(hue / 65535 * 360, saturation);
      const updateHex = () => this.update("currentHex", toHex());
      state.currentHex = toHex();
      color.addEnhancedCurrentHueAttributeListener(value => { hue = value; updateHex(); });
      color.addCurrentSaturationAttributeListener(value => { saturation = value; updateHex(); });
    }

    if (this.type === "white_light") {
      state.mireds = await color.getColorTemperatureMiredsAttribute();
      color.addColorTemperatureMiredsAttributeListener(mireds => this.update("mireds", mireds));
    }

    if (contact) {
      state.open = !(await contact.getStateValueAttribute());
      contact.addStateValueAttributeListener(closed => this.update("open", !closed));
    }
  }

  // Called by the listeners: stores the new value and tells onChange about it.
  update(attribute, value) {
    if (this.state[attribute] === value) return;
    this.state[attribute] = value;

    if (!SETTLING_ATTRIBUTES.includes(attribute)) {
      this.onChange?.(this, attribute, value);
      return;
    }

    clearTimeout(this.settleTimers[attribute]);
    this.settleTimers[attribute] = setTimeout(() => {
      this.onChange?.(this, attribute, this.state[attribute]);
    }, SETTLE_MS);
  }

  toJSON() {
    return { id: this.id, type: this.type, ...this.state };
  }

  detectType() {
    if (this.color?.supportedFeatures.hueSaturation) return "color_light";
    if (this.color?.supportedFeatures.colorTemperature) return "white_light";
    if (this.contact) return "contact_sensor";
  }
}
