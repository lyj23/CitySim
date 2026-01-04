/**
 * NPC Sim - 主应用程序
 * Vue 3 应用程序设置和组合
 */

const { createApp, reactive, ref, computed, nextTick } = Vue;

// 初始化地图数据（100x100网格，默认为'00'）
function initMapData() {
    const map = [];
    for (let y = 0; y < MAP_SIZE; y++) {
        const row = [];
        for (let x = 0; x < MAP_SIZE; x++) {
            row.push('00');
        }
        map.push(row);
    }
    return map;
}

// 初始化道路数据（100x100网格，默认为'00' = 无道路）
function initRoadData() {
    const road = [];
    for (let y = 0; y < MAP_SIZE; y++) {
        const row = [];
        for (let x = 0; x < MAP_SIZE; x++) {
            row.push('00');
        }
        road.push(row);
    }
    return road;
}

// 应用程序设置
const app = createApp({
    setup() {
        // 状态
        const currentDay = ref(1);
        const currentTab = ref('NPC');
        const activeBottomTab = ref('family');
        const params = reactive({
            resumeCount: 3,
            houseApplyCount: 3,
            familyCount: 1,
            taxDays: 0,
            taxHours: 1,
            showFamilyLog: false,
            showTaxLog: false,
            jobHours: 1,
            showJobLog: false,
            houseGenerateCount: 1,
            showHouseGenerateLog: false
        });
        
        // 日志系统（从组合式函数获取）
        const {
            logMessages,
            logMessagesContainer,
            addLog,
            clearLogs
        } = useLogSystem(Vue);
        
        const exportWithTimestamp = ref(true);
        const exportWithPath = ref(false);

        // 核心数据库 - 使用常量文件中的默认数据
        const db = reactive(JSON.parse(JSON.stringify(DEFAULT_DATA)));

        // 金钱管理（从组合式函数获取）
        const {
            infiniteMoney,
            getPlayerMoney,
            setPlayerMoney,
            deductPlayerMoney,
            canAfford
        } = useMoneyManager(db, Vue);

        // 地图数据（100x100网格）
        const mapData = reactive(initMapData());
        
        // 道路数据（100x100网格）
        const roadData = reactive(initRoadData());
        
        // 地图编辑器（从组合式函数获取）
        const mapEditor = useMapEditor(Vue, db, mapData, roadData, addLog, canAfford, getPlayerMoney, deductPlayerMoney);

        // 结果记录
        const results = reactive({
            jobLogs: {},      // 键: NpcID_JobName, 值: { score, rank, qualified }
            jobApplied: {},   // 键: NpcID_JobName, 值: true
            jobHireLogs: {},  // 键: NpcID_JobName, 值: { score, rank }
            jobAccepted: {},  // 键: NpcID, 值: JobName
            houseLogs: {},    // 键: FamilyID_HouseID, 值: 申请得分
            houseAcceptLogs: {}, // 键: FamilyID_HouseID, 值: 接受得分
            houseAccepted: {} // 键: FamilyID, 值: HouseID
        });


        // 计算属性
        const isResultTab = computed(() => ['jobResult', 'jobHireResult', 'houseResult', 'houseAcceptResult'].includes(currentTab.value));
        const isMapTab = computed(() => currentTab.value === 'map');
        const currentData = computed(() => {
            // 企业职业人员表使用计算属性
            if (currentTab.value === 'CompanyJobs') {
                return companyJobsData.value;
            }
            return db[currentTab.value];
        });
        const currentHeaders = computed(() => HEADERS[currentTab.value]);

        // 企业职业人员表数据
        const companyJobsData = computed(() => {
            const result = [];

            // 遍历所有Company
            db.Company.forEach(company => {
                if (!company.职业人员) return;

                // 解析职业人员字段
                const jobs = company.职业人员.split(';');

                jobs.forEach(jobStr => {
                    if (!jobStr.trim()) return;

                    // 格式：职业名,最大人数,(人员IDa，人员IDb，人员IDc...)
                    const match = jobStr.match(/^([^,]+),(\d+),\(([^)]*)\)$/);
                    if (match) {
                        const jobName = match[1].trim();
                        const maxPeople = parseInt(match[2]);
                        const peopleStr = match[3].trim();

                        // 解析员工ID列表
                        const peopleList = peopleStr ? peopleStr.split(/[,，]/).filter(id => id.trim()) : [];
                        const currentPeople = peopleList.length;
                        const vacancies = maxPeople - currentPeople;

                        // 获取员工姓名
                        const employeeNames = peopleList.map(npcId => {
                            const npc = db.NPC.find(n => n.NpcID === npcId);
                            return npc ? `${npc.LastName}${npc.FirstName}(${npcId})` : npcId;
                        }).join(', ');

                        result.push({
                            CompanyID: company.ID,
                            CompanyName: company.名称,
                            JobName: jobName,
                            MaxPeople: maxPeople,
                            CurrentPeople: currentPeople,
                            Vacancies: vacancies,
                            Employees: employeeNames
                        });
                    }
                });
            });

            return result;
        });
        
        // 获取主标签页（无父标签的标签页）
        const mainTabs = computed(() => {
            const result = {};
            for (const [key, tab] of Object.entries(TABS)) {
                if (!tab.parent) {
                    result[key] = tab;
                }
            }
            return result;
        });
        
        // 获取当前主标签页的子标签页
        const subTabs = computed(() => {
            const result = {};
            // 获取实际的父标签页（当前标签页或其父标签页）
            const currentTabInfo = TABS[currentTab.value];
            const parentKey = currentTabInfo?.parent || currentTab.value;
            
            for (const [key, tab] of Object.entries(TABS)) {
                if (tab.parent === parentKey) {
                    result[key] = tab;
                }
            }
            return result;
        });
        
        // 检查当前标签页是否有子标签页
        const hasSubTabs = computed(() => Object.keys(subTabs.value).length > 0);
        
        // 获取活动的主标签页（用于导航高亮）
        const activeMainTab = computed(() => {
            const currentTabInfo = TABS[currentTab.value];
            return currentTabInfo?.parent || currentTab.value;
        });

        
        // 玩家数据计算属性
        const playerCityName = computed(() => {
            const item = db.PlayerData?.find(p => p.Item === '城市名称');
            return item?.Value || '未命名';
        });
        
        const playerMoney = computed(() => {
            const item = db.PlayerData?.find(p => p.Item === '当前金钱');
            return item?.Value || '0';
        });
        
        const playerDate = computed(() => {
            const item = db.PlayerData?.find(p => p.Item === '当前日期');
            const value = item?.Value || '0001\\01\\01';
            // 将 YYYY\MM\DD 格式转换为 YYYY/MM/DD 格式
            return value.replace(/\\/g, '/');
        });
        
        const playerTime = computed(() => {
            const item = db.PlayerData?.find(p => p.Item === '当前时间');
            const value = item?.Value || '0000';
            // 将 XXXX 格式转换为 XX:XX 格式用于显示
            if (value.length === 4) {
                return value.substring(0, 2) + ':' + value.substring(2, 4);
            }
            return value;
        });
        
        // 平均满意度计算属性
        const averageSatisfaction = computed(() => {
            if (!db.NPC || db.NPC.length === 0) return 0;
            const total = db.NPC.reduce((sum, npc) => {
                const satisfaction = parseFloat(npc.Satisfaction) || 50;
                return sum + satisfaction;
            }, 0);
            return total / db.NPC.length;
        });

        // 家庭数计算属性
        const familyCount = computed(() => {
            if (!db.Family) return 0;
            return db.Family.length;
        });

        // 住宅需求计算属性
        const housingDemand = computed(() => {
            const item = db.PlayerData?.find(p => p.Item === '住宅需求');
            return parseInt(item?.Value) || 0;
        });

        // 住宅需求进度计算属性
        const housingDemandProgress = computed(() => {
            const demand = housingDemand.value;
            const maxDemand = familyCount.value + 100;
            if (maxDemand <= 0) return 0;
            const progress = (demand / maxDemand) * 100;
            return Math.min(Math.max(progress, 0), 100); // 限制在 0-100 之间
        });




        // --- 动作 ---
        
        // 生成家庭包装函数
        function generateFamily() {
            const result = generateFamilies(db, params);
            if (params.showFamilyLog) {
                addLog(result.message);
            }
        }
        
        // 生成住宅
        function generateHouse() {
            try {
                const result = generateHouses(db, roadData, params);
                if (params.showHouseGenerateLog && result && result.message) {
                    const lines = result.message.split('\n');
                    lines.forEach(line => {
                        if (line.trim()) addLog(line);
                    });
                }
            } catch (error) {
                console.error('Error generating houses:', error);
                addLog(`生成住宅时发生错误: ${error.message || error}`);
            }
        }        
        // 运行求职包装函数
        function handleRunJobHunt() {
            runJobHunt(db, results, params);
        }

        // 运行找房包装函数
        function handleRunHouseHunt() {
            runHouseHunt(db, results, params);
        }

        // 下一天包装函数
        function nextDay() {
            currentDay.value++;
            processNextDay(db);
        }

        // 收取住宅税
        function collectHouseTax() {
            const days = params.taxDays || 0;
            const hours = params.taxHours || 1;
            
            // 计算总时长（小时）
            const totalHours = (days * 24) + hours;
            
            if (totalHours <= 0) {
                if (params.showTaxSummary) {
                    alert('请输入有效的天数或小时数');
                }
                return;
            }
            
            // 根据总时长计算每日税金
            // tax = (dailyTax * totalHours) / 24
            let totalCollected = 0;
            let taxInfo = [];
            
            // 处理每个有住宅的家庭
            db.Family.forEach(fam => {
                if (fam.Residence && fam.Residence.trim() !== '') {
                    // 查找该家庭的建筑和住宅
                    const building = db.Building.find(b => b.BuildingID === fam.Residence);
                    if (building && building.Type === 'House') {
                        const house = db.House.find(h => h.HouseID === building.RefID);
                        if (house) {
                            const dailyTax = parseFloat(house.Cost) || 0;
                            const taxAmount = (dailyTax * totalHours) / 24;
                            
                            // 从家庭财产中扣除税收
                            updateFamilyProperty(fam, -taxAmount, {
                                reason: `住宅税 (${houseTypeName})`,
                                addLog: false, // 统一在后面显示
                                familyId: fam.FamilyID
                            });
                            
                            // 增加玩家金钱
                            totalCollected += taxAmount;
                            
                            // 从HouseType表获取住宅类型名称
                            const houseTypeName = getHouseTypeName(house.StyleID) || house.HouseID;
                            
                            taxInfo.push({
                                family: fam.LastName + '家 (' + fam.FamilyID + ')',
                                house: houseTypeName + ' (' + house.HouseID + ')',
                                dailyTax: dailyTax,
                                taxAmount: taxAmount.toFixed(2),
                                remaining: fam.Property.toFixed(2)
                            });
                        }
                    }
                }
            });
            
            // 更新玩家金钱
            const playerMoneyItem = db.PlayerData.find(p => p.Item === '当前金钱');
            if (playerMoneyItem) {
                const currentMoney = parseFloat(playerMoneyItem.Value) || 0;
                playerMoneyItem.Value = (currentMoney + totalCollected).toFixed(2);
            }
            
            // 仅在showTaxLog为true时显示日志
            if (params.showTaxLog) {
                addLog(`住宅税金收取完成！收取时长: ${days}天 ${hours}小时 (共${totalHours}小时)，共收取: ${totalCollected.toFixed(2)} 金币`);
                taxInfo.forEach(info => {
                    addLog(`${info.family} - ${info.house} | 日税金: ${info.dailyTax}, 本次收取: ${info.taxAmount}, 剩余财产: ${info.remaining}`);
                });
            }
        }

        // 收取NPC的工作收入
        function collectJobIncome() {
            const hours = params.jobHours || 1;

            if (hours <= 0) {
                if (params.showJobSummary) {
                    alert('请输入有效的小时数');
                }
                return;
            }

            let totalIncome = 0;
            let totalCompanyPayment = 0;
            let incomeInfo = [];

            // 处理每个有工作的NPC
            db.NPC.forEach(npc => {
                if (npc.Job_ID && npc.Job_ID.trim() !== '' && npc.Family_ID) {
                    // 查找工作记录
                    const job = db.Job.find(j => j.JobName === npc.Job_ID);
                    if (job) {
                        const hourlyIncome = parseFloat(job.Income) || 0;
                        const npcIncome = hourlyIncome * hours;

                        // 从公司资金中扣除工资（使用通用函数）
                        const deductionResult = deductFromCompanyFunds(npc.NpcID, npcIncome, db);

                        // 统计公司支付总额
                        if (deductionResult.success) {
                            totalCompanyPayment += deductionResult.deducted;
                        }

                        // 查找家庭并将收入添加到家庭财产
                        const family = db.Family.find(f => f.FamilyID === npc.Family_ID);
                        if (family) {
                            // 更新家庭财产
                            updateFamilyProperty(family, npcIncome, {
                                reason: `工作收入 (${job.JobName})`,
                                addLog: false, // 统一在后面显示
                                familyId: family.FamilyID
                            });
                            totalIncome += npcIncome;

                            incomeInfo.push({
                                npc: npc.LastName + npc.FirstName + ' (' + npc.NpcID + ')',
                                job: job.JobName,
                                hourlyIncome: hourlyIncome,
                                hours: hours,
                                npcIncome: npcIncome.toFixed(2),
                                family: family.LastName + '家 (' + family.FamilyID + ')',
                                familyProperty: family.Property.toFixed(2),
                                company: deductionResult.company ? deductionResult.company.名称 : '无公司',
                                companyFunds: deductionResult.company ? deductionResult.company.资金.toFixed(2) : 'N/A'
                            });
                        }
                    }
                }
            });

            // 仅在showJobLog为true时显示日志
            if (params.showJobLog) {
                addLog(`NPC工作收入收取完成！工作时长: ${hours} 小时，共发放收入: ${totalIncome.toFixed(2)} 金币，公司支付: ${totalCompanyPayment.toFixed(2)} 金币`);
                incomeInfo.forEach(info => {
                    addLog(`${info.npc} - ${info.job} | 时薪: ${info.hourlyIncome}, 本次收入: ${info.npcIncome}, 家庭: ${info.family}, 家庭财产: ${info.familyProperty}, 公司: ${info.company}, 公司资金: ${info.companyFunds}`);
                });
            }
        }


        // --- 显示辅助函数 ---
        function getNpcName(npcId) {
            if (!npcId) return '';
            const npc = db.NPC.find(n => n.NpcID === npcId);
            return npc ? npc.LastName + npc.FirstName : '';
        }

        function getHouseTypeName(styleId) {
            if (!styleId) return '';
            const houseType = db.HouseType.find(ht => ht.ID === styleId);
            return houseType ? houseType.Name : '';
        }

        function getJobLogValue(npcId, jobName) {
            const log = results.jobLogs[`${npcId}_${jobName}`];
            if (!log) return '';
            // 不显示没有空缺的工作的得分
            if (!log.hasVacancy) return '';
            // 不显示不合格工作的得分
            if (!log.qualified) return '不合格';
            // 如果排名大于简历数则不显示排名
            if (log.rank > params.resumeCount) return log.score;
            return `${log.score}(${log.rank})`;
        }

        function getJobHireLogValue(npcId, jobName) {
            const log = results.jobHireLogs[`${npcId}_${jobName}`];
            if (!log) return '';
            return `${log.score}(${log.rank})`;
        }

        function isJobApplied(npcId, jobName) {
            return results.jobApplied[`${npcId}_${jobName}`] === true;
        }

        function isJobAccepted(npcId, jobName) {
            return results.jobAccepted[npcId] === jobName;
        }

        function getHouseLogValue(famId, houseId) {
            return results.houseLogs[`${famId}_${houseId}`] || '';
        }

        function getHouseAcceptLogValue(famId, houseId) {
            return results.houseAcceptLogs[`${famId}_${houseId}`] || '';
        }

        function isHouseAccepted(famId, houseId) {
            return results.houseAccepted[famId] === houseId;
        }

        // --- Excel 操作 ---
        async function handleExportExcel() {
            if (isResultTab.value) return alert('筛选结果暂不支持导出');
            if (isMapTab.value) {
                // 导出地图数据、道路数据和建筑数据
                await exportMapExcel(mapData, roadData, exportWithTimestamp.value, exportWithPath.value);
                // 同时导出Building表
                await exportExcel(db, 'Building', HEADERS, exportWithTimestamp.value, exportWithPath.value);
                return;
            }
            await exportExcel(db, currentTab.value, HEADERS, exportWithTimestamp.value, exportWithPath.value);
        }

        async function handleImportExcel(event) {
            const file = event.target.files[0];
            if (!file) return;
            
            try {
                const result = await importExcelFile(file, db, HEADERS, TABS, mapData, roadData);
                if (result.isMap) {
                    alert(`导入地图数据成功`);
                    currentTab.value = 'map';
                } else if (result.isRoad) {
                    alert(`导入路网数据成功`);
                    currentTab.value = 'map';
                } else {
                    alert(`导入 ${result.count} 条数据到 ${result.tabName} 成功`);
                    currentTab.value = result.targetTab;
                }
            } catch (err) {
                alert(err.message);
            }
            
            // 重置文件输入
            event.target.value = '';
        }

        async function handleImportAllExcel() {
            const result = await importAllExcel(db, HEADERS, mapData, roadData);
            
            if (result.cancelled) return;
            
            if (!result.success) {
                alert(result.message);
                return;
            }
            
            // 显示结果
            let message = '';
            if (result.importedTables.length > 0) {
                message += `成功导入 ${result.importedTables.length} 个表格：\n${result.importedTables.join('\n')}`;
            } else {
                message += '未找到匹配的表格文件！';
            }
            if (result.skippedFiles.length > 0) {
                message += `\n\n跳过的文件：\n${result.skippedFiles.join('\n')}`;
            }
            message += '\n\n支持的文件名：Family, FamilyGen, LastName, FirstName, NPC, NpcAbilityGen, House, Job, TerBlock, RoadBlock, Building, Company, CompanyType';
            alert(message);
        }

        async function handleExportAllExcel() {
            const count = await exportAllExcel(db, HEADERS, mapData, roadData, exportWithTimestamp.value, exportWithPath.value);
            alert(`已导出 ${count} 个表格`);
        }

        // 加载配置JSON数据
        async function handleLoadConfigJson() {
            if (!confirm('确定要从config/json目录加载配置数据吗？\n这将覆盖当前数据库中的所有配置表数据。')) {
                return;
            }

            try {
                addLog('开始加载配置JSON数据...');
                const results = await loadAllConfigJson(db);
                
                if (results.success.length > 0) {
                    addLog(`成功加载 ${results.success.length} 个配置表：`);
                    results.success.forEach(item => addLog(`  ✓ ${item}`));
                }
                
                if (results.failed.length > 0) {
                    addLog(`失败 ${results.failed.length} 个配置表：`);
                    results.failed.forEach(item => addLog(`  ✗ ${item}`));
                }
                
                addLog('配置JSON加载完成！');
                alert(`配置加载完成！\n\n成功: ${results.success.length} 个\n失败: ${results.failed.length} 个`);
            } catch (error) {
                console.error('加载配置JSON失败:', error);
                addLog(`加载配置JSON失败: ${error.message}`);
                
                let errorMessage = error.message;
                if (error.message.includes('Failed to fetch')) {
                    errorMessage += '\n\n提示：\n本地开发时需要使用本地服务器（如 VSCode 的 Live Server 扩展）。\n在 GitHub Pages 上托管时可以正常工作。\n\n或者直接使用"导入Excel"功能导入数据。';
                }
                alert(`加载配置JSON失败:\n\n${errorMessage}`);
            }
        }


        // --- 表格操作 ---
        function addRow() {
            const emptyRow = {};
            HEADERS[currentTab.value].forEach(h => {
                if (!h.key.startsWith('NpcName_')) emptyRow[h.key] = '';
            });
            
            // 为Building表自动生成BuildingID
            if (currentTab.value === 'Building') {
                const maxId = db.Building.reduce((max, b) => {
                    const idNum = parseInt((b.BuildingID + '').replace(/^B/, ''), 10) || 0;
                    return Math.max(max, idNum);
                }, 0);
                emptyRow.BuildingID = 'B' + String(maxId + 1).padStart(3, '0');
            }
            
            // 为Company表自动生成ID
            if (currentTab.value === 'Company') {
                const maxId = db.Company.reduce((max, c) => {
                    const idNum = parseInt((c.ID + '').replace(/^C/, ''), 10) || 0;
                    return Math.max(max, idNum);
                }, 0);
                emptyRow.ID = 'C' + String(maxId + 1).padStart(3, '0');
            }
            
            // 为CompanyType表自动生成ID
            if (currentTab.value === 'CompanyType') {
                const maxId = db.CompanyType.reduce((max, c) => {
                    const idNum = parseInt((c.ID + '').replace(/^CT/, ''), 10) || 0;
                    return Math.max(max, idNum);
                }, 0);
                emptyRow.ID = 'CT' + String(maxId + 1).padStart(3, '0');
            }

            // CompanyJobs表是只读的，不支持新增行
            if (currentTab.value === 'CompanyJobs') {
                alert('企业职业人员表是只读的，请通过企业表编辑职业人员字段');
                return;
            }

            db[currentTab.value].push(emptyRow);
        }

        function deleteRow(index) {
            // CompanyJobs表是只读的，不支持删除行
            if (currentTab.value === 'CompanyJobs') {
                alert('企业职业人员表是只读的，请通过企业表编辑职业人员字段');
                return;
            }
            db[currentTab.value].splice(index, 1);
        }

        // 返回所有属性和方法
        return {
            // 状态
            currentDay,
            currentTab,
            activeBottomTab,
            tabs: TABS,
            mainTabs,
            subTabs,
            hasSubTabs,
            activeMainTab,
            currentData,
            currentHeaders,
            companyJobsData,
            db,
            params,
            isResultTab,
            isMapTab,
            exportWithTimestamp,
            exportWithPath,
            
            // 日志系统
            logMessages,
            logMessagesContainer,
            addLog,
            clearLogs,
            
            // 玩家数据
            playerCityName,
            playerMoney,
            playerDate,
            playerTime,
            averageSatisfaction,
            housingDemand,
            housingDemandProgress,
            familyCount,
            
            // 地图状态
            mapData,
            roadData,
            MAP_SIZE,
            
            // 地图编辑器（从 mapEditor 解构）
            ...mapEditor,
            
            // 动作
            generateFamily,
            generateHouse,
            runJobHunt: handleRunJobHunt,
            runHouseHunt: handleRunHouseHunt,
            nextDay,
            collectHouseTax,
            collectJobIncome,
            exportExcel: handleExportExcel,
            importExcel: handleImportExcel,
            importAllExcel: handleImportAllExcel,
            exportAllExcel: handleExportAllExcel,
            loadConfigJson: handleLoadConfigJson,
            addRow,
            deleteRow,
            
            // 地图常量
            CELL_SIZE,
            
            // 显示辅助函数
            getNpcName,
            getHouseTypeName,
            getJobLogValue,
            getJobHireLogValue,
            isJobApplied,
            isJobAccepted,
            getHouseLogValue,
            getHouseAcceptLogValue,
            isHouseAccepted,
            
            // 金钱管理
            infiniteMoney,
            getPlayerMoney,
            setPlayerMoney,
            deductPlayerMoney,
            canAfford
        };
    }
}).mount('#app');
