const Discord = require('discord.io');
const logger = require('winston');
const auth = require('./auth.json');
const fs = require("fs");
const pluralize = require('pluralize');
const table = require('text-table');
const ordinal = require('ordinal');

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
let players = JSON.parse(fs.readFileSync("./tracker.json", "utf8"));

// Time vars
const startTime = new Date(); // Server start time
const spawnTime = new Date();

spawnTime.setMinutes(startTime.getMinutes() + 2); // 2 minutes after server launch

const gameChannelID = '366308327237615617';

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
    const initialData = {
        "inventory": {
            1: {
                "name": "sword",
                "slot": "hands",
                "value": 10
            },
            2: {
                "name": "dagger",
                "slot": "hands",
                "value": 20
            }
        },
        "pets": {},
        "equipment": {
            "head": 0,
            "chest": 0,
            "legs": 0,
            "hands": 1,
            "accessory": 0
        },
        "stats": {
            "health": 100,
            "experience": 0,
            "level": 0
        }
    };

    if (!players[userID]) 
        players[userID] = initialData;

    updateJSON();
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

const showInfo = (channelID, userID, itemID) => {
    if (isNaN(itemID))
        sendMessage(`Undefined item slot.`);
    else
    {
        const item = players[userID].inventory[itemID];
        if (item) {
            const {
                name,
                slot,
                value,
            } = item;

            const t = table([
                [ 'Name:', name ],
                [ 'Slot:', slot ],
                [ 'Value:', value +' gold' ]
            ]);

            sendMessage(`<@!${userID}>\nYour ${ordinal(itemID)} slot contains:\n` + t, channelID);            
        }
        else   
            sendMessage("You have no item in that slot!", channelID);
    }
}

const showEquipment = (channelID, userID) => {

    const items = players[userID].inventory;

    const {
        head,
        chest,
        legs,
        hands,
        accessory
    } = players[userID].equipment;

    const t = table([
        [ 'Head:', (head > 0 ? items[head].name : ` `) ],
        [ 'Chest:', (chest > 0 ? items[chest].name : ` `) ],
        [ 'Legs:', (legs > 0 ? items[legs].name : ` `) ],
        [ 'Hands:', (hands > 0 ? items[hands].name : ` `) ],
        [ 'Accessory:', (accessory > 0 ? items[accessory].name : ` `) ]
    ]);

    sendMessage(`Equipment for <@!${userID}>\n` + t, channelID);
}

const unEquipItem = (channelID, userID, equipSpot) => {

    const equipment = players[userID].equipment;

    if (isNaN(equipment[equipSpot])) return;

    const id = players[userID].equipment[equipSpot];

    if (id === 0) return;
    const old = players[userID].inventory[id];
    equipment[equipSpot] = 0;

    sendMessage(`<@!${userID}>, you have unequipped your ${old.name}`, channelID);
}

const equipItem = (channelID, userID, itemID) => {
    if (isNaN(itemID))
        sendMessage("Undefined item slot.\n`Name integration coming soon.`");

    const item = players[userID].inventory[itemID];

    if (item) {
        const {
            name,
            slot,
        } = item;

        players[userID].equipment[slot] = itemID;

        sendMessage(`<@!${userID}>, you have equipped your ${name}.\n`, channelID);            
    }
    else   
        sendMessage("<@!${userID}>, you have no item in that slot!");
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

    if (message.substring(0, 1) === '!') {
        let args = message.substring(1).split(' ');
        const cmd = args[0];
       
        args = args.splice(1);

        initializePlayer(userID);

        switch(cmd) {
            case 'stats':
                showStats(channelID, userID);
                break;
            case 'items':
            case 'inventory':
                showInventory(channelID, userID);
                break;
            case 'equipment':
            case 'equips':
                showEquipment(channelID, userID);
                break;
            case 'equip':
                equipItem(channelID, userID, parseInt(args[0]));
                break;
            case 'unequip':
                unEquipItem(channelID, userID, args[0].toLowerCase());
                break;
            case 'info':
                showInfo(channelID, userID, parseInt(args[0]));
                break;
            case 'help':
                sendMessage(`Stfu <@!${userID}>.`, channelID);
                break;
         }
     }
});