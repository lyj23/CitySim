/**
 * NPC Sim - Family Generator Module
 * Handles family and NPC generation logic
 */

/**
 * Generate families based on configuration
 * @param {Object} db - Database reference
 * @param {Object} params - Parameters including familyCount
 * @returns {Object} Result with totalFamilies and totalNpcs count
 */
function generateFamilies(db, params) {
    if (db.FamilyGen.length === 0) {
        return { success: false, message: '请先配置家庭生成表' };
    }
    
    const count = params.familyCount || 1;
    let totalFamilies = 0;
    let totalNpcs = 0;
    
    for (let c = 0; c < count; c++) {
        // 1. Random template selection
        const template = weightedRandom(db.FamilyGen, 'Weight');
        
        // 2. Random last name
        const lastNameObj = weightedRandom(db.LastName, 'Weight');
        const lastName = lastNameObj ? lastNameObj.LastName : '无名';
        
        // 3. Generate property
        const propRanges = parseRangeWeightString(template.Property);
        const propRange = weightedRandom(propRanges, 'weight');
        const property = Math.floor(Math.random() * (propRange.end - propRange.start + 1)) + propRange.start;

        const familyId = 'F' + generateID();
        
        // 4. Generate all members (P1-P8)
        const familyRecord = {
            FamilyID: familyId,
            LastName: lastName,
            Property: property
        };
        
        const generatedNpcs = [];
        for (let i = 1; i <= 8; i++) {
            const genderKey = `P${i}_Gender`;
            const ageKey = `P${i}_Age`;
            const abilityKey = `P${i}_Ability`;
            
            // Check if all fields for this member are filled
            const gender = template[genderKey];
            const age = template[ageKey];
            const ability = template[abilityKey];
            
            if (gender !== undefined && gender !== '' && 
                age !== undefined && age !== '' && 
                ability !== undefined && ability !== '') {
                // Generate NPC for this slot
                const npc = generateNPCBySlot(db, template, i, lastName, familyId);
                generatedNpcs.push(npc);
                familyRecord[`NpcID_${i}`] = npc.NpcID;
            } else {
                familyRecord[`NpcID_${i}`] = '';
            }
        }

        // 5. Write to database
        db.Family.push(familyRecord);
        generatedNpcs.forEach(npc => db.NPC.push(npc));
        totalFamilies++;
        totalNpcs += generatedNpcs.length;
    }
    
    return { 
        success: true, 
        totalFamilies, 
        totalNpcs,
        message: `成功生成 ${totalFamilies} 个家庭，共 ${totalNpcs} 名成员`
    };
}

/**
 * Generate NPC by slot number (1-8)
 * @param {Object} db - Database reference
 * @param {Object} template - Family generation template
 * @param {number} slotNum - Slot number (1-8)
 * @param {string} lastName - Last name for the NPC
 * @param {string} familyId - Family ID
 * @returns {Object} Generated NPC object
 */
function generateNPCBySlot(db, template, slotNum, lastName, familyId) {
    const gender = Number(template[`P${slotNum}_Gender`]);
    const ageStr = template[`P${slotNum}_Age`];
    const abilityType = template[`P${slotNum}_Ability`];
    
    // Age
    const ageRanges = parseRangeWeightString(ageStr);
    const ageRange = weightedRandom(ageRanges, 'weight');
    const age = Math.floor(Math.random() * (ageRange.end - ageRange.start + 1)) + ageRange.start;

    // Name - filter by gender and age
    const validNames = db.FirstName.filter(n => {
        // Gender filter: empty means any gender
        if (n.Gender !== "" && n.Gender !== '' && n.Gender != gender) return false;
        // Age filter: MinAge <= age < MaxAge
        if (n.MinAge !== "" && n.MinAge !== '' && age < Number(n.MinAge)) return false;
        if (n.MaxAge !== "" && n.MaxAge !== '' && age >= Number(n.MaxAge)) return false;
        return true;
    });
    
    let firstName = '某某';
    if (validNames.length > 0) {
        // First random selection
        const firstNameObj = weightedRandom(validNames, 'Weight');
        // Take only first character to ensure single-char name
        const firstChar = firstNameObj ? firstNameObj.FirstName.charAt(0) : '某';
        firstName = firstChar;
        
        // Check NextTextRate for double-character name
        if (firstNameObj && firstNameObj.NextTextRate) {
            const nextRate = Number(firstNameObj.NextTextRate) || 0;
            if (Math.random() < nextRate) {
                // Filter out already selected name for second selection
                const remainingNames = validNames.filter(n => n.FirstName !== firstNameObj.FirstName);
                if (remainingNames.length > 0) {
                    const secondNameObj = weightedRandom(remainingNames, 'Weight');
                    if (secondNameObj) {
                        // Take only first character for second name
                        const secondChar = secondNameObj.FirstName.charAt(0);
                        firstName = firstChar + secondChar;
                    }
                }
            }
        }
    }

    // Ability
    const abilityRule = db.NpcAbilityGen.find(a => a.NpcAbilityTypeID == abilityType);
    const stats = {};
    if (abilityRule) {
        ['Cha', 'Dex', 'Log', 'Phy', 'Cre', 'Per'].forEach(stat => {
            const ranges = parseRangeWeightString(abilityRule[stat]);
            const r = weightedRandom(ranges, 'weight');
            stats[stat] = Math.floor(Math.random() * (r.end - r.start + 1)) + r.start;
        });
    }

    // Tag
    let tag = '';
    if (abilityRule && abilityRule.TagGen) {
        const tagRules = parseWeightString(abilityRule.TagGen);
        const tagObj = weightedRandom(tagRules, 'weight');
        tag = tagObj ? tagObj.val : '';
    }

    return {
        NpcID: 'N' + generateID(),
        LastName: lastName,
        FirstName: firstName,
        Gender: gender,
        Job_ID: '',
        Family_ID: familyId,
        Age: age,
        HouseID: '',
        ...stats,
        Satisfaction: 50,
        Tag: tag
    };
}

// Export for ES modules (if using module system)
// export { generateFamilies, generateNPCBySlot };
