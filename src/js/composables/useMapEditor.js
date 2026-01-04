/**
 * 地图编辑器组合式函数
 * 处理地图编辑、道路绘制、建筑放置等功能
 */

/**
 * 地图编辑器组合式函数
 * @param {Object} Vue - Vue实例
 * @param {Object} db - 数据库对象
 * @param {Array} mapData - 地图数据
 * @param {Array} roadData - 道路数据
 * @param {Function} addLog - 日志添加函数
 * @param {Function} canAfford - 金钱检查函数
 * @param {Function} getPlayerMoney - 获取玩家金钱函数
 * @param {Function} deductPlayerMoney - 扣除玩家金钱函数
 */
function useMapEditor(Vue, db, mapData, roadData, addLog, canAfford, getPlayerMoney, deductPlayerMoney) {
    const { ref, computed } = Vue;
    
    // 地图编辑器状态
    const mapEditMode = ref('view');  // 'view'=查看, 'block'=地块, 'building'=建筑, 'road'=道路, 'plan'=规划
    const selectedBlockType = ref('00');
    const selectedRoadType = ref('120');  // 选中的道路类型（道路编辑模式）
    const selectedPlanType = ref('1');  // 选中的规划类型（规划编辑模式）
    const roadEraseMode = ref(false);  // 道路擦除模式
    const isMouseDown = ref(false);
    
    // 规划矩形绘制状态
    const planStartPos = ref(null);  // 规划矩形绘制的起始位置
    const planCurrentPos = ref(null);  // 规划绘制过程中的当前鼠标位置
    const brushSize = ref(1);  // 画笔大小（1=单个格子, 2=2x2, 3=3x3, 等等）
    const roadPlanInfluenceRange = 5;  // 公路影响周围规划区的范围（格子数）
    
    // 建筑拖拽状态
    const draggedBuilding = ref(null);  // 当前拖拽的建筑
    const dragPreviewPos = ref({ x: 0, y: 0 });  // 拖拽过程中的预览位置
    
    // 地图视图模式（仅查看模式）
    const mapViewMode = ref('normal');  // 'normal'=普通, 'resident'=居民
    
    // 地图缩放状态
    const mapZoom = ref(100);  // 缩放级别（100 = 100%，默认）
    
    // 从数据库获取地形地块类型
    const terrainBlockTypes = computed(() => {
        return getTerrainBlockTypes(db);
    });
    
    // 从数据库获取道路地块类型
    const roadBlockTypes = computed(() => {
        return getRoadBlockTypes(db);
    });
    
    // 过滤道路地块类型（道路编辑模式，仅显示'公路'类型）
    const roadBlockTypesFiltered = computed(() => {
        const types = roadBlockTypes.value;
        const filtered = {};
        for (const [code, info] of Object.entries(types)) {
            if (code === '00' || info.type === '公路') {
                filtered[code] = info;
            }
        }
        return filtered;
    });
    
    // 过滤道路地块类型（规划编辑模式，仅显示'规划'类型）
    const planBlockTypesFiltered = computed(() => {
        const types = roadBlockTypes.value;
        const filtered = {};
        for (const [code, info] of Object.entries(types)) {
            if (info.type === '规划') {
                filtered[code] = info;
            }
        }
        return filtered;
    });
    
    // 获取地块颜色
    function getBlockColor(code) {
        const types = terrainBlockTypes.value;
        return types[code]?.color || types['00']?.color || '#4a90d9';
    }
    
    // 获取道路颜色
    function getRoadColor(code) {
        if (!code || code === '00') return 'transparent';
        const types = roadBlockTypes.value;
        return types[code]?.color || 'transparent';
    }
    
    // 获取道路不透明度（0 = 不透明，100 = 完全透明）
    function getRoadOpacity(code) {
        if (!code || code === '00') return 100;
        const types = roadBlockTypes.value;
        const opacity = types[code]?.opacity;
        return opacity !== undefined ? opacity : 0;
    }
    
    // 检查指定位置是否有道路（非'00'）
    function hasRoad(x, y) {
        if (x < 0 || x >= MAP_SIZE || y < 0 || y >= MAP_SIZE) return false;
        return roadData[y][x] !== '00';
    }
    
    // 选择地块类型
    function selectBlockType(code) {
        selectedBlockType.value = code;
    }
    
    // 选择道路类型
    function selectRoadType(code) {
        // 检查是否能支付该道路类型的建造费用
        const roadInfo = roadBlockTypes.value[code];
        if (roadInfo && !canAfford(roadInfo.buildCost)) {
            addLog(`金钱不足！选择 ${roadInfo.name} 需要 ¥${roadInfo.buildCost}，当前 ¥${getPlayerMoney()}`);
            return;  // 金钱不足，不允许选择
        }
        selectedRoadType.value = code;
        roadEraseMode.value = false;  // 选择道路类型时停用擦除模式
    }
    
    // 选择规划类型
    function selectPlanType(code) {
        selectedPlanType.value = code;
    }
    
    // 切换道路擦除模式
    function toggleRoadEraseMode() {
        roadEraseMode.value = !roadEraseMode.value;
        if (roadEraseMode.value) {
            selectedRoadType.value = '';  // 擦除模式激活时取消选择道路类型
        }
    }
    
    // 获取规划预览矩形坐标
    function getPlanPreviewRect() {
        if (!planStartPos.value || !planCurrentPos.value) return null;
        const x1 = Math.min(planStartPos.value.x, planCurrentPos.value.x);
        const y1 = Math.min(planStartPos.value.y, planCurrentPos.value.y);
        const x2 = Math.max(planStartPos.value.x, planCurrentPos.value.x);
        const y2 = Math.max(planStartPos.value.y, planCurrentPos.value.y);
        return { x1, y1, x2, y2, width: x2 - x1 + 1, height: y2 - y1 + 1 };
    }
    
    // 获取规划预览矩形的样式
    function getPlanPreviewStyle() {
        const rect = getPlanPreviewRect();
        if (!rect) return { display: 'none' };
        
        const planInfo = roadBlockTypes.value[selectedPlanType.value];
        const color = planInfo?.color || '#FFFF00';
        const opacity = planInfo?.opacity !== undefined ? (1 - planInfo.opacity / 100) : 0.5;
        
        return {
            display: 'block',
            left: (rect.x1 * 12) + 'px',
            top: (rect.y1 * 12) + 'px',
            width: (rect.width * 12) + 'px',
            height: (rect.height * 12) + 'px',
            backgroundColor: color,
            opacity: opacity,
            border: '2px dashed #333',
            pointerEvents: 'none',
            position: 'absolute',
            zIndex: 100,
            boxSizing: 'border-box'
        };
    }
    
    // 确认并绘制规划矩形
    function confirmPlanRectangle() {
        const rect = getPlanPreviewRect();
        if (!rect) return;
        
        const planCode = selectedPlanType.value;
        
        for (let y = rect.y1; y <= rect.y2; y++) {
            for (let x = rect.x1; x <= rect.x2; x++) {
                // 检查边界
                if (x >= 0 && x < MAP_SIZE && y >= 0 && y < MAP_SIZE) {
                    // 规划只能在有RoadBlock数据的格子上绘制（非'00'或'0'）
                    const roadCode = roadData[y][x];
                    if (roadCode && roadCode !== '00' && roadCode !== '0') {
                        // 检查现有道路类型是否为'公路' - 不能覆盖
                        const existingType = roadBlockTypes.value[roadCode]?.type;
                        if (existingType === '公路') {
                            continue;  // 跳过道路类型为'公路'的格子
                        }
                        roadData[y][x] = planCode;
                    }
                }
            }
        }
        
        // 清除预览状态
        planStartPos.value = null;
        planCurrentPos.value = null;
    }
    
    // 绘制地块格子
    function paintCell(x, y) {
        if (mapEditMode.value !== 'block') return;
        const size = brushSize.value;
        const offset = Math.floor((size - 1) / 2);  // 居中画笔
        
        for (let dy = 0; dy < size; dy++) {
            for (let dx = 0; dx < size; dx++) {
                const targetX = x - offset + dx;
                const targetY = y - offset + dy;
                // 检查边界
                if (targetX >= 0 && targetX < MAP_SIZE && targetY >= 0 && targetY < MAP_SIZE) {
                    mapData[targetY][targetX] = selectedBlockType.value;
                }
            }
        }
    }
    
    // 绘制道路
    function paintRoad(x, y) {
        if (mapEditMode.value !== 'road') return;
        const size = brushSize.value;
        const offset = Math.floor((size - 1) / 2);  // 居中画笔
        
        // 确定要绘制的道路代码（擦除模式使用'00'）
        const roadCode = roadEraseMode.value ? '00' : selectedRoadType.value;
        const isErasing = roadEraseMode.value;
        
        // 获取当前道路类型的建造费用
        const buildCost = isErasing ? 0 : (roadBlockTypes.value[roadCode]?.buildCost || 0);
        
        // 计算需要绘制的格子数（用于计算总费用）
        let cellsToPaint = 0;
        
        // 第一次遍历：计算需要绘制的格子数和总费用
        for (let dy = 0; dy < size; dy++) {
            for (let dx = 0; dx < size; dx++) {
                const targetX = x - offset + dx;
                const targetY = y - offset + dy;
                // 检查边界
                if (targetX >= 0 && targetX < MAP_SIZE && targetY >= 0 && targetY < MAP_SIZE) {
                    if (isErasing) {
                        // 擦除模式不收费
                        cellsToPaint++;
                    } else {
                        // 绘制道路前检查地形是否允许建造
                        const terCode = mapData[targetY][targetX];
                        const canBuild = terrainBlockTypes.value[terCode]?.canBuild;
                        if (canBuild === 0 || canBuild === '0') {
                            continue;  // 跳过不允许建造的格子
                        }
                        // 检查是否已经是相同类型的道路
                        if (roadData[targetY][targetX] !== roadCode) {
                            cellsToPaint++;
                        }
                    }
                }
            }
        }
        
        // 计算总费用
        const totalCost = cellsToPaint * buildCost;
        
        // 检查金钱是否足够
        if (!canAfford(totalCost)) {
            addLog(`金钱不足！需要 ¥${totalCost}，当前 ¥${getPlayerMoney()}`);
            return;
        }
        
        // 第二次遍历：实际绘制道路
        let cellsPainted = 0;
        for (let dy = 0; dy < size; dy++) {
            for (let dx = 0; dx < size; dx++) {
                const targetX = x - offset + dx;
                const targetY = y - offset + dy;
                // 检查边界
                if (targetX >= 0 && targetX < MAP_SIZE && targetY >= 0 && targetY < MAP_SIZE) {
                    if (isErasing) {
                        // 擦除道路时，检查并清理孤立的规划格子
                        eraseRoadAndCleanPlan(targetX, targetY);
                        cellsPainted++;
                    } else {
                        // 绘制道路前检查地形是否允许建造
                        const terCode = mapData[targetY][targetX];
                        const canBuild = terrainBlockTypes.value[terCode]?.canBuild;
                        if (canBuild === 0 || canBuild === '0') {
                            continue;  // 跳过不允许建造的格子
                        }
                        // 检查是否已经是相同类型的道路
                        if (roadData[targetY][targetX] !== roadCode) {
                            roadData[targetY][targetX] = roadCode;
                            cellsPainted++;
                        }
                        // 绘制道路时，在周围扩展规划（将空格子设置为规划）
                        expandPlanAroundRoad(targetX, targetY);
                    }
                }
            }
        }
        
        // 扣除金钱
        const actualCost = cellsPainted * buildCost;
        if (actualCost > 0) {
            deductPlayerMoney(actualCost);
            addLog(`建造道路：${cellsPainted}格，花费 ¥${actualCost}`);
        }
    }
    
    // 在道路格子周围扩展规划（每个方向roadPlanInfluenceRange个格子）
    // 将没有道路/规划的格子设置为规划类型'1'，但仅当地形允许建造时
    function expandPlanAroundRoad(x, y) {
        const range = roadPlanInfluenceRange;
        for (let dy = -range; dy <= range; dy++) {
            for (let dx = -range; dx <= range; dx++) {
                const targetX = x + dx;
                const targetY = y + dy;
                // 检查边界
                if (targetX >= 0 && targetX < MAP_SIZE && targetY >= 0 && targetY < MAP_SIZE) {
                    // 检查格子是否有无道路/规划数据（'00'表示空）
                    const currentRoad = roadData[targetY][targetX];
                    if (!currentRoad || currentRoad === '00') {
                        // 检查地形是否允许建造（仅当canBuild明确为1或'1'时允许）
                        const terCode = mapData[targetY][targetX];
                        const canBuild = terrainBlockTypes.value[terCode]?.canBuild;
                        // 使用 != 1 来同时处理数字和字符串类型，undefined/null/0/'0' 都会被排除
                        if (canBuild != 1) {
                            continue;  // 跳过不允许建造的格子
                        }
                        // 设置为第一个规划类型'1'
                        roadData[targetY][targetX] = '1';
                    }
                }
            }
        }
    }
    
    // 擦除道路并清理孤立的规划格子
    function eraseRoadAndCleanPlan(x, y) {
        const oldCode = roadData[y][x];
        const oldType = roadBlockTypes.value[oldCode]?.type;
        
        // 仅擦除道路（公路类型），不擦除规划
        if (oldType !== '公路') {
            return;  // 不是道路，不做任何操作
        }
        
        // 先擦除道路（临时设置为'00'）
        roadData[y][x] = '00';
        
        // 检查被擦除的格子是否在任何其他道路的roadPlanInfluenceRange格范围内
        // 如果是，将其转换为规划类型而不是清除
        if (isPlanCellNearAnyRoad(x, y)) {
            // 设置规划前检查地形是否允许建造（仅当canBuild明确为1或'1'时允许）
            const terCode = mapData[y][x];
            const canBuild = terrainBlockTypes.value[terCode]?.canBuild;
            // 使用 == 1 来同时处理数字和字符串类型
            if (canBuild == 1) {
                // 被擦除的道路格子在其他道路附近，转换为规划类型'1'
                roadData[y][x] = '1';
            }
        }
        
        // 在该被擦除道路的周围roadPlanInfluenceRange格范围内检查规划格子
        const range = roadPlanInfluenceRange;
        const planCellsToCheck = [];
        
        for (let dy = -range; dy <= range; dy++) {
            for (let dx = -range; dx <= range; dx++) {
                const checkX = x + dx;
                const checkY = y + dy;
                // 跳过当前格子（已在上面的代码中处理）
                if (dx === 0 && dy === 0) continue;
                if (checkX >= 0 && checkX < MAP_SIZE && checkY >= 0 && checkY < MAP_SIZE) {
                    const cellCode = roadData[checkY][checkX];
                    const cellType = roadBlockTypes.value[cellCode]?.type;
                    if (cellType === '规划') {
                        planCellsToCheck.push({ x: checkX, y: checkY });
                    }
                }
            }
        }
        
        // 对于每个规划格子，检查其是否在任何道路的6格范围内
        for (const planCell of planCellsToCheck) {
            if (!isPlanCellNearAnyRoad(planCell.x, planCell.y)) {
                // 该规划格子是孤立的，从RoadBlock中清除（仅清除规划，不清除地形）
                roadData[planCell.y][planCell.x] = '00';
            }
        }
    }
    
    // 检查规划格子是否在任何道路格子的roadPlanInfluenceRange格范围内
    function isPlanCellNearAnyRoad(px, py) {
        const range = roadPlanInfluenceRange;
        for (let dy = -range; dy <= range; dy++) {
            for (let dx = -range; dx <= range; dx++) {
                const checkX = px + dx;
                const checkY = py + dy;
                if (checkX >= 0 && checkX < MAP_SIZE && checkY >= 0 && checkY < MAP_SIZE) {
                    const cellCode = roadData[checkY][checkX];
                    const cellType = roadBlockTypes.value[cellCode]?.type;
                    if (cellType === '公路') {
                        return true;
                    }
                }
            }
        }
        return false;
    }
    
    // 处理格子鼠标按下事件
    function handleCellMouseDown(x, y) {
        // 地块编辑模式 - 绘制格子
        if (mapEditMode.value === 'block') {
            isMouseDown.value = true;
            paintCell(x, y);
            return;
        }
        
        // 道路编辑模式 - 绘制道路
        if (mapEditMode.value === 'road') {
            isMouseDown.value = true;
            paintRoad(x, y);
            return;
        }
        
        // 规划编辑模式 - 开始绘制矩形
        if (mapEditMode.value === 'plan') {
            isMouseDown.value = true;
            planStartPos.value = { x, y };
            planCurrentPos.value = { x, y };
            return;
        }
        
        // 建筑编辑模式 - 放置建筑
        if (mapEditMode.value === 'building' && draggedBuilding.value) {
            // 将拖拽的建筑放置到新位置
            const building = draggedBuilding.value;
            const size = getBuildingSize(building);
            
            // 检查位置是否有效
            if (x >= 0 && x + size.l <= MAP_SIZE && y >= 0 && y + size.w <= MAP_SIZE) {
                // 检查位置合法性（考虑建筑朝向和重叠）
                if (checkPlacementValidity(x, y, size.l, size.w, building.BuildingID)) {
                    building.Position = `${x},${y}`;
                    // 保持建筑原有朝向不变
                    addLog(`建筑 ${building.BuildingID} 已移动到 (${x},${y})，朝向保持 ${building.Direction || '未设置'}`);
                    draggedBuilding.value = null;
                } else {
                    addLog(`位置 (${x},${y}) 不合法：地形不允许或与其他建筑重叠`);
                }
            }
            return;
        }
    }
    
    // 处理格子鼠标进入事件
    function handleCellMouseEnter(x, y) {
        // 地块编辑模式 - 拖拽绘制
        if (mapEditMode.value === 'block' && isMouseDown.value) {
            paintCell(x, y);
            return;
        }
        
        // 道路编辑模式 - 拖拽绘制
        if (mapEditMode.value === 'road' && isMouseDown.value) {
            paintRoad(x, y);
            return;
        }
        
        // 规划编辑模式 - 更新矩形预览
        if (mapEditMode.value === 'plan' && isMouseDown.value) {
            planCurrentPos.value = { x, y };
            return;
        }
        
        // 建筑编辑模式 - 更新预览位置
        if (mapEditMode.value === 'building' && draggedBuilding.value) {
            dragPreviewPos.value = { x, y };
        }
    }
    
    // 处理鼠标释放事件
    function handleMouseUp() {
        // 规划编辑模式 - 确认矩形绘制
        if (mapEditMode.value === 'plan' && isMouseDown.value && planStartPos.value) {
            confirmPlanRectangle();
        }
        isMouseDown.value = false;
    }
    
    // 设置地图编辑模式
    function setMapEditMode(mode) {
        mapEditMode.value = mode;
        // 切换模式时清除拖拽的建筑
        if (mode !== 'building') {
            draggedBuilding.value = null;
        }
        // 选择模式后关闭下拉菜单
        const dropdownElement = document.querySelector('.mode-switch .dropdown-toggle');
        if (dropdownElement) {
            const dropdownInstance = bootstrap.Dropdown.getInstance(dropdownElement);
            if (dropdownInstance) {
                dropdownInstance.hide();
            }
        }
    }
    
    // 获取道路提示文本
    function getRoadTooltip(x, y) {
        const roadCode = roadData[y][x];
        if (!roadCode || roadCode === '00') return '';
        const types = roadBlockTypes.value;
        return `路网: ${types[roadCode]?.name || roadCode}`;
    }
    
    // 建筑拖拽函数
    function pickupBuilding(building) {
        if (mapEditMode.value !== 'building') return;
        draggedBuilding.value = building;
        // 将预览位置初始化为建筑当前位置
        const [bx, by] = (building.Position + '').split(',').map(Number);
        dragPreviewPos.value = { x: bx, y: by };
    }
    
    // 处理建筑点击事件
    function handleBuildingClick(building, event) {
        if (mapEditMode.value !== 'building') return;
        event.stopPropagation();
        
        if (draggedBuilding.value === building) {
            // 已在拖拽此建筑，不做任何操作（在格子点击时放置）
            return;
        }
        
        // 拾取建筑
        pickupBuilding(building);
    }
    
    // 检查建筑是否正在被拖拽
    function isBuildingBeingDragged(building) {
        return draggedBuilding.value === building;
    }
    
    // 检查建筑放置位置是否合法
    // 考虑地形是否允许建造，以及是否与其他建筑重叠
    // excludeBuildingId: 排除的建筑ID（用于拖拽移动时排除自身）
    function checkPlacementValidity(x, y, width, height, excludeBuildingId = null) {
        // 检查边界
        if (x < 0 || y < 0 || x + width > MAP_SIZE || y + height > MAP_SIZE) {
            return false;
        }
        
        // 检查地形是否允许建造
        for (let dy = 0; dy < height; dy++) {
            for (let dx = 0; dx < width; dx++) {
                const targetX = x + dx;
                const targetY = y + dy;
                const terCode = mapData[targetY][targetX];
                const canBuild = terrainBlockTypes.value[terCode]?.canBuild;
                // 地形必须明确允许建造（canBuild === 1 或 '1'）
                if (canBuild != 1) {
                    return false;
                }
            }
        }
        
        // 检查是否与其他建筑重叠
        for (const building of db.Building) {
            // 排除自身
            if (building.BuildingID === excludeBuildingId) continue;
            if (!building.Position) continue;
            
            const [bx, by] = (building.Position + '').split(',').map(Number);
            const buildingSize = getBuildingSize(building);
            
            if (isNaN(bx) || isNaN(by) || buildingSize.l === 0 || buildingSize.w === 0) continue;
            
            // 检查矩形重叠
            // 建筑A: (x, y) 到 (x + width, y + height)
            // 建筑B: (bx, by) 到 (bx + buildingSize.l, by + buildingSize.w)
            const noOverlap = (
                x + width <= bx ||  // A在B左边
                bx + buildingSize.l <= x ||  // A在B右边
                y + height <= by ||  // A在B上边
                by + buildingSize.w <= y  // A在B下边
            );
            
            if (!noOverlap) {
                // 存在重叠
                return false;
            }
        }
        
        return true;
    }
    
    // 获取公路相对于建筑的位置（N/S/E/W表示公路在建筑的哪边）
    function getRoadSide(x, y, width, height) {
        // 检查上边（y-1）- 北
        for (let dx = 0; dx < width; dx++) {
            if (isRoadCell(x + dx, y - 1)) {
                return 'N';
            }
        }
        
        // 检查下边（y+height）- 南
        for (let dx = 0; dx < width; dx++) {
            if (isRoadCell(x + dx, y + height)) {
                return 'S';
            }
        }
        
        // 检查左边（x-1）- 西
        for (let dy = 0; dy < height; dy++) {
            if (isRoadCell(x - 1, y + dy)) {
                return 'W';
            }
        }
        
        // 检查右边（x+width）- 东
        for (let dy = 0; dy < height; dy++) {
            if (isRoadCell(x + width, y + dy)) {
                return 'E';
            }
        }
        
        // 如果有多个方向的公路，优先返回找到的第一个方向
        return null;
    }
    
    // 重新计算建筑朝向（基于紧贴的公路位置）
    function updateBuildingDirection(building) {
        if (!building || !building.Position) return;
        
        const [x, y] = building.Position.split(',').map(Number);
        const size = getBuildingSize(building);
        
        const roadSide = getRoadSide(x, y, size.l, size.w);
        if (roadSide === 'N') {
            building.Direction = 'S';  // 公路在北边，建筑朝南
        } else if (roadSide === 'S') {
            building.Direction = 'N';  // 公路在南边，建筑朝北
        } else if (roadSide === 'W') {
            building.Direction = 'E';  // 公路在西边，建筑朝东
        } else if (roadSide === 'E') {
            building.Direction = 'W';  // 公路在东边，建筑朝西
        } else {
            building.Direction = null;  // 没有找到紧贴的公路
        }
    }
    
    // 检查指定位置是否为公路类型
    function isRoadCell(x, y) {
        // 边界检查
        if (x < 0 || x >= MAP_SIZE || y < 0 || y >= MAP_SIZE) {
            return false;
        }
        
        // 获取路网数据
        const roadCode = (roadData[y][x] || '').toString().trim();
        if (!roadCode || roadCode === '00') {
            return false;
        }
        
        // 获取道路块类型
        const roadBlockType = roadBlockTypes.value[roadCode];
        if (!roadBlockType) {
            return false;
        }
        
        // 检查类型字段是否为"公路"
        return roadBlockType.type === '公路';
    }
    
    // 获取拖拽预览样式
    function getDragPreviewStyle(building) {
        if (!isBuildingBeingDragged(building)) return {};
        const size = getBuildingSize(building);
        
        // 检查当前位置是否合法
        const isValid = checkPlacementValidity(
            dragPreviewPos.value.x, 
            dragPreviewPos.value.y, 
            size.l, 
            size.w,
            building.BuildingID
        );
        
        return {
            left: (dragPreviewPos.value.x * 12 + 2) + 'px',
            top: (dragPreviewPos.value.y * 12 + 2) + 'px',
            width: (size.l * 12 - 4) + 'px',
            height: (size.w * 12 - 4) + 'px',
            backgroundColor: isValid ? 'rgba(0, 255, 0, 0.3)' : 'rgba(255, 0, 0, 0.3)',
            border: isValid ? '2px solid #00ff00' : '2px solid #ff0000'
        };
    }
    
    // 通过查询引用表（如House）获取建筑大小
    function getBuildingSize(building) {
        if (!building) return { l: 0, w: 0 };
        
        // 根据Type和RefID从引用表获取大小
        const type = building.Type;
        const refId = building.RefID;
        
        if (!type || !refId) return { l: 0, w: 0 };
        
        let size = null;
        
        // 根据Type查询相应的表
        if (type === 'House') {
            const house = db.House.find(h => h.HouseID === refId);
            if (house && house.StyleID) {
                // 使用StyleID从HouseType表获取大小
                const houseType = db.HouseType.find(ht => ht.ID === house.StyleID);
                if (houseType && houseType.Size) {
                    size = houseType.Size;
                }
            }
        } else if (type === 'Company') {
            // Company类型：通过RefID查询Company表，然后通过样式编号查询CompanyType表
            const company = db.Company.find(c => c.ID === refId);
            if (company && company['样式编号']) {
                // 使用样式编号从CompanyType表获取大小
                const companyType = db.CompanyType.find(ct => ct.ID === company['样式编号']);
                if (companyType && companyType['大小']) {
                    size = companyType['大小'];
                }
            }
        }
        // 未来可以在这里添加更多类型（例如'Shop'、'Factory'等）
        
        if (!size) return { l: 0, w: 0 };
        
        const [l, w] = (size + '').split(',').map(Number);
        
        // 根据建筑方向调整长宽
        // 南北朝向（N/S）使用原始尺寸：l为东西长度，w为南北长度
        // 东西朝向（E/W）需要交换长宽：l为南北长度，w为东西长度
        const direction = (building.Direction + '').toUpperCase().trim();
        let finalL = l || 0;
        let finalW = w || 0;
        
        if (direction === 'E' || direction === 'W') {
            // 东西朝向，交换长宽
            finalL = w || 0;
            finalW = l || 0;
        }
        // 其他方向（N, S, NE, NW, SE, SW）保持原样
        
        return { l: finalL, w: finalW };
    }
    
    // 获取指定网格位置的建筑
    function getBuildingAtPosition(x, y) {
        for (const building of db.Building) {
            if (!building.Position) continue;
            const [bx, by] = (building.Position + '').split(',').map(Number);
            const size = getBuildingSize(building);
            if (isNaN(bx) || isNaN(by) || size.l === 0 || size.w === 0) continue;
            // 检查(x, y)是否在此建筑的边界内
            // Position是西北角，L是东西长度，W是南北长度
            if (x >= bx && x < bx + size.l && y >= by && y < by + size.w) {
                return building;
            }
        }
        return null;
    }
    
    // 获取建筑的居民家庭信息（如果是住宅）
    // 返回居住在此建筑中的所有家庭数组
    function getBuildingResidentInfo(building) {
        if (!building) return [];
        
        // 如果是住宅，查找Residence为此建筑的所有家庭
        if (building.Type === 'House') {
            // 查找Residence为此建筑的所有家庭
            const families = db.Family.filter(f => f.Residence === building.BuildingID);
            
            return families.map(family => ({
                familyId: family.FamilyID,
                lastName: family.LastName
            }));
        }
        
        // 如果是企业，返回企业信息
        if (building.Type === 'Company') {
            const company = db.Company.find(c => c.ID === building.RefID);
            if (company) {
                return [{
                    familyId: company.ID,
                    lastName: company['名称'] || company.ID
                }];
            }
        }
        
        return [];
    }
    
    // 获取建筑提示文本
    function getBuildingTooltip(building) {
        if (!building) return '';
        
        let tooltip = `建筑: ${building.BuildingID}\n类型: ${building.Type}\n索引: ${building.RefID}\n位置: ${building.Position}`;
        
        // 如果是住宅，显示居民家庭
        if (building.Type === 'House') {
            const residents = getBuildingResidentInfo(building);
            if (residents.length > 0) {
                const familyNames = residents.map(r => r.lastName + '家').join(', ');
                tooltip += `\n居住: ${familyNames}`;
            } else {
                tooltip += `\n居住: 无人居住`;
            }
        }
        
        // 如果是企业，显示企业名称
        if (building.Type === 'Company') {
            const company = db.Company.find(c => c.ID === building.RefID);
            if (company) {
                tooltip += `\n企业: ${company['名称'] || company.ID}`;
                tooltip += `\n资金: ${company.资金 || 0}`;
            }
        }
        
        return tooltip;
    }
    
    // 根据当前视图模式获取建筑显示文本
    function getBuildingDisplayText(building) {
        if (!building) return '';
        
        // 在居民视图模式下，对于住宅类型建筑显示居民家庭名称
        if (mapViewMode.value === 'resident' && building.Type === 'House') {
            const residents = getBuildingResidentInfo(building);
            if (residents.length === 0) {
                return '-';  // 此处无家庭居住
            }
            // 用'/'连接所有家庭姓氏
            return residents.map(r => r.lastName).join('/');
        }
        
        // 对于企业类型建筑，在普通视图或居民视图模式下显示企业名称
        if (building.Type === 'Company') {
            const company = db.Company.find(c => c.ID === building.RefID);
            if (company && company['名称']) {
                return company['名称'];
            }
        }
        
        // 默认：显示建筑ID
        return building.BuildingID;
    }
    
    // 获取建筑朝向的旋转角度样式
    // Direction 可以是: N=北, S=南, E=东, W=西, NE=东北, NW=西北, SE=东南, SW=西南
    function getDirectionRotation(direction) {
        // 标准化方向字符串，统一为大写
        const dir = (direction + '').toUpperCase().trim();
        
        // 根据方向返回旋转角度（0度=指向上方/北）
        let rotation = 0;
        
        switch (dir) {
            case 'N':
                rotation = 0;
                break;
            case 'NE':
                rotation = 45;
                break;
            case 'E':
                rotation = 90;
                break;
            case 'SE':
                rotation = 135;
                break;
            case 'S':
                rotation = 180;
                break;
            case 'SW':
                rotation = 225;
                break;
            case 'W':
                rotation = 270;
                break;
            case 'NW':
                rotation = 315;
                break;
            default:
                rotation = 0;  // 默认指向北方
        }
        
        return {
            transform: `translate(-50%, -50%) rotate(${rotation}deg)`
        };
    }
    
    // 设置地图视图模式
    function setMapViewMode(mode) {
        mapViewMode.value = mode;
    }
    
    // 地图缩放控制
    function zoomIn() {
        if (mapZoom.value < 300) {
            mapZoom.value += 25;
        }
    }
    
    function zoomOut() {
        if (mapZoom.value > 25) {
            mapZoom.value -= 25;
        }
    }
    
    function resetZoom() {
        mapZoom.value = 100;
    }
    
    function getZoomStyle() {
        return {
            transform: `scale(${mapZoom.value / 100})`,
            transformOrigin: 'top left'
        };
    }
    
    // 返回所有状态和方法
    return {
        // 状态
        mapEditMode,
        selectedBlockType,
        selectedRoadType,
        selectedPlanType,
        roadEraseMode,
        isMouseDown,
        planStartPos,
        planCurrentPos,
        brushSize,
        draggedBuilding,
        dragPreviewPos,
        mapViewMode,
        mapZoom,
        
        // 计算属性
        terrainBlockTypes,
        roadBlockTypes,
        roadBlockTypesFiltered,
        planBlockTypesFiltered,
        
        // 地块和道路操作
        getBlockColor,
        getRoadColor,
        getRoadOpacity,
        hasRoad,
        selectBlockType,
        selectRoadType,
        selectPlanType,
        toggleRoadEraseMode,
        getPlanPreviewRect,
        getPlanPreviewStyle,
        paintCell,
        paintRoad,
        expandPlanAroundRoad,
        eraseRoadAndCleanPlan,
        isPlanCellNearAnyRoad,
        
        // 事件处理
        handleCellMouseDown,
        handleCellMouseEnter,
        handleMouseUp,
        setMapEditMode,
        getRoadTooltip,
        
        // 建筑操作
        pickupBuilding,
        handleBuildingClick,
        isBuildingBeingDragged,
        checkPlacementValidity,
        getRoadSide,
        updateBuildingDirection,
        isRoadCell,
        getDragPreviewStyle,
        getBuildingSize,
        getBuildingAtPosition,
        getBuildingResidentInfo,
        getBuildingTooltip,
        getBuildingDisplayText,
        getDirectionRotation,
        
        // 视图控制
        setMapViewMode,
        zoomIn,
        zoomOut,
        resetZoom,
        getZoomStyle
    };
}
