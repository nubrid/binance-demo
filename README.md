# Binance Demo _(binance-demo)_

![node](https://img.shields.io/node/v/16.17.1)
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

We'll use WebSockets to connect to `wss://stream.binancefuture.com/ws/btcusdt@kline_1m` for getting latest price, but use `https://testnet.binancefuture.com` for placing/cancelling `bid` & `ask` open orders. Refer to the [Futures Testnet Guide Page](https://www.binance.com/en/support/faq/ab78f9a1b8824cf0a106b4229c76496d) for information on how to generate the API Key.

## Background

- Get latest price
- Place a `bid` & `ask` open order with `$100` difference from latest price
- Cancel order when `bid`/`ask` can be filled. Place a new set of order
- Use either symbol `btcusdt` or `btcbusd`
- Use `websockets` via `testnet` to subscribe to latest price
- Use `rest api` via `testnet` to open/cancel orders

## Install

```bash
git clone https://github.com/nubrid/binance-demo.git
cd binance-demo
node . -h
```

## Usage

### CLI

```bash
# TODO: npx @nubrid/binance-demo -- --args1 value1 --argsN

node .
node . -s BTCBUSD -spread 200 --key XXXX --secret XXXX
```

## API

- Get latest price - `wss://stream.binancefuture.com/ws/btcusdt@kline_1m`
- Place/cancel `bid` & `ask` - `https://testnet.binancefuture.com`

## Contributing

See [the contributing file](CONTRIBUTING.md)!

PRs accepted.

Small note: If editing the Readme, please conform to the [standard-readme](https://github.com/RichardLitt/standard-readme) specification.

## License

[MIT © Randell Rivera.](LICENSE)
