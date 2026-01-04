/**
 * NPC Sim - House Data Operations
 * 房屋数据操作模块
 * Handles house-related data operations
 */

/**
 * 获取房屋当前居民数量
 * @param {Object} db - 数据库引用
 * @param {string} houseId - 房屋ID
 * @returns {number} 当前居民数量
 */
function getHouseCurrentResidents(db, houseId) {
    const building = db.Building.find(b => b.Type === 'House' && b.RefID === houseId);
    if (!building) return 0;
    return db.Family.filter(f => f.Residence === building.BuildingID).length;
}

/**
 * 获取房屋剩余容量
 * @param {Object} db - 数据库引用
 * @param {Object} house - 房屋对象
 * @returns {number} 剩余容量
 */
function getHouseRemainingCapacity(db, house) {
    // 直接从House表获取容量
    const capacity = parseInt(house.Capacity) || 1;
    const currentResidents = getHouseCurrentResidents(db, house.HouseID);
    return Math.max(0, capacity - currentResidents);
}

/**
 * 检查房屋是否可用（有容量）
 * @param {Object} db - 数据库引用
 * @param {Object} house - 房���对象
 * @returns {boolean} 是否可用
 */
function isHouseAvailable(db, house) {
    return getHouseRemainingCapacity(db, house) > 0;
}

/**
 * 获取考虑本轮已接受家庭的房屋剩余容量（动态计算）
 * @param {Object} db - 数据库引用
 * @param {Object} house - 房屋对象
 * @param {Object} houseAcceptedCount - 本轮已接受家庭计数
 * @returns {number} 动态剩余容量
 */
function getHouseRemainingCapacityDynamic(db, house, houseAcceptedCount) {
    const baseRemaining = getHouseRemainingCapacity(db, house);
    const acceptedThisRun = houseAcceptedCount[house.HouseID] || 0;
    return Math.max(0, baseRemaining - acceptedThisRun);
}