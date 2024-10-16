import { Request, Response } from "express";
import { INR_BALANCES, ORDERBOOK, STOCK_BALANCES } from "../utils/store";
import { broadcastOrderBookUpdate } from "../websocket";

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
export const createSymbol = async (req: Request, res: Response) => {
   const  {stockSymbol} = req.params;
   //zod validation laga lo yaha
  res.status(201).send(`Symbol ${stockSymbol} created`)
}

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
    let { userId, stockSymbol, quantity, price } = req.body;
    let stockType = req.body.stockType as "yes" | "no";

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

    if (INR_BALANCES[userId] && STOCK_BALANCES[userId]) {
        if (INR_BALANCES[userId].balance >= quantity * Number(price)) {
            INR_BALANCES[userId].balance -= (quantity * Number(price));
            INR_BALANCES[userId].locked += (quantity * Number(price));

            if (ORDERBOOK[stockSymbol]) {
                const stock = ORDERBOOK[stockSymbol][stockType];
                if (stock) {
                    const sortedPrice = Object.keys(stock).sort((a, b) => Number(a) - Number(b));
                    if (sortedPrice.length <= 0) {
                        ORDERBOOK[stockSymbol][stockType][price].buyOrders[userId] = quantity;
                        res.status(200).json("order is placed and pending");
                        broadcastOrderBookUpdate()
                        return;
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
                                    ORDERBOOK[stockSymbol][stockType][sortedPrice[i]].orders[key] -= quantity;
                                    quantity = 0;
                                } else {
                                    keys[key] = orders[key];
                                    quantity -= orders[key];
                                    delete ORDERBOOK[stockSymbol][stockType][sortedPrice[i]].orders[key];
                                }
                            });
                        } else if (total <= quantity) {
                            quantity -= total;
                            toPay.push(orders);
                            delete ORDERBOOK[stockSymbol][stockType][sortedPrice[i]];
                        }
                    }

                    for (let i = 0; i < toPay.length; i++) {
                        const keys = Object.keys(toPay[i]);
                        for (let j = 0; j < keys.length; j++) {
                            const user = keys[j];
                            const amount = toPay[i][user] * Number(sortedPrice[i]);
                            STOCK_BALANCES[user][stockSymbol][stockType].locked -= toPay[i][user];
                            INR_BALANCES[userId].locked -= amount;
                            INR_BALANCES[user].balance += amount;
                        }
                    }

                    if (quantity > 0) {
                        ORDERBOOK[stockSymbol][stockType][price].buyOrders[userId] = quantity;
                        res.status(200).send(`Buy order matched partially, ${quantity} remaining`);
                        broadcastOrderBookUpdate()
                        return;
                    } else {
                        res.status(200).send(`Buy order matched completely`);
                        broadcastOrderBookUpdate()
                        return;
                    }
                }
            } else {
                ORDERBOOK[stockSymbol] = {
                    yes: {},
                    no: {},
                };

                ORDERBOOK[stockSymbol][stockType][price] = {
                    total: 0,
                    orders: {},
                    buyOrders: {},
                };

                ORDERBOOK[stockSymbol][stockType][price].buyOrders[userId] = quantity;
                res.status(200).send("Buy order placed and pending");
                broadcastOrderBookUpdate()
                return;
            }
        } else {
            res.status(400).send("Insufficient INR balance");
            return;
        }
    } else {
        res.status(400).send("user doesn't exist");
        return;
    }
};



export const sellStock = async (req: Request, res: Response) => {
    let { userId, stockSymbol, quantity, price } = req.body;
    let stockType = req.body.stockType as "yes" | "no";
    
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

    if (INR_BALANCES[userId] && STOCK_BALANCES[userId]) {
        if (STOCK_BALANCES[userId][stockSymbol][stockType].quantity >= quantity) {
            STOCK_BALANCES[userId][stockSymbol][stockType].quantity -= quantity;
            STOCK_BALANCES[userId][stockSymbol][stockType].locked += quantity;

            const stock = ORDERBOOK[stockSymbol]?.[stockType] || {};
            const sortedPricing = Object.keys(stock).sort((a, b) => Number(a) - Number(b));

            if (sortedPricing.length > 0) {
                let buyOrder: { [userId: string]: number } = {}, actualQuantity = quantity;

                for (let i = 0; i < sortedPricing.length; i++) {
                    if (Number(sortedPricing[i]) < Number(price)) {
                        if (stock[sortedPricing[i]]?.buyOrders) {
                            buyOrder = stock[sortedPricing[i]].buyOrders;
                            
                            Object.keys(buyOrder).forEach(key => {
                                if (quantity - buyOrder[key] >= 0) {
                                    INR_BALANCES[key].locked -= Number(sortedPricing[i]) * buyOrder[key];
                                    STOCK_BALANCES[userId][stockSymbol][stockType].locked -= buyOrder[key];
                                    STOCK_BALANCES[key][stockSymbol][stockType].quantity += buyOrder[key];
                                    INR_BALANCES[userId].balance += Number(sortedPricing[i]) * buyOrder[key];
                                    quantity -= buyOrder[key];
                                    delete ORDERBOOK[stockSymbol][stockType][sortedPricing[i]].buyOrders[key];
                                } else {
                                    INR_BALANCES[key].locked -= Number(sortedPricing[i]) * quantity;
                                    STOCK_BALANCES[userId][stockSymbol][stockType].locked -= quantity;
                                    STOCK_BALANCES[key][stockSymbol][stockType].quantity += quantity;
                                    INR_BALANCES[userId].balance += Number(sortedPricing[i]) * quantity;
                                    ORDERBOOK[stockSymbol][stockType][sortedPricing[i]].buyOrders[key] -= quantity;
                                    quantity = 0;
                                }
                            });

                            if (quantity <= 0) {
                                break;
                            }
                        }
                    }
                }

                if (quantity <= 0) {
                    res.status(200).send("sell order placed and executed");
                    broadcastOrderBookUpdate()
                    return;
                }
            }

            ORDERBOOK[stockSymbol] = ORDERBOOK[stockSymbol] || {};
            ORDERBOOK[stockSymbol][stockType] = ORDERBOOK[stockSymbol][stockType] || {};
            ORDERBOOK[stockSymbol][stockType][price] = ORDERBOOK[stockSymbol][stockType][price] || { total: 0, orders: {}, buyOrders: {} };
            ORDERBOOK[stockSymbol][stockType][price].total += quantity;
            ORDERBOOK[stockSymbol][stockType][price].orders[userId] = (ORDERBOOK[stockSymbol][stockType][price].orders[userId] || 0) + quantity;

            res.status(200).send(`Sell order placed for ${quantity} '${stockType}' options at price ${price}.`);
            broadcastOrderBookUpdate()
            return;
        } else {
            res.status(400).send("Insufficient stock balance");
            return;
        }
    } else {
        res.status(400).send("user doesn't exist");
        return;
    }
};


export const getStockSymbolOrders = async (req: Request, res: Response) => {
    const { stockSymbol } = req.params;
    if (ORDERBOOK[stockSymbol]) {
        res.status(200).json(ORDERBOOK[stockSymbol])
    } else {
        res.status(404).send("Symbol not found")
    }
}

export const mintTrade = async (req: Request, res: Response) => {
    const {userId,stockSymbol,quantity,price} = req.body;
    //zod validation laga lo yaha

    if(!userId || !stockSymbol || !quantity|| !price){
        res.status(400).send("missing parameters");
        return;
    }
    if(!(typeof quantity === "number" && typeof userId === "string" && typeof stockSymbol === "string")){
        res.status(400).send("invalid userId or stockSymbol or quantity");
        return;
    }

    if(INR_BALANCES[userId] &&  INR_BALANCES[userId].balance>=2*quantity*price){
        INR_BALANCES[userId].balance-=2*quantity*price;
        STOCK_BALANCES[userId] = STOCK_BALANCES[userId] || {};
        STOCK_BALANCES[userId][stockSymbol] = STOCK_BALANCES[userId][stockSymbol] || {yes:{quantity:0,locked:0},no:{quantity:0,locked:0}};
        STOCK_BALANCES[userId][stockSymbol].yes.quantity+=quantity;
        STOCK_BALANCES[userId][stockSymbol].no.quantity+=quantity;
        res.status(200).send(`Minted ${quantity} 'yes' and 'no' tokens for user ${userId}, remaining balance is ${INR_BALANCES[userId].balance}`)
        return 
    }else{
        res.status(400).send("Insufficient INR balance");
        return;
    }
        
}