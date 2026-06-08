import LightTile from "./LightTile.jsx";
import SwitchTile from "./SwitchTile.jsx";
import SensorTile from "./SensorTile.jsx";
import ClimateTile from "./ClimateTile.jsx";

export const TILE_MAP = {
  light: LightTile,
  switch: SwitchTile,
  sensor: SensorTile,
  binary_sensor: SensorTile,
  climate: ClimateTile,
};
