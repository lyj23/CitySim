/**
 * NPC Sim - 表头定义
 * 各数据表格的列头配置
 */

const HEADERS = {
    Family: [
        { key: 'FamilyID', label: '家庭ID' }, { key: 'LastName', label: '姓氏' }, { key: 'Property', label: '财产', type: 'number' },
        { key: 'Residence', label: '居住地' },
        { key: 'NpcID_1', label: '成员1 ID' }, { key: 'NpcName_1', label: '成员1 姓名' },
        { key: 'NpcID_2', label: '成员2 ID' }, { key: 'NpcName_2', label: '成员2 姓名' },
        { key: 'NpcID_3', label: '成员3 ID' }, { key: 'NpcName_3', label: '成员3 姓名' },
        { key: 'NpcID_4', label: '成员4 ID' }, { key: 'NpcName_4', label: '成员4 姓名' },
        { key: 'NpcID_5', label: '成员5 ID' }, { key: 'NpcName_5', label: '成员5 姓名' },
        { key: 'NpcID_6', label: '成员6 ID' }, { key: 'NpcName_6', label: '成员6 姓名' },
        { key: 'NpcID_7', label: '成员7 ID' }, { key: 'NpcName_7', label: '成员7 姓名' },
        { key: 'NpcID_8', label: '成员8 ID' }, { key: 'NpcName_8', label: '成员8 姓名' }
    ],
    FamilyGen: [
        { key: 'FamilyMode', label: '模板编号' }, { key: 'Weight', label: '权重', type: 'number' }, { key: 'Property', label: '初始财产区间' }, 
        { key: 'P1_Gender', label: 'P1性别(1男0女)' }, { key: 'P1_Age', label: 'P1年龄区间' }, { key: 'P1_Ability', label: 'P1能力类型' },
        { key: 'P2_Gender', label: 'P2性别(1男0女)' }, { key: 'P2_Age', label: 'P2年龄区间' }, { key: 'P2_Ability', label: 'P2能力类型' },
        { key: 'P3_Gender', label: 'P3性别(1男0女)' }, { key: 'P3_Age', label: 'P3年龄区间' }, { key: 'P3_Ability', label: 'P3能力类型' },
        { key: 'P4_Gender', label: 'P4性别(1男0女)' }, { key: 'P4_Age', label: 'P4年龄区间' }, { key: 'P4_Ability', label: 'P4能力类型' },
        { key: 'P5_Gender', label: 'P5性别(1男0女)' }, { key: 'P5_Age', label: 'P5年龄区间' }, { key: 'P5_Ability', label: 'P5能力类型' },
        { key: 'P6_Gender', label: 'P6性别(1男0女)' }, { key: 'P6_Age', label: 'P6年龄区间' }, { key: 'P6_Ability', label: 'P6能力类型' },
        { key: 'P7_Gender', label: 'P7性别(1男0女)' }, { key: 'P7_Age', label: 'P7年龄区间' }, { key: 'P7_Ability', label: 'P7能力类型' },
        { key: 'P8_Gender', label: 'P8性别(1男0女)' }, { key: 'P8_Age', label: 'P8年龄区间' }, { key: 'P8_Ability', label: 'P8能力类型' }
    ],
    LastName: [
        { key: 'LastName', label: '姓氏' }, 
        { key: 'Weight', label: '权重', type: 'number' }
    ],
    FirstName: [
        { key: 'FirstName', label: '名字' }, { key: 'Gender', label: '性别限定' }, { key: 'Weight', label: '权重', type: 'number' },
        { key: 'MinAge', label: '最小年龄', type: 'number' }, { key: 'MaxAge', label: '最大年龄', type: 'number' },
        { key: 'NextTextRate', label: '额外单字概率', type: 'number' }
    ],
    NPC: [
        { key: 'NpcID', label: 'ID' }, { key: 'LastName', label: '姓' }, { key: 'FirstName', label: '名' }, 
        { key: 'Gender', label: '性别' }, { key: 'Job_ID', label: '职业' }, { key: 'Family_ID', label: '家庭ID' },
        { key: 'Age', label: '年龄', type: 'number' }, { key: 'HouseID', label: '住宅ID' },
        { key: 'Cha', label: '魅力', type: 'number' }, { key: 'Dex', label: '灵巧', type: 'number' }, { key: 'Log', label: '逻辑', type: 'number' },
        { key: 'Phy', label: '运动', type: 'number' }, { key: 'Cre', label: '创意', type: 'number' }, { key: 'Per', label: '感知', type: 'number' },
        { key: 'Satisfaction', label: '满意值', type: 'number' },
        { key: 'Tag', label: '特性' }
    ],
    NpcAbilityGen: [
        { key: 'NpcAbilityTypeID', label: '类型ID' }, { key: 'Cha', label: '魅力生成' }, { key: 'Dex', label: '灵巧生成' },
        { key: 'Log', label: '逻辑生成' }, { key: 'Phy', label: '运动生成' }, { key: 'Cre', label: '创意生成' },
        { key: 'Per', label: '感知生成' }, { key: 'TagGen', label: '特性生成' }
    ],
    House: [
        { key: 'HouseID', label: 'ID' }, { key: 'StyleID', label: '样式编号' },
        { key: 'Capacity', label: '容纳家庭数', type: 'number' },
        { key: 'Cost', label: '日税金', type: 'number' },
        { key: 'MinInCome', label: '最低收入', type: 'number' }, { key: 'OfferNum', label: 'Offer数', type: 'number' },
        { key: 'ApplyIntentionWeight', label: '申请意向权重' }, { key: 'AcceptIntention', label: '接受意向权重' }
    ],
    HouseType: [
        { key: 'ID', label: 'ID' }, { key: 'Name', label: '名称' }, { key: 'Size', label: '大小' },
        { key: 'Capacity', label: '容纳家庭数', type: 'number' },
        { key: 'BaseCost', label: '基础日税金', type: 'number' },
        { key: 'BaseMinIncome', label: '基础最低收入', type: 'number' }, { key: 'BaseOfferNum', label: '基础offer数', type: 'number' },
        { key: 'BaseApplyIntentionWeight', label: '基础申请意向权重' }, { key: 'BaseAcceptIntention', label: '基础接受意向权重' },
        { key: 'GenerateWeight', label: '生成权重', type: 'number' }, { key: 'ApplicablePlanTypes', label: '适用规划类型' }
    ],
    Job: [
        { key: 'JobName', label: '职业名' }, { key: 'Income', label: '时薪', type: 'number' },
        { key: 'OfferNum', label: 'Offer数', type: 'number' },
        { key: 'ChaReq', label: '魅力要求', type: 'number' }, { key: 'ChaWeight', label: '魅力权重', type: 'number' }, { key: 'ChaGrowth', label: '魅力成长', type: 'number' }, { key: 'CharGrowthMax', label: '魅力上限', type: 'number' },
        { key: 'DexReq', label: '灵巧要求', type: 'number' }, { key: 'DexWeight', label: '灵巧权重', type: 'number' }, { key: 'DexGrowth', label: '灵巧成长', type: 'number' }, { key: 'DexGrowthMax', label: '灵巧上限', type: 'number' },
        { key: 'LogReq', label: '逻辑要求', type: 'number' }, { key: 'LogWeight', label: '逻辑权重', type: 'number' }, { key: 'LogGrowth', label: '逻辑成长', type: 'number' }, { key: 'LogGrowthMax', label: '逻辑上限', type: 'number' },
        { key: 'PhyReq', label: '运动要求', type: 'number' }, { key: 'PhyWeight', label: '运动权重', type: 'number' }, { key: 'PhyGrowth', label: '运动成长', type: 'number' }, { key: 'PhyGrowthMax', label: '运动上限', type: 'number' },
        { key: 'CreReq', label: '创意要求', type: 'number' }, { key: 'CreWeight', label: '创意权重', type: 'number' }, { key: 'CreGrowth', label: '创意成长', type: 'number' }, { key: 'CreGrowthMax', label: '创意上限', type: 'number' },
        { key: 'PerReq', label: '感知要求', type: 'number' }, { key: 'PerWeight', label: '感知权重', type: 'number' }, { key: 'PerGrowth', label: '感知成长', type: 'number' }, { key: 'PerGrowthMax', label: '感知上限', type: 'number' },
        { key: 'ApplyIntentionWeight', label: '应聘意向权重' }, { key: 'AcceptIntention', label: '聘用意向权重' }
    ],
    Building: [
        { key: 'BuildingID', label: 'ID' },
        { key: 'Type', label: '类型' },
        { key: 'RefID', label: '索引' },
        { key: 'Position', label: '位置' },
        { key: 'Direction', label: '朝向'}
    ],
    TerBlockType: [
        { key: 'Code', label: '编号' },
        { key: 'Name', label: '名称' },
        { key: 'Color', label: '颜色编码' },
        { key: 'CanBuild', label: '可以建设', type: 'number' }
    ],
    RoadBlockType: [
        { key: 'Code', label: '编号' },
        { key: 'Name', label: '名称' },
        { key: 'Color', label: '颜色编码' },
        { key: 'Type', label: '类型' },
        { key: 'Opacity', label: '半透明度', type: 'number' },
        { key: 'BuildCost', label: '建造费用', type: 'number' }
    ],
    PlayerData: [
        { key: 'Item', label: '项目' },
        { key: 'Value', label: '值' }
    ],
    Company: [
        { key: 'ID', label: 'ID' },
        { key: '名称', label: '名称' },
        { key: '样式编号', label: '样式编号' },
        { key: '日成本', label: '日成本', type: 'number' },
        { key: '日收入', label: '日收入', type: 'number' },
        { key: '资金', label: '资金', type: 'number' },
        { key: '职业人员', label: '职业人员' }
    ],
    CompanyJobs: [
        { key: 'CompanyID', label: '企业ID' },
        { key: 'CompanyName', label: '企业名称' },
        { key: 'JobName', label: '职位名称' },
        { key: 'MaxPeople', label: '最大人数', type: 'number' },
        { key: 'CurrentPeople', label: '当前人数', type: 'number' },
        { key: 'Vacancies', label: '空缺数', type: 'number' },
        { key: 'Employees', label: '员工列表' }
    ],
    CompanyType: [
        { key: 'ID', label: 'ID' },
        { key: '名称', label: '名称' },
        { key: '后缀', label: '后缀' },
        { key: '大小', label: '大小' },
        { key: '收入税率', label: '收入税率', type: 'number' },
        { key: '基础日成本', label: '基础日成本', type: 'number' },
        { key: '基础日收入', label: '基础日收入', type: 'number' },
        { key: '适用规划类型', label: '适用规划类型' },
        { key: '职业', label: '职业' }
    ]
};
