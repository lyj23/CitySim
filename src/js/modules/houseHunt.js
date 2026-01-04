/**
 * NPC Sim - House Hunt Module
 * 房屋寻租模拟模块
 * Handles house hunting simulation logic
 */

/**
 * Run house hunt simulation
 * 运行房屋寻租模拟
 * @param {Object} db - Database reference - 数据库引用
 * @param {Object} results - Results storage - 结果存储对象
 * @param {Object} params - Parameters including houseApplyCount - 参数对象，包含houseApplyCount
 */
function runHouseHunt(db, results, params) {
    // 初始化结果存储
    results.houseLogs = {};        // 家庭申请意向分数: key: FamilyID_HouseID
    results.houseAcceptLogs = {};  // 房屋接受意向分数: key: FamilyID_HouseID
    results.houseAccepted = {};    // 最终接受结果: key: FamilyID, value: HouseID
    
    // 深拷贝房屋数据并在每次运行时恢复OfferNum
    const houses = JSON.parse(JSON.stringify(db.House));
    const families = db.Family;
    
    // 从原始数据库恢复每个房屋的OfferNum
    houses.forEach(h => {
        const original = db.House.find(oh => oh.HouseID === h.HouseID);
        if (original) {
            h.OfferNum = parseInt(original.OfferNum) || 0;
        }
    });
    

    

    
    /**
     * Calculate family's apply intention score for a house
     * 计算家庭对房屋的申请意向分数
     * Formula: (sum of tag weights) / member count + rent * rent weight
     * 公式：(标签权重总和) / 成员数量 + 租金 * 租金权重
     * Weight format: "租金,权重;标签A,权重;标签B,权重"
     * 权重格式："租金,权重;标签A,权重;标签B,权重"
     */
    function calcFamilyApplyScore(famId, house) {
        const members = getFamilyMembers(db, famId);
        if (members.length === 0) return 0;
        
        const familyTags = getFamilyTags(db, famId);
        const rules = parseWeightString(house.ApplyIntentionWeight);
        const rent = parseInt(house.Cost) || 0;
        
        let tagScore = 0;
        let rentWeight = 0;
        
        rules.forEach(r => {
            if (r.val === '租金' || r.val === 'Rent') {
                rentWeight = r.weight;
            } else {
                // 统计该标签在家庭中出现的次数
                const tagCount = familyTags.filter(t => t === r.val).length;
                tagScore += tagCount * r.weight;
            }
        });
        
        // 公式：(标签分数) / 成员数量 + 租金 * 租金权重
        const score = (tagScore / members.length) + (rent * rentWeight);
        return score;
    }
    
    /**
     * Calculate house's accept intention score for a family
     * 计算房屋对家庭的接受意向分数
     * Formula: (sum of tag weights) / member count
     * 公式：(标签权重总和) / 成员数量
     * Weight format: "标签A,权重;标签B,权重"
     * 权重格式："标签A,权重;标签B,权重"
     */
    function calcHouseAcceptScore(famId, house) {
        const members = getFamilyMembers(db, famId);
        if (members.length === 0) return 0;
        
        const familyTags = getFamilyTags(db, famId);
        const rules = parseWeightString(house.AcceptIntention);
        
        let tagScore = 0;
        
        rules.forEach(r => {
            // 统计该标签在家庭中出现的次数
            const tagCount = familyTags.filter(t => t === r.val).length;
            tagScore += tagCount * r.weight;
        });
        
        // 公式：(标签分数) / 成员数量
        const score = tagScore / members.length;
        return score;
    }
    
    // ============================================
    // PHASE 1: Family Applications - 第一阶段：家庭申请
    // ============================================
    
    const famApplications = {}; // { famId: [ {houseId, applyScore} ] } - 家庭申请记录
    
    families.forEach(fam => {
        // 跳过已有住所的家庭
        if (fam.Residence && fam.Residence.trim() !== '') {
            return; // 该家庭已有住所，跳过申请
        }
        
        const familyIncome = getFamilyDailyIncome(db, fam.FamilyID);
        
        // 计算所有可用房屋的申请分数
        const scores = houses
            .filter(h => {
        // 检查房屋是否可用（有容量）
        if (!isHouseAvailable(db, h)) return false;
                // 检查最低收入要求
                if (familyIncome < (parseInt(h.MinInCome) || 0)) return false;
                return true;
            })
            .map(h => ({
                houseId: h.HouseID,
                applyScore: calcFamilyApplyScore(fam.FamilyID, h)
            }));
        
        // 按分数降序排序
        scores.sort((a, b) => b.applyScore - a.applyScore);
        
        // 选择前A个申请（随机处理并列分数）
        const topScores = [];
        let remainingSlots = params.houseApplyCount;
        
        while (remainingSlots > 0 && scores.length > 0) {
            const maxScore = scores[0].applyScore;
            const tied = scores.filter(s => s.applyScore === maxScore);
            
            if (tied.length <= remainingSlots) {
                // 取所有并列条目
                topScores.push(...tied);
                remainingSlots -= tied.length;
                scores.splice(0, tied.length);
            } else {
                // 从并列条目中随机选择
                while (remainingSlots > 0 && tied.length > 0) {
                    const idx = Math.floor(Math.random() * tied.length);
                    topScores.push(tied[idx]);
                    const scoreIdx = scores.findIndex(s => s.houseId === tied[idx].houseId);
                    scores.splice(scoreIdx, 1);
                    tied.splice(idx, 1);
                    remainingSlots--;
                }
            }
        }
        
        // 在结果中记录申请分数
        topScores.forEach(s => {
            results.houseLogs[`${fam.FamilyID}_${s.houseId}`] = s.applyScore.toFixed(1);
        });
        
        famApplications[fam.FamilyID] = topScores;
    });
    
    // ============================================
    // PHASE 2: Matching Process (iterative) - 第二阶段：匹配过程（迭代）
    // ============================================
    
    const famAccepted = {};  // { famId: houseId } - 最终接受的房屋
    const houseAcceptedCount = {}; // 跟踪本轮中每个房屋接受的家庭数量
    let hasActivity = true;
    

    
    while (hasActivity) {
        hasActivity = false;
        const houseOffers = {}; // { houseId: [ {famId, acceptScore} ] } - 房屋发出的offer列表
        
        // 每个房屋评估申请人并发送offer
        houses.forEach(house => {
            if (house.OfferNum <= 0) return;
            
        // 检查剩余容量（考虑本轮已接受的家庭）
        const remainingCapacity = getHouseRemainingCapacityDynamic(db, house, houseAcceptedCount);
            if (remainingCapacity <= 0) return;
            
            // 收集尚未接受其他房屋的申请人
            const applicants = [];
            for (let famId in famApplications) {
                if (famAccepted[famId]) continue; // 已接受其他房屋
                
                const app = famApplications[famId].find(a => a.houseId === house.HouseID);
                if (app) {
                    const acceptScore = calcHouseAcceptScore(famId, house);
                    applicants.push({ famId, acceptScore, applyScore: app.applyScore });
                    
                    // 在结果中记录接受分数
                    results.houseAcceptLogs[`${famId}_${house.HouseID}`] = acceptScore.toFixed(1);
                }
            }
            
            // 按接受分数降序排序
            applicants.sort((a, b) => b.acceptScore - a.acceptScore);
            
            // 发送offer（受OfferNum和剩余容量限制）
            const maxOffers = Math.min(house.OfferNum, remainingCapacity);
            const offersToSend = [];
            let remaining = maxOffers;
            
            while (remaining > 0 && applicants.length > 0) {
                const maxScore = applicants[0].acceptScore;
                const tied = applicants.filter(a => a.acceptScore === maxScore);
                
                if (tied.length <= remaining) {
                    offersToSend.push(...tied);
                    remaining -= tied.length;
                    tied.forEach(t => {
                        const idx = applicants.findIndex(a => a.famId === t.famId);
                        applicants.splice(idx, 1);
                    });
                } else {
                    // 从并列分数中随机选择
                    while (remaining > 0 && tied.length > 0) {
                        const idx = Math.floor(Math.random() * tied.length);
                        offersToSend.push(tied[idx]);
                        const appIdx = applicants.findIndex(a => a.famId === tied[idx].famId);
                        applicants.splice(appIdx, 1);
                        tied.splice(idx, 1);
                        remaining--;
                    }
                }
            }
            
            houseOffers[house.HouseID] = offersToSend;
            house.OfferNum -= offersToSend.length;
        });
        
        // 家庭接收offer并选择最佳offer（最高申请分数）
        const famReceivedOffers = {}; // { famId: [ {houseId, applyScore} ] } - 家庭收到的offer列表
        
        for (let houseId in houseOffers) {
            houseOffers[houseId].forEach(offer => {
                const famId = offer.famId;
                if (!famReceivedOffers[famId]) famReceivedOffers[famId] = [];
                famReceivedOffers[famId].push({ 
                    houseId: houseId, 
                    applyScore: offer.applyScore 
                });
            });
        }
        
        // 每个收到offer的家庭选择申请分数最高的房屋
        for (let famId in famReceivedOffers) {
            const offers = famReceivedOffers[famId];
            
            // 选择最佳offer（随机处理并列分数）
            const best = selectFromTied(offers, 'applyScore');
            
            if (best) {
                // 在接受前检查房屋是否还有容量
                const house = houses.find(h => h.HouseID === best.houseId);
        if (house && getHouseRemainingCapacityDynamic(db, house, houseAcceptedCount) > 0) {
                    famAccepted[famId] = best.houseId;
                    results.houseAccepted[famId] = best.houseId;
                    // 更新该房屋的接受计数
                    houseAcceptedCount[best.houseId] = (houseAcceptedCount[best.houseId] || 0) + 1;
                    hasActivity = true;
                }
            }
        }
    }
    
    // ============================================
    // PHASE 3: Update Database - 第三阶段：更新数据库
    // ============================================
    
    for (let famId in famAccepted) {
        const houseId = famAccepted[famId];
        
        // 找到引用该房屋的Building
        const building = db.Building.find(b => b.Type === 'House' && b.RefID === houseId);
        const buildingId = building ? building.BuildingID : '';
        
        // 更新家庭的居住地
        const family = db.Family.find(f => f.FamilyID === famId);
        if (family) {
            family.Residence = buildingId;
        }
        
        // 更新该家庭所有NPC的房屋ID
        db.NPC.forEach(n => {
            if (n.Family_ID === famId) n.HouseID = houseId;
        });
    }
}

// ES模块导出（如果使用模块系统）
// export { runHouseHunt };
