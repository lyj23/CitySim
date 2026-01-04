const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

/**
 * 将config目录下的所有Excel文件转换为JSON
 * 用于GitHub Pages托管时的数据读取
 */

// 配置路径
const CONFIG_DIR = path.join(__dirname, '../config');
const JSON_DIR = path.join(__dirname, '../config/json');

// 确保json目录存在
if (!fs.existsSync(JSON_DIR)) {
    fs.mkdirSync(JSON_DIR, { recursive: true });
    console.log(`创建目录: ${JSON_DIR}`);
}

/**
 * 读取Excel文件并转换为JSON对象
 * @param {string} filePath - Excel文件路径
 * @returns {Object} 包含所有sheet数据的对象
 */
function excelToJson(filePath) {
    const workbook = XLSX.readFile(filePath);
    const result = {};

    // 遍历所有sheet
    workbook.SheetNames.forEach(sheetName => {
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
        result[sheetName] = jsonData;
    });

    return result;
}

/**
 * 获取目录下所有的Excel文件
 * @param {string} dirPath - 目录路径
 * @returns {Array} Excel文件路径数组
 */
function getExcelFiles(dirPath) {
    const files = fs.readdirSync(dirPath);
    return files
        .filter(file => file.endsWith('.xlsx') || file.endsWith('.xls'))
        .map(file => path.join(dirPath, file));
}

/**
 * 主函数：转换所有Excel文件
 */
function convertAllExcel() {
    console.log('开始转换Excel文件...\n');

    const excelFiles = getExcelFiles(CONFIG_DIR);
    console.log(`找到 ${excelFiles.length} 个Excel文件\n`);

    let successCount = 0;
    let failCount = 0;

    excelFiles.forEach(filePath => {
        try {
            const fileName = path.basename(filePath, path.extname(filePath));
            const jsonPath = path.join(JSON_DIR, `${fileName}.json`);

            console.log(`正在处理: ${fileName}.xlsx`);

            // 转换Excel为JSON
            const jsonData = excelToJson(filePath);

            // 保存JSON文件
            fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2), 'utf-8');

            console.log(`✓ 转换成功: ${fileName}.json\n`);
            successCount++;
        } catch (error) {
            console.error(`✗ 转换失败: ${path.basename(filePath)}`);
            console.error(`  错误: ${error.message}\n`);
            failCount++;
        }
    });

    console.log('====================');
    console.log(`转换完成！`);
    console.log(`成功: ${successCount} 个`);
    console.log(`失败: ${failCount} 个`);
    console.log(`输出目录: ${JSON_DIR}`);
    console.log('====================');
}

// 执行转换
convertAllExcel();
