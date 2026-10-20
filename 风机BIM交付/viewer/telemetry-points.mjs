// Stable public model point keys; actual SCADA tags remain unmapped.
export const TELEMETRY_POINTS=[
  {
    "key": "main_bearing_temperature",
    "assetId": "DRIVE.BEARING",
    "name": "主轴承温度",
    "unit": "degC"
  },
  {
    "key": "gearbox_oil_temperature",
    "assetId": "GEARBOX.STAGE.1",
    "name": "齿轮箱油温",
    "unit": "degC"
  },
  {
    "key": "gearbox_vibration_rms",
    "assetId": "GEARBOX.STAGE.1",
    "name": "齿轮箱振动有效值",
    "unit": "mm/s"
  },
  {
    "key": "generator_speed",
    "assetId": "GENERATOR.BODY",
    "name": "发电机转速",
    "unit": "rpm"
  },
  {
    "key": "active_power",
    "assetId": "GENERATOR.BODY",
    "name": "有功功率",
    "unit": "kW"
  },
  {
    "key": "stator_temperature",
    "assetId": "GENERATOR.BODY",
    "name": "定子温度",
    "unit": "degC"
  },
  {
    "key": "yaw_position",
    "assetId": "YAW.BEARING",
    "name": "偏航角度",
    "unit": "deg"
  },
  {
    "key": "blade_1_pitch",
    "assetId": "PITCH.BEARING.1",
    "name": "叶片1桨距角",
    "unit": "deg"
  },
  {
    "key": "blade_2_pitch",
    "assetId": "PITCH.BEARING.2",
    "name": "叶片2桨距角",
    "unit": "deg"
  },
  {
    "key": "blade_3_pitch",
    "assetId": "PITCH.BEARING.3",
    "name": "叶片3桨距角",
    "unit": "deg"
  },
  {
    "key": "wind_speed",
    "assetId": "SENSOR.WIND",
    "name": "风速",
    "unit": "m/s"
  },
  {
    "key": "wind_direction",
    "assetId": "SENSOR.WIND",
    "name": "传感器1风向",
    "unit": "deg"
  },
  {
    "key": "wind_speed_2",
    "assetId": "SENSOR.WIND.2",
    "name": "传感器2风速",
    "unit": "m/s"
  },
  {
    "key": "wind_direction_2",
    "assetId": "SENSOR.WIND.2",
    "name": "传感器2风向",
    "unit": "deg"
  }
];
