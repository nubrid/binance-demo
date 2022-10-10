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
  .example('node .')
  .example('node . -s BTCBUSD')
  .options({
    apikey: {
      alias: 'key',
      describe: 'Binance Futures API Key'
    },
    apisecret: {
      alias: 'secret',
      describe: 'Binance Futures Secret Key'
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
    }
  })
  .boolean(['m'])
  .number(['spread'])
  .check(argv => {
    if (isNaN(argv.spread) || argv.spread < 100) throw new Error('Spread must be greater than 100')
    if (!argv.apikey && !process.env.FUTURES_API_KEY) throw new Error('Missing `--apikey` argument or specify `FUTURES_API_KEY` in a `.env` file.')
    if (!argv.apisecret && !process.env.FUTURES_API_SECRET) throw new Error('Missing `--apisecret` argument or specify `FUTURES_API_SECRET` in a `.env` file.')

    return true
  })
  .help('h')
  .alias('h', 'help')
  .epilog('Copyright 2022')
  .argv

const ENDPOINT_BATCH_ORDERS = '/fapi/v1/batchOrders'
const FUTURES_API_KEY = _argv.apikey || process.env.FUTURES_API_KEY
const FUTURES_SECRET_KEY = _argv.apisecret || process.env.FUTURES_API_SECRET
const SPREAD = _argv.spread
const SYMBOL = _argv.s
const URL_API = _argv.m ? 'https://fapi.binance.com' : 'https://testnet.binancefuture.com'
const URL_WEBSOCKETS = _argv.m ? 'wss://fstream.binance.com' : 'wss://stream.binancefuture.com'

// NOTE: https://developers.binance.com/docs/binance-trading-api/futures#signed-trade-and-user_data-endpoint-security
function generateHmacSha256Signature (combinedQueryStringRequestBodyParams, secretKey) {
  return crypto.createHmac('sha256', secretKey).update(combinedQueryStringRequestBodyParams).digest('hex')
}

async function runBinanceApiFuturesRequest (method, endpoint, params) {
  const paramsQueryString = qs.stringify(params)
  const signature = generateHmacSha256Signature(paramsQueryString, FUTURES_SECRET_KEY)
  const axiosRequestConfig = {
    method,
    url: `${URL_API}${endpoint}?${paramsQueryString}&signature=${signature}`,
    headers: {
      'X-MBX-APIKEY': FUTURES_API_KEY
      // NOTE: https://developers.binance.com/docs/binance-trading-api/futures#general-information-on-endpoints
      // ...method !== 'GET' && { 'Content-Type': 'application/x-www-form-urlencoded' }
    }
  }

  try {
    // NOTE: For debugging
    // console.log('Binance API URL: ', axiosRequestConfig.url)
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

function openBatchOrders (symbol, currentMarketPrice, spread) {
  return runBinanceApiFuturesRequest('POST', ENDPOINT_BATCH_ORDERS, {
    batchOrders: JSON.stringify([
      generateOpenOrderParams(symbol, 'BUY', currentMarketPrice - spread, true),
      generateOpenOrderParams(symbol, 'SELL', currentMarketPrice + spread, true)
    ]),
    recvWindow: 5000,
    timestamp: Date.now()
  })
}

function closeBatchOrders (symbol, batchOrders) {
  return runBinanceApiFuturesRequest('DELETE', ENDPOINT_BATCH_ORDERS, {
    symbol,
    origClientOrderIdList: JSON.stringify(batchOrders.map(order => order.clientOrderId)),
    recvWindow: 5000,
    timestamp: Date.now()
  })
}

const ws = new WebSocket(`${URL_WEBSOCKETS}/ws/${SYMBOL.toLowerCase()}@kline_1m`)

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
      // NOTE: To prevent `Unknown order sent` error, close order if not filled
      await closeBatchOrders(SYMBOL, openedBatchOrders.filter(batchOrder => {
        const isBidBatchOrder = batchOrder.side === 'BUY'
        const isAskBatchOrder = batchOrder.side === 'SELL'
        const isOpenedBidOrderFilled = isBidOrderFilled && isBidBatchOrder
        const isOpenedAskOrderFilled = isAskOrderFilled && isAskBatchOrder

        return !isOpenedBidOrderFilled && !isOpenedAskOrderFilled
      }))
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
