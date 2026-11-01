import "dotenv/config";
import express from "express";
import cors from "cors";
import routes from "./routes/index.js";

const app = express();
app.use(cors());
routes(app);

const porta = process.env.PORTA;
const end = process.env.END;

app.listen(porta, () => console.log(`Servidor no end: ${end}:${porta}`));
