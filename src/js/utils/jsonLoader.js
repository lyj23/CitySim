/**
 * JSON数据加载工具
 * 用于从config/json目录加载配置数据
 * 主要用于GitHub Pages等静态托管环境
 */

/**
 * 从JSON文件加载数据
 * @param {string} fileName - JSON文件名（不含扩展名）
 * @returns {Promise<Object>} JSON数据对象
 */
async function loadJsonFile(fileName) {
    try {
        const response = await fetch(`config/json/${fileName}.json`);
        if (!response.ok) {
            throw new Error(`无法加载文件: ${fileName}.json (${response.status})`);
        }
        return await response.json();
    } catch (error) {
        if (error.message.includes('Failed to fetch')) {
            throw new Error(`无法加载 ${fileName}.json：本地开发时需要使用本地服务器（如 VSCode 的 Live Server 扩展）。在 GitHub Pages 上托管时可以正常工作。`);
        }
        throw error;
    }
}

/**
 * 加载所有配置JSON文件
 * @param {Object} db - 数据库对象
 * @returns {Promise<Object>} 包含加载结果的对象
 */
async function loadAllConfigJson(db) {
    const configFiles = [
        'Building',
        'BuildingType',
        'Company',
        'CompanyType',
        'DayTick',
        'FamilyGen',
        'FirstName',
        'House',
        'HouseGen',
        'HouseType',
        'Job',
        'LastName',
        'NpcAbilityGen',
        'PlayerData',
        'RoadBlock',
        'RoadBlockType',
        'TagGen',
        'TerBlock',
        'TerBlockType'
    ];

    const results = {
        success: [],
        failed: []
    };

    for (const fileName of configFiles) {
        try {
            const jsonData = await loadJsonFile(fileName);
            
            // 更新数据库中的对应表
            Object.keys(jsonData).forEach(sheetName => {
                if (db[sheetName] && Array.isArray(db[sheetName])) {
                    // 替换整个数组
                    db[sheetName].splice(0, db[sheetName].length, ...jsonData[sheetName]);
                    results.success.push(`${sheetName} (${jsonData[sheetName].length}条记录)`);
                }
            });
        } catch (error) {
            results.failed.push(fileName);
            console.error(`加载失败: ${fileName}`, error);
        }
    }

    return results;
}

/**
 * 检查JSON文件是否存在
 * @param {string} fileName - JSON文件名（不含扩展名）
 * @returns {Promise<boolean>} 文件是否存在
 */
async function checkJsonFileExists(fileName) {
    try {
        const response = await fetch(`config/json/${fileName}.json`, { method: 'HEAD' });
        return response.ok;
    } catch {
        return false;
    }
}
