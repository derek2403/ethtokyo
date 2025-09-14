from web3 import Web3
from web3.gas_strategies.time_based import medium_gas_price_strategy
from web3.gas_strategies.rpc import rpc_gas_price_strategy

w3 = Web3(Web3.HTTPProvider("http://gensyn-testnet.g.alchemy.com/public"))
w3.eth.set_gas_price_strategy(rpc_gas_price_strategy)
w3.eth.generate_gas_price()
