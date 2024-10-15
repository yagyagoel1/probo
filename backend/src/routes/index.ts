


import { Router } from "express";
import { createSymbol, createUser, getInrBalances, getOrderBook, getStockBalances, getUserInrBalance, onrampInr, resetAll } from "../controller";

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