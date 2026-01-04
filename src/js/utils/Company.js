/**
 * NPC Sim - 公司操作工具函数
 * 专门处理公司相关的业务逻辑和数据操作
 */

/**
 * 根据NPC ID查找其所在的公司
 * @param {string} npcId - NPC ID
 * @param {Object} db - 数据库对象
 * @returns {Object|null} - 公司对象，如果未找到返回null
 */
function findCompanyByNpcId(npcId, db) {
    // 遍历所有Company
    for (const company of db.Company) {
        if (!company.职业人员) continue;

        // 解析职业人员字段
        const jobs = company.职业人员.split(';');

        for (const jobStr of jobs) {
            if (!jobStr.trim()) continue;

            // 格式：职业名,最大人数,(人员IDa，人员IDb，人员IDc...)
            const match = jobStr.match(/^([^,]+),(\d+),\(([^)]*)\)$/);
            if (match) {
                const peopleStr = match[3].trim();
                // 检查NPC ID是否在人员列表中
                const peopleList = peopleStr ? peopleStr.split(/[,，]/).filter(id => id.trim()) : [];
                if (peopleList.includes(npcId)) {
                    return company;
                }
            }
        }
    }

    return null;
}

/**
 * 从NPC所在公司的资金中扣除指定金额
 * @param {string} npcId - NPC ID
 * @param {number} amount - 要扣除的金额
 * @param {Object} db - 数据库对象
 * @returns {Object} - { success: boolean, company: Object|null, deducted: number, message: string }
 */
function deductFromCompanyFunds(npcId, amount, db) {
    // 查找NPC所在的公司
    const company = findCompanyByNpcId(npcId, db);

    if (!company) {
        return {
            success: false,
            company: null,
            deducted: 0,
            message: `NPC ${npcId} 未找到所属公司`
        };
    }

    // 从公司资金中扣除金额
    const currentFunds = parseFloat(company.资金) || 0;
    company.资金 = parseFloat((currentFunds - amount).toFixed(2));

    return {
        success: true,
        company: company,
        deducted: amount,
        message: `从公司 "${company.名称}" 扣除 ${amount.toFixed(2)} 金币`
    };
}

/**
 * 向公司资金中添加指定金额
 * @param {string} companyId - 公司ID
 * @param {number} amount - 要添加的金额
 * @param {Object} db - 数据库对象
 * @returns {Object} - { success: boolean, company: Object|null, added: number, message: string }
 */
function addToCompanyFunds(companyId, amount, db) {
    const company = db.Company.find(c => c.CompanyID === companyId);
    
    if (!company) {
        return {
            success: false,
            company: null,
            added: 0,
            message: `公司 ${companyId} 未找到`
        };
    }

    const currentFunds = parseFloat(company.资金) || 0;
    company.资金 = parseFloat((currentFunds + amount).toFixed(2));

    return {
        success: true,
        company: company,
        added: amount,
        message: `向公司 "${company.名称}" 添加 ${amount.toFixed(2)} 金币`
    };
}

/**
 * 获取公司当前资金
 * @param {string} companyId - 公司ID
 * @param {Object} db - 数据库对象
 * @returns {number} - 公司资金金额
 */
function getCompanyFunds(companyId, db) {
    const company = db.Company.find(c => c.CompanyID === companyId);
    return company ? parseFloat(company.资金) || 0 : 0;
}

/**
 * 解析Company的职业人员字段，返回每个职业的空缺数
 * 格式：职业名1,最大人数,(人员IDa，人员IDb，人员IDc...)；职业名2,最大人数,(人员IDe，人员IDf，人员IDg...)；……
 * @param {string} 职业人员 - Company表的职业人员字段
 * @param {Object} company - 公司对象
 * @returns {Object} - { jobName: { max: number, current: number, vacancies: number, company: companyObj }[] }
 */
function parseCompanyJobs(职业人员, company) {
    const result = {};
    if (!职业人员) return result;
    
    // 按分号分割不同的职业
    const jobs = 职业人员.split(';');
    
    jobs.forEach(jobStr => {
        if (!jobStr.trim()) return;

        // 格式：职业名,最大人数,(人员IDa，人员IDb，人员IDc...)
        const match = jobStr.match(/^([^,]+),(\d+),\(([^)]*)\)$/);
        if (match) {
            const jobName = match[1].trim();
            const maxPeople = parseInt(match[2]);
            const currentPeopleStr = match[3].trim();

            // 计算当前人数
            const peopleList = currentPeopleStr ? currentPeopleStr.split(/[,，]/).filter(id => id.trim()) : [];
            const currentPeople = peopleList.length;
            const vacancies = Math.max(0, maxPeople - currentPeople);
            
            // 初始化数组（如果还没有）
            if (!result[jobName]) {
                result[jobName] = [];
            }
            
            result[jobName].push({
                max: maxPeople,
                current: currentPeople,
                vacancies: vacancies,
                company: company
            });
        }
    });
    
    return result;
}

/**
 * 获取所有公司的职业空缺信息
 * @param {Object} db - 数据库
 * @returns {Object} - { jobName: { vacancies: number, companies: [...] } }
 */
function getAllCompanyJobVacancies(db) {
    const result = {};
    
    // 遍历所有Building，找到类型为Company的建筑
    const companyBuildings = db.Building.filter(b => b.Type === 'Company');
    
    companyBuildings.forEach(building => {
        // 通过索引字段找到Company记录
        const company = db.Company.find(c => c.ID === building.RefID);
        if (!company || !company.职业人员) return;
        
        // 解析职业人员字段
        const jobs = parseCompanyJobs(company.职业人员, company);
        
        // 合并到结果中
        for (const jobName in jobs) {
            if (!result[jobName]) {
                result[jobName] = {
                    vacancies: 0,
                    companies: []
                };
            }
            
            jobs[jobName].forEach(jobInfo => {
                result[jobName].vacancies += jobInfo.vacancies;
                result[jobName].companies.push(jobInfo);
            });
        }
    });
    
    return result;
}

/**
 * 更新Company的职业人员字段，添加或移除NPC
 * @param {Object} db - 数据库
 * @param {string} jobName - 职业名称
 * @param {string} npcId - NPC ID
 * @param {boolean} isHiring - 是否雇佣（true=雇佣，false=解雇）
 * @returns {boolean} - 是否成功更新
 */
function updateCompanyJobPosition(db, jobName, npcId, isHiring) {
    const companyBuildings = db.Building.filter(b => b.Type === 'Company');
    
    for (const building of companyBuildings) {
        const company = db.Company.find(c => c.ID === building.RefID);
        if (!company || !company.职业人员) continue;
        
        const jobs = parseCompanyJobs(company.职业人员, company);
        
        // 检查这个公司是否有这个职位
        if (jobs[jobName] && jobs[jobName].length > 0) {
            // 找到有空缺的职位
            const jobInfo = jobs[jobName].find(j => j.vacancies > 0);
            if (!jobInfo) continue;
            
            // 修改职业人员字段
            const jobList = company.职业人员.split(';');
            const newJobList = [];
            
            for (let i = 0; i < jobList.length; i++) {
                const jobStr = jobList[i];
                const match = jobStr.match(/^([^,]+),(\d+),\(([^)]*)\)$/);

                if (match && match[1].trim() === jobName) {
                    const currentPeopleStr = match[3].trim();
                    let peopleList = currentPeopleStr ? currentPeopleStr.split(/[,，]/).filter(id => id.trim()) : [];                    
                    if (isHiring) {
                        // 添加NPC ID
                        peopleList.push(npcId);
                    } else {
                        // 移除NPC ID
                        peopleList = peopleList.filter(id => id !== npcId);
                    }
                    
                    // 重构字符串
                    const newPeopleStr = peopleList.join(',');
                    newJobList.push(`${match[1]},${match[2]},(${newPeopleStr})`);
                } else {
                    newJobList.push(jobStr);
                }
            }
            
            company.职业人员 = newJobList.join(';');
            return true; // 成功更新
        }
    }
    
    return false; // 没有找到合适的职位
}
// 用于ES模块的导出（如果使用模块系统）
// export { findCompanyByNpcId, deductFromCompanyFunds, addToCompanyFunds, getCompanyFunds,
//          parseCompanyJobs, getAllCompanyJobVacancies, updateCompanyJobPosition };