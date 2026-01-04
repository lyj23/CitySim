/**
 * NPC Sim - 家庭数据工具函数
 * 统一处理家庭相关数据操作
 */

/**
 * 更新家庭财产
 * @param {Object} family - 家庭对象
 * @param {number} amount - 变动金额（正数为增加，负数为扣除）
 * @param {Object} options - 选项
 * @param {string} options.reason - 变动原因（可选，用于日志）
 * @param {Function} options.addLog - 日志函数（可选）
 * @param {string} options.familyId - 家庭ID（可选，用于日志显示）
 * @returns {Object} 操作结果 { success: boolean, before: number, after: number, amount: number }
 */
function updateFamilyProperty(family, amount, options = {}) {
    const { reason = '', addLog = null, familyId = '' } = options;
    
    // 验证参数
    if (!family) {
        console.error('updateFamilyProperty: 家庭对象不能为空');
        return { success: false, before: 0, after: 0, amount: amount, message: '家庭对象不能为空' };
    }
    
    // 获取当前财产
    const currentProperty = parseFloat(family.Property) || 0;
    
    // 计算新财产
    const newProperty = parseFloat((currentProperty + amount).toFixed(2));
    
    // 更新家庭财产
    family.Property = newProperty;
    
    // 记录日志
    if (addLog && reason) {
        const familyName = familyId || (family.LastName + '家');
        const action = amount >= 0 ? '增加' : '扣除';
        const logMessage = `${familyName} 财产${action} ${Math.abs(amount).toFixed(2)} 金币（${reason}），当前: ${newProperty.toFixed(2)}`;
        addLog(logMessage);
    }
    
    return {
        success: true,
        before: currentProperty,
        after: newProperty,
        amount: amount,
        message: `${amount >= 0 ? '增加' : '扣除'} ${Math.abs(amount).toFixed(2)} 金币`
    };
}

/**
 * 扣除家庭财产
 * @param {Object} family - 家庭对象
 * @param {number} amount - 扣除金额（正数）
 * @param {Object} options - 选项
 * @returns {Object} 操作结果
 */
function deductFamilyProperty(family, amount, options = {}) {
    return updateFamilyProperty(family, -Math.abs(amount), { ...options });
}

/**
 * 增加家庭财产
 * @param {Object} family - 家庭对象
 * @param {number} amount - 增加金额（正数）
 * @param {Object} options - 选项
 * @returns {Object} 操作结果
 */
function addFamilyProperty(family, amount, options = {}) {
    return updateFamilyProperty(family, Math.abs(amount), { ...options });
}

/**
 * 检查家庭是否足够支付
 * @param {Object} family - 家庭对象
 * @param {number} amount - 需要的金额
 * @returns {boolean} 是否足够
 */
function canFamilyAfford(family, amount) {
    if (!family) return false;
    const currentProperty = parseFloat(family.Property) || 0;
    return currentProperty >= amount;
}

/**
 * 获取家庭当前财产
 * @param {Object} family - 家庭对象
 * @returns {number} 当前财产
 */
function getFamilyProperty(family) {
    if (!family) return 0;
    return parseFloat(family.Property) || 0;
}

/**
 * 获取家庭成员列��
 * @param {Object} db - 数据库引用
 * @param {string} famId - 家庭ID
 * @returns {Array} 家庭成员NPC列表
 */
function getFamilyMembers(db, famId) {
    return db.NPC.filter(n => n.Family_ID === famId);
}

/**
 * 获取家庭日收入
 * @param {Object} db - 数据库引用
 * @param {string} famId - 家庭ID
 * @returns {number} 家庭日收入总和
 */
function getFamilyDailyIncome(db, famId) {
    const members = getFamilyMembers(db, famId);
    let income = 0;
    members.forEach(m => {
        const job = db.Job.find(j => j.JobName === m.Job_ID);
        if (job) income += parseInt(job.Income) || 0;
    });
    return income;
}

/**
 * 获取家庭所有成员的标签
 * @param {Object} db - 数据库引用
 * @param {string} famId - 家庭ID
 * @returns {Array} 家庭成员的所有标签数组
 */
function getFamilyTags(db, famId) {
    const members = getFamilyMembers(db, famId);
    const allTags = [];
    members.forEach(m => {
        if (m.Tag) {
            const tags = (m.Tag + '').split(',').map(t => t.trim()).filter(t => t);
            allTags.push(...tags);
        }
    });
    return allTags;
}
