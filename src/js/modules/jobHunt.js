/**
 * NPC Sim - Job Hunt Module
 * Handles job hunting and recruitment simulation logic
 */

/**
 * Calculate weight for job hunting based on rule string
 * @param {Object} entity - NPC or Family object
 * @param {string} ruleStr - Rule string (e.g., "Income,1;TagA,5" or "时薪,1")
 * @param {Object} context - Additional context (e.g., hourlyRate)
 * @returns {number} Calculated weight
 */
function calculateWeight(entity, ruleStr, context = {}) {
    if (!ruleStr) return 0;
    let totalWeight = 0;
    const rules = parseWeightString(ruleStr);

    rules.forEach(rule => {
        // 0. 特殊处理"时薪"字段（用于应聘意向计算）
        if (rule.val === '时薪') {
            const hourlyRate = context.hourlyRate || 0;
            totalWeight += hourlyRate * rule.weight;
        }
        // 1. Tag matching
        else if (entity.Tag && entity.Tag.split(/[,，]/).includes(rule.val)) {
            totalWeight += rule.weight;
        }
        // 2. Chinese attribute name mapping (魅力->Cha, 灵巧->Dex, etc.)
        else {
            const mappedAttr = ATTR_NAME_MAP[rule.val];
            if (mappedAttr && entity.hasOwnProperty(mappedAttr)) {
                totalWeight += (Number(entity[mappedAttr]) || 0) * rule.weight;
            }
            // 3. Attribute matching (Cha, Dex, etc. English names)
            else if (entity.hasOwnProperty(rule.val)) {
                totalWeight += (Number(entity[rule.val]) || 0) * rule.weight;
            }
            // 4. Context matching (e.g., family income)
            else if (context.hasOwnProperty(rule.val)) {
                totalWeight += (Number(context[rule.val]) || 0) * rule.weight;
            }
        }
    });
    return totalWeight;
}

/**
 * Run job hunt simulation
 * @param {Object} db - Database reference
 * @param {Object} results - Results storage
 * @param {Object} params - Parameters including resumeCount
 */
function runJobHunt(db, results, params) {
    // Clear previous results
    results.jobLogs = {};
    results.jobApplied = {};
    results.jobHireLogs = {};
    results.jobAccepted = {};

    // 1. Initialize
    // 获取所有公司的职业空缺信息
    const jobVacancies = getAllCompanyJobVacancies(db);
    const jobs = db.Job; // Job表只包含职业的属性信息（收入、要求等）
    const npcs = db.NPC.filter(n => !n.Job_ID); // Only unemployed NPCs look for jobs

    // 保存原始OfferNum并在每次运行时重置
    const originalOfferNums = new Map();
    jobs.forEach(job => {
        originalOfferNums.set(job.JobName, job.OfferNum);
        job.OfferNum = parseInt(job.OfferNum) || 0; // 确保是数字
    });

    // 临时存储每个NPC的申请队列 { npcId: [ {jobName, score} ] }
    const npcApplications = {};

    // 2. NPC提交简历（基于ApplyIntentionWeight）
    npcs.forEach(npc => {
        // 记录所有职业的分数（包括不满足要求的或没有空缺的）
        const allScores = jobs.map(job => {
            // 检查这个职业是否有空缺
            const jobVacancy = jobVacancies[job.JobName];
            const hasVacancy = jobVacancy && jobVacancy.vacancies > 0;

            // 检查NPC是否满足职业的属性要求
            const qualified = npc.Cha >= (job.ChaReq || 0) && 
                              npc.Dex >= (job.DexReq || 0) && 
                              npc.Log >= (job.LogReq || 0) && 
                              npc.Phy >= (job.PhyReq || 0) && 
                              npc.Cre >= (job.CreReq || 0) && 
                              npc.Per >= (job.PerReq || 0);

            // 计算权重：仅当有空缺时才计算NPC对该职业的意向
            // 应聘意向：受时薪、标签的加权影响
            let score = 0;
            if (hasVacancy) {
                score = calculateWeight(npc, job.ApplyIntentionWeight, { hourlyRate: job.Income });
            }
            return { jobName: job.JobName, score: score, qualified: qualified, hasVacancy: hasVacancy };
        });

        // 只排序并申请满足要求且有空缺的职业
        const validScores = allScores.filter(s => s.qualified && s.hasVacancy);

        // 为相同分数的项添加随机因子，确保随机选择
        validScores.sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            return Math.random() - 0.5; // 相同分数时随机排序
        });

        // 记录所有职业的分数和排名（只有满足要求且有空缺的才有排名）
        allScores.forEach(s => {
            const rankIndex = validScores.findIndex(vs => vs.jobName === s.jobName);
            results.jobLogs[`${npc.NpcID}_${s.jobName}`] = {
                score: s.score.toFixed(1),
                rank: rankIndex >= 0 ? rankIndex + 1 : -1, // -1表示不满足要求或无空缺
                qualified: s.qualified,
                hasVacancy: s.hasVacancy
            };
        });

        // 取前J个作为申请目标（只从满足要求且有空缺的职业中选择）
        const topJ = validScores.slice(0, params.resumeCount);

        // 记录已申请的职业
        topJ.forEach(s => {
            results.jobApplied[`${npc.NpcID}_${s.jobName}`] = true;
        });

        npcApplications[npc.NpcID] = topJ;
    });

    // 3. 招聘流程（循环直到没有offer或没有接受）
    let hasActivity = true;
    const npcAccepted = {}; // 记录本轮被录用的NPC

    while (hasActivity) {
        hasActivity = false;
        const jobOffers = {}; // { npcId: { jobName, buildingId, companyId, scoreInNpcMind } }

        // A. 公司筛选简历 - 基于具体公司和职位的空缺
        const companyBuildings = db.Building.filter(b => b.Type === 'Company');

        companyBuildings.forEach(building => {
            const company = db.Company.find(c => c.ID === building.RefID);
            if (!company || !company.职业人员) return;

            // 解析这个公司的职位空缺
            const companyJobs = parseCompanyJobs(company.职业人员, company);

            // 遍历这个公司的每个职位
            for (const jobName in companyJobs) {
                const jobInfos = companyJobs[jobName];

                // 遍历这个职位的所有可用位置
                for (const jobInfo of jobInfos) {
                    if (jobInfo.vacancies <= 0) continue;

                    // 获取Job表中的职位信息
                    const job = db.Job.find(j => j.JobName === jobName);

                    // 使用临时变量记录剩余offer数（避免跨轮次累积）
                    let remainingOffers = job.OfferNum;

                    if (!job || remainingOffers <= 0) continue;

                    // 收集所有这个职位的申请者（还未被录用）
                    const applicants = [];
                    for (let npcId in npcApplications) {
                        if (npcAccepted[npcId]) continue;
                        const app = npcApplications[npcId].find(a => a.jobName === jobName);
                        if (app) {
                            const npc = db.NPC.find(n => n.NpcID === npcId);
                            // 检查硬性要求
                            if (npc.Cha >= job.ChaReq && npc.Dex >= job.DexReq &&
                                npc.Log >= job.LogReq && npc.Phy >= job.PhyReq &&
                                npc.Cre >= job.CreReq && npc.Per >= job.PerReq) {

                                // 计算公司对NPC的权重（聘用意向）：使用AcceptIntention字段中的规则
                                const score = calculateWeight(npc, job.AcceptIntention);

                                // 记录用工意向分数（排序后会更新排名）
                                const logKey = `${npcId}_${jobName}`;
                                if (!results.jobHireLogs[logKey]) {
                                    results.jobHireLogs[logKey] = { score: score.toFixed(1), rank: 0 };
                                }

                                applicants.push({ npcId, score, npcScore: app.score });
                            }
                        }
                    }

                    // 排序并发送offer
                    applicants.sort((a, b) => b.score - a.score);
                    
                    // 记录每个申请者的排名
                    applicants.forEach((app, index) => {
                        const logKey = `${app.npcId}_${jobName}`;
                        const existingLog = results.jobHireLogs[logKey];
                        if (existingLog && existingLog.rank === 0) {
                            // 更新排名（保留分数）
                            results.jobHireLogs[logKey] = {
                                score: existingLog.score,
                                rank: index + 1
                            };
                        }
                    });
                    
                    // 发送1个offer给最高分者
                    const maxOffers = Math.min(remainingOffers, jobInfo.vacancies);
                    const offers = applicants.slice(0, maxOffers);

                    // 更新剩余offer数（修改db中的值以便在多轮次中递减）
                    remainingOffers = remainingOffers - offers.length;
                    
                    // 记录收到的offer
                    offers.forEach(offer => {
                        if (!jobOffers[offer.npcId]) jobOffers[offer.npcId] = [];
                        jobOffers[offer.npcId].push({
                            jobName: jobName,
                            buildingId: building.ID,
                            companyId: company.ID,
                            scoreInNpcMind: offer.npcScore,
                            companyScore: offer.score
                        });
                    });
                }
            }
        });

        // B. NPC处理offer
        for (let npcId in jobOffers) {
            const offers = jobOffers[npcId];
            // 按NPC对职业的意向分数排序
            offers.sort((a, b) => b.scoreInNpcMind - a.scoreInNpcMind);
            const bestOffer = offers[0];
            
            if (bestOffer) {
                // 接受offer
                npcAccepted[npcId] = bestOffer.jobName;
                results.jobAccepted[npcId] = bestOffer.jobName;
                
                // 更新Company的职业人员字段，添加NPC ID
                updateCompanyJobPosition(db, bestOffer.jobName, npcId, true);
                
                // 扣减职业空缺数
                if (jobVacancies[bestOffer.jobName]) {
                    jobVacancies[bestOffer.jobName].vacancies--;
                }
                
                hasActivity = true;
                break; // 每个NPC最多接受一个offer
            }
        }
    }

    // 4. 更新实际数据 - 更新NPC状态表中的职业情况
    for (let npcId in npcAccepted) {
        const npc = db.NPC.find(n => n.NpcID === npcId);
        if (npc) {
            npc.Job_ID = npcAccepted[npcId];
        }
    }
}

// Export for ES modules (if using module system)
// export { calculateWeight, runJobHunt };
