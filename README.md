# Crypto Profit Tracker

Averaging up / down during trading can sometimes be troublesome as you want to find out the final rate that you get after all the transactions. Instead of using excel and have your time wasted, this app takes all your Bittrex transactions and help you calculate the final rate and display your portfolio with needed information.

## Preview (Alpha State)

![Crypto Tracker Mock](images/preview.png)

## Usage

Download binary source or if you are a developer:

    npm install -g electron
    electron .

Input your API Key and Secret in the setting page, and submit (ONLY USE API w/ READ INFO PERMISSION, FURTHER PERMISSIONS ARE UNNECESSARY)

On later version, electron should be installed as non-devDependencies and just add run script. Maybe add binary release using ```electron-package```

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

[x] Display all assets and the average buy rate of it.

[x] Fix bug where updated ticker will mess the order of the odd and non-odd <td>

[x] Update UI to match initial mock, show last sync time and sync button on the bottom of the window.

[ ] Design a database structure to keep the portfolio and the last transaction sync'd. (Currently it's fetching all transactions and recalculating every time)

[ ] Sort by field.

[x] Show loading animation if data is being fetched.

[x] Effect for Sidebar Buttons Hover.
