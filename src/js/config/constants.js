/**
 * NPC Sim - 基础常量配置
 * 属性映射、地图配置等基础常量
 */

// 属性名称映射（中文到英文）
const ATTR_NAME_MAP = {
    '魅力': 'Cha',
    '灵巧': 'Dex',
    '逻辑': 'Log',
    '运动': 'Phy',
    '创意': 'Cre',
    '感知': 'Per'
};

// 地图配置
const MAP_SIZE = 100; // 100x100 网格
const CELL_SIZE = 12; // 每个格子的像素尺寸

// 地图块类型定义（回退值，实际数据来自 TerBlockType 表）
const MAP_BLOCK_TYPES = {
    '00': { name: '普通海面', color: '#4a90d9' },      // 蓝色
    '10': { name: '普通绿地', color: '#90EE90' },      // 浅绿色
    '20': { name: '普通道路', color: '#555555' },      // 深灰色
    '30': { name: '普通硬地', color: '#d3d3d3' }       // 浅灰色
};

// 从数据库获取地形块类型或使用默认值
function getTerrainBlockTypes(db) {
    if (db && db.TerBlockType && db.TerBlockType.length > 0) {
        const types = {};
        db.TerBlockType.forEach(item => {
            types[item.Code] = { 
                name: item.Name, 
                color: item.Color,
                canBuild: item.CanBuild !== undefined ? item.CanBuild : 1  // 默认：可以建设
            };
        });
        return types;
    }
    return MAP_BLOCK_TYPES;
}

// 道路块类型定义（回退值，实际数据来自 RoadBlockType 表）
const ROAD_BLOCK_TYPES = {
    '00': { name: '无', color: 'transparent', type: '', opacity: 100 },
    'R1': { name: '普通道路', color: '#555555', type: '公路', opacity: 0 },
    'R2': { name: '高速公路', color: '#333333', type: '公路', opacity: 0 },
    'R3': { name: '人行道', color: '#888888', type: '公路', opacity: 0 },
    'P1': { name: '规划区域', color: '#FFFF00', type: '规划', opacity: 50 }
};

// 从数据库获取道路块类型或使用默认值
function getRoadBlockTypes(db) {
    if (db && db.RoadBlockType && db.RoadBlockType.length > 0) {
        const types = {};
        db.RoadBlockType.forEach(item => {
            types[item.Code] = { 
                name: item.Name, 
                color: item.Color,
                type: item.Type || '',
                opacity: item.Opacity !== undefined ? item.Opacity : 0,
                buildCost: parseInt(item.BuildCost) || 0
            };
        });
        return types;
    }
    return ROAD_BLOCK_TYPES;
}
