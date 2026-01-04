/**
 * NPC 模拟 - 住宅生成器模块
 * 处理住宅生成逻辑
 */

/**
 * 基于 HouseType 表生成住宅
 * @param {Object} db - 数据库引用
 * @param {Array} roadData - 路网规划数据的二维数组
 * @param {Object} params - 参数，包括 houseGenerateCount 和 showHouseGenerateLog
 * @returns {Object} - 包含消息和成功状态的结果
 */
function generateHouses(db, roadData, params) {
    const targetCount = parseInt(params.houseGenerateCount) || 1;
    let remainingCount = targetCount;
    const generatedHouses = [];
    let failureReason = '';
    
    // 辅助函数：获取下一个可用的 HouseID
    function getNextHouseID() {
        let maxNum = 0;
        db.House.forEach(h => {
            const match = h.HouseID.match(/^H(\d+)$/);
            if (match) {
                const num = parseInt(match[1]);
                if (num > maxNum) maxNum = num;
            }
        });
        return 'H' + String(maxNum + 1).padStart(2, '0');
    }
    
    // 辅助函数：获取下一个可用的 BuildingID
    function getNextBuildingID() {
        let maxNum = 0;
        db.Building.forEach(b => {
            const match = b.BuildingID.match(/^B(\d+)$/);
            if (match) {
                const num = parseInt(match[1]);
                if (num > maxNum) maxNum = num;
            }
        });
        return 'B' + String(maxNum + 1).padStart(3, '0');
    }
    
    // 辅助函数：解析尺寸字符串 "长,宽" 为对象
    function parseSize(sizeStr) {
        const parts = (sizeStr || '').split(',').map(s => parseInt(s.trim()));
        return { l: parts[0] || 1, w: parts[1] || 1 };
    }
    
    // 辅助函数：检查矩形区域是否可用于建筑
    function isAreaAvailable(roadData, x, y, width, height, requiredPlanTypes) {
        // 检查边界
        if (x < 0 || y < 0 || x + width > MAP_SIZE || y + height > MAP_SIZE) {
            return false;
        }
        
        // 检查区域内的所有单元格
        for (let dy = 0; dy < height; dy++) {
            for (let dx = 0; dx < width; dx++) {
                const cellCode = (roadData[y + dy][x + dx] || '').toString().trim();
                
                // 检查单元格是否为公路格（建筑不能覆盖公路）
                if (isRoadCell(x + dx, y + dy, roadData, db)) {
                    return false; // 碰到公路，不可放置
                }
                
                // 检查单元格是否具有所需的规划类型之一
                const hasMatch = requiredPlanTypes.some(planType => {
                    return planType.toString().trim() === cellCode;
                });
                
                if (!hasMatch) {
                    return false;
                }
            }
        }
        
        // 检查区域是否未被现有建筑占用
        for (let building of db.Building) {
            if (!building.Position) continue;
            
            const [bx, by] = building.Position.split(',').map(p => parseInt(p.trim()));
            const bSize = getBuildingSizeFromDB(building);
            
            // 检查重叠
            if (!(x + width <= bx || x >= bx + bSize.l || y + height <= by || y >= by + bSize.w)) {
                return false; // 检测到重叠
            }
        }
        
        return true;
    }
    
    // 辅助函数：从数据库获取建筑尺寸
    function getBuildingSizeFromDB(building) {
        if (building.Type === 'House') {
            const house = db.House.find(h => h.HouseID === building.RefID);
            if (house && house.StyleID) {
                const houseType = db.HouseType.find(ht => ht.ID === house.StyleID);
                if (houseType) {
                    const size = parseSize(houseType.Size);
                    
                    // 根据建筑朝向决定是否旋转尺寸
                    // 东西方向（E/W）的建筑需要旋转，南北方向（N/S）的建筑保持原样
                    if (building.Direction === 'E' || building.Direction === 'W') {
                        return { l: size.w, w: size.l }; // 交换长宽
                    }
                    return size;
                }
            }
        }
        return { l: 1, w: 1 };
    }
    
    // 辅助函数：检查指定位置是否为公路类型
    function isRoadCell(x, y, roadData, db) {
        // 边界检查
        if (x < 0 || x >= MAP_SIZE || y < 0 || y >= MAP_SIZE) {
            return false;
        }
        
        // 获取路网数据
        const roadCode = (roadData[y][x] || '').toString().trim();
        if (!roadCode || roadCode === '00') {
            return false;
        }
        
        // 查找 RoadBlockType 表中的类型信息
        const roadBlockType = db.RoadBlockType?.find(rbt => rbt.Code === roadCode);
        if (!roadBlockType) {
            return false;
        }
        
        // 检查类型字段是否为"公路"
        return roadBlockType.Type === '公路';
    }
    
    // 辅助函数：检查公路指定方向的所有可能放置位置
    // roadX, roadY: 公路格子坐标
    // direction: 'N'|'S'|'E'|'W' 表示建筑在公路的哪个方向（N=公路北边，S=公路南边，W=公路西边，E=公路东边）
    // width, height: 建筑尺寸
    // requiredPlanTypes: 需要的规划类型
    // db: 数据库引用
    function checkPlacementFromRoad(roadX, roadY, direction, width, height, requiredPlanTypes, db) {
        const positions = [];
        
        // 根据方向，检查建筑沿公路边缘滑动的所有可能位置
        switch (direction) {
            case 'N':  // 建筑在公路上方，建筑正面朝南（朝向公路）
                // 建筑下边缘接触公路上边缘，建筑可以左右滑动
                // 公路格子(roadX, roadY)，建筑下边缘在y = roadY
                for (let offsetX = 0; offsetX < width; offsetX++) {
                    const startX = roadX - width + 1 + offsetX;
                    const startY = roadY - height;
                    
                    if (startX <= roadX && roadX <= startX + width - 1) {
                        if (isAreaAvailable(roadData, startX, startY, width, height, requiredPlanTypes)) {
                            positions.push({
                                x: startX,
                                y: startY,
                                direction: 'S',  // 建筑正面朝南（朝向公路）
                                width: width,
                                height: height,
                                roadX: roadX,
                                roadY: roadY
                            });
                        }
                    }
                }
                break;
                
            case 'S':  // 建筑在公路下方，建筑正面朝北（朝向公路）
                // 建筑上边缘接触公路下边缘，建筑可以左右滑动
                for (let offsetX = 0; offsetX < width; offsetX++) {
                    const startX = roadX - width + 1 + offsetX;
                    const startY = roadY + 1;
                    
                    if (startX <= roadX && roadX <= startX + width - 1) {
                        if (isAreaAvailable(roadData, startX, startY, width, height, requiredPlanTypes)) {
                            positions.push({
                                x: startX,
                                y: startY,
                                direction: 'N',  // 建筑正面朝北（朝向公路）
                                width: width,
                                height: height,
                                roadX: roadX,
                                roadY: roadY
                            });
                        }
                    }
                }
                break;
                
            case 'W':  // 建筑在公路左边，建筑正面朝东（朝向公路）
                // 建筑右边缘接触公路左边缘，建筑可以上下滑动
                // 对于东西方向，建筑长宽需要旋转，传入 isAreaAvailable 时交换 width 和 height
                for (let offsetY = 0; offsetY < width; offsetY++) {
                    const startX = roadX - height;
                    const startY = roadY - width + 1 + offsetY;
                    
                    if (startY <= roadY && roadY <= startY + width - 1) {
                        if (isAreaAvailable(roadData, startX, startY, height, width, requiredPlanTypes)) {
                            positions.push({
                                x: startX,
                                y: startY,
                                direction: 'E',  // 建筑正面朝东（朝向公路）
                                width: width,   // 返回原始尺寸（未旋转）
                                height: height,
                                roadX: roadX,
                                roadY: roadY
                            });
                        }
                    }
                }
                break;
                
            case 'E':  // 建筑在公路右边，建筑正面朝西（朝向公路）
                // 建筑左边缘接触公路右边缘，建筑可以上下滑动
                // 对于东西方向，建筑长宽需要旋转，传入 isAreaAvailable 时交换 width 和 height
                for (let offsetY = 0; offsetY < width; offsetY++) {
                    const startX = roadX + 1;
                    const startY = roadY - width + 1 + offsetY;
                    
                    if (startY <= roadY && roadY <= startY + width - 1) {
                        if (isAreaAvailable(roadData, startX, startY, height, width, requiredPlanTypes)) {
                            positions.push({
                                x: startX,
                                y: startY,
                                direction: 'W',  // 建筑正面朝西（朝向公路）
                                width: width,   // 返回原始尺寸（未旋转）
                                height: height,
                                roadX: roadX,
                                roadY: roadY
                            });
                        }
                    }
                }
                break;
        }
        
        return positions.length > 0 ? positions : null;
    }
    
    // 辅助函数：从公路格子检索所有可用位置
    function findAvailablePositionsFromRoads(roadData, width, height, requiredPlanTypes, db) {
        const positions = [];
        
        // 遍历所有格子
        for (let y = 0; y < MAP_SIZE; y++) {
            for (let x = 0; x < MAP_SIZE; x++) {
                // 只处理公路格子
                if (!isRoadCell(x, y, roadData, db)) {
                    continue;
                }
                
                // 检查四个方向：北、南、西、东
                const directions = ['N', 'S', 'W', 'E'];
                
                for (let dir of directions) {
                    // 检查该方向是否可以放置建筑（返回所有可能的位置）
                    const placementList = checkPlacementFromRoad(x, y, dir, width, height, requiredPlanTypes, db);
                    
                    if (placementList && placementList.length > 0) {
                        positions.push(...placementList);
                    }
                }
            }
        }
        
        return positions;
    }
    
    // 辅助函数：加权随机选择
    function weightedRandomSelect(items, weightKey) {
        const totalWeight = items.reduce((sum, item) => sum + (parseInt(item[weightKey]) || 0), 0);
        if (totalWeight === 0) return null;
        
        let random = Math.random() * totalWeight;
        for (let item of items) {
            random -= parseInt(item[weightKey]) || 0;
            if (random <= 0) return item;
        }
        return items[items.length - 1];
    }
    
    // 验证 roadData
    if (!roadData || roadData.length === 0) {
        return {
            success: false,
            message: '生成住宅失败：路网规划数据为空',
            generated: 0,
            remaining: targetCount
        };
    }
    
    // 获取所有生成权重大于 0 的住宅类型
    if (!db.HouseType || db.HouseType.length === 0) {
        failureReason = 'HouseType表为空或不存在';
        return {
            success: false,
            message: `生成住宅失败：${failureReason}`,
            generated: 0,
            remaining: targetCount
        };
    }
    
    const availableTypes = db.HouseType.filter(ht => parseInt(ht.GenerateWeight) > 0);
    
    if (availableTypes.length === 0) {
        failureReason = '没有可用的住宅类型（生成权重>0）';
        return {
            success: false,
            message: `生成住宅失败：${failureReason}`,
            generated: 0,
            remaining: targetCount
        };
    }
    
    // 生成循环
    while (remainingCount > 0) {
        // 筛选容量小于等于剩余数量的类型
        const suitableTypes = availableTypes.filter(ht => {
            const capacity = parseInt(ht.Capacity) || 1;
            return capacity <= remainingCount;
        });
        
        if (suitableTypes.length === 0) {
            failureReason = `剩余需要生成户数(${remainingCount})小于所有住宅类型的最小容纳家庭数`;
            break;
        }
        
        // 加权随机选择
        const selectedType = weightedRandomSelect(suitableTypes, 'GenerateWeight');
        
        if (!selectedType) {
            failureReason = '权重随机选择失败';
            break;
        }
        
        // 解析适用的规划类型（支持单个值或逗号分隔的值）
        const planTypesStr = (selectedType.ApplicablePlanTypes || '').toString().trim();
        if (!planTypesStr) {
            failureReason = `住宅类型 ${selectedType.Name} 没有指定适用规划类型`;
            break;
        }
        
        // 按逗号分割（支持英文和中文逗号）
        const applicablePlanTypes = planTypesStr
            .split(/[,，]/)
            .map(s => s.trim())
            .filter(s => s);
        
        if (applicablePlanTypes.length === 0) {
            failureReason = `住宅类型 ${selectedType.Name} 的适用规划类型格式错误`;
            break;
        }
        
        // 获取建筑尺寸
        const size = parseSize(selectedType.Size);
        
        // 从公路格子出发，查找所有可用位置（四个方向）
        const positions = findAvailablePositionsFromRoads(roadData, size.l, size.w, applicablePlanTypes, db);
        
        if (positions.length === 0) {
            failureReason = `找不到足够大小(${size.l}x${size.w})、符合规划类型(${applicablePlanTypes.join(',')})且紧贴公路的可用区域`;
            break;
        }
        
        // 随机选择一个位置
        const position = positions[Math.floor(Math.random() * positions.length)];
        
        // 设置建筑参数
        const finalWidth = position.width;
        const finalHeight = position.height;
        const finalDirection = position.direction;
        
        // 创建新住宅
        const newHouseID = getNextHouseID();
        const newHouse = {
            HouseID: newHouseID,
            StyleID: selectedType.ID,
            Capacity: parseInt(selectedType.Capacity) || 1,
            Cost: parseInt(selectedType.BaseCost) || 0,
            MinInCome: parseInt(selectedType.BaseMinIncome) || 0,
            OfferNum: parseInt(selectedType.BaseOfferNum) || 0,
            ApplyIntentionWeight: selectedType.BaseApplyIntentionWeight || '',
            AcceptIntention: selectedType.BaseAcceptIntention || ''
        };
        
        db.House.push(newHouse);
        
        // 创建新建筑
        const newBuildingID = getNextBuildingID();
        const newBuilding = {
            BuildingID: newBuildingID,
            Type: 'House',
            RefID: newHouseID,
            Position: `${position.x},${position.y}`,
            Direction: finalDirection  // 设置建筑朝向
        };
        
        db.Building.push(newBuilding);
        
        // 记录生成
        const capacity = parseInt(selectedType.Capacity) || 1;
        generatedHouses.push({
            houseID: newHouseID,
            buildingID: newBuildingID,
            typeName: selectedType.Name,
            capacity: capacity,
            position: `(${position.x},${position.y})`,
            direction: finalDirection,
            size: `${finalWidth}x${finalHeight}`,
            adjacentToRoad: true
        });
        
        remainingCount -= capacity;
    }
    
    // 构建结果消息
    let message = '';
    
    if (generatedHouses.length === 0) {
        message = `生成住宅失败：${failureReason}`;
        return {
            success: false,
            message: message,
            generated: 0,
            remaining: targetCount
        };
    }
    
    const totalGenerated = targetCount - remainingCount;
    message = `住宅生成完成！目标户数: ${targetCount}, 已生成户数: ${totalGenerated}, 剩余户数: ${remainingCount}\n`;
    
    generatedHouses.forEach(h => {
        const directionText = h.direction ? ` 朝向${h.direction}` : '';
        const sizeText = h.size ? ` 尺寸${h.size}` : '';
        message += `- ${h.typeName} (${h.houseID}) 容纳${h.capacity}户 位置${h.position}${sizeText}${directionText} [紧贴公路]\n`;
    });
    
    if (remainingCount > 0) {
        message += `\n未完成原因: ${failureReason}`;
    }
    
    return {
        success: true,
        message: message,
        generated: totalGenerated,
        remaining: remainingCount
    };
}

// 导出 ES 模块（如果使用模块系统）
// export { generateHouses };
