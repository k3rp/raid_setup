function groupPlayersByName(raidSetup) {
    const playersByGroup = {};
    for (let row = 0; row < raidSetup.length; row++) {
        const [name, className, role] = raidSetup[row];
        playersByGroup[name] = { className, role };
    }
    return playersByGroup;
}

function debugPrintSetup(raidList) {
    for (let i = 0; i < 4; i++) {
        const groupA = "Group " + (2 * i + 1);
        const groupB = "Group " + (2 * i + 2);
        console.log(groupA + " ".repeat(16 - groupA.length) + groupB);
        console.log(raidList[i * 10] + " ".repeat(16 - raidList[i * 10].length) + raidList[i * 10 + 5]);
        console.log(raidList[i * 10 + 1] + " ".repeat(16 - raidList[i * 10 + 1].length) + raidList[i * 10 + 6]);
        console.log(raidList[i * 10 + 2] + " ".repeat(16 - raidList[i * 10 + 2].length) + raidList[i * 10 + 7]);
        console.log(raidList[i * 10 + 3] + " ".repeat(16 - raidList[i * 10 + 3].length) + raidList[i * 10 + 8]);
        console.log(raidList[i * 10 + 4] + " ".repeat(16 - raidList[i * 10 + 4].length) + raidList[i * 10 + 9]);
        console.log('');
    }
}

// This could return null if no fit.
function findBestFitPlayer(playersGroupedByName, acceptedClasses, priorityList, role, inversePriorityList) {
    // First look in priority list.
    for (let i = 0; i < priorityList.length; i++) {
        const prioName = priorityList[i];
        for (const name in playersGroupedByName) {
            if (!acceptedClasses.includes(playersGroupedByName[name].className)) continue;

            if (name == prioName) {
                priorityList.splice(i, 1);
                delete playersGroupedByName[name];
                return name;
            }
        }
    }

    // Second try to find the best fit based on role.
    for (const name in playersGroupedByName) {
        if (!acceptedClasses.includes(playersGroupedByName[name].className)) continue;
        if (playersGroupedByName[name].role == role) {
            delete playersGroupedByName[name];
            return name;
        }
    }

    // Third, try to find in reverse priority list.
    for (let i = inversePriorityList.length - 1; i >= 0; i--) {
        const name = inversePriorityList[i];
        if (!name in playersGroupedByName) continue;
        if (!acceptedClasses.includes(playersGroupedByName[name].className)) continue;

        inversePriorityList.splice(i, 1);
        delete playersGroupedByName[name];
        return name;
    }

    // Lastly, try to find any player in the acceptedClasses.
    for (const name in playersGroupedByName) {
        if (!acceptedClasses.includes(playersGroupedByName[name].className)) continue;

        delete playersGroupedByName[name];
        return name;
    }
}

function populateTankGroups(
    numTanks, groups, playersGroupedByName, tankPriority, meleeDpsPriority, improvedDevotionAuraPriority, improvedImpPriority) {
    for (let i = 0; i < numTanks; i++) {
        const tank = findBestFitPlayer(
            playersGroupedByName, ['Warrior', 'Druid', 'Paladin'], tankPriority, 'Tank', meleeDpsPriority);
        if (numTanks > 3) {
            const snakeIdx = Math.ceil(i / 2) % 2;
            groups[snakeIdx + 1].push(tank);
        } else {
            groups[1].push(tank);
        }
    }

    numGroups = numTanks > 3 ? 2 : 1;
    for (let i = 1; i <= numGroups; i++) {
        const devotionAuraPaladin = findBestFitPlayer(
            playersGroupedByName, ['Paladin'], improvedDevotionAuraPriority, null, []);
        groups[i].push(devotionAuraPaladin);
        const improvedImpWarlock = findBestFitPlayer(
            playersGroupedByName, ['Warlock'], improvedImpPriority, null, []);
        groups[i].push(improvedImpWarlock);
    }
}

function populatePrayerOfHealing(groups, playersGroupedByName) {
    // try to not put priests in tank groups
    for (let i = 8; i >= 1; i--) {
        // don't add healer if group is full, hello?!
        if (groups[i].length == 5) continue;
        // todo consider prio deep holy spec
        const someHealer = findBestFitPlayer(playersGroupedByName, ['Priest'], [], 'Healer', []);
        console.log("some healer", someHealer);
        if (!someHealer) break;
        groups[i].push(someHealer);
    }
}

function populateMeleeDpsGroups(groups, playersGroupedByName, meleeDpsPriority, rangedDpsPriority) {
    // Populate hunters and warriors first, one in each group for trueshot aura and battle shout. 
    // Does every hunter have trueshot aura?
    for (let i = 3; i <= 4; i++) {
        const hunter = findBestFitPlayer(playersGroupedByName, ['Hunter'], rangedDpsPriority, null, []);
        groups[i].push(hunter);
        const warrior = findBestFitPlayer(playersGroupedByName, ['Warrior'], meleeDpsPriority, null, []);
        groups[i].push(warrior);
    }

    // Populate the remaining 3 spots in each group based on priority. Fallback to random warrior/rogue.
    for (let i = 0; i < 6; i++) {
        const meleeDps = findBestFitPlayer(playersGroupedByName, ['Warrior', 'Rogue'], meleeDpsPriority, null, []);
        const snakeIdx = Math.ceil(i / 2) % 2;
        groups[snakeIdx + 3].push(meleeDps);
    }
}

function populateCasterGroups(groups, playersGroupedByName, rangedDpsPriority) {
    // Start by trying to put one paladin in each group.
    for (let i = 8; i >= 5; i--) {
        const paladin = findBestFitPlayer(playersGroupedByName, ['Paladin'], [], 'Healer', []);
        groups[i].push(paladin);
    }

    // Try to add two warlocks and two mages each to group 5-6.
    // Fill healers to 7/8;
    for (let i = 0; i < 8; i++) {
        const snakeIdx = Math.ceil(i / 2) % 2;
        if (i % 4 < 2) {
            const mage = findBestFitPlayer(playersGroupedByName, ['Mage'], rangedDpsPriority, 'DPS', []);
            groups[snakeIdx + 5].push(mage);
        } else {
            const warlock = findBestFitPlayer(playersGroupedByName, ['Warlock'], rangedDpsPriority, 'DPS', []);
            groups[snakeIdx + 5].push(warlock);
        }
        const healer = findBestFitPlayer(playersGroupedByName, ['Priest', 'Druid', 'Paladin'], rangedDpsPriority, 'Healer', []);
        groups[snakeIdx + 7].push(healer);
    }
}

function fillRemainingOpenSlots(groups, playersGroupedByName) {
    const preferredGroupsByClass = {
        'Druid': [8, 7, 6, 5, 4, 3, 2, 1],
        'Hunter': [4, 3, 2, 1, 5, 6, 7, 8],
        'Mage': [5, 6, 7, 8, 2, 1, 3, 4],
        'Paladin': [2, 8, 7, 6, 5, 4, 3, 1],
        'Priest': [8, 7, 6, 5, 2, 1, 3, 4],
        'Rogue': [4, 3, 2, 7, 8, 1, 5, 6],
        'Warlock': [5, 6, 7, 8, 2, 1, 3, 4],
        'Warrior': [4, 3, 2, 1, 7, 8, 5, 6],
    };

    for (const name in playersGroupedByName) {
        const prefferedGroups = preferredGroupsByClass[playersGroupedByName[name].className];
        for (let i = 0; i < prefferedGroups.length; i++) {
            const group = prefferedGroups[i];
            if (groups[group].length < 5) {
                groups[group].push(name);
                break;
            } 
            for (let j = 0; j < groups[group].length; j++) {
                if (groups[group][j] == null) {
                    groups[group][j] = name;
                    break;
                }
            }
        }
    }
}

function createRaidSetupFromGroups(groups) {
    const raidSetup = [];

    for (let i = 1; i <= 8; i++) {
        let partySize = 0;
        for (let j = 0; j < groups[i].length; j++) {
            if (groups[i][j] != null) {
                raidSetup.push(groups[i][j]);
                partySize += 1;
            }
        }
        for (let j = 0; j < (5 - partySize); j++) {
            raidSetup.push('');
        }
    }
    return raidSetup;
}

/**
 * Computes Raid Setup for Razorgore.
 *
 * @param {range} raidSetup colums are [name, class, role].
 * @return The sorted raid setup.
 * @customfunction
 */
function computeRazorgoreSetup(
    raidSetup, tankPriority, meleeDpsPriority, rangedDpsPriority, improvedDevotionAuraPriority, improvedImpPriorty) {
    const playersGroupedByName = groupPlayersByName(raidSetup);
    const groups = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [], 8: [] };

    populateTankGroups(4, groups, playersGroupedByName, tankPriority, meleeDpsPriority, improvedDevotionAuraPriority, improvedImpPriorty);
    populateMeleeDpsGroups(groups, playersGroupedByName, meleeDpsPriority, rangedDpsPriority);
    populateCasterGroups(groups, playersGroupedByName, rangedDpsPriority);
    fillRemainingOpenSlots(groups, playersGroupedByName);

    const finalRaidSetup = createRaidSetupFromGroups(groups);
    debugPrintSetup(finalRaidSetup);
    //console.log(groups);

    return finalRaidSetup;
}

function computeVaelSetup(raidSetup, tankPrio, meleeDpsPrio, rangedDpsPrio, impDevoAuraPrio, impImpPrio) {
    const playersGroupedByName = groupPlayersByName(raidSetup);
    const groups = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [], 8: [] };

    populateTankGroups(4, groups, playersGroupedByName, tankPrio, meleeDpsPrio, rangedDpsPrio, impDevoAuraPrio, impImpPrio);
    populateMeleeDpsGroups(groups, playersGroupedByName, meleeDpsPrio, rangedDpsPrio);
    populatePrayerOfHealing(groups, playersGroupedByName);
    populateCasterGroups(groups, playersGroupedByName, rangedDpsPrio);
    fillRemainingOpenSlots(groups, playersGroupedByName);

    const finalRaidSetup = createRaidSetupFromGroups(groups);
    debugPrintSetup(finalRaidSetup);
    //console.log(groups);

    return finalRaidSetup;
}

const debugRaidSetupStrList = [
    "Inglewood	Warrior	Tank",
    "Zambonior	Warrior	Tank",
    "Gingerpojken	Paladin	Healer",
    "Idsint	Warlock	DPS",
    "Samanta	Druid	Tank",
    "Profila	Hunter	DPS",
    "Cajuz	Paladin	Healer",
    "Kolmo	Warrior	Tank",
    "Drogomir	Warrior	Tank",
    "Marm	Druid	Healer",
    "Cusman	Warrior	DPS",
    "Vessa	Hunter	DPS",
    "Mogen	Rogue	DPS",
    "Steffrik	Rogue	DPS",
    "Ylf	Warrior	DPS",
    "Outrageous	Warrior	DPS",
    "Tobhi	Hunter	DPS",
    "Furyk	Rogue	DPS",
    "Garlarock	Rogue	DPS",
    "Nievo	Warrior	DPS",
    "Kerpz	Mage	DPS",
    "Gagrim	Mage	DPS",
    "Tristam	Mage	DPS",
    "Fancybottom	Mage	DPS",
    "Churros	Mage	DPS",
    "Cewe	Warlock	DPS",
    "Analius	Warlock	DPS",
    "Winze	Warlock	DPS",
    "Caarma	Warlock	DPS",
    "Shortylock	Warlock	DPS",
    "Kungasser	Priest	Healer",
    "Styret	Priest	Healer",
    "Emodan	Priest	Healer",
    "Bysen	Priest	Healer",
    "Kragmane	Priest	Healer",
    "Criona	Paladin	Healer",
    "Uum	Paladin	Healer",
    "Mo	Paladin	Healer",
    "Pickard	Paladin	Healer",
    "Daddyyyankie	Druid	Healer"
];

const debugRaidSetup = debugRaidSetupStrList.map(line => line.split('\t'));

const debugTankPrio = ["Zambonior", "Inglewood", "Samanta", "Kolmo", "Cusman", "Drogomir"];
const debugMeleeDpsPriority = ["Ylf", "Nievo", "Furyk", "Mogen", "Steffrik", "Garlarock", "Cusman", "Kolmo"];
const debugRangedDpsPriority = ["Kerpz", "Cewe", "Vessa", "Analius", "Tristam", "Tobhi"];
const debugImpDevotionAura = ["Uum", "Gingerpojken"];
const debugImpImp = ["Idsint", "Shortylock"];

//computeRazorgoreSetup(debugRaidSetup, debugTankPrio, debugMeleeDpsPriority, debugRangedDpsPriority, debugImpDevotionAura, debugImpImp);
computeVaelSetup(debugRaidSetup, debugTankPrio, debugMeleeDpsPriority, debugRangedDpsPriority, debugImpDevotionAura, debugImpImp);
