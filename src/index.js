import axios from 'axios'
import crypto from 'crypto'
import dotenv from 'dotenv'
import qs from 'qs'
import WebSocket from 'ws'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

dotenv.config()

const _argv = yargs(hideBin(process.argv))
  .usage('Usage: node . [options]')
  .example([
    ['node .', 'BTCUSDT Spot trading via Testnet'],
    ['node . -s BTCBUSD -f', 'BTCBUSD Futures trading via Testnet'],
    ['node . --api https://testnet.binance.vision --wss wss://stream.binance.com:9443', 'Get latest price from Production, but place bid/ask open order from Testnet']
  ])
  .options({
    key: {
      alias: 'api-key',
      describe: 'Binance Spot/Futures API Key'
    },
    secret: {
      alias: 'api-secret',
      describe: 'Binance Spot/Futures Secret Key'
    },
    f: {
      alias: 'trade-futures',
      describe: 'Trade futures. default: "spot"',
      nargs: 0
    },
    m: {
      alias: 'use-mainnet',
      describe: 'Use mainnet. default: "testnet"',
      nargs: 0
    },
    s: {
      alias: 'symbol',
      choices: ['BTCUSDT', 'BTCBUSD'],
      default: 'BTCUSDT',
      nargs: 1
    },
    spread: {
      describe: 'Price difference from last price',
      default: 100,
      nargs: 1
    },
    api: {
      alias: 'url-api',
      describe: 'Binance Spot/Futures REST API URL',
      nargs: 1
    },
    wss: {
      alias: 'url-wss',
      describe: 'Binance Spot/Futures WebSocket URL',
      nargs: 1
    }
  })
  .boolean(['f', 'm'])
  .number(['spread'])
  .check(argv => {
    if (isNaN(argv.spread) || argv.spread < 1) { throw new Error('Spread must be greater than 1') }
    if (argv.f && !argv.key && !process.env.FUTURES_API_KEY) { throw new Error('Missing `--apikey` argument or specify `FUTURES_API_KEY` in a `.env` file.') }
    if (argv.f && !argv.secret && !process.env.FUTURES_API_SECRET) { throw new Error('Missing `--apisecret` argument or specify `FUTURES_API_SECRET` in a `.env` file.') }
    if (!argv.f && !argv.key && !process.env.SPOT_API_KEY) { throw new Error('Missing `--apikey` argument or specify `SPOT_API_KEY` in a `.env` file.') }
    if (!argv.f && !argv.secret && !process.env.SPOT_API_SECRET) { throw new Error('Missing `--apisecret` argument or specify `SPOT_API_SECRET` in a `.env` file.') }

    return true
  })
  .conflicts('m', ['url-api', 'url-wss'])
  .help('h')
  .alias('h', 'help')
  .epilog('Copyright 2022')
  .argv

const isMainnet = _argv.m
const isFuturesTrading = _argv.f

const ENDPOINT_BATCH_ORDERS = '/fapi/v1/batchOrders'
const ENDPOINT_ORDERS = '/api/v3/order'
const API_KEY = _argv.key ||
  (
    isFuturesTrading
    ? process.env.FUTURES_API_KEY
    : process.env.SPOT_API_KEY
  )
const API_SECRET = _argv.secret ||
  (
    isFuturesTrading
    ? process.env.FUTURES_API_SECRET
    : process.env.SPOT_API_SECRET
  )
const SPREAD = _argv.spread
const SYMBOL = _argv.s
const URL_API = _argv.api ||
  (
    isMainnet
      ? isFuturesTrading
        ? 'https://fapi.binance.com' // rest api mainnet futures
        : 'https://api.binance.com' // rest api mainnet spot
      : isFuturesTrading
        ? 'https://testnet.binancefuture.com' // rest api testnet futures
        : 'https://testnet.binance.vision' // rest api testnet spot
  )
const URL_WEBSOCKET = _argv.wss ||
  (
    isMainnet
      ? isFuturesTrading
        ? 'wss://fstream.binance.com' // websocket mainnet futures
        : 'wss://stream.binance.com:9443' // websocket mainnet spot
      : isFuturesTrading
        ? 'wss://stream.binancefuture.com' // websocket testnet futures
        : 'wss://testnet.binance.vision' // websocket testnet spot
  )

console.log(`%s %s trading
Getting latest price from %s
Place bid/ask open order from %s`, SYMBOL, isFuturesTrading ? 'Futures' : 'Spot', URL_WEBSOCKET, URL_API)

// NOTE: https://developers.binance.com/docs/binance-trading-api/futures#signed-trade-and-user_data-endpoint-security
function generateHmacSha256Signature (combinedQueryStringRequestBodyParams, secretKey) {
  return crypto.createHmac('sha256', secretKey).update(combinedQueryStringRequestBodyParams).digest('hex')
}

async function runBinanceApiRequest (method, endpoint, params) {
  const paramsQueryString = qs.stringify(params)
  const signature = generateHmacSha256Signature(paramsQueryString, API_SECRET)
  const axiosRequestConfig = {
    method,
    url: `${URL_API}${endpoint}?${paramsQueryString}&signature=${signature}`,
    headers: {
      'X-MBX-APIKEY': API_KEY
      // NOTE: https://developers.binance.com/docs/binance-trading-api/futures#general-information-on-endpoints
      // ...method !== 'GET' && { 'Content-Type': 'application/x-www-form-urlencoded' }
    }
  }

  try {
    const response = await axios(axiosRequestConfig)
    return response.data
  } catch (err) {
    return err.response.data
  }
}

function generateOpenOrderParams (symbol, side, price, encloseNumeric) {
  return {
    symbol,
    side,
    type: 'LIMIT',
    quantity: encloseNumeric ? '0.001' : 0.001,
    price: encloseNumeric ? price + '' : price,
    timeInForce: 'GTC'
  }
}

async function openBatchOrders (symbol, currentMarketPrice, spread) {
  return isFuturesTrading
    ? runBinanceApiRequest('POST', ENDPOINT_BATCH_ORDERS, {
      batchOrders: JSON.stringify([
        generateOpenOrderParams(symbol, 'BUY', currentMarketPrice - spread, true),
        generateOpenOrderParams(symbol, 'SELL', currentMarketPrice + spread, true)
      ]),
      recvWindow: 5000,
      timestamp: Date.now()
    })
    // NOTE: Since there's no batch order API in Spot trading, open bid/ask orders separately
    : [
        await runBinanceApiRequest('POST', ENDPOINT_ORDERS, {
          ...generateOpenOrderParams(symbol, 'BUY', currentMarketPrice - spread, true),
          recvWindow: 5000,
          timestamp: Date.now()
        }),
        await runBinanceApiRequest('POST', ENDPOINT_ORDERS, {
          ...generateOpenOrderParams(symbol, 'SELL', currentMarketPrice + spread, true),
          recvWindow: 5000,
          timestamp: Date.now()
        })
      ]
}

async function closeBatchOrders (symbol, batchOrders) {
  return isFuturesTrading
    ? runBinanceApiRequest('DELETE', ENDPOINT_BATCH_ORDERS, {
      symbol,
      origClientOrderIdList: JSON.stringify(batchOrders.map(order => order.clientOrderId)),
      recvWindow: 5000,
      timestamp: Date.now()
    })
    // NOTE: Since there's no batch order API in Spot trading, close bid/ask orders separately
    : [
        await runBinanceApiRequest('DELETE', ENDPOINT_ORDERS, {
          symbol,
          origClientOrderId: batchOrders[0].clientOrderId,
          recvWindow: 5000,
          timestamp: Date.now()
        }),
        await runBinanceApiRequest('DELETE', ENDPOINT_ORDERS, {
          symbol,
          origClientOrderId: batchOrders[1].clientOrderId,
          recvWindow: 5000,
          timestamp: Date.now()
        })
      ]
}

const ws = new WebSocket(`${URL_WEBSOCKET}/ws/${SYMBOL.toLowerCase()}@kline_1m`)

let lastPrice, lastStatus, openedBatchOrders, isProcessingBatchOrders

ws.on('message', async function message (data) {
  // { o: openPrice, c: closePrice, h: highPrice, l: lowPrice }
  const { c: closePrice } = JSON.parse(data)?.k
  const isBidOrderFilled = closePrice <= lastPrice - SPREAD
  const isAskOrderFilled = closePrice >= lastPrice + SPREAD

  lastStatus = '--'

  if (!isProcessingBatchOrders && (!openedBatchOrders || isBidOrderFilled || isAskOrderFilled)) {
    // NOTE: Prevent concurrent batch orders given that each WebSocket event can run concurrently
    isProcessingBatchOrders = true

    lastPrice = ~~closePrice

    if (isBidOrderFilled) lastStatus = 'Bid order can be filled, cancelling & creating new bid/ask order'
    else if (isAskOrderFilled) lastStatus = 'Ask order can be filled, cancelling & creating new bid/ask order'

    if (openedBatchOrders) {
      // TODO: Revisit. Sometimes, both bid & ask aren't filled so we have to close both
      await closeBatchOrders(SYMBOL, openedBatchOrders)
      // NOTE: To prevent `Unknown order sent` error, close order if not filled
      // await closeBatchOrders(SYMBOL, openedBatchOrders.filter(batchOrder => {
      //   const isBidBatchOrder = batchOrder.side === 'BUY'
      //   const isAskBatchOrder = batchOrder.side === 'SELL'
      //   const isOpenedBidOrderFilled = isBidOrderFilled && isBidBatchOrder
      //   const isOpenedAskOrderFilled = isAskOrderFilled && isAskBatchOrder

      //   return !isOpenedBidOrderFilled && !isOpenedAskOrderFilled
      // }))
    }

    openedBatchOrders = await openBatchOrders(SYMBOL, lastPrice, SPREAD)

    isProcessingBatchOrders = false
  }

  const bidOrderPrice = +lastPrice - SPREAD
  const askOrderPrice = +lastPrice + SPREAD

  // TODO: Revisit console.clear()
  console.log(`
  Last status: %s
  Last price: %s
  Bid: %s
  Ask: %s
  Close price: %s`, lastStatus, lastPrice, bidOrderPrice, askOrderPrice, closePrice)
})
