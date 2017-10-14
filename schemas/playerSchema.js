const playerSchema = {
    "inventory": {
        1: {
            "name": "sword",
            "slot": "weapon",
            "damage": "d4",
            "value": 10
        },
        2: {
            "name": "dagger",
            "slot": "weapon",
            "damage": "d4",
            "value": 20
        }
    },
    "pets": {},
    "equipment": {
        "head": 0,
        "chest": 0,
        "legs": 0,
        "hands": 0,
        "accessory": 0,
        "weapon": 0
    },
    "stats": {
        "health": 100,
        "experience": 0,
        "level": 0
    }
};

module.exports = playerSchema;