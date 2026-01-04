/**
 * useMoneyManager.js - 金钱管理组合式函数
 * 提供玩家金钱获取、设置、扣除和检查功能
 */

/**
 * 金钱管理组合式函数
 * @param {Object} db - 数据库对象
 * @param {Object} Vue - Vue 全局对象（用于解构 ref）
 * @returns {Object} 金钱相关的状态和方法
 */
function useMoneyManager(db, Vue) {
    const { ref } = Vue;
    // 无限金钱模式
    const infiniteMoney = ref(false);
    
    /**
     * 获取玩家当前金钱
     * @returns {number} 当前金钱金额
     */
    function getPlayerMoney() {
        const item = db.PlayerData?.find(p => p.Item === '当前金钱');
        return parseFloat(item?.Value) || 0;
    }
    
    /**
     * 设置玩家金钱（共用函数）
     * @param {number} amount - 要设置的金钱金额
     * @returns {boolean} 是否设置成功
     */
    function setPlayerMoney(amount) {
        const playerMoneyItem = db.PlayerData.find(p => p.Item === '当前金钱');
        if (playerMoneyItem) {
            playerMoneyItem.Value = amount.toFixed(2);
            return true;
        }
        return false;
    }
    
    /**
     * 扣除玩家金钱（共用函数）
     * @param {number} amount - 要扣除的金额
     * @returns {boolean} 是否扣除成功（金钱不足返回 false）
     */
    function deductPlayerMoney(amount) {
        if (infiniteMoney.value) {
            return true;  // 无限金钱模式，不扣除
        }
        const currentMoney = getPlayerMoney();
        if (currentMoney >= amount) {
            return setPlayerMoney(currentMoney - amount);
        }
        return false;  // 金钱不足
    }
    
    /**
     * 检查玩家金钱是否足够（共用函数）
     * @param {number} amount - 需要的金额
     * @returns {boolean} 是否足够支付
     */
    function canAfford(amount) {
        if (infiniteMoney.value) {
            return true;  // 无限金钱模式，总是可以支付
        }
        return getPlayerMoney() >= amount;
    }
    
    return {
        infiniteMoney,
        getPlayerMoney,
        setPlayerMoney,
        deductPlayerMoney,
        canAfford
    };
}

// 导出为全局变量
window.useMoneyManager = useMoneyManager;
