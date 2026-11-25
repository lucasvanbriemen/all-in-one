import { OnOff, LevelControl, ColorControl, BooleanState } from "@matter/main/clusters";
import { colorUtils } from "./colors.js";

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
  }

  async trackState() {
    const { onOff, level, color, contact, state } = this;

    if (onOff) {
      state.isTurnedOn = await onOff.getOnOffAttribute();
      onOff.addOnOffAttributeListener(on => { state.isTurnedOn = on; });
    }

    if (level) {
      state.brightness = await level.getCurrentLevelAttribute();
      level.addCurrentLevelAttributeListener(brightness => { state.brightness = brightness; });
    }

    if (this.type === "color_light") {
      // Hue and saturation arrive separately, so remember both and rebuild the hex from them.
      let hue = await color.getEnhancedCurrentHueAttribute();
      let saturation = await color.getCurrentSaturationAttribute();
      const updateHex = () => {
        state.currentHex = colorUtils.hueAndSaturationToHex(hue / 65535 * 360, saturation);
      };
      updateHex();
      color.addEnhancedCurrentHueAttributeListener(value => { hue = value; updateHex(); });
      color.addCurrentSaturationAttributeListener(value => { saturation = value; updateHex(); });
    }

    if (this.type === "white_light") {
      state.mireds = await color.getColorTemperatureMiredsAttribute();
      color.addColorTemperatureMiredsAttributeListener(mireds => { state.mireds = mireds; });
    }

    if (contact) {
      state.open = !(await contact.getStateValueAttribute());
      contact.addStateValueAttributeListener(closed => { state.open = !closed; });
    }
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
