import { Request, Response } from "express";
import { INR_BALANCES, ORDERBOOK, STOCK_BALANCES } from "../utils/store";

export const createUser = async (req: Request, res: Response) => {
    const { userId } = req.params;
    //zod validation laga lo yaha
    if( INR_BALANCES[userId]) {
         res.status(400).send("User already exists");
    }
    else{
        INR_BALANCES[userId]= { locked:0,balance:0}
         res.status(201).send(`user ${userId} created`)
    }
}
// export const createSymbol = async (req: Request, res: Response) => {
//    const  {stockSymbol} = req.params;
//    //zod validation laga lo yaha
//     if( STOCK_BALANCES[stockSymbol]) {
//          res.status(400).send("Symbol already exists");
//     }
//     else{
//         STOCK_BALANCES[stockSymbol]= {"yes":{quantity:0,locked:0},"no":{quantity:0,locked:0}}
//          res.status(201).send(`Symbol ${stockSymbol} created`)
//     }
// }

export const getOrderBook = async (req: Request, res: Response) => {
    res.status(200).send({data: ORDERBOOK})
}

export const getInrBalances = async (req: Request, res: Response) => {
    res.status(200).json(INR_BALANCES)
}

export const getStockBalances = async (req: Request, res: Response) => {
    res.status(200).json(STOCK_BALANCES)
}

export const  resetAll = async (req: Request, res: Response) => {
    Object.keys(INR_BALANCES).forEach((key) => {
        delete INR_BALANCES[key];
    });
    Object.keys(STOCK_BALANCES).forEach((key) => {
        delete STOCK_BALANCES[key];
    });
    Object.keys(ORDERBOOK).forEach((key) => {
        delete ORDERBOOK[key];
    });

    res.status(200).send("All data reset")
}



export const getUserInrBalance = async (req: Request, res: Response) => {
    const {userId} = req.params;

    //zod validation laga lo yaha
    if(INR_BALANCES[userId]){
        res.status(200).json(INR_BALANCES[userId])
    }
    else{
        res.status(404).send("User not found")
    }
}
export const onrampInr = async(req:Request,res:Response)=>{
    const {userId,amount} = req.body
    if(INR_BALANCES[userId]){
        INR_BALANCES[userId].balance+=amount;
        res.status(200).send(`onramped ${userId} with amount ${amount}`);
    }else{
        res.status(400).send("user does not exist in out database")
    }
}
export const buyStock = async (req: Request, res: Response) => {
    let { userId, stockSymbol, quantity, price, stockType } = req.body;
    if (!userId || !stockSymbol || !quantity || !price || !stockType) {
         res.status(400).send("missing parameters");
         return;
    }
    if (!(stockType === "yes" || stockType === "no")) {
         res.status(400).send("invalid stock type");
         return;
        }
    if (!(typeof quantity === "number" && typeof price === "string")) {
         res.status(400).send("invalid quantity or price");
         return;

        }
    if (!(typeof userId === "string" && typeof stockSymbol === "string")) {
         res.status(400).send("invalid userId or stockSymbol");
         return;
        }
    stockSymbol = String(stockSymbol);
    if (INR_BALANCES[userId] && STOCK_BALANCES[stockSymbol]) {
        if (INR_BALANCES[userId].balance + INR_BALANCES[userId].locked >= quantity * Number(price)) {
            INR_BALANCES[userId].balance -= (quantity * Number(price)) - INR_BALANCES[userId].locked;
            INR_BALANCES[userId].locked += (quantity * Number(price)) + INR_BALANCES[userId].locked;
            if (ORDERBOOK[stockSymbol]) {
                const stock = ORDERBOOK[stockSymbol]?.[stockType as "yes" | "no"];
                if (stock) {
                    const sortedPrice = Object.keys(stock).sort((a, b) => Number(a) - Number(b));
                    if (sortedPrice.length > 0) {
                         res.status(200).send("Buy order placed and pending");
                         return
                    }
                    const toPay = [];
                    const actualQuantity = quantity;
                    for (let i = 0; i < sortedPrice.length; i++) {
                        if (Number(sortedPrice[i]) > Number(price)) {
                            break;
                        }

                        const total = stock[sortedPrice[i]].total;
                        const orders = stock[sortedPrice[i]].orders;
                        if (total > quantity) {
                            const keys: { [user: string]: number } = {};
                            Object.keys(orders).forEach((key) => {
                                if (orders[key] > quantity) {
                                    keys[key] = quantity;
                                    ORDERBOOK[stockSymbol][stockType as "yes" | "no"][sortedPrice[i]].orders[key] -= quantity;
                                    quantity = 0;
                                } else {
                                    keys[key] = orders[key];
                                    quantity -= orders[key];
                                    delete ORDERBOOK[stockSymbol][stockType as "yes" | "no"][sortedPrice[i]].orders[key];
                                }
                            });
                        } else if (total <= quantity) {
                            quantity -= total;
                            toPay.push(orders);
                            delete ORDERBOOK[stockSymbol]?.[stockType as "yes" | "no"][sortedPrice[i]];
                        }
                    }
                    for (let i = 0; i < toPay.length; i++) {
                        const keyd = Object.keys(toPay[i]);
                        for (let j = 0; j < keyd.length; j++) {
                            const user = keyd[j];
                            const amount = toPay[i][user] * Number(sortedPrice[i]);
                            STOCK_BALANCES[user][stockSymbol as string][stockType as "yes" | "no"].locked -= toPay[i][user];
                            INR_BALANCES[userId].locked -= amount;
                            INR_BALANCES[user].balance += amount;
                        }
                    }

                    if (quantity > 0) {
                        res.status(200).send(`Buy order matched partially, ${quantity} remaining`);
                        return;
                    } else {
                        res.status(200).send(`Buy order matched completely`);
                        return;
                    }
                }
            } else {
                res.status(200).send("Buy order placed and pending");
                return 
            }
        } else {
            res.status(400).send("Insufficient INR balance");
            return 
        }
    } else {
         res.status(400).send("user doesn't exist");
         return
    }
};