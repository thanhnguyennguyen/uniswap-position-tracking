const path = require('path')
require('dotenv').config({
    path: path.resolve(__dirname, process.env.ENV_FILE ?? './.env')
})
const noti_bot = require('noti_bot')
const notifyTelegram = noti_bot.telegram

const { ethers } = require('ethers');
const { abi: IUniswapV3PoolABI } = require('@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json');
const { abi: INonfungiblePositionManagerABI } = require('@uniswap/v3-periphery/artifacts/contracts/NonfungiblePositionManager.sol/NonfungiblePositionManager.json');

const RPC_ENDPOINT = process.env.RPC ??  "https://node-eth.pinksale.com"
const positionId = process.env.POSITION
const poolAddress = process.env.POOL
const POSITION_MANAGER_ADDRESS = process.env.STATE_VIEW_CONTRACT_V3

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
            poolAddress,
            IUniswapV3PoolABI,
            provider
        );

        // Get current tick from slot0
        const slot0 = await poolContract.slot0();
        const currentTick = slot0.tick;

        // Check if position is in range
        const isInRange = currentTick >= position.tickLower && 
                         currentTick < position.tickUpper;

        console.log(`Position ${positionId} is ${isInRange ? 'IN RANGE' : 'OUT OF RANGE'}`);
        console.log('Current tick:', currentTick);
        console.log('Lower tick:', position.tickLower.toString());
        console.log('Upper tick:', position.tickUpper.toString());

        if (!isInRange) {
            notifyTelegram(`Position https://app.uniswap.org/positions/v3/${process.env.CHAIN}/${positionId} is out of range ${currentTick >=  position.tickUpper ? 'break Upper Range ' : 'break Lower Range'}  currentTick: ${currentTick}`, process.env.TELEGRAM_TOKEN, process.env.TELEGRAM_CHAT)
        }
    } catch (error) {
        console.error('Error checking position:', error);
    }
}

const main = async () => {
    console.log('Starting position monitoring...');
    // Run immediately on startup
    await checkPosition();
    
    const runOnce =
    String(process.env.RUN_ONCE || '').toLowerCase() === 'true' ||
    String(process.env.CI || '').toLowerCase() === 'true'

if (runOnce) return
    // Then run every minute
    setInterval(checkPosition, 5 * 60_000);
}

main()
    .catch((error) => {
        console.error(error);
    });
