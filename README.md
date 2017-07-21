# Crypto Profit Tracker

Consolidate the data taken from Bittrex account through API Key, show current portfolio with the margin (gain / loss percentage).

## Database

There will be two tables: **portfolio** and **metadata**

#### Portfolio
| coin | amount | buy_rate |
| :--: | -----: | -------: |
| ANS | 23.115 | 0.00341223 |
| BTC | 0.425 | 1 |
| ETH | 10.523 | 0.13341578 |

#### Metadata
| meta | value |
| :--: | -----: |
| api_key | *bittrex api key* |
| secret_key | *bittrex secret key* |
| last_sync | *unix long time* |
| last_tx_uuid | *tx id from bittrex* |

## Mockup

![Crypto Tracker Mock](images/mock.png)

Created using [creately.com](https://creately.com/)

## TODO Checklist

[x] Connect and get all transactions from Bittrex through the API.

[x] Consolidate the transactions data based on Deposit, Withdrawal, and Order History

[ ] Design a database structure to keep the portfolio and the last transaction sync'd. (Currently it's fetching all transactions and recalculating every time)

[ ] Sort by field

[x] Display all assets and the buy rate of it.

[ ] CSS effect for more intuitive UX.
