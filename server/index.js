const express = require("express");
const cors = require("cors");
const puppeteer = require("puppeteer");
const { google } = require("googleapis");
const routes = require("./routes/index");
require('dotenv').config();

const app = express();
app.use(cors({ origin: ["http://localhost:5173", "https://kivoo-remastered-coral.vercel.app"] }));
app.use(express.json());
app.use(express.urlencoded({ limit: "50mb", extended: true }));
console.log(process.env.GOOGLE_PRIVATE_KEY_ID, "en index");



// RUTAS
app.use("/api", routes);

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`🚀 Servidor escuchando en http://localhost:${PORT}`);
});
