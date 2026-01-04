/**
 * NPC Sim - 默认数据配置
 * 数据库初始化的默认数据
 */

const DEFAULT_DATA = {
    Family: [],
    FamilyGen: [
        { FamilyMode: 'M1', Weight: 10, Property: '1000,5000,1', P1_Gender: 1, P1_Age: '20,30,1', P1_Ability: 'Normal' }
    ],
    LastName: [
        { LastName: '李', Weight: 10 }, 
        { LastName: '王', Weight: 10 }
    ],
    FirstName: [
        { FirstName: '明', Gender: 1, Weight: 10, MinAge: '', MaxAge: '', NextTextRate: 0.5 },
        { FirstName: '红', Gender: 0, Weight: 10, MinAge: '', MaxAge: '', NextTextRate: 0.3 },
        { FirstName: '伟', Gender: 1, Weight: 8, MinAge: '', MaxAge: '', NextTextRate: 0.4 },
        { FirstName: '芳', Gender: 0, Weight: 8, MinAge: '', MaxAge: '', NextTextRate: 0.3 }
    ],
    NPC: [],
    NpcAbilityGen: [
        { NpcAbilityTypeID: 'Normal', Cha: '1,10,1', Dex: '1,10,1', Log: '1,10,1', Phy: '1,10,1', Cre: '1,10,1', Per: '1,10,1', TagGen: '勤奋,1;懒惰,1' }
    ],
    House: [
        { HouseID: 'H01', StyleID: 'HS01', Capacity: 1, Cost: 50, MinInCome: 0, OfferNum: 2, ApplyIntentionWeight: '100,1;勤奋,5', AcceptIntention: '100,1' }
    ],
    HouseType: [
        { ID: 'HS01', Name: '公寓', Size: '3,3', Capacity: 1, BaseCost: 50, BaseMinIncome: 0, BaseOfferNum: 2, BaseApplyIntentionWeight: '100,1;勤奋,5', BaseAcceptIntention: '100,1', GenerateWeight: 10, ApplicablePlanTypes: '10' }
    ],
    Job: [
        { JobName: '搬砖', Income: 100, OfferNum: 3, ChaReq: 0, ChaWeight: 0, ChaGrowth: 0.1, CharGrowthMax: 10, DexReq: 0, DexWeight: 1, DexGrowth: 0.5, DexGrowthMax: 20, LogReq:0, LogWeight:0, LogGrowth:0, LogGrowthMax:0, PhyReq:5, PhyWeight:2, PhyGrowth:1, PhyGrowthMax:50, CreReq:0, CreWeight:0, CreGrowth:0, CreGrowthMax:0, PerReq:0, PerWeight:0, PerGrowth:0, PerGrowthMax:0, ApplyIntentionWeight: '勤奋,10', AcceptIntention: 'Phy,1' }
    ],
    Building: [],
    TerBlockType: [
        { Code: '00', Name: '普通海面', Color: '#4a90d9', CanBuild: 0 },
        { Code: '10', Name: '普通绿地', Color: '#90EE90', CanBuild: 1 },
        { Code: '20', Name: '普通道路', Color: '#555555', CanBuild: 1 },
        { Code: '30', Name: '普通硬地', Color: '#d3d3d3', CanBuild: 1 }
    ],
    RoadBlockType: [
        { Code: '1', Name: '未规划区', Color: '#FFFFFF', Type: '规划', Opacity: 70, BuildCost: 0 },
        { Code: '10', Name: '居住区', Color: '#555555', Type: '公路', Opacity: 70, BuildCost: 10 },
        { Code: 'R2', Name: '高速公路', Color: '#333333', Type: '公路', Opacity: 0, BuildCost: 50 },
        { Code: 'R3', Name: '人行道', Color: '#888888', Type: '公路', Opacity: 0, BuildCost: 5 },
        { Code: '120', Name: '单车道-泊油路-双向', Color: '#737373', Type: '公路', Opacity: 0, BuildCost: 20 }
    ],
    Company: [],
    CompanyJobs: [],
    CompanyType: [],
    PlayerData: [
        { Item: '城市名称', Value: '新城市' },
        { Item: '当前金钱', Value: '10000' },
        { Item: '当前日期', Value: '0001\\01\\01' },
        { Item: '当前时间', Value: '00:00' },
        { Item: '住宅需求', Value: '0' }
    ]
};
