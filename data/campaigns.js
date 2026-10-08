// data/campaigns.js

// ============================================================

// 《战线 1937-1945》

// 多战场 / 阶段 / 战役目录

// ============================================================

 

export const CAMPAIGNS = [

 

    // ========================================================

    // 特殊战役：超出 1937-1945 主时间线

    // ========================================================

    {

        id: "special_operations",

        name: "特殊战役",

        subtitle: "Special Operations · Beyond 1937–1945",

        phases: [

            {
                id: "modern_red_blue_2026",
                name: "现代红蓝对抗",
                subtitle: "Modern Combined-Arms Exercise",
                scenarios: [
                    {
                        id: "lijian26_combined_brigade",
                        name: "砺剑-26：合成旅红蓝对抗",
                        dateText: "现代 · 虚构训练对抗",
                        location: "砺剑训练基地",
                        status: "available",
                        scenarioPath: "./data/interface-scenarios/lijian26/scenario-lijian26.json",
                        unitsPath: "./data/interface-scenarios/lijian26/units-lijian26.json",
                        factions:["RED","BLUE"],
                        roles:{attacker:"red",defender:"blue"},
                        start:{year:2026,month:10,day:2,hour:8,minute:0,hoursPerTurn:1,startingPhase:"red"},
                        modernBrigadeSelection:true,
                        aiMode:"active"
                    },
                    {
                        id: "lijian27_zhejiang",
                        name: "砺剑-27：浙江方向联合演习",
                        dateText: "2027 · 浙江方向集团军级红蓝对抗演习",
                        location: "浙江省域演习区（架空）",
                        status: "available",
                        stageOverviewImage: "./assets/lijian27/lijian27-ab-overview.png",
                        stageOverviewHotspots: {
                            lijian27a:{left:14.0,top:91.0,width:22.0,height:5.3},
                            lijian27b:{left:64.2,top:91.0,width:22.0,height:5.3}
                        },
                        children: [
    {
                            id: "lijian27a",
                            name: "砺剑27A",
                            dateText: "2027 · 第一阶段 · 西部山地—衢州方向",
                            location: "浙江西部演习区（架空）", status: "available",
                            scenarioPath: "./data/interface-scenarios/lijian27_zhejiang/scenario-lijian27a.json",
                            unitsPath: "./data/interface-scenarios/lijian27_zhejiang/units-lijian27a.json",
                            factions:["RED","BLUE"], roles:{attacker:"red",defender:"blue"},
                            start:{year:2027,month:9,day:16,hour:6,minute:0,hoursPerTurn:1,startingPhase:"red"},
                            preBattleBriefing:{
                                heading:"东南方向联合演习导演部通告 · 砺剑27A",
                                summary:"砺剑27联合对抗演习正式开始。蓝方依托西部山地、河谷、公路和衢州—龙游交通体系构筑纵深防御；红方集团军先遣作战群奉命从西部方向发起进攻，在限定时间内打开足以保障后续主力向纵深发展的战役通道。",
                                redMission:"查明蓝方防御体系，组织工程开路与合成突破，夺取衢州主要交通节点，随后打开龙游方向东进通道，并尽可能保持桥梁、道路和补给体系完整。",
                                blueMission:"依托山地、河流、城镇和既设阵地实施纵深迟滞，破坏红方进攻节奏，保存主要作战力量并阻止红方形成稳定连续的向东突破口。",
                                phases:[
                                    {title:"第1—4回合 · 侦察接触",text:"双方展开侦察与反侦察。红方需要确定主要防御方向，蓝方前沿力量实施警戒迟滞。"},
                                    {title:"第5—10回合 · 打开通路",text:"工程分队前出，围绕桥梁、山口和主要道路建立进攻通路，合成部队攻击第一防御地域。"},
                                    {title:"第11—18回合 · 衢州突破",text:"双方主力围绕衢州交通枢纽及周边山地投入战斗，红方争取撕开主要防御体系。"},
                                    {title:"第19—24回合 · 扩大战果",text:"红方继续向龙游方向发展，蓝方组织撤退、局部反击并保存力量，为后续阶段形成新的战役态势。"}
                                ],
                                objectives:[
                                    {side:"red",name:"打开突破口",text:"夺取衢州并建立至少一条稳定向东交通轴线。"},
                                    {side:"red",name:"保障连续进攻",text:"保持主要桥梁、道路和补给节点可用。"},
                                    {side:"blue",name:"纵深迟滞",text:"延缓红方突破并迫使其消耗工程、火力和预备力量。"},
                                    {side:"blue",name:"保存主力",text:"避免主力在西部被围歼，为B阶段保留反击力量。"}
                                ],
                                victory:"第24回合由导演部根据突破深度、战略节点、有效兵力保存、工程与补给状态综合评分。A阶段结果用于解释B阶段的西部突破、残余蓝军和补给态势。"
                            },
                            groupArmySelection:true, trainingMap:{size:"grand",terrain:"西部山地+河谷+交通节点",width:144,height:120}, aiMode:"active"
                        },
    {
                            id: "lijian27b",
                            name: "砺剑27B",
                            dateText: "2027 · 第二阶段 · 浙江纵深联合演习",
                            location: "浙江省域演习区（架空）", status: "available",
                            scenarioPath: "./data/interface-scenarios/lijian27_zhejiang/scenario-lijian27b.json",
                            unitsPath: "./data/interface-scenarios/lijian27_zhejiang/units-lijian27b.json",
                            factions:["RED","BLUE"], roles:{attacker:"red",defender:"blue"},
                            start:{year:2027,month:9,day:18,hour:6,minute:0,hoursPerTurn:2,startingPhase:"red"},
                            preBattleBriefing:{
                                heading:"东南方向联合演习导演部通告 · 砺剑27B",
                                summary:"砺剑27联合对抗演习进入第二阶段。红方已突破衢州方向防御并控制金华—义乌前进支点，战役重心转向杭州方向。蓝方依托杭州外围城市群、钱塘江水系、交通枢纽和纵深阵地重新组织防御，北部湖州—嘉兴方向与东部宁波方向的预备力量正在进入战区。",
                                redMission:"以金华—义乌为前进支点，保障衢州方向补给线，沿主要交通轴线向杭州方向发展；夺取杭州外围关键节点、机场和交通枢纽，压缩蓝方杭州防御体系，并阻止其北部、东部增援形成完整防线。",
                                blueMission:"依托杭州及周边城市群、钱塘江水系和交通工程组织纵深防御，迟滞红方向杭州推进；保存主力并利用湖州—嘉兴、宁波方向增援形成侧翼压力，在条件成熟时组织局部反突击。",
                                phases:[{title:"第1—8回合 · 稳固前进支点",text:"巩固金华—义乌及衢州方向交通线，清除侧后威胁，为向杭州推进建立补给基础。"},{title:"第9—18回合 · 向杭州方向推进",text:"沿主要交通轴线突破蓝方外围阻滞，争夺杭州外围交通节点、机场和渡河通道。"},{title:"第19—30回合 · 城市群攻防",text:"围绕杭州及钱塘江两岸展开纵深攻防，蓝方北部与东部增援逐步投入。"},{title:"第31—36回合 · 决战与收官",text:"围绕杭州方向主要战略目标、交通体系和双方有效兵力进行最终判定。"}],
                                objectives:[{side:"red",name:"杭州方向",text:"建立由金华—义乌通向杭州方向的稳定进攻走廊。"},{side:"red",name:"交通与机场",text:"夺取杭州外围关键交通节点、渡河通道和可用机场。"},{side:"blue",name:"杭州纵深防御",text:"依托钱塘江水系和城市群阻止红方形成连续突破。"},{side:"blue",name:"增援与反击",text:"保障湖州—嘉兴、宁波方向增援进入并保存反击能力。"}],
                                victory:"导演部根据战略要地控制、有效兵力保存、指挥体系完整度、后勤保障状态和阶段任务完成情况综合评分。"
                            },
                            groupArmySelection:true, trainingMap:{size:"grand",terrain:"浙江省域多山地形+主要水系",width:144,height:120}, aiMode:"active"
                        }
                        ]
                    },
                    {
                        id: "lijian28_hexicorridor",
                        name: "砺剑-28：河西方向联合演习",
                        dateText: "2028 · 集团军级远程机动与战役反突击",
                        location: "河西走廊型演习地域（架空）",
                        status: "available",
                        scenarioPath: "./data/interface-scenarios/lijian28_hexicorridor/scenario-lijian28.json",
                        unitsPath: "./data/interface-scenarios/lijian28_hexicorridor/units-lijian28.json",
                        factions:["RED","BLUE"], roles:{attacker:"red",defender:"blue"},
                        start:{year:2028,month:9,day:12,hour:6,minute:0,hoursPerTurn:3,startingPhase:"red"},
                        preBattleBriefing:{
                            heading:"西北方向联合演习导演部通告 · 砺剑-28",
                            summary:"砺剑-28联合对抗演习开始。演习地域为南北山地夹持的狭长戈壁—绿洲走廊。红方集团军奉命实施远程开进和纵深进攻；蓝方采取节点迟滞、主动脱离和预备队反突击，重点检验双方在超长战役纵深条件下的侦察、机动、保障和指挥能力。",
                            redMission:"完成远程开进，夺取绿洲与交通节点，逐次建立前进保障地域，在保持主要交通线和有效战斗力的前提下向东部纵深发展。",
                            blueMission:"避免在前沿与红方进行不必要消耗，依托节点实施迟滞并保存主力；待红方战役纵深拉长后投入预备力量，威胁其交通线、保障节点和突出部侧后。",
                            phases:[
                                {title:"第1—6回合 · 远程开进",text:"双方侦察体系展开，红方选择道路高速开进或戈壁迂回。"},
                                {title:"第7—14回合 · 绿洲争夺",text:"围绕绿洲、道路和交通节点建立第一批前进保障地域。"},
                                {title:"第15—20回合 · 主动脱离",text:"蓝方前沿部队向纵深转移，红方决定追击速度与保障节奏。"},
                                {title:"第21—25回合 · 补给压力",text:"导演部重点评价道路、油料、弹药与前进保障体系。"},
                                {title:"第26—34回合 · 战役反突击",text:"蓝方预备力量从侧翼投入，重点威胁红方交通线和突出部。"},
                                {title:"第35—40回合 · 最后72小时",text:"停止新增战役预备力量，双方围绕战略节点和体系完整度完成终局对抗。"}
                            ],
                            objectives:[
                                {side:"red",name:"保持进攻体系",text:"夺取关键节点的同时保持主交通轴和前进保障地域连续。"},
                                {side:"red",name:"进入东部纵深",text:"在第40回合前形成稳定的纵深控制。"},
                                {side:"blue",name:"迟滞与保存",text:"以空间换时间，避免主力在前沿被固定和消耗。"},
                                {side:"blue",name:"战役反突击",text:"利用预备队威胁红方补给线并迫使其停止连续进攻。"}
                            ],
                            victory:"第40回合由导演部综合战略节点控制30%、有效兵力20%、后勤体系20%、指挥体系10%、战损交换10%和阶段任务10%评分；不以全歼对手作为胜利条件。"
                        },
                        groupArmySelection:true,
                        trainingMap:{size:"theater",terrain:"戈壁+绿洲+山口+超长交通轴",width:180,height:100},
                        aiMode:"active"
                    },
                    {
                        id: "lijian29_wandong",
                        name: "砺剑-29：皖东联合战役演习",
                        dateText: "2029 · 江淮丘陵与水网城镇联合对抗",
                        location: "安徽·皖东演习区（地名真实，军事部署虚构）", status: "available",
                        scenarioPath: "./data/interface-scenarios/lijian29_wandong/scenario-lijian29.json",
                        unitsPath: "./data/interface-scenarios/lijian29_wandong/units-lijian29.json",
                        factions:["RED","BLUE"], roles:{attacker:"red",defender:"blue"},
                        start:{year:2029,month:9,day:16,hour:6,minute:0,hoursPerTurn:2,startingPhase:"red"},
                        preBattleBriefing:{
                            image:"./assets/briefings/lijian29-wandong.png",
                            heading:"东部方向联合演习导演部通告 · 砺剑-29",
                            summary:"砺剑-29联合对抗演习开始。演习地域采用皖东公开地名与概化地形，包含丘陵、水网、湖泊、城镇和交通走廊。红方从南部与东部方向展开，蓝方在前沿即配置警戒与防御力量，并依托三界—定远方向组织纵深防御。重点检验复杂地形下的侦察、工程、机动、防空、保障与联合指挥能力。",
                            redMission:"从南部、东部集结地域进入战区，夺取关键交通节点并建立连续保障走廊；控制三界训练区及定远—滁州方向主要控制点，在保持有效战斗力的前提下压缩蓝方防御体系。",
                            blueMission:"前沿警戒部队不得全部后撤，依托丘陵、水网、道路节点和城镇外围构筑多层防御；保存纵深预备力量，在红方交通线拉长后实施局部反击，破坏其连续保障能力。",
                            phases:[
                              {title:"第1—6回合 · 接敌与侦察",text:"双方侦察体系展开，红方突破前沿警戒，蓝方确认主要进攻方向。"},
                              {title:"第7—14回合 · 三界方向争夺",text:"围绕三界训练区、道路节点和水网通道展开攻防。"},
                              {title:"第15—24回合 · 纵深机动",text:"战役重心转向定远—滁州方向，双方投入预备力量并争夺保障节点。"},
                              {title:"第25—32回合 · 体系对抗",text:"重点评价防空、工程、补给、抢修、航空与火力支援体系。"},
                              {title:"第33—36回合 · 决胜与巩固",text:"围绕主要控制点、有效兵力和交通体系完成最终评分。"}
                            ],
                            objectives:[
                              {side:"red",name:"控制三界",text:"夺取并保持三界训练区及周边交通节点。"},
                              {side:"red",name:"建立走廊",text:"维持南部/东部集结地域至前沿的连续补给与抢修通道。"},
                              {side:"blue",name:"前沿迟滞",text:"利用前沿警戒和多层阵地延缓红方推进，避免前线空虚。"},
                              {side:"blue",name:"纵深反击",text:"保存预备力量，在有利时机威胁红方交通与保障体系。"}
                            ],
                            victory:"第36回合由导演部综合战略节点30%、有效兵力20%、后勤体系20%、指挥体系10%、战损交换10%和阶段任务10%评分；不以全歼对手作为唯一胜利条件。"
                        },
                        groupArmySelection:true,
                        trainingMap:{size:"theater",terrain:"江淮丘陵+水网湖泊+城镇交通走廊",width:140,height:100},
                        aiMode:"active"
                    }
                ]
            },
            {
                id: "modern_training_center",
                name: "现代合成旅训练中心",
                subtitle: "训练中心 · 小型 / 中型 / 大型",
                scenarios: [
                    {id:"train_small_urban",name:"小型·城市综合训练场",dateText:"现代 · 小型城市训练",location:"砺剑训练中心",status:"available",scenarioPath:"./data/interface-scenarios/train_small_urban/scenario-train_small_urban.json",factions:["RED","BLUE"],roles:{attacker:"red",defender:"blue"},start:{year:2026,month:10,day:2,hour:8,minute:0,hoursPerTurn:1,startingPhase:"red"},modernBrigadeSelection:true,trainingMap:{size:"small",terrain:"城市",width:44,height:30},aiMode:"active"},
                    {id:"train_small_mountain",name:"小型·山地训练场",dateText:"现代 · 小型山地训练",location:"砺剑训练中心",status:"available",scenarioPath:"./data/interface-scenarios/train_small_mountain/scenario-train_small_mountain.json",factions:["RED","BLUE"],roles:{attacker:"red",defender:"blue"},start:{year:2026,month:10,day:2,hour:8,minute:0,hoursPerTurn:1,startingPhase:"red"},modernBrigadeSelection:true,trainingMap:{size:"small",terrain:"山地",width:44,height:30},aiMode:"active"},
                    {id:"train_small_river",name:"小型·渡河训练场",dateText:"现代 · 小型渡河训练",location:"砺剑训练中心",status:"available",scenarioPath:"./data/interface-scenarios/train_small_river/scenario-train_small_river.json",factions:["RED","BLUE"],roles:{attacker:"red",defender:"blue"},start:{year:2026,month:10,day:2,hour:8,minute:0,hoursPerTurn:1,startingPhase:"red"},modernBrigadeSelection:true,trainingMap:{size:"small",terrain:"渡河",width:44,height:30},aiMode:"active"},
                    {id:"train_small_armor",name:"小型·装甲靶场",dateText:"现代 · 小型平原训练",location:"砺剑训练中心",status:"available",scenarioPath:"./data/interface-scenarios/train_small_armor/scenario-train_small_armor.json",factions:["RED","BLUE"],roles:{attacker:"red",defender:"blue"},start:{year:2026,month:10,day:2,hour:8,minute:0,hoursPerTurn:1,startingPhase:"red"},modernBrigadeSelection:true,trainingMap:{size:"small",terrain:"平原",width:44,height:30},aiMode:"active"},
                    {id:"train_medium_forest",name:"中型·丘陵林地训练场",dateText:"现代 · 中型丘陵林地训练",location:"砺剑训练中心",status:"available",scenarioPath:"./data/interface-scenarios/train_medium_forest/scenario-train_medium_forest.json",factions:["RED","BLUE"],roles:{attacker:"red",defender:"blue"},start:{year:2026,month:10,day:2,hour:8,minute:0,hoursPerTurn:1,startingPhase:"red"},modernBrigadeSelection:true,trainingMap:{size:"medium",terrain:"丘陵林地",width:60,height:40},aiMode:"active"},
                    {id:"train_medium_plain",name:"中型·平原机械化训练场",dateText:"现代 · 中型平原训练",location:"砺剑训练中心",status:"available",scenarioPath:"./data/interface-scenarios/train_medium_plain/scenario-train_medium_plain.json",factions:["RED","BLUE"],roles:{attacker:"red",defender:"blue"},start:{year:2026,month:10,day:2,hour:8,minute:0,hoursPerTurn:1,startingPhase:"red"},modernBrigadeSelection:true,trainingMap:{size:"medium",terrain:"平原",width:60,height:40},aiMode:"active"},
                    {id:"train_medium_coast",name:"中型·滨海训练场",dateText:"现代 · 中型滨海训练",location:"砺剑训练中心",status:"available",scenarioPath:"./data/interface-scenarios/train_medium_coast/scenario-train_medium_coast.json",factions:["RED","BLUE"],roles:{attacker:"red",defender:"blue"},start:{year:2026,month:10,day:2,hour:8,minute:0,hoursPerTurn:1,startingPhase:"red"},modernBrigadeSelection:true,trainingMap:{size:"medium",terrain:"滨海",width:60,height:40},aiMode:"active"},
                    {id:"train_large_amphibious_islands",name:"大型·群岛两栖综合训练场",dateText:"现代 · 两栖群岛综合训练",location:"砺剑两栖训练海域（架空）",status:"available",scenarioPath:"./data/interface-scenarios/train_large_amphibious_islands/scenario-train_large_amphibious_islands.json",factions:["RED","BLUE"],roles:{attacker:"red",defender:"blue"},start:{year:2026,month:10,day:2,hour:8,minute:0,hoursPerTurn:1,startingPhase:"red"},modernBrigadeSelection:true,trainingMap:{size:"large",terrain:"群岛+滨海+岸防工事",width:76,height:52},aiMode:"active"},
                    {id:"marine_amphibious_test",name:"海军陆战队·群岛登陆演习场",marineSupportSelection:true,dateText:"现代 · 海军陆战队与舰艇测试",location:"砺剑海军陆战队训练海域（架空）",status:"available",scenarioPath:"./data/interface-scenarios/marine_amphibious_test/scenario-marine_amphibious_test.json",unitsPath:"./data/interface-scenarios/marine_amphibious_test/units-marine_amphibious_test.json",factions:["RED","BLUE"],roles:{attacker:"red",defender:"blue"},start:{year:2026,month:10,day:6,hour:7,minute:0,hoursPerTurn:1,startingPhase:"red"},navalMode:true,amphibiousMode:true,trainingMap:{size:"large",terrain:"外海+群岛+双滩头+港口+滨海丘陵",width:84,height:60},aiMode:"active"},
                    {id:"train_medium_desert",name:"中型·荒漠戈壁训练场",dateText:"现代 · 中型荒漠训练",location:"砺剑训练中心",status:"available",scenarioPath:"./data/interface-scenarios/train_medium_desert/scenario-train_medium_desert.json",factions:["RED","BLUE"],roles:{attacker:"red",defender:"blue"},start:{year:2026,month:10,day:2,hour:8,minute:0,hoursPerTurn:1,startingPhase:"red"},modernBrigadeSelection:true,trainingMap:{size:"medium",terrain:"荒漠",width:60,height:40},aiMode:"active"},
                    {id:"train_large_combined",name:"大型·合成旅综合训练场",dateText:"现代 · 大型综合训练",location:"砺剑训练中心",status:"available",scenarioPath:"./data/interface-scenarios/train_large_combined/scenario-train_large_combined.json",factions:["RED","BLUE"],roles:{attacker:"red",defender:"blue"},start:{year:2026,month:10,day:2,hour:8,minute:0,hoursPerTurn:1,startingPhase:"red"},modernBrigadeSelection:true,trainingMap:{size:"large",terrain:"综合",width:76,height:52},aiMode:"active"},
                    {id:"train_large_integrated_base",name:"大型·综合训练基地",dateText:"现代 · 大型多地形工事综合训练",location:"砺剑综合训练基地",status:"available",scenarioPath:"./data/interface-scenarios/train_large_integrated_base/scenario-train_large_integrated_base.json",factions:["RED","BLUE"],roles:{attacker:"red",defender:"blue"},start:{year:2026,month:10,day:2,hour:8,minute:0,hoursPerTurn:1,startingPhase:"red"},modernBrigadeSelection:true,trainingMap:{size:"large",terrain:"综合地形+工事",width:76,height:52},aiMode:"active"},
                    {id:"train_large_mountain",name:"大型·山地纵深训练场",dateText:"现代 · 大型山地训练",location:"砺剑训练中心",status:"available",scenarioPath:"./data/interface-scenarios/train_large_mountain/scenario-train_large_mountain.json",factions:["RED","BLUE"],roles:{attacker:"red",defender:"blue"},start:{year:2026,month:10,day:2,hour:8,minute:0,hoursPerTurn:1,startingPhase:"red"},modernBrigadeSelection:true,trainingMap:{size:"large",terrain:"山地",width:76,height:52},aiMode:"active"},
                    {id:"train_large_urban",name:"大型·城市群训练场",dateText:"现代 · 大型城市群训练",location:"砺剑训练中心",status:"available",scenarioPath:"./data/interface-scenarios/train_large_urban/scenario-train_large_urban.json",factions:["RED","BLUE"],roles:{attacker:"red",defender:"blue"},start:{year:2026,month:10,day:2,hour:8,minute:0,hoursPerTurn:1,startingPhase:"red"},modernBrigadeSelection:true,trainingMap:{size:"large",terrain:"城市群",width:76,height:52},aiMode:"active"},
                    {id:"train_large_joint",name:"大型·全域联合训练场",dateText:"现代 · 大型全域训练",location:"砺剑训练中心",status:"available",scenarioPath:"./data/interface-scenarios/train_large_joint/scenario-train_large_joint.json",factions:["RED","BLUE"],roles:{attacker:"red",defender:"blue"},start:{year:2026,month:10,day:2,hour:8,minute:0,hoursPerTurn:1,startingPhase:"red"},groupArmySelection:true,trainingMap:{size:"large",terrain:"集团军综合地形+工事",width:96,height:64},aiMode:"active"}
                ]
            },
            {
                id: "korean_war_1950_1953",
                name: "抗美援朝",
                subtitle: "Korean War · 1950–1953",
                scenarios: [],
                campaigns: [
                    { id:"korean_war_first_campaign", name:"第一次战役", scenarios:[] },
                    { id:"korean_war_second_campaign", name:"第二次战役", scenarios:[] },
                    { id:"korean_war_third_campaign", name:"第三次战役", scenarios:[] },
                    { id:"korean_war_fourth_campaign", name:"第四次战役", scenarios:[] },
                    { id:"korean_war_fifth_campaign", name:"第五次战役", scenarios:[] },
                    { id:"korean_war_positional", name:"阵地战阶段", scenarios:[] },
                    { id:"korean_war_1953_summer", name:"1953年夏季反击", scenarios:[] }
                ],
                equipmentDeckId: "pva_korea_1950_1953"
            },
            {

                id: "korea_1979",

                name: "1979：汉城政变之夜",

                scenarios: [

                    {

                        id: "seoul_1979_1212",

                        name: "双十二之夜",

                        subtitle: "12·12 Military Insurrection",

                        dateText: "1979年12月12日—13日",

                        location: "韩国·汉城",

                        status: "available",

                        scenarioPath: "./data/interface-scenarios/seoul1979/scenario-seoul1979.json",

                        unitsPath: "./data/interface-scenarios/seoul1979/units-seoul1979.json",

                        factions: ["NEWMIL", "ROK_GOV"],

                        roles: { attacker: "new_military", defender: "rok_government" },

                        start: { year:1979, month:12, day:12, hour:18, minute:0, hoursPerTurn:0.5, startingPhase:"new_military" }

                    }

                ]

            }

        ]

    },

 

    // ========================================================

    // 苏德战场

    // ========================================================

    {

        id: "eastern_front",

        name: "苏德战场",

        subtitle: "Eastern Front",

 

        phases: [

 

            // ------------------------------------------------

            // 1941 巴巴罗萨

            // ------------------------------------------------

            {

                id: "barbarossa_1941",

                name: "1941：巴巴罗萨",

 

                scenarios: [

 

                    {

                        id: "dubno",

                        name: "杜布诺战役",

                        subtitle: "Battle of Dubno",

 

                        dateText: "1941年6月26日",

                        location: "乌克兰西部",

 

                        status: "available",

 

                        scenarioPath: "./data/scenario.json",

                        unitsPath: "./data/units.json",

 

                        factions: ["GER", "USSR"],

 

                        roles: {

                            attacker: "german",

                            defender: "soviet"

                        },

 

                        start: {

                            year: 1941,

                            month: 6,

                            day: 26,

                            hour: 8,

                            minute: 0,

                            hoursPerTurn: 2,

                            startingPhase: "german"

                        }

                    },

 

                    {

                        id: "smolensk",

                        name: "斯摩棱斯克战役",

                        subtitle: "Battle of Smolensk",

 

                        dateText: "1941年7月10日",

                        location: "斯摩棱斯克",

 

                        status: "available",

 

                        scenarioPath: "./data/interface-scenarios/smolensk/scenario-smolensk.json",

                        unitsPath: "./data/interface-scenarios/smolensk/units-smolensk.json",

 

                        factions: ["GER", "USSR"],

 

                        roles: {

                            attacker: "german",

                            defender: "soviet"

                        },

 

                        start: {

                            year: 1941,

                            month: 7,

                            day: 10,

                            hour: 8,

                            minute: 0,

                            hoursPerTurn: 2,

                            startingPhase: "german"

                        }

                    }

                ]

            },

 

            {
                id: "stalingrad_campaign_1942_43",
                name: "1942–43：斯大林格勒保卫战",
                subtitle: "系统战役 · Battle of Stalingrad",
                campaignSystem: {
                    enabled: true,
                    persistentState: true,
                    logisticsReserved: true,
                    note: "系统战役框架已建立；弹药、燃料、补给等持续后勤物资接口预留，当前版本不启用。"
                },
                scenarios: [
                    { id:"stalingrad_approach", name:"斯大林格勒外围防御战", subtitle:"阶段框架", dateText:"1942年8月", location:"斯大林格勒西部", status:"interface" },
                    {
                        id:"mamayev_kurgan_1942", name:"马马耶夫岗争夺战", subtitle:"Mamayev Kurgan · 子战役",
                        dateText:"1942年9月14日", location:"斯大林格勒·马马耶夫岗", status:"available",
                        scenarioPath:"./data/interface-scenarios/mamayev-kurgan/scenario-mamayev-kurgan.json", unitsPath:"./data/interface-scenarios/mamayev-kurgan/units-mamayev-kurgan.json",
                        factions:["GER","USSR"], roles:{attacker:"german",defender:"soviet"},
                        start:{year:1942,month:9,day:14,hour:6,minute:0,hoursPerTurn:6,startingPhase:"german"}
                    },
                    { id:"stalingrad_grain_elevator", name:"谷物升降机保卫战", subtitle:"阶段框架", dateText:"1942年9月", location:"斯大林格勒南部", status:"interface" },
                    {
                        id:"stalingrad_tractor_factory",
                        name:"捷尔任斯基拖拉机厂保卫战",
                        subtitle:"拖拉机厂 · T-34生产线直接参战",
                        dateText:"1942年10月14日",
                        location:"斯大林格勒北部工厂区",
                        status:"available",
                        scenarioPath:"./data/interface-scenarios/stalingrad-tractor-factory/scenario-stalingrad-tractor-factory.json",
                        unitsPath:"./data/interface-scenarios/stalingrad-tractor-factory/units-stalingrad-tractor-factory.json",
                        factions:["GER","USSR"], roles:{attacker:"german",defender:"soviet"},
                        start:{year:1942,month:10,day:14,hour:6,minute:0,hoursPerTurn:6,startingPhase:"german"}
                    },
                    { id:"stalingrad_barrikady", name:"街垒工厂争夺战", subtitle:"阶段框架", dateText:"1942年10月", location:"斯大林格勒工厂区", status:"interface" },
                    { id:"stalingrad_red_october", name:"红十月工厂争夺战", subtitle:"阶段框架", dateText:"1942年10月", location:"斯大林格勒工厂区", status:"interface" },
                    { id:"stalingrad_volga_crossing", name:"伏尔加河渡口保卫战", subtitle:"阶段框架", dateText:"1942年10月", location:"伏尔加河西岸", status:"interface" },
                    { id:"stalingrad_uranus", name:"天王星行动", subtitle:"后续阶段框架", dateText:"1942年11月", location:"斯大林格勒战区", status:"interface" },
                    { id:"stalingrad_ring", name:"指环行动", subtitle:"最终阶段框架", dateText:"1943年1月", location:"斯大林格勒包围圈", status:"interface" }
                ]
            },

 

            {

                id: "counteroffensive_1943",

                name: "1943：库尔斯克与战略反攻",

                scenarios: [

                    {

                        id: "kursk_1943",

                        name: "库尔斯克会战",

                        subtitle: "Battle of Kursk · Operation Citadel",

                        dateText: "1943年7月5日",

                        location: "苏联·库尔斯克突出部",

                        status: "available",

                        scenarioPath: "./data/interface-scenarios/kursk/scenario-kursk.json",

                        unitsPath: "./data/interface-scenarios/kursk/units-kursk.json",

                        factions: ["GER", "USSR"],

                        roles: { attacker: "german", defender: "soviet" },

                        start: { year:1943, month:7, day:5, hour:4, minute:30, hoursPerTurn:6, startingPhase:"german" }

                    }

                ]

            },

 

            // ------------------------------------------------

            // 1944-45 攻入德国

            // ------------------------------------------------

            {

                id: "germany_1944_45",

                name: "1944–45：攻入德国",

 

                scenarios: [

 

                    {

                        id: "berlin",

                        name: "柏林战役",

                        subtitle: "Battle of Berlin",

 

                        dateText: "1945年4月—5月",

                        location: "德国·柏林",

 

                        status: "available",

 

                        scenarioPath: "./data/interface-scenarios/berlin/scenario-berlin.json",

                        unitsPath: "./data/interface-scenarios/berlin/units-berlin.json",

 

                        factions: ["USSR", "GER"],

 

                        roles: {

                            attacker: "soviet",

                            defender: "german"

                        },

 

                        start: {

                            year: 1945,

                            month: 4,

                            day: 16,

                            hour: 5,

                            minute: 0,

                            hoursPerTurn: 6,

                            startingPhase: "soviet"

                        }

                    }

                ]

            }

        ]

    },

 

 

    // ========================================================

    // 中国战场：抗日战争主要战役总表接口

    // ========================================================

    {

        id: "china_front", name: "中国战场", subtitle: "China Front · 1931–1945",

        phases: [

            {

                id: "china_1931_36", name: "1931–1936：局部抗战",

                scenarios: [

                    { id: "mukden_1931", name: "九一八事变", dateText: "1931年9月18日", location: "辽宁·沈阳", status: "interface", interfaceOnly: true, factions:["CHN","JPN"], roles:{attacker:"japanese",defender:"chinese"}, urbanDefense:false, wallSystem:false },

                    { id: "heilongjiang_1931", name: "黑龙江战役", dateText: "1931年", location: "黑龙江", status: "interface", interfaceOnly: true, factions:["CHN","JPN"], roles:{attacker:"japanese",defender:"chinese"}, urbanDefense:false, wallSystem:false },

                    { id: "jiangqiao_1931", name: "江桥抗战", dateText: "1931年11月", location: "黑龙江·江桥", status: "interface", interfaceOnly: true, factions:["CHN","JPN"], roles:{attacker:"japanese",defender:"chinese"}, urbanDefense:false, wallSystem:false },

                    { id: "harbin_1932", name: "哈尔滨保卫战", dateText: "1932年", location: "哈尔滨", status: "interface", interfaceOnly: true, factions:["CHN","JPN"], roles:{attacker:"japanese",defender:"chinese"}, urbanDefense:true, wallSystem:true },

                    { id: "shanghai_1932", name: "淞沪抗战（一·二八）", dateText: "1932年1月—3月", location: "上海", status: "interface", interfaceOnly: true, factions:["CHN","JPN"], roles:{attacker:"japanese",defender:"chinese"}, urbanDefense:true, wallSystem:true },

                    { id: "rehe_1933", name: "热河战役", dateText: "1933年", location: "热河", status: "interface", interfaceOnly: true, factions:["CHN","JPN"], roles:{attacker:"japanese",defender:"chinese"}, urbanDefense:false, wallSystem:false },

                    { id: "great_wall_1933", name: "长城抗战", dateText: "1933年", location: "长城沿线", status: "interface", interfaceOnly: true, factions:["CHN","JPN"], roles:{attacker:"japanese",defender:"chinese"}, urbanDefense:false, wallSystem:false },

                    { id: "suiyuan_1936", name: "绥远抗战", dateText: "1936年", location: "绥远", status: "interface", interfaceOnly: true, factions:["CHN","JPN"], roles:{attacker:"japanese",defender:"chinese"}, urbanDefense:false, wallSystem:false }

                ]

            },

            {

                id: "china_1937_38", name: "1937–1938：全面抗战初期",

                scenarios: [

                    { id: "lugouqiao_1937", name: "七七事变", dateText: "1937年7月7日", location: "北平·卢沟桥", status: "interface", interfaceOnly: true, factions:["CHN","JPN"], roles:{attacker:"japanese",defender:"chinese"}, urbanDefense:false, wallSystem:false },

                    { id: "beiping_tianjin_1937", name: "平津作战", dateText: "1937年7月—8月", location: "北平—天津", status: "interface", interfaceOnly: true, factions:["CHN","JPN"], roles:{attacker:"japanese",defender:"chinese"}, urbanDefense:true, wallSystem:true },

                    { id: "nankou_1937", name: "南口战役", dateText: "1937年8月", location: "察哈尔·南口", status: "interface", interfaceOnly: true, factions:["CHN","JPN"], roles:{attacker:"japanese",defender:"chinese"}, urbanDefense:false, wallSystem:false },

                    { id: "shanghai", name: "淞沪会战", dateText: "1937年8月—11月", location: "上海", status: "available", scenarioPath: "./data/interface-scenarios/shanghai/scenario-shanghai.json", unitsPath: "./data/interface-scenarios/shanghai/units-shanghai.json", factions:["CHN","JPN"], roles:{attacker:"japanese",defender:"chinese"}, start:{year:1937,month:8,day:13,hour:8,minute:0,hoursPerTurn:6,startingPhase:"japanese"}, urbanDefense:true, wallSystem:true , children:[{ id:"sihang", name:"四行仓库保卫战", dateText:"1937年10月26日—11月1日", location:"上海·闸北·四行仓库", status:"available", scenarioPath:"./data/interface-scenarios/sihang/scenario-sihang.json", unitsPath:"./data/interface-scenarios/sihang/units-sihang.json", factions:["CHN","JPN"], roles:{attacker:"japanese",defender:"chinese"}, start:{year:1937,month:10,day:26,hour:22,minute:0,hoursPerTurn:2,startingPhase:"japanese"}, urbanDefense:true, wallSystem:true }] },

                    { id: "jiangyin_1937", name: "江阴保卫战", dateText: "1937年8月—12月", location: "江苏·江阴", status: "interface", interfaceOnly: true, factions:["CHN","JPN"], roles:{attacker:"japanese",defender:"chinese"}, urbanDefense:true, wallSystem:true },

                    { id: "nanjing", name: "南京保卫战", dateText: "1937年12月", location: "南京", status: "available", scenarioPath: "./data/interface-scenarios/nanjing/scenario-nanjing.json", unitsPath: "./data/interface-scenarios/nanjing/units-nanjing.json", factions:["CHN","JPN"], roles:{attacker:"japanese",defender:"chinese"}, start:{year:1937,month:12,day:1,hour:8,minute:0,hoursPerTurn:6,startingPhase:"japanese"}, urbanDefense:true, wallSystem:true },

                    { id: "taiyuan_1937", name: "太原会战（含平型关、忻口）", dateText: "1937年9月—11月", location: "山西", status: "interface", interfaceOnly: true, factions:["CHN","JPN"], roles:{attacker:"japanese",defender:"chinese"}, urbanDefense:true, wallSystem:true },

                    { id: "xuzhou_1938", name: "徐州会战", dateText: "1938年1月—5月", location: "江苏—山东", status: "interface", interfaceOnly: true, factions:["CHN","JPN"], roles:{attacker:"japanese",defender:"chinese"}, urbanDefense:true, wallSystem:true, children:[{ id: "tengxian", name: "滕县保卫战", dateText: "1938年3月16日—18日", location: "山东·滕县", status: "available", scenarioPath: "./data/interface-scenarios/tengxian/scenario-tengxian.json", unitsPath: "./data/interface-scenarios/tengxian/units-tengxian.json", factions:["CHN","JPN"], roles:{attacker:"japanese",defender:"chinese"}, start:{year:1938,month:3,day:16,hour:6,minute:0,hoursPerTurn:2,startingPhase:"japanese"}, urbanDefense:true, wallSystem:true }, { id: "taierzhuang", name: "台儿庄战役", dateText: "1938年3月—4月", location: "山东·台儿庄", status: "available", scenarioPath: "./data/interface-scenarios/taierzhuang/scenario-taierzhuang.json", unitsPath: "./data/interface-scenarios/taierzhuang/units-taierzhuang.json", factions:["CHN","JPN"], roles:{attacker:"japanese",defender:"chinese"}, start:{year:1938,month:3,day:24,hour:8,minute:0,hoursPerTurn:2,startingPhase:"japanese"}, urbanDefense:true, wallSystem:true }] },

                    { id: "lanfeng_1938", name: "兰封会战", dateText: "1938年5月—6月", location: "河南·兰封", status: "interface", interfaceOnly: true, factions:["CHN","JPN"], roles:{attacker:"japanese",defender:"chinese"}, urbanDefense:false, wallSystem:false },

                    { id: "chongqing_bombing", name: "重庆大轰炸", dateText: "1938—1943年", location: "重庆", status: "interface", interfaceOnly: true, factions:["CHN","JPN"], roles:{attacker:"japanese",defender:"chinese"}, urbanDefense:true, wallSystem:true },

                    { id: "wuhan_1938", name: "武汉会战", dateText: "1938年6月11日—10月27日", location: "安徽—江西—湖北·武汉", status: "available", scenarioPath:"./data/interface-scenarios/wuhan/scenario-wuhan.json", unitsPath:"./data/interface-scenarios/wuhan/units-wuhan.json", factions:["CHN","JPN"], roles:{attacker:"japanese",defender:"chinese"}, start:{year:1938,month:6,day:11,hour:6,minute:0,hoursPerTurn:24,startingPhase:"japanese"}, urbanDefense:true, wallSystem:true, children:[{ id: "wanjialing", name: "万家岭战役", dateText: "1938年10月", location: "江西·德安·万家岭", status: "available", scenarioPath: "./data/interface-scenarios/wanjialing/scenario-wanjialing.json", unitsPath: "./data/interface-scenarios/wanjialing/units-wanjialing.json", factions:["CHN","JPN"], roles:{attacker:"japanese",defender:"chinese"}, start:{year:1938,month:10,day:2,hour:8,minute:0,hoursPerTurn:2,startingPhase:"japanese"}, urbanDefense:false, wallSystem:false }] },

                    { id: "guangzhou_1938", name: "广州战役", dateText: "1938年10月12日—29日", location: "广东·大亚湾—惠阳—东莞—广州", status: "available", scenarioPath: "./data/interface-scenarios/guangzhou/scenario-guangzhou.json", unitsPath: "./data/interface-scenarios/guangzhou/units-guangzhou.json", factions:["CHN","JPN"], roles:{attacker:"japanese",defender:"chinese"}, start:{year:1938,month:10,day:12,hour:6,minute:0,hoursPerTurn:6,startingPhase:"japanese"}, urbanDefense:true, wallSystem:true }

                ]

            },

            {

                id: "china_1939_41_full", name: "1939–1941：战略相持",

                scenarios: [

                    { id: "nanchang_1939", name: "南昌会战", dateText: "1939年3月—5月", location: "江西·南昌", status: "interface", interfaceOnly: true, factions:["CHN","JPN"], roles:{attacker:"japanese",defender:"chinese"}, urbanDefense:true, wallSystem:true },

                    { id: "suizao_1939", name: "随枣会战", dateText: "1939年5月", location: "湖北·随县—枣阳", status: "interface", interfaceOnly: true, factions:["CHN","JPN"], roles:{attacker:"japanese",defender:"chinese"}, urbanDefense:false, wallSystem:false },

                    { id: "changsha_campaigns", name: "长沙会战", dateText: "1939—1942年", location: "湖南·长沙及周边", status: "interface", interfaceOnly: true, factions:["CHN","JPN"], roles:{attacker:"japanese",defender:"chinese"}, urbanDefense:true, wallSystem:true, children:[

                        { id: "changsha1_1939", name: "第一次长沙会战", dateText: "1939年9月—10月", location: "湖南·长沙", status: "interface", interfaceOnly: true, factions:["CHN","JPN"], roles:{attacker:"japanese",defender:"chinese"}, urbanDefense:true, wallSystem:true },

                        { id: "changsha2_1941", name: "第二次长沙会战", dateText: "1941年9月—10月", location: "湖南·长沙", status: "interface", interfaceOnly: true, factions:["CHN","JPN"], roles:{attacker:"japanese",defender:"chinese"}, urbanDefense:true, wallSystem:true },

                        { id: "changsha3", name: "第三次长沙会战", dateText: "1941年12月—1942年1月", location: "湖南·长沙", status: "available", scenarioPath: "./data/interface-scenarios/changsha3/scenario-changsha3.json", unitsPath: "./data/interface-scenarios/changsha3/units-changsha3.json", factions:["CHN","JPN"], roles:{attacker:"japanese",defender:"chinese"}, start:{year:1941,month:12,day:24,hour:8,minute:0,hoursPerTurn:6,startingPhase:"japanese"}, urbanDefense:true, wallSystem:true }

                    ] },

                    { id: "guinan_1939", name: "桂南会战（含昆仑关战役）", dateText: "1939年11月—1940年2月", location: "广西南部", status: "interface", interfaceOnly: true, factions:["CHN","JPN"], roles:{attacker:"japanese",defender:"chinese"}, urbanDefense:false, wallSystem:false },

                    { id: "kunlun", name: "昆仑关战役", dateText: "1939年12月—1940年1月", location: "广西·昆仑关", status: "available", scenarioPath: "./data/interface-scenarios/kunlun/scenario-kunlun.json", unitsPath: "./data/interface-scenarios/kunlun/units-kunlun.json", factions:["CHN","JPN"], roles:{attacker:"chinese",defender:"japanese"}, start:{year:1939,month:12,day:18,hour:8,minute:0,hoursPerTurn:6,startingPhase:"chinese"}, urbanDefense:false, wallSystem:false },

                    { id: "wuyuan_1940", name: "五原战役", dateText: "1940年3月", location: "绥远·五原", status: "interface", interfaceOnly: true, factions:["CHN","JPN"], roles:{attacker:"japanese",defender:"chinese"}, urbanDefense:true, wallSystem:true },

                    { id: "zaoyi_1940", name: "枣宜会战", dateText: "1940年5月—6月", location: "湖北", status: "interface", interfaceOnly: true, factions:["CHN","JPN"], roles:{attacker:"japanese",defender:"chinese"}, urbanDefense:false, wallSystem:false },

                    { id: "hundred_regiments_1940", name: "百团大战", dateText: "1940年8月—12月", location: "华北", status: "interface", interfaceOnly: true, factions:["CHN","JPN"], roles:{attacker:"japanese",defender:"chinese"}, urbanDefense:false, wallSystem:false },

                    { id: "yunan_1941", name: "豫南会战", dateText: "1941年1月—2月", location: "河南南部", status: "interface", interfaceOnly: true, factions:["CHN","JPN"], roles:{attacker:"japanese",defender:"chinese"}, urbanDefense:false, wallSystem:false },

                   {
    id: "shanggao_1941",
    name: "上高会战",
    dateText: "1941年3月—4月",
    location: "江西·上高",

    status: "available",

    scenarioPath: "./data/interface-scenarios/shanggao_1941/scenario-shanggao_1941.json",
    unitsPath: "./data/interface-scenarios/shanggao_1941/units-shanggao_1941.json",

    factions: ["CHN", "JPN"],

    roles: {
        attacker: "japanese",
        defender: "chinese"
    },

    start: {
        year: 1941,
        month: 3,
        day: 15,
        hour: 8,
        minute: 0,
        hoursPerTurn: 6,
        startingPhase: "japanese"
    },

    urbanDefense: false,
    wallSystem: false
},

                    { id: "zhongtiaoshan_1941", name: "中条山战役", dateText: "1941年5月—6月", location: "山西·中条山", status: "interface", interfaceOnly: true, factions:["CHN","JPN"], roles:{attacker:"japanese",defender:"chinese"}, urbanDefense:false, wallSystem:false },

 

                ]

            },

            {

                id: "china_1942_45_full", name: "1942–1945：反攻与战争后期",

                scenarios: [

                    { id: "yenangyaung_1942", name: "仁安羌大捷", dateText: "1942年4月", location: "缅甸·仁安羌", status: "interface", interfaceOnly: true, factions:["CHN","JPN"], roles:{attacker:"japanese",defender:"chinese"}, urbanDefense:false, wallSystem:false },

                    { id: "western_hubei_1943", name: "鄂西会战", dateText: "1943年5月—6月", location: "湖北西部", status: "interface", interfaceOnly: true, factions:["CHN","JPN"], roles:{attacker:"japanese",defender:"chinese"}, urbanDefense:false, wallSystem:false },

                    { id: "burma_yunnan_1943", name: "缅北滇西战役", dateText: "1943—1945年", location: "缅北—滇西", status: "interface", interfaceOnly: true, factions:["CHN","JPN"], roles:{attacker:"japanese",defender:"chinese"}, urbanDefense:false, wallSystem:false },

                    { id: "changde", name: "常德会战", dateText: "1943年11月—12月", location: "湖南·常德", status: "available", scenarioPath: "./data/interface-scenarios/changde/scenario-changde.json", unitsPath: "./data/interface-scenarios/changde/units-changde.json", factions:["CHN","JPN"], roles:{attacker:"japanese",defender:"chinese"}, start:{year:1943,month:11,day:2,hour:8,minute:0,hoursPerTurn:6,startingPhase:"japanese"}, urbanDefense:true, wallSystem:true },

                    { id: "ichigo_1944", name: "豫湘桂会战", dateText: "1944年4月—12月", location: "河南—湖南—广西", status: "interface", interfaceOnly: true, factions:["CHN","JPN"], roles:{attacker:"japanese",defender:"chinese"}, urbanDefense:false, wallSystem:false },

                    { id: "central_henan_1944", name: "豫中会战", dateText: "1944年4月—6月", location: "河南", status: "interface", interfaceOnly: true, factions:["CHN","JPN"], roles:{attacker:"japanese",defender:"chinese"}, urbanDefense:false, wallSystem:false },

                    { id: "myitkyina_1944", name: "密支那战役", dateText: "1944年5月—8月", location: "缅甸·密支那", status: "interface", interfaceOnly: true, factions:["CHN","JPN"], roles:{attacker:"japanese",defender:"chinese"}, urbanDefense:true, wallSystem:true },

                    { id: "changheng_1944", name: "长衡会战", dateText: "1944年5月—8月", location: "长沙—衡阳", status: "interface", interfaceOnly: true, factions:["CHN","JPN"], roles:{attacker:"japanese",defender:"chinese"}, urbanDefense:true, wallSystem:true, children:[

                        { id: "hengyang", name: "衡阳保卫战", dateText: "1944年6月23日—8月8日", location: "湖南·衡阳", status: "available", scenarioPath: "./data/interface-scenarios/hengyang/scenario-hengyang.json", unitsPath: "./data/interface-scenarios/hengyang/units-hengyang.json", factions:["CHN","JPN"], roles:{attacker:"japanese",defender:"chinese"}, start:{year:1944,month:6,day:23,hour:8,minute:0,hoursPerTurn:6,startingPhase:"japanese"}, urbanDefense:true, wallSystem:true }

                    ] },

                    { id: "guilin_liuzhou", name: "桂柳会战", dateText: "1944年9月—11月", location: "广西·桂林—柳州", status: "available", scenarioPath: "./data/interface-scenarios/guilin_liuzhou/scenario-guilin_liuzhou.json", unitsPath: "./data/interface-scenarios/guilin_liuzhou/units-guilin_liuzhou.json", factions:["CHN","JPN"], roles:{attacker:"japanese",defender:"chinese"}, start:{year:1944,month:9,day:14,hour:8,minute:0,hoursPerTurn:6,startingPhase:"japanese"}, urbanDefense:true, wallSystem:true },

                    { id: "xiangyuegan_1945", name: "湘粤赣战役", dateText: "1945年1月—3月", location: "湖南—广东—江西", status: "interface", interfaceOnly: true, factions:["CHN","JPN"], roles:{attacker:"japanese",defender:"chinese"}, urbanDefense:false, wallSystem:false },

                    { id: "western_henan_hubei_1945", name: "豫西鄂北会战", dateText: "1945年3月—5月", location: "河南西部—湖北北部", status: "interface", interfaceOnly: true, factions:["CHN","JPN"], roles:{attacker:"japanese",defender:"chinese"}, urbanDefense:false, wallSystem:false },

                    { id: "west_hunan", name: "湘西会战", dateText: "1945年4月—6月", location: "湖南西部", status: "available", scenarioPath: "./data/interface-scenarios/west_hunan/scenario-west_hunan.json", unitsPath: "./data/interface-scenarios/west_hunan/units-west_hunan.json", factions:["CHN","JPN"], roles:{attacker:"japanese",defender:"chinese"}, start:{year:1945,month:4,day:9,hour:8,minute:0,hoursPerTurn:6,startingPhase:"japanese"}, urbanDefense:false, wallSystem:false }

                ]

            },

          {

                id: "zhejiang_resistance", name: "浙江抗战",

                scenarios: [

                    {

                        id: "hangzhou_resistance",

                        name: "杭州地区抗战",

                        dateText: "1937—1945年",

                        location: "浙江·杭州及周边",

                        status: "interface",

                        interfaceOnly: true,

                        factions:["CHN","JPN"],

                        roles:{attacker:"japanese",defender:"chinese"},

                        urbanDefense:true,

                        wallSystem:true,

                        children:[

                            { id:"hangzhou_1937", name:"杭州方向作战", dateText:"1937年12月20日—24日", location:"余杭—杭州—钱塘江", status:"available", scenarioPath:"./data/interface-scenarios/hangzhou_1937/scenario-hangzhou_1937.json", unitsPath:"./data/interface-scenarios/hangzhou_1937/units-hangzhou_1937.json", factions:["CHN","JPN"], roles:{attacker:"japanese",defender:"chinese"}, start:{year:1937,month:12,day:20,hour:6,minute:0,hoursPerTurn:6,startingPhase:"japanese"}, urbanDefense:true, wallSystem:true },

                            { id:"qiantang_bridge_1937", name:"钱塘江大桥阻击与爆破", dateText:"1937年12月23日", location:"杭州·钱塘江大桥", status:"interface", interfaceOnly:true, factions:["CHN","JPN"], roles:{attacker:"japanese",defender:"chinese"}, urbanDefense:true, wallSystem:false },

                            { id:"dongzhou_1939", name:"东洲保卫战", dateText:"1939年3月", location:"浙江·富阳·东洲", status:"interface", interfaceOnly:true, factions:["CHN","JPN"], roles:{attacker:"japanese",defender:"chinese"}, urbanDefense:false, wallSystem:false },

                            { id:"tianmu_guerrilla", name:"天目山地区敌后作战", dateText:"1938—1945年", location:"浙江西北·天目山区", status:"interface", interfaceOnly:true, factions:["CHN","JPN"], roles:{attacker:"japanese",defender:"chinese"}, urbanDefense:false, wallSystem:false }

                        ]

                    },

                    { id: "zhejiang_jiangxi_1942", name: "浙赣会战", dateText: "1942年5月15日—9月", location: "浙江—江西·浙赣铁路战区", status: "available", scenarioPath: "./data/interface-scenarios/zhejiang_jiangxi/scenario-zhejiang_jiangxi.json", unitsPath: "./data/interface-scenarios/zhejiang_jiangxi/units-zhejiang_jiangxi.json", factions:["CHN","JPN"], roles:{attacker:"japanese",defender:"chinese"}, start:{year:1942,month:5,day:15,hour:6,minute:0,hoursPerTurn:24,startingPhase:"japanese"}, urbanDefense:true, wallSystem:false },

                    { id: "dongyang_1942", name: "东阳战役（地图还需要修改）", dateText: "1942年5月", location: "浙江·东阳", status: "available", scenarioPath: "./data/interface-scenarios/dongyang_1942/scenario-dongyang_1942.json", unitsPath: "./data/interface-scenarios/dongyang_1942/units-dongyang_1942.json", factions:["CHN","JPN"], roles:{attacker:"japanese",defender:"chinese"}, start:{year:1942,month:5,day:20,hour:6,minute:0,hoursPerTurn:6,startingPhase:"japanese"}, urbanDefense:false, wallSystem:false }

                ]

            },

        ]

    },

 

    // ========================================================

    // 东欧战场

    // ========================================================

    ,

    // ========================================================
    // 欧洲战场：西欧与东欧并列入口
    // ========================================================
    {
        id: "european_theater",
        name: "欧洲战场",
        subtitle: "European Theater · 1939–1945",
        subtheaters: [
            {
                    id: "western_front",
                    name: "西欧战场",
                    subtitle: "Western Front · 1944–1945",
                    phases: [
                        {
                            id: "normandy_1944",
                            name: "1944：诺曼底登陆",
                            scenarios: [
                                { id:"omaha_1944", name:"奥马哈海滩", subtitle:"Omaha Beach · D-Day", dateText:"1944年6月6日", location:"法国·诺曼底", status:"available", scenarioPath:"./data/interface-scenarios/omaha_1944/scenario-omaha_1944.json", unitsPath:"./data/interface-scenarios/omaha_1944/units-omaha_1944.json", factions:["USA","GER"], roles:{attacker:"american",defender:"german"}, start:{year:1944,month:6,day:6,hour:6,minute:30,hoursPerTurn:0.5,startingPhase:"american"} },
                                { id:"utah_1944", name:"犹他海滩", status:"interface", interfaceOnly:true, factions:["USA","GER"], roles:{attacker:"american",defender:"german"} },
                                { id:"pointe_du_hoc_1944", name:"奥克角", status:"interface", interfaceOnly:true, factions:["USA","GER"], roles:{attacker:"american",defender:"german"} },
                                { id:"sainte_mere_eglise_1944", name:"圣梅尔埃格利斯", status:"interface", interfaceOnly:true, factions:["USA","GER"], roles:{attacker:"american",defender:"german"} },
                                { id:"pegasus_bridge_1944", name:"佩加索斯桥", status:"interface", interfaceOnly:true, factions:["GBR","GER"], roles:{attacker:"british",defender:"german"} },
                                { id:"gold_1944", name:"黄金海滩", status:"interface", interfaceOnly:true, factions:["GBR","GER"], roles:{attacker:"british",defender:"german"} },
                                { id:"juno_1944", name:"朱诺海滩", status:"interface", interfaceOnly:true, factions:["ALLIED","GER"], roles:{attacker:"allied",defender:"german"} },
                                { id:"sword_1944", name:"宝剑海滩", status:"interface", interfaceOnly:true, factions:["GBR","GER"], roles:{attacker:"british",defender:"german"} },
                                { id:"caen_1944", name:"卡昂方向", status:"interface", interfaceOnly:true, factions:["GBR","GER"], roles:{attacker:"british",defender:"german"} },
                                { id:"normandy_grand_1944", name:"诺曼底登陆（大型战役）", status:"interface", interfaceOnly:true, factions:["ALLIED","GER"], roles:{attacker:"allied",defender:"german"} }
                            ]
                        }
                    ]
                },
            {

                    id: "eastern_europe",

                    name: "东欧战场",

                    subtitle: "Eastern Europe",

 

                    phases: [

 

                        {

                            id: "poland_1939",

                            name: "1939：波兰战役",

                            scenarios: []

                        },

 

                        {

                            id: "balkans_1941",

                            name: "1941：巴尔干战役",

                            scenarios: []

                        },

 

                        {

                            id: "romania_hungary_1944",

                            name: "1944：罗马尼亚—匈牙利",

                            scenarios: []

                        },

 

                        {

                            id: "central_europe_1945",

                            name: "1945：中欧决战",

                            scenarios: []

                        }

                    ]

                }
        ]
    },

    // ========================================================

    // 北非战场

    // ========================================================

    {

        id: "north_africa",

        name: "北非战场",

        subtitle: "North Africa",

 

        phases: [

 

            {

                id: "desert_1940_41",

                name: "1940–41：沙漠战争初期",

                scenarios: []

            },

 

            {

                id: "rommel_1941_42",

                name: "1941–42：隆美尔攻势",

                scenarios: []

            },

 

            {

                id: "el_alamein_1942",

                name: "1942：阿拉曼阶段",

                scenarios: []

            },

 

            {

                id: "tunisia_1942_43",

                name: "1942–43：突尼斯战役",

                scenarios: []

            }

        ]

    },

 

 

    // ========================================================

    // 架空太平洋战场

    // ========================================================

    {

        id: "alternate_pacific",

        name: "架空太平洋战场",

        subtitle: "Alternate Pacific War",

 

        phases: [

 

            {

                id: "australia_1943",

                name: "1943：澳洲最后防线",

 

                scenarios: [

 

                    {

                        id: "melbourne_1943",

                        name: "墨尔本保卫战",

                        subtitle: "Defense of Melbourne",

 

                        dateText: "1943年9月",

                        location: "澳大利亚·墨尔本",

 

                        status: "available",

 

                        scenarioPath: "./data/interface-scenarios/melbourne/scenario-melbourne.json",

                        unitsPath: "./data/interface-scenarios/melbourne/units-melbourne.json",

 

                        factions: ["ALLIED", "JPN"],

 

                        roles: {

                            attacker: "japanese",

                            defender: "allied"

                        },

 

                        start: {

                            year: 1943,

                            month: 9,

                            day: 15,

                            hour: 6,

                            minute: 0,

                            hoursPerTurn: 6,

                            startingPhase: "japanese"

                        }

                    }

,

                    {

                        id: "melbourne_cbd_1943",

                        name: "墨尔本城区保卫战",

                        subtitle: "Defense of Melbourne CBD",

                        dateText: "1943年9月",

                        location: "澳大利亚·墨尔本CBD",

                        status: "available",

                        scenarioPath: "./data/interface-scenarios/melbourne-cbd/scenario-melbourne-cbd.json",

                        unitsPath: "./data/interface-scenarios/melbourne-cbd/units-melbourne-cbd.json",

                        factions: ["ALLIED", "JPN"],

                        roles: { attacker: "japanese", defender: "allied" },

                        start: { year: 1943, month: 9, day: 28, hour: 6, minute: 0, hoursPerTurn: 2, startingPhase: "japanese" }

                    }

                ]

            }

        ]

    }

 

,
    // ========================================================
    // 解放战争
    // ========================================================
    {
        id: "chinese_civil_war",
        name: "解放战争",
        subtitle: "Chinese Civil War · 1946–1949",
        phases: [
            { id:"ccw_strategic_defense", name:"战略防御 1946–1947", scenarios:[], equipmentDeckId:"pla_civil_war_1946_1947" },
            { id:"ccw_counteroffensive", name:"战略反攻 1947–1948", scenarios:[], equipmentDeckId:"pla_civil_war_1947_1948" },
            { id:"ccw_decisive", name:"战略决战 1948–1949", scenarios:[], campaigns:[
                { id:"liaoshen", name:"辽沈战役", scenarios:[] },
                { id:"huaihai", name:"淮海战役", scenarios:[] },
                { id:"pingjin", name:"平津战役", scenarios:[] }
            ], equipmentDeckId:"pla_civil_war_1948_1949" },
            { id:"ccw_crossing_advance", name:"渡江及全国进军 1949", scenarios:[], equipmentDeckId:"pla_civil_war_1949" },
            {
                id:"taiwan_liberation_series",
                name:"台湾解放系列",
                subtitle:"现代架空战役 · Fictional Modern Campaign",
                scenarios:[
                    {id:"twlib_00_prologue",name:"海峡风云",dateText:"2026 · 架空",location:"架空滨海综合测试区",status:"available",scenarioPath:"./data/interface-scenarios/twlib-00-prologue/scenario-twlib-00-prologue.json",unitsPath:"./data/interface-scenarios/twlib-00-prologue/units-twlib-00-prologue.json",factions:["PLA","TW_PROXY"],roles:{attacker:"pla",defender:"tw_proxy"},start:{year:2026,month:1,day:1,hour:8,minute:0,hoursPerTurn:2,startingPhase:"pla"}},
                    {id:"twlib_01_outpost",name:"台海前哨",dateText:"现代 · 架空",location:"台海方向（架空战区）",status:"interface",interfaceOnly:true,factions:["PLA","TW_PROXY"],roles:{attacker:"pla",defender:"tw_proxy"}},
                    {id:"twlib_02_islands",name:"外岛之战",dateText:"现代 · 架空",location:"架空岛屿战区",status:"interface",interfaceOnly:true,factions:["PLA","TW_PROXY"],roles:{attacker:"pla",defender:"tw_proxy"}},
                    {id:"twlib_03_strait",name:"海峡争夺",dateText:"现代 · 架空",location:"台海方向（架空战区）",status:"interface",interfaceOnly:true,factions:["PLA","TW_PROXY"],roles:{attacker:"pla",defender:"tw_proxy"}},
                    {id:"twlib_04_landing",name:"登陆日",dateText:"现代 · 架空",location:"架空滨海战区",status:"interface",interfaceOnly:true,factions:["PLA","TW_PROXY"],roles:{attacker:"pla",defender:"tw_proxy"}},
                    {id:"twlib_05_breakthrough",name:"突破防线",dateText:"现代 · 架空",location:"架空沿岸战区",status:"interface",interfaceOnly:true,factions:["PLA","TW_PROXY"],roles:{attacker:"pla",defender:"tw_proxy"}},
                    {id:"twlib_06_depth",name:"纵深推进",dateText:"2026 · 架空",location:"架空纵深战区",status:"available",scenarioPath:"./data/interface-scenarios/twlib-06-depth/scenario-twlib-06-depth.json",unitsPath:"./data/interface-scenarios/twlib-06-depth/units-twlib-06-depth.json",plaCombinedBrigadeSelection:true,factions:["PLA","TW_PROXY"],roles:{attacker:"pla",defender:"tw_proxy"},start:{year:2026,month:11,day:20,hour:6,minute:0,hoursPerTurn:1,startingPhase:"pla"}},
                    {id:"twlib_07_urban",name:"城市决战",dateText:"2026 · 架空",location:"架空城市战区",status:"available",scenarioPath:"./data/interface-scenarios/twlib-07-urban/scenario-twlib-07-urban.json",unitsPath:"./data/interface-scenarios/twlib-07-urban/units-twlib-07-urban.json",plaCombinedBrigadeSelection:true,factions:["PLA","TW_PROXY"],roles:{attacker:"pla",defender:"tw_proxy"},start:{year:2026,month:11,day:28,hour:6,minute:0,hoursPerTurn:1,startingPhase:"pla"}},
                    {id:"twlib_08_finale",name:"终章：台北终局",dateText:"2026 · 架空",location:"架空首都都市战区",status:"available",scenarioPath:"./data/interface-scenarios/twlib-08-finale/scenario-twlib-08-finale.json",unitsPath:"./data/interface-scenarios/twlib-08-finale/units-twlib-08-finale.json",plaCombinedBrigadeSelection:true,factions:["PLA","TW_PROXY"],roles:{attacker:"pla",defender:"tw_proxy"},start:{year:2026,month:12,day:1,hour:6,minute:0,hoursPerTurn:1,startingPhase:"pla"}}
                ]
            }
        ]
    },

    // ========================================================
    // 开发测试场：每个版本的固定回归测试关卡
    // ========================================================
    {
        id: "development_test",
        name: "开发测试",
        subtitle: "Development Regression Test",
        phases: [
            {
                id: "system_test_phase",
                name: "综合系统测试",
                scenarios: [
                    { id: "system_test_range", name: "综合系统测试场", dateText: "版本测试专用", location: "虚拟测试地图", status: "available", scenarioPath: "./data/interface-scenarios/system-test/scenario-system-test.json", unitsPath: "./data/interface-scenarios/system-test/units-system-test.json", factions:["CHN","JPN"], roles:{attacker:"japanese",defender:"chinese"}, start:{year:1945,month:1,day:1,hour:8,minute:0,hoursPerTurn:6,startingPhase:"chinese"}, urbanDefense:true, wallSystem:true, aiMode:"passive" },
                    { id: "comprehensive_tutorial", name: "游戏综合教学关卡", dateText: "现代 · 综合教学", location: "综合训练教学基地", status: "available", scenarioPath: "./data/interface-scenarios/comprehensive-tutorial/scenario-comprehensive-tutorial.json", factions:["RED","BLUE"], roles:{attacker:"red",defender:"blue"}, start:{year:2026,month:10,day:5,hour:8,minute:0,hoursPerTurn:1,startingPhase:"red"}, modernBrigadeSelection:true, trainingMap:{size:"large",terrain:"综合教学",width:76,height:52}, aiMode:"passive" },
                    { id: "modern_brigade_test_range", name: "合成旅单位测试场", dateText: "现代 · 开发测试专用", location: "虚拟合成旅测试基地", status: "available", scenarioPath: "./data/interface-scenarios/modern-brigade-test/scenario-modern-brigade-test.json", factions:["RED","BLUE"], roles:{attacker:"red",defender:"blue"}, start:{year:2026,month:10,day:3,hour:8,minute:0,hoursPerTurn:1,startingPhase:"red"}, modernBrigadeSelection:true, trainingMap:{size:"large",terrain:"综合单位测试",width:76,height:52}, aiMode:"passive" },
                    { id: "rocket_force_test_range", name: "火箭军综合测试旅专用测试场", dateText: "现代 · 开发测试专用", location: "虚拟联合火力测试基地", status: "available", scenarioPath: "./data/interface-scenarios/rocket-force-test/scenario-rocket-force-test.json", factions:["RED","BLUE"], roles:{attacker:"red",defender:"blue"}, start:{year:2026,month:10,day:5,hour:8,minute:0,hoursPerTurn:1,startingPhase:"red"}, modernBrigadeSelection:true, rocketForceTest:true, trainingMap:{size:"large",terrain:"导弹/工事综合测试",width:76,height:52}, aiMode:"passive" }
                ]
            }
        ]
    }

,
];

 

 

// ============================================================

// 战役查找

// ============================================================

 

/**

 * 根据 scenario id 查找战役。

 *

 * @param {string} id

 * @returns {{theater: object, phase: object, scenario: object}|null}

 */

export function findScenarioById(id) {
    if (!id) return null;

    const searchTheater = (theater, rootTheater = theater) => {
        if (!theater || !Array.isArray(theater.phases)) return null;
        for (const phase of theater.phases) {
            if (!phase || !Array.isArray(phase.scenarios)) continue;
            for (const item of phase.scenarios) {
                if (!item) continue;
                if (item.id === id) return { theater: rootTheater, subtheater: theater, phase, scenario: item };
                if (Array.isArray(item.children)) {
                    const child = item.children.find(child => child && child.id === id);
                    if (child) return { theater: rootTheater, subtheater: theater, phase, scenario: child, parentScenario: item };
                }
            }
        }
        return null;
    };

    for (const theater of CAMPAIGNS) {
        if (!theater) continue;
        if (Array.isArray(theater.subtheaters)) {
            for (const subtheater of theater.subtheaters) {
                const found = searchTheater(subtheater, theater);
                if (found) return found;
            }
        } else {
            const found = searchTheater(theater, theater);
            if (found) return found;
        }
    }
    return null;
}
