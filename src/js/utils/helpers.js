/**
 * NPC Sim - 通用工具函数
 * 用于解析、随机操作和其他通用功能的工具函数
 */

/**
 * 解析权重字符串，如 "A,10;B,20" 为 {val, weight} 对象数组
 * @param {string} str - 待解析的权重字符串
 * @returns {Array<{val: string, weight: number}>}
 */
function parseWeightString(str) {
    if (!str) return [];
    // 替换中文逗号
    str = str.replace(/，/g, ',');
    const parts = str.split(/[;；]/); // 同时支持中文和英文分号
    return parts.map(p => {
        const [val, weight] = p.split(',');
        return { val: val ? val.trim() : '', weight: weight ? parseFloat(weight) : 0 };
    }).filter(i => i.val !== '');
}

/**
 * 解析范围权重字符串，如 "0,10,1; 11,20,5" 为 {start, end, weight} 对象数组
 * @param {string} str - 待解析的范围权重字符串
 * @returns {Array<{start: number, end: number, weight: number}>}
 */
function parseRangeWeightString(str) {
    if (!str) return [];
    str = str.replace(/，/g, ',');
    const parts = str.split(/[;；]/);
    return parts.map(p => {
        const [start, end, weight] = p.split(',');
        return { 
            start: parseFloat(start), 
            end: parseFloat(end), 
            weight: parseFloat(weight) 
        };
    }).filter(i => !isNaN(i.weight));
}

/**
 * 从列表中进行加权随机选择
 * @param {Array} list - 待选择的元素列表
 * @param {string} weightKey - 权重属性的键名（默认为 'weight'）
 * @returns {*} 被选中的元素
 */
function weightedRandom(list, weightKey = 'weight') {
    let total = list.reduce((sum, item) => sum + (item[weightKey] || 0), 0);
    let random = Math.random() * total;
    for (let item of list) {
        if (random < (item[weightKey] || 0)) return item;
        random -= item[weightKey] || 0;
    }
    return list[0]; // fallback
}

/**
 * 从并列最高分中随机选择
 * @param {Array} items - 待选择的元素列表
 * @param {string} scoreKey - 分数属性的键名
 * @returns {*} 被选中的元素，如果列表为空则返回null
 */
function selectFromTied(items, scoreKey) {
    if (items.length === 0) return null;
    const maxScore = Math.max(...items.map(item => item[scoreKey]));
    const tied = items.filter(item => item[scoreKey] === maxScore);
    return tied[Math.floor(Math.random() * tied.length)];
}
/**
 * 生成简单的UUID风格的ID
 * @returns {string} 生成的ID字符串
 */
function generateID() {
    return Math.random().toString(36).substr(2, 9);
}


// 用于ES模块的导出（如果使用模块系统）
// export { parseWeightString, parseRangeWeightString, weightedRandom, generateID };
