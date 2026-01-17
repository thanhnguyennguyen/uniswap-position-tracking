const path = require('path')
require('dotenv').config({
    path: path.resolve(__dirname, './.env')
})
const noti_bot = require('noti_bot')
const notifyTelegram = noti_bot.telegram

const { ethers } = require('ethers');
const CLAMM_ABI = require('./abi/pancake_infinity_clamm_manager.json')
const INonfungiblePositionManagerABI = require('./abi/pancake_infinity_clamm_position_manager.json');

const RPC_ENDPOINT = "https://bsc-dataseed1.binance.org"
const positionId = process.env.POSITION
const poolAddress = process.env.POOL
const POSITION_MANAGER_ADDRESS = "0x55f4c8abA71A1e923edC303eb4fEfF14608cC226"
const POOL_MANAGER_ADDRESS = '0xa0FfB9c1CE1Fe56963B0321B32E7A0302114058b'
const checkPosition = async () => {
    try {
        // Connect to provider
        const provider = new ethers.providers.JsonRpcProvider(RPC_ENDPOINT);
        
        // Create contract instances
        const positionManager = new ethers.Contract(
            POSITION_MANAGER_ADDRESS,
            INonfungiblePositionManagerABI,
            provider
        );

        // Get position details
        const position = await positionManager.positions(positionId);

        // Create pool contract instance
        const poolContract = new ethers.Contract(
            POOL_MANAGER_ADDRESS,
            CLAMM_ABI,
            provider
        );

        // Get current tick from slot0
        const slot0 = await poolContract.getSlot0(poolAddress);
        const currentTick = slot0.tick;

        // Check if position is in range
        const isInRange = currentTick >= position.tickLower && 
                         currentTick < position.tickUpper;

        console.log(`Position ${positionId} is ${isInRange ? 'IN RANGE' : 'OUT OF RANGE'}`);
        console.log('Current tick:', currentTick);
        console.log('Lower tick:', position.tickLower.toString());
        console.log('Upper tick:', position.tickUpper.toString());

        if (!isInRange) {
            notifyTelegram(`Position https://pancakeswap.finance/liquidity/${positionId}?chain=bsc is out of range ${currentTick < position.tickUpper ? 'break Upper Range ' : 'break Lower Range'}  currentTick: ${currentTick}`, process.env.TELEGRAM_TOKEN, process.env.TELEGRAM_CHAT)
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
