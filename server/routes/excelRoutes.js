const { Router } = require("express");
const { updateStatusInExcelHandler, consultarEnviosHandler, updateRetornados } = require("../handlers/excelHandler");

const excelRoutes = Router();

excelRoutes.post("/update-status", updateStatusInExcelHandler);
excelRoutes.post("/consultar-envios", consultarEnviosHandler);
excelRoutes.post("/update-retornados", updateRetornados);

module.exports = excelRoutes;
