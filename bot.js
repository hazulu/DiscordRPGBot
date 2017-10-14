const Discord = require('discord.io');
const logger = require('winston');
const auth = require('./auth.json');
const fs = require("fs");
const pluralize = require('pluralize');
const table = require('text-table');
const ordinal = require('ordinal');
const randomInt = require('random-int');
const { playerSchema } = require('./schemas');

// Configure logger settings
logger.remove(logger.transports.Console);
logger.add(logger.transports.Console, {
    colorize: true
});
logger.level = 'debug';

// Initialize Discord Bot
let bot = new Discord.Client({
   token: auth.token,
   autorun: true
});

bot.on('ready', function () {
    logger.info('Connected');
    logger.info('Logged in as: ');
    logger.info(bot.username + ' - (' + bot.id + ')');
    sendMessage(`Server Restarted.`);
});

// Load tracker
const db = fs.readFileSync("./tracker.json", "utf8");
let players = db ? JSON.parse(db) : {};

// Time vars
const startTime = new Date(); // Server start time
const spawnTime = new Date();

spawnTime.setMinutes(startTime.getMinutes() + 2); // 2 minutes after server launch

const gameChannelID = '366308327237615617'; //bot.channels['366308327237615617'].guild_id;

const offset = 1; // Notification will be sent this many minutes before the target time
let stop = false;
let spawned = false;

const updateJSON = () => {
    fs.writeFile("./tracker.json", JSON.stringify(players), 
        (err) => {
            if (err) console.error(err);
        }
    );
};

const sendMessage = (message, channelID=gameChannelID) => bot.sendMessage({ to: channelID, message: `${message}` });

const initializePlayer = (userID) => {
    let player = players[userID];

    if (!player) 
        players[userID] = playerSchema;

    updateJSON();
}

const getItem = (userID, itemName) => {
    const player = players[userID];
    const items = player.inventory;

    for (const item in items)
        if (items[item].name === itemName)
            return item;
    
    return 0;
}

const showStats = (channelID, userID) => {
    const {
        health,
        experience,
        level
    } = players[userID].stats;

    const t = table([
        [ 'Health:', health ],
        [ 'Experience:', experience ],
        [ 'Level:', level ]
    ]);

    console.log(t);
    sendMessage(`Stats for <@!${userID}>\n` + t, channelID);
}

const showInventory = (channelID, userID) => {
    const items = players[userID].inventory;
    let itemMessage = "";

    logger.info(items);

    for(item in items) {
        itemMessage += `${item}: ${items[item].name}, `;
    };

    sendMessage(`Inventory for <@!${userID}>\n` + itemMessage, channelID);
}

const showInfo = (channelID, userID, args) => {

    if (!args[0]) {
        sendMessage(`Usage: \`!info [item slot or item name]\`.`, channelID);
        return;
    }

    let itemID = args[0];
    const isNum = !isNaN(parseInt(args[0]));
    const player = players[userID];
    const items = player.inventory;
    let itemName = "";
    let message = "";

    if (!isNum) {
        itemName = args.join(" ");
        itemID = getItem(userID, itemName);
    }

    if (!items[itemID]) {
        message = isNum ? `<@!${userID}>, you have no item in that slot.` : `<@!${userID}>, you have no item named \`${itemName}\``;
        sendMessage(message, channelID);
        return;
    }

    const item = items[itemID];
    itemName = item.name;

    let tableData = [];

    for (const attribute in item) {
        tableData.push([
            `${attribute} : `, 
            item[attribute]
        ]);
    }
    
    const itemInfo = table(tableData);
    
    sendMessage(`<@!${userID}>\nInfo for :\n` + itemInfo, channelID);
}

const showEquipment = (channelID, userID) => {
    const items = players[userID].inventory;
    const equipment = players[userID].equipment;
    let tableData = [];

    for (const equip in equipment) {
        const slotName = equip.charAt(0).toUpperCase() + equip.slice(1);
        const equipName = equipment[equip] > 0 ? items[equipment[equip]].name : ' ';

        tableData.push([
            `${slotName} : `, 
            equipName
        ]);
    }
    
    const equipmentTable = table(tableData);

    sendMessage(`Equipment for <@!${userID}>\n` + equipmentTable, channelID);
}

// TODO: new implementation
const unEquipItem = (channelID, userID, equipSpot) => {
    const equipment = players[userID].equipment;

    if (isNaN(equipment[equipSpot])) return;

    const id = players[userID].equipment[equipSpot];

    if (id === 0) return;
    const old = players[userID].inventory[id];
    equipment[equipSpot] = 0;

    sendMessage(`<@!${userID}>, you have unequipped your ${old.name}`, channelID);
}

const equipItem = (channelID, userID, args) => {

    if (!args[0]) {
        sendMessage(`Usage: \`!equip [item slot or item name]\`.`, channelID);
        return;
    }

    let itemID = args[0];    
    const isNum = !isNaN(parseInt(itemID));
    const player = players[userID];
    const items = player.inventory;
    const itemName = args.join(" ");

    if (!isNum) {
        itemID = getItem(userID, itemName);
    }

    if (!items[itemID]) {
        let message = isNum ? `<@!${userID}>, you have no item in that slot.` : `<@!${userID}>, you have no item named \`${itemName}\``;
        sendMessage(message, channelID);
        return;
    }

    const {
        name,
        slot,
    } = items[itemID];

    player.equipment[slot] = itemID;

    sendMessage(`<@!${userID}>, you have equipped your \`${name}\`.\n`, channelID);
}

const getDamage = (userID, itemID) => {
    const item = players[userID].inventory[itemID];
    const die = parseInt(item.damage.slice(1));

    return item ? randomInt(1, die) : randomInt(1, 2);
}

const testRoll = (channelID, userID) => {
    const item = players[userID].equipment.weapon;

    if (item) {
        const weapon = players[userID].inventory[item];
        const damage = getDamage(userID, players[userID].equipment.weapon);
        
        sendMessage(`You swing your ${weapon.name}! You deal ${damage} damage.`, channelID);
    } else {
        const damage = randomInt(1, 2);
        sendMessage(`You flail your arms and deal ${damage} damage!`, channelID);
    }
}

// setInterval(() => {    
//     if (!stop) {
//         if (!spawned) {
//             const d = new Date();

//             return;

//             if (d.getMinutes() < spawnTime.getMinutes() - offset) return;

//             if (d.getMinutes() === spawnTime.getMinutes() - offset) {
//                 sendMessage('An egg will appear in ' + offset + ' minute!');
//             } else if (d.getMinutes() === spawnTime.getMinutes()) {
//                 sendMessage('An egg has spawned!');    
//                 spawned = true;    
//             }
//         }
//     }
// }, 60 * 1000); // Check every minute

bot.on('message', (user, userID, channelID, message, evt) => {

    if (channelID !== gameChannelID) return;

    if (message.substring(0, 1) !== '!') return;

    let args = message.toLowerCase().substring(1).split(' ');
    const cmd = args[0];
    
    args = args.splice(1);

    initializePlayer(userID);

    const commands = {
        'stats': 'showStats',
        'items': 'showInventory',
        'inventory': 'showInventory',
        'equips': 'showEquipment',
        'equipment': 'showEquipment',
        'equip': 'equipItem',
        'unequip': 'unequipItem',
        'info': 'showInfo',
        'attack': 'testRoll'
    }

    if (cmd in commands)
        eval(`${commands[cmd]}(channelID, userID, args);`);

});