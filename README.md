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
| last_tx_id | *tx id from bittrex* |

## Mockup

![Crypto Tracker Mock](images/mock.png)

Created using [creately.com](https://creately.com/)

## TODO Checklist

[ ] Connect and get all transactions from Bittrex through the API.

[ ] Design a database structure to keep the portfolio and the last transaction sync'd.

[ ] Consolidate the transactions data, and display all assets.
