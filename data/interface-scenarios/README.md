# 战役数据目录

每个战役/测试场使用独立文件夹。地图与兵力文件统一放在同一目录：

- `scenario-<id>.json`：地图、地形、战略要点、任务、工事等。
- `units-<id>.json`：该关卡固定兵力（如该关卡使用动态合成旅生成，则可无 units 文件）。

`data/campaigns.js` 中的 `scenarioPath` / `unitsPath` 必须引用本目录中的实际路径。
