/**
 * NPC 模拟 - Excel 操作模块
 * 处理 Excel 导入/导出功能
 */

/**
 * 带路径选择保存文件（如果支持）
 * @param {Object} wb - 工作簿对象
 * @param {string} filename - 建议的文件名
 * @param {boolean} exportWithPath - 是否使用路径选择
 * @returns {Promise<boolean>} 成功状态
 */
async function saveFileWithPath(wb, filename, exportWithPath) {
    if (exportWithPath && window.showSaveFilePicker) {
        try {
            const handle = await window.showSaveFilePicker({
                suggestedName: filename,
                types: [{
                    description: 'Excel 文件',
                    accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] }
                }]
            });
            const writable = await handle.createWritable();
            // 先截断文件以确保完全覆盖
            await writable.truncate(0);
            const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
            await writable.write(new Blob([wbout], { type: 'application/octet-stream' }));
            await writable.close();
            return true;
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error('保存失败:', err);
                alert('保存失败，将使用默认下载方式');
                XLSX.writeFile(wb, filename);
            }
            return false;
        }
    } else {
        if (exportWithPath && !window.showSaveFilePicker) {
            alert('当前浏览器不支持指定路径功能，将使用默认下载方式。\n建议使用 Chrome 86+ 或 Edge 86+ 浏览器。');
        }
        XLSX.writeFile(wb, filename);
        return true;
    }
}

/**
 * 导出当前标签页数据到 Excel
 * @param {Object} db - 数据库引用
 * @param {string} currentTab - 当前标签页名称
 * @param {Object} headers - 表头定义
 * @param {boolean} exportWithTimestamp - 在文件名中添加时间戳
 * @param {boolean} exportWithPath - 使用路径选择
 */
async function exportExcel(db, currentTab, headers, exportWithTimestamp, exportWithPath) {
    const data = db[currentTab];
    const headerMap = headers[currentTab];
    
    // 将数据映射到中文表头
    const exportData = data.map(row => {
        const newRow = {};
        headerMap.forEach(h => {
            if (h.key.startsWith('NpcName_')) return;
            newRow[h.label] = row[h.key];
        });
        return newRow;
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, currentTab);
    const filename = exportWithTimestamp 
        ? `${currentTab}_${new Date().getTime()}.xlsx`
        : `${currentTab}.xlsx`;
    await saveFileWithPath(wb, filename, exportWithPath);
}

/**
 * 导出地图数据到 Excel
 * @param {Array} mapData - 地图数据二维数组
 * @param {Array} roadData - 路网数据二维数组
 * @param {boolean} exportWithTimestamp - 在文件名中添加时间戳
 * @param {boolean} exportWithPath - 使用路径选择
 */
async function exportMapExcel(mapData, roadData, exportWithTimestamp, exportWithPath) {
    // 为 TerBlock Excel 创建二维数组（行是 Y 坐标，列是 X 坐标）
    const excelData = [];
    
    // 添加表头行（X 坐标：0-99）
    const headerRow = ['Y\\X'];
    for (let x = 0; x < MAP_SIZE; x++) {
        headerRow.push(x);
    }
    excelData.push(headerRow);
    
    // 添加数据行
    for (let y = 0; y < MAP_SIZE; y++) {
        const row = [y]; // Y 坐标作为第一列
        for (let x = 0; x < MAP_SIZE; x++) {
            row.push(mapData[y][x]);
        }
        excelData.push(row);
    }
    
    const ws = XLSX.utils.aoa_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'TerBlock');
    
    const filename = exportWithTimestamp 
        ? `TerBlock_${new Date().getTime()}.xlsx`
        : `TerBlock.xlsx`;
    await saveFileWithPath(wb, filename, exportWithPath);
    
    // 导出 RoadBlock 数据
    const roadExcelData = [];
    roadExcelData.push([...headerRow]);  // 相同的表头
    
    for (let y = 0; y < MAP_SIZE; y++) {
        const row = [y];
        for (let x = 0; x < MAP_SIZE; x++) {
            row.push(roadData[y][x]);
        }
        roadExcelData.push(row);
    }
    
    const roadWs = XLSX.utils.aoa_to_sheet(roadExcelData);
    const roadWb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(roadWb, roadWs, 'RoadBlock');
    
    const roadFilename = exportWithTimestamp 
        ? `RoadBlock_${new Date().getTime()}.xlsx`
        : `RoadBlock.xlsx`;
    await saveFileWithPath(roadWb, roadFilename, exportWithPath);
}

/**
 * 从 Excel 工作表导入地图数据
 * @param {Object} worksheet - XLSX 工作表
 * @param {Array} mapData - 要更新的地图数据数组
 */
function importMapFromWorksheet(worksheet, mapData) {
    const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    // 跳过表头行，从第1行开始
    for (let i = 1; i < json.length && i <= MAP_SIZE; i++) {
        const row = json[i];
        if (!row) continue;
        
        const y = i - 1; // Y 坐标 (0-99)
        
        // 跳过第一列（Y 坐标标签），读取第1-100列
        for (let j = 1; j < row.length && j <= MAP_SIZE; j++) {
            const x = j - 1; // X 坐标 (0-99)
            const value = String(row[j] || '00').padStart(2, '0');
            mapData[y][x] = value;
        }
    }
}

/**
 * 从 Excel 工作表导入路网数据
 * @param {Object} worksheet - XLSX 工作表
 * @param {Array} roadData - 要更新的路网数据数组
 */
function importRoadFromWorksheet(worksheet, roadData) {
    const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    // 跳过表头行，从第1行开始
    for (let i = 1; i < json.length && i <= MAP_SIZE; i++) {
        const row = json[i];
        if (!row) continue;
        
        const y = i - 1; // Y 坐标 (0-99)
        
        // 跳过第一列（Y 坐标标签），读取第1-100列
        for (let j = 1; j < row.length && j <= MAP_SIZE; j++) {
            const x = j - 1; // X 坐标 (0-99)
            const value = String(row[j] || '00');
            roadData[y][x] = value;
        }
    }
}

/**
 * 从文件名导入 Excel 文件
 * @param {File} file - 要导入的文件
 * @param {Object} db - 数据库引用
 * @param {Object} headers - 表头定义
 * @param {Object} tabs - 标签页定义
 * @param {Array} mapData - 地图数据数组（用于 TerBlock 导入）
 * @param {Array} roadData - 路网数据数组（用于 RoadBlock 导入）
 * @returns {Promise<Object>} 包含 targetTab 的导入结果
 */
function importExcelFile(file, db, headers, tabs, mapData, roadData) {
    return new Promise((resolve, reject) => {
        // 从文件名中提取表名（去除时间戳和扩展名）
        let fileName = file.name.replace(/\.xlsx?$/i, '');
        fileName = fileName.replace(/_\d+$/, '');
        
        // 检查是否为有效的表名
        const targetTab = TABLE_NAME_MAP[fileName];
        if (!targetTab) {
            reject({
                message: `无法识别文件名 "${file.name}"！\n\n支持的文件名：Family, FamilyGen, LastName, FirstName, NPC, NpcAbilityGen, House, Job, TerBlock, RoadBlock, Building, Company, CompanyType\n（可带时间戳后缀，如 NPC_1234567890.xlsx）`
            });
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            
            // TerBlock 的特殊处理
            if (targetTab === 'TerBlock') {
                importMapFromWorksheet(worksheet, mapData);
                resolve({
                    isMap: true,
                    targetTab: 'map'
                });
                return;
            }
            
            // RoadBlock 的特殊处理
            if (targetTab === 'RoadBlock') {
                importRoadFromWorksheet(worksheet, roadData);
                resolve({
                    isRoad: true,
                    targetTab: 'map'
                });
                return;
            }
            
            const json = XLSX.utils.sheet_to_json(worksheet);

            // 反向映射：中文表头 -> Key
            const headerMap = headers[targetTab];
            const newData = json.map(row => {
                const newRow = {};
                headerMap.forEach(h => {
                    if (h.key.startsWith('NpcName_')) return;
                    
                    let cellValue = row[h.label] !== undefined ? row[h.label] : '';
                    
                    // 对于 RoadBlockType 和 TerBlockType，确保 Code 字段是字符串
                    if ((targetTab === 'RoadBlockType' || targetTab === 'TerBlockType') && h.key === 'Code') {
                        cellValue = cellValue.toString();
                    }
                    
                    newRow[h.key] = cellValue;
                });
                return newRow;
            });

            db[targetTab] = newData;
            resolve({
                targetTab,
                count: newData.length,
                tabName: tabs[targetTab].name
            });
        };
        reader.onerror = () => reject({ message: '文件读取失败' });
        reader.readAsArrayBuffer(file);
    });
}

/**
 * 从目录中导入所有 Excel 文件
 * @param {Object} db - 数据库引用
 * @param {Object} headers - 表头定义
 * @param {Array} mapData - 地图数据数组（用于 TerBlock 导入）
 * @param {Array} roadData - 路网数据数组（用于 RoadBlock 导入）
 * @returns {Promise<Object>} 导入结果
 */
async function importAllExcel(db, headers, mapData, roadData) {
    // 检查浏览器支持
    if (!window.showDirectoryPicker) {
        return { 
            success: false, 
            message: '当前浏览器不支持选择文件夹功能。\n建议使用 Chrome 86+ 或 Edge 86+ 浏览器。' 
        };
    }
    
    let dirHandle;
    try {
        dirHandle = await window.showDirectoryPicker({ mode: 'read' });
    } catch (err) {
        if (err.name === 'AbortError') return { success: false, cancelled: true };
        return { success: false, message: '无法选择文件夹：' + err.message };
    }
    
    let importedTables = [];
    let skippedFiles = [];
    
    try {
        // 遍历目录中的所有文件
        for await (const entry of dirHandle.values()) {
            if (entry.kind !== 'file') continue;
            
            // 检查是否为 Excel 文件
            if (!entry.name.match(/\.xlsx?$/i)) continue;
            
            // 从文件名中提取表名
            let fileName = entry.name.replace(/\.xlsx?$/i, '');
            fileName = fileName.replace(/_\d+$/, '');
            
            // 检查是否为有效的表名
            const dbKey = TABLE_NAME_MAP[fileName];
            if (!dbKey) {
                skippedFiles.push(entry.name);
                continue;
            }
            
            try {
                const file = await entry.getFile();
                const arrayBuffer = await file.arrayBuffer();
                const data = new Uint8Array(arrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                
                // TerBlock 的特殊处理
                if (dbKey === 'TerBlock') {
                    importMapFromWorksheet(worksheet, mapData);
                    importedTables.push('TerBlock(地图)');
                    continue;
                }
                
                // RoadBlock 的特殊处理
                if (dbKey === 'RoadBlock') {
                    importRoadFromWorksheet(worksheet, roadData);
                    importedTables.push('RoadBlock(路网)');
                    continue;
                }
                
                const json = XLSX.utils.sheet_to_json(worksheet);

                // 反向映射
                const headerMap = headers[dbKey];
                if (!headerMap) continue;
                
                const newData = json.map(row => {
                    const newRow = {};
                    headerMap.forEach(h => {
                        if (h.key.startsWith('NpcName_')) return;
                        
                        let cellValue = row[h.label] !== undefined ? row[h.label] : '';
                        
                        // 对于 RoadBlockType 和 TerBlockType，确保 Code 字段是字符串
                        if ((dbKey === 'RoadBlockType' || dbKey === 'TerBlockType') && h.key === 'Code') {
                            cellValue = cellValue.toString();
                        }
                        
                        newRow[h.key] = cellValue;
                    });
                    return newRow;
                });

                db[dbKey] = newData;
                importedTables.push(`${dbKey}(${newData.length}条)`);
            } catch (err) {
                console.error(`导入 ${entry.name} 失败:`, err);
                skippedFiles.push(entry.name + '(读取失败)');
            }
        }
        
        return {
            success: true,
            importedTables,
            skippedFiles
        };
        
    } catch (err) {
        console.error('读取目录失败:', err);
        return { success: false, message: '读取目录失败：' + err.message };
    }
}

/**
 * 导出所有表到 Excel 文件
 * @param {Object} db - 数据库引用
 * @param {Object} headers - 表头定义
 * @param {Array} mapData - 地图数据数组
 * @param {Array} roadData - 路网数据数组
 * @param {boolean} exportWithTimestamp - 在文件名中添加时间戳
 * @param {boolean} exportWithPath - 使用路径选择
 */
async function exportAllExcel(db, headers, mapData, roadData, exportWithTimestamp, exportWithPath) {
    const tablesToExport = ['Family', 'FamilyGen', 'LastName', 'FirstName', 'NPC', 'NpcAbilityGen', 'House', 'Job', 'Building', 'TerBlockType', 'RoadBlockType', 'Company', 'CompanyType', 'PlayerData'];
    
    // 如果启用了路径选择，让用户先选择一个文件夹
    let dirHandle = null;
    if (exportWithPath && window.showDirectoryPicker) {
        try {
            dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
        } catch (err) {
            if (err.name === 'AbortError') return;
            alert('无法选择文件夹，将使用默认下载方式');
        }
    } else if (exportWithPath && !window.showDirectoryPicker) {
        alert('当前浏览器不支持指定路径功能，将使用默认下载方式。\n建议使用 Chrome 86+ 或 Edge 86+ 浏览器。');
    }
    
    // 导出常规表
    for (const tabName of tablesToExport) {
        const data = db[tabName];
        const headerMap = headers[tabName];
        if (!data || !headerMap) continue;
        
        // 将数据映射到中文表头
        const exportData = data.map(row => {
            const newRow = {};
            headerMap.forEach(h => {
                if (h.key.startsWith('NpcName_')) return;
                newRow[h.label] = row[h.key];
            });
            return newRow;
        });

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, tabName);
        
        const filename = exportWithTimestamp 
            ? `${tabName}_${new Date().getTime()}.xlsx`
            : `${tabName}.xlsx`;
        
        if (dirHandle) {
            try {
                const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
                const writable = await fileHandle.createWritable();
                // 先截断文件以确保完全覆盖现有文件
                await writable.truncate(0);
                const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
                await writable.write(new Blob([wbout], { type: 'application/octet-stream' }));
                await writable.close();
            } catch (err) {
                console.error(`保存 ${filename} 失败:`, err);
            }
        } else {
            XLSX.writeFile(wb, filename);
        }
    }
    
    
    // 导出 TerBlock
    const mapExcelData = [];
    const mapHeaderRow = ['Y\\X'];
    for (let x = 0; x < MAP_SIZE; x++) {
        mapHeaderRow.push(x);
    }
    mapExcelData.push(mapHeaderRow);
    
    for (let y = 0; y < MAP_SIZE; y++) {
        const row = [y];
        for (let x = 0; x < MAP_SIZE; x++) {
            row.push(mapData[y][x]);
        }
        mapExcelData.push(row);
    }
    
    const mapWs = XLSX.utils.aoa_to_sheet(mapExcelData);
    const mapWb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(mapWb, mapWs, 'TerBlock');
    
    const mapFilename = exportWithTimestamp 
        ? `TerBlock_${new Date().getTime()}.xlsx`
        : `TerBlock.xlsx`;
    
    if (dirHandle) {
        try {
            const fileHandle = await dirHandle.getFileHandle(mapFilename, { create: true });
            const writable = await fileHandle.createWritable();
                // 先截断文件以确保完全覆盖现有文件
                await writable.truncate(0);
            const wbout = XLSX.write(mapWb, { bookType: 'xlsx', type: 'array' });
            await writable.write(new Blob([wbout], { type: 'application/octet-stream' }));
            await writable.close();
        } catch (err) {
            console.error(`保存 ${mapFilename} 失败:`, err);
        }
    } else {
        XLSX.writeFile(mapWb, mapFilename);
    }
    
    
    // 导出 RoadBlock
    const roadExcelData = [];
    roadExcelData.push([...mapHeaderRow]);
    
    for (let y = 0; y < MAP_SIZE; y++) {
        const row = [y];
        for (let x = 0; x < MAP_SIZE; x++) {
            row.push(roadData[y][x]);
        }
        roadExcelData.push(row);
    }
    
    const roadWs = XLSX.utils.aoa_to_sheet(roadExcelData);
    const roadWb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(roadWb, roadWs, 'RoadBlock');
    
    const roadFilename = exportWithTimestamp 
        ? `RoadBlock_${new Date().getTime()}.xlsx`
        : `RoadBlock.xlsx`;
    
    if (dirHandle) {
        try {
            const fileHandle = await dirHandle.getFileHandle(roadFilename, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.truncate(0);
            const wbout = XLSX.write(roadWb, { bookType: 'xlsx', type: 'array' });
            await writable.write(new Blob([wbout], { type: 'application/octet-stream' }));
            await writable.close();
        } catch (err) {
            console.error(`保存 ${roadFilename} 失败:`, err);
        }
    } else {
        XLSX.writeFile(roadWb, roadFilename);
    }
    
    return tablesToExport.length + 2; // +2 表示 TerBlock 和 RoadBlock
}

// 导出 ES 模块（如果使用模块系统）
// export { saveFileWithPath, exportExcel, exportMapExcel, importExcelFile, importAllExcel, exportAllExcel };
