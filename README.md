# Binance Demo _(binance-demo)_

[![node](https://img.shields.io/node/v/pnpm)](https://nodejs.org/en/)
[![license](https://img.shields.io/github/license/nubrid/binance-demo)](LICENSE)
[![standard-readme compliant](https://img.shields.io/badge/readme%20style-standard-brightgreen.svg?style=flat-square)](https://github.com/RichardLitt/standard-readme)

Binance Trading API Demo

Demo providing liquidity to an exchange. Place open orders and adjust accordingly when market moves

## Table of Contents

- [Security](#security)
- [Background](#background)
- [Install](#install)
- [Usage](#usage)
- [API](#api)
- [Contributing](#contributing)
- [License](#license)

## Security

We'll use WebSocket to connect to `wss://testnet.binance.vision/ws/btcusdt@kline_1m` for getting latest price, but use `https://testnet.binance.vision` for placing/cancelling `bid` & `ask` open orders. Refer to the [Spot Testnet Guide Page](https://testnet.binance.vision) or [Futures Testnet Guide Page](https://www.binance.com/en/support/faq/ab78f9a1b8824cf0a106b4229c76496d) for information on how to generate the API Key.

## Background

- Get latest price
- Place a `bid` & `ask` open order with `$100` difference from latest price
- Cancel order when `bid`/`ask` can be filled. Place a new set of order
- Use either symbol `btcusdt` or `btcbusd`
- Use `websocket` via `testnet` to subscribe to latest price
- Use `rest api` via `testnet` to open/cancel orders

## Install

```bash
git clone https://github.com/nubrid/binance-demo.git
cd binance-demo
pnpm i # npm install
node . -h
```

## Usage

### CLI

```bash
# TODO: npx @nubrid/binance-demo -- --args1 value1 --argsN

node . -h
node . -s BTCBUSD -spread 200 --key XXXX --secret XXXX # BTCBUSD Spot trading via Testnet
```

## API

- Get latest price - `wss://testnet.binance.vision/ws/btcusdt@kline_1m`
- Place/cancel `bid` & `ask` - `https://testnet.binance.vision`

## Contributing

See [the contributing file](CONTRIBUTING.md)!

PRs accepted.

Small note: If editing the Readme, please conform to the [standard-readme](https://github.com/RichardLitt/standard-readme) specification.

## License

[MIT © Randell Rivera.](LICENSE)
