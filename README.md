# Binance Demo _(binance-demo)_

![node](https://img.shields.io/node/v/18.10.0)
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

We'll use WebSockets to connect to `wss://stream.binance.com:9443/ws/btcusdt@kline_1m` for getting latest price, but use `wss://testnet.binance.vision/ws/` for placing/cancelling `bid` & `ask` open orders. Refer to the [Spot Testnet Page](https://testnet.binance.vision/) for information on how to generate the API Key.

## Background

- Get latest price
- Place a `bid` & `ask` open order with `$100` difference from latest price
- Cancel order when `bid`/`ask` can be filled. Place a new set of order
- Use either symbol `btcusdt` or `btcbusd`
- Use `websockets` to subscribe to latest price
- Use `rest api` to cancel orders
- Use `testnet` to open orders

## Install

```bash
# TODO:
```

## Usage

```bash
# TODO: npx binance-demo -- --args1 value1 --argsN
```

## API

- Get latest price - `wss://stream.binance.com:9443/ws/btcusdt@kline_1m`
- Place/cancel `bid` & `ask` - `wss://testnet.binance.vision/ws/`

## Contributing

See [the contributing file](CONTRIBUTING.md)!

PRs accepted.

Small note: If editing the Readme, please conform to the [standard-readme](https://github.com/RichardLitt/standard-readme) specification.

## License

[MIT © Randell Rivera.](LICENSE)
