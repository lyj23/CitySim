/**
 * NPC Sim - Day Cycle Module
 * Handles day progression and daily updates
 */

/**
 * Process next day logic
 * @param {Object} db - Database reference
 */
function processNextDay(db) {
    // 1. NPC attribute growth
    db.NPC.forEach(npc => {
        const job = db.Job.find(j => j.JobName === npc.Job_ID);
        if (job) {
            if (npc.Cha < job.CharGrowthMax) npc.Cha = Math.min(job.CharGrowthMax, npc.Cha + job.ChaGrowth);
            if (npc.Dex < job.DexGrowthMax) npc.Dex = Math.min(job.DexGrowthMax, npc.Dex + job.DexGrowth);
            if (npc.Log < job.LogGrowthMax) npc.Log = Math.min(job.LogGrowthMax, npc.Log + job.LogGrowth);
            if (npc.Phy < job.PhyGrowthMax) npc.Phy = Math.min(job.PhyGrowthMax, npc.Phy + job.PhyGrowth);
            if (npc.Cre < job.CreGrowthMax) npc.Cre = Math.min(job.CreGrowthMax, npc.Cre + job.CreGrowth);
            if (npc.Per < job.PerGrowthMax) npc.Per = Math.min(job.PerGrowthMax, npc.Per + job.PerGrowth);
            
            // Format to 2 decimal places
            ['Cha','Dex','Log','Phy','Cre','Per'].forEach(k => npc[k] = parseFloat(npc[k].toFixed(2)));
        }
    });

    // 2. Family property update
    db.Family.forEach(fam => {
        let dailyIncome = 0;
        let dailyCost = 0;
        
        const members = db.NPC.filter(n => n.Family_ID === fam.FamilyID);
        members.forEach(m => {
            const job = db.Job.find(j => j.JobName === m.Job_ID);
            if (job) dailyIncome += job.Income;
        });
        
        // Find family house (assume all members live together, take first member with house)
        const housedMember = members.find(m => m.HouseID);
        if (housedMember) {
            const house = db.House.find(h => h.HouseID === housedMember.HouseID);
            if (house) dailyCost = house.Cost;
        }

        // 更新家庭财产（收入 - 成本）
        const dailyChange = dailyIncome - dailyCost;
        const result = updateFamilyProperty(fam, dailyChange, {
            reason: `每日收支 (+${dailyIncome.toFixed(2)} -${dailyCost.toFixed(2)})`
        });

        // 如果财产变为负数，记录警告
        if (result.after < 0 && result.before >= 0) {
            console.warn(`${fam.LastName}家 财产不足: ${result.after.toFixed(2)} 金币`);
        }
    });
}

// Export for ES modules (if using module system)
// export { processNextDay };
