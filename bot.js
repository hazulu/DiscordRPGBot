const Discord = require('discord.io');
const logger = require('winston');
const auth = require('./auth.json');
const fs = require("fs");
const pluralize = require('pluralize');

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
});

// Load tracker
let points = JSON.parse(fs.readFileSync("./tracker.json", "utf8"));

// Time vars
const startTime = new Date(); // Server start time
const spawnTime = new Date();

spawnTime.setMinutes(startTime.getMinutes() + 2); // 2 minutes after server launch

const gameChannelID = '365929907655802882';

const offset = 1; // Notification will be sent this many minutes before the target time
let stop = false;
let spawned = false;

setInterval(() => {    
    if (!stop) {
        if (!spawned) {
            const d = new Date();

            if (d.getMinutes() < spawnTime.getMinutes() - offset) return;

            if (d.getMinutes() === spawnTime.getMinutes() - offset) {
                bot.sendMessage({
                    to: '365929907655802882',
                    message: 'An egg will appear in ' + offset + ' minute!'
                });
            } else if (d.getMinutes() === spawnTime.getMinutes()) {
                bot.sendMessage({ to: '365929907655802882', message: 'An egg has spawned!' });    
                spawned = true;    
            }
        }
    }
}, 60 * 1000); // Check every minute

bot.on('message', (user, userID, channelID, message, evt) => {
    // Our bot needs to know if it will execute a command
    // It will listen for messages that will start with `!`
    if (message.substring(0, 1) === '!') {
        let args = message.substring(1).split(' ');
        const cmd = args[0];
       
        args = args.splice(1);

        switch(cmd) {
            // !take
            case 'take':
                if (spawned) {
                    const d = new Date();
                    
                    addPoints(userID, 1);

                    const userPoints = points[userID].points;
                    const eggsMessage = `${userPoints} ${pluralize('egg', userPoints)}`;

                    bot.sendMessage({
                        to: gameChannelID,
                        message: `<@!${userID}>, you snag the egg! You now have ${eggsMessage}.`
                    });

                    spawnTime.setMinutes(d.getMinutes() + 2);  
                    spawned = false;
                } else {
                    bot.sendMessage({
                        to: gameChannelID,
                        message: 'You stare into thin air, no prize awaits you.'
                    });
                }

                break;
            case 'time':
                const d = new Date();
                const t = spawnTime.getMinutes() - d.getMinutes();

                bot.sendMessage({
                    to: gameChannelID,
                    message: `${t} minutes until spawn. It will spawn at ${spawnTime.getMinutes()} Currently at ${d.getMinutes()}`
                });

                break;
            /*case 'stop':
                stop = !stop;
                bot.sendMessage({
                    to: gameChannelID,
                    message: `stop =  ${stop}`
                });
                break;*/
            case 'eggs':
                checkPoints(userID);
                const userPoints = points[userID].points;
                const eggsMessage = `${userPoints} ${pluralize('egg', userPoints)}`;
                bot.sendMessage({
                    to: channelID,
                    message: `<@!${userID}> you have ${eggsMessage}`
                });

                break;
            case 'gain':
                addPoints(userID, 1);
                break;
         }
     }
});

const checkPoints = (userID) => {
    if (!points[userID]) {
        points[userID] = { points: 0 };
        updateJSON();
    }
};

const addPoints = (userID, amount) => {
    checkPoints(userID);
    points[userID].points += amount;
    updateJSON();
};

const updateJSON = () => {
    // Save to JSON
    fs.writeFile("./tracker.json", JSON.stringify(points), 
        (err) => {
            if (err) console.error(err);
        }
    );
};