// 城市防御战统一规则。战役目录中 urbanDefense:true / wallSystem:true 的战役均使用此规则。
export const URBAN_DEFENSE_POLICY = Object.freeze({
  wallSystemVersion: "tengxian-v1",
  defaultWallHP: 1000,
  segmented: true,
  independentDurability: true,
  showDurabilityInHexInfo: true,
  blockPathWhileIntact: true,
  breachAtHP: 0,
  removeWallRenderingAtZeroHP: true,
  breachBecomesPassable: true,
  persistInSave: true,
  states: [
    { minRatio:.76, label:"完整" }, { minRatio:.51, label:"受损" },
    { minRatio:.26, label:"严重受损" }, { minRatio:.01, label:"濒临崩塌" },
    { minRatio:0, label:"缺口" }
  ]
});
