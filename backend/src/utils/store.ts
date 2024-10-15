export const INR_BALANCES:{
[userId:string]: {
        locked:number,
        balance:number
    }
}=  {}

export const ORDERBOOK:{
    [stockSymbol: string]: {
        [key in entryType]: {
            [price:string]: {
            total:number
            orders:{
                [user:string]:number,
            

            }
            buyOrders:{
                [user:string]:number;
            }
        };
    };
}} = {}


type StockBalances = {
    [userId: string]: {
    [stockSymbol: string]: {
        [key in entryType]: {
            quantity: number;
            locked: number;
        };
    };
};
}

export const STOCK_BALANCES: StockBalances = {};


enum entryType{
    YES="yes",
    NO= "no"
}