const path = require('path')
require('dotenv').config({
    path: path.resolve(__dirname, './.env')
})
const noti_bot = require('noti_bot')
const notifyTelegram = noti_bot.telegram
const notifySlack = noti_bot.slack

const { ethers } = require('ethers');
const { abi: IUniswapV3PoolABI } = require('@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json');
const { abi: INonfungiblePositionManagerABI } = require('@uniswap/v3-periphery/artifacts/contracts/NonfungiblePositionManager.sol/NonfungiblePositionManager.json');

const RPC_ENDPOINT = "https://bsc-dataseed1.binance.org"
const positionId = 1925550
const poolAddress = "0x5968FEACbA91D55010975E0CFe8ACfc32664ad33"
const POSITION_MANAGER_ADDRESS = "0x46A15B0b27311cedF172AB29E4f4766fbE7F4364"



const main = async () => {
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
                     currentTick <= position.tickUpper;

    console.log(`Position ${positionId} is ${isInRange ? 'IN RANGE' : 'OUT OF RANGE'}`);
    console.log('Current tick:', currentTick);
    console.log('Lower tick:', position.tickLower.toString());
    console.log('Upper tick:', position.tickUpper.toString());

    if (!isInRange) {
        notifyTelegram(`Position ${positionId} is out of range`, process.env.TELEGRAM_TOKEN, process.env.TELEGRAM_CHAT)
        notifySlack(`Position ${positionId} is out of range`, process.env.SLACK_HOOK_KEY, process.env.SLACK_CHANNEL, process.env.SLACK_BOTNAME, process.env.SLACK_ICON)
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });