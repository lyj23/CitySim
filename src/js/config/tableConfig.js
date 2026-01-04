/**
 * NPC Sim - 表格配置
 * 表名映射和标签页定义
 */

// 表名映射（文件名 -> 数据库键）
const TABLE_NAME_MAP = {
    'Family': 'Family',
    'FamilyGen': 'FamilyGen',
    'LastName': 'LastName',
    'FirstName': 'FirstName',
    'NPC': 'NPC',
    'NpcAbilityGen': 'NpcAbilityGen',
    'House': 'House',
    'HouseType': 'HouseType',
    'Job': 'Job',
    'TerBlock': 'TerBlock',
    'RoadBlock': 'RoadBlock',
    'Building': 'Building',
    'TerBlockType': 'TerBlockType',
    'RoadBlockType': 'RoadBlockType',
    'Company': 'Company',
    'CompanyType': 'CompanyType',
    'PlayerData': 'PlayerData'
};

// 标签页定义
// parent: 表示这是父标签页下的子标签页
const TABS = {
    map: { name: '地图' },
    TerBlockType: { name: '地形类型表', parent: 'map' },
    RoadBlockType: { name: '路网类型表', parent: 'map' },
    PlayerData: { name: '玩家数据表', parent: 'map' },
    NPC: { name: 'NPC' },
    NpcAbilityGen: { name: 'NPC能力生成表', parent: 'NPC' },
    Family: { name: '家庭表' },
    FamilyGen: { name: '家庭生成表', parent: 'Family' },
    LastName: { name: '姓氏表', parent: 'Family' },
    FirstName: { name: '人名表', parent: 'Family' },
    Job: { name: '职业表' },
    jobResult: { name: '职业应聘意向筛选', parent: 'Job' },
    jobHireResult: { name: '职业聘用意向得分', parent: 'Job' },
    House: { name: '住宅表' },
    HouseType: { name: '住宅样式表', parent: 'House' },
    houseResult: { name: '住宅申请得分', parent: 'House' },
    houseAcceptResult: { name: '住宅接受申请得分', parent: 'House' },
    Building: { name: '建筑表' },
    Company: { name: '企业表' },
    CompanyJobs: { name: '企业职业人员表', parent: 'Company' },
    CompanyType: { name: '企业样式表', parent: 'Company' }
};
