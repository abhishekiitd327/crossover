"use strict";
const redis = require("redis");
const util = require("util");
const KEY = `account1/balance`;
const DEFAULT_BALANCE = 100;

// Initialize Redis client outside the function handler scope
let redisClient;

async function getRedisClient() {
    return new Promise((resolve, reject) => {
        if (redisClient) {
            console.log('Reusing Redis client');
            resolve(redisClient);
        } else {
            try {
                const newClient = new redis.RedisClient({
                    host: process.env.ENDPOINT,
                    port: parseInt(process.env.PORT || "6379"),
                });
                newClient.on("ready", () => {
                    console.log('Redis client ready');
                    redisClient = newClient;
                    resolve(newClient);
                });
            } catch (error) {
                reject(error);
            }
        }
    });
}

exports.chargeRequestRedis = async function (input) {
    const redisClient = await getRedisClient();
    var remainingBalance = await getBalanceRedis(redisClient, KEY);
    var charges = getCharges();
    const isAuthorized = authorizeRequest(remainingBalance, charges);
    if (!isAuthorized) {
        return {
            remainingBalance,
            isAuthorized,
            charges: 0,
        };
    }
    remainingBalance = await chargeRedis(redisClient, KEY, charges);
    return {
        remainingBalance,
        charges,
        isAuthorized,
    };
};

function getCharges() {
    return DEFAULT_BALANCE / 20;
}

async function getBalanceRedis(redisClient, key) {
    const res = await util.promisify(redisClient.get).bind(redisClient).call(redisClient, key);
    return parseInt(res || "0");
}

async function chargeRedis(redisClient, key, charges) {
    return util.promisify(redisClient.decrby).bind(redisClient).call(redisClient, key, charges);
}

function authorizeRequest(remainingBalance, charges) {
    return remainingBalance >= charges;
}
