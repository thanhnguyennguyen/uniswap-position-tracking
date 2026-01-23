const path = require('path')
require('dotenv').config({
    path: path.resolve(__dirname, './.env')
})
const noti_bot = require('noti_bot')
const notifyTelegram = noti_bot.telegram

const { ethers } = require('ethers');
const UNISWAP_V4_STATE_VIEW_ABI = require('./abi/uniswap_v4_state_view.json')
const INonfungiblePositionManagerABI = require('./abi/uniswap_v4_position_manager.json');

const RPC_ENDPOINT = "https://bsc-dataseed1.binance.org"
const positionId = process.env.POSITION
const poolAddress = process.env.POOL

const TICK_LOWER = process.env.TICK_LOWER
const TICK_UPPER = process.env.TICK_UPPER

const STATE_VIEW_ADDRESS = '0xd13Dd3D6E93f276FAfc9Db9E6BB47C1180aeE0c4'
const checkPosition = async () => {
    try {
        // Connect to provider
        const provider = new ethers.providers.JsonRpcProvider(RPC_ENDPOINT);
        

        // Create pool contract instance
        const stateViewContract = new ethers.Contract(
            STATE_VIEW_ADDRESS,
            UNISWAP_V4_STATE_VIEW_ABI,
            provider
        );

        // Get current tick from slot0
        const slot0 = await stateViewContract.getSlot0(poolAddress);
        const currentTick = slot0.tick;

        // Check if position is in range
        const breakUpper = currentTick >= TICK_UPPER
        const breakLower = currentTick < TICK_LOWER
        const isInRange = !breakUpper && !breakLower
        console.log(`Position ${positionId} is ${isInRange ? 'IN RANGE' : 'OUT OF RANGE'}`);
        console.log('Current tick:', currentTick);
        console.log('Lower tick:', TICK_LOWER);
        console.log('Upper tick:', TICK_UPPER);

        if (!isInRange) {
            notifyTelegram(`Position https://app.uniswap.org/positions/v4/bnb/${positionId}  is out of range ${ breakUpper  ? 'break Upper Range ' : 'break Lower Range'}  currentTick: ${currentTick}`, process.env.TELEGRAM_TOKEN, process.env.TELEGRAM_CHAT)
        }
    } catch (error) {
        console.error('Error checking position:', error);
    }
}

const main = async () => {
    console.log('Starting position monitoring...');
    // Run immediately on startup
    await checkPosition();
    
    // Then run every minute
    setInterval(checkPosition, 5 * 60_000);
}

main()
    .catch((error) => {
        console.error(error);
    });
