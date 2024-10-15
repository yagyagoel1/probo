


import { Router } from "express";
import { buyStock, createSymbol, createUser, getInrBalances, getOrderBook, getStockBalances, getStockSymbolOrders, getUserInrBalance, mintTrade, onrampInr, resetAll, sellStock } from "../controller";

export const router :ReturnType<typeof Router> = Router();

router.route("/user/create/:userId").post(createUser)
router.route("/symbol/create/:stockSymbol").post(createSymbol)
router.route("/orderbook").get(getOrderBook)//doubt

router.route("/balances/inr").get(getInrBalances)
router.route("/balances/stock").get(getStockBalances)
router.route("/reset").post(resetAll)



router.route("/balace/inr/:userId").get(getUserInrBalance)
router.route("/onramp/inr").post(onrampInr)
router.route("/order/buy").post(buyStock)
router.route("/order/sell").post(sellStock)
router.route("/orderbook/:stockSymbol").get(getStockSymbolOrders)
router.route("/trade/mint").post(mintTrade)