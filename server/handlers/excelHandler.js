const { google } = require("googleapis");
const puppeteer = require("puppeteer");
const { head } = require("../routes");
require("dotenv").config();

const auth = new google.auth.GoogleAuth({
  credentials: {
    type: "service_account",
    project_id: process.env.GOOGLE_PROJECT_ID,
    private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
    private_key: process.env.GOOGLE_PRIVATE_KEY,
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    client_id: process.env.GOOGLE_CLIENT_ID,
    auth_uri: process.env.GOOGLE_AUTH_URI,
    token_uri: process.env.GOOGLE_TOKEN_URI,
    auth_provider_x509_cert_url: process.env.GOOGLE_AUTH_PROVIDER_CERT_URL,
    client_x509_cert_url: process.env.GOOGLE_CLIENT_CERT_URL,
  },
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheets = google.sheets({ version: "v4", auth });
const SPREADSHEET_ID = "14KaaQ6iAWJQeN_-fLPaQdYh0_RTsvESuGzF5bgV9QWo";
const HOJA_PEDIDOS = "PEDIDOS";

const consultarEnviosHandler = async (req, res) => {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${HOJA_PEDIDOS}!A1:Z1000`,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0)
      return res.status(404).json({ error: "No se encontraron pedidos" });

    const headers = rows[0];
    const pedidos = rows.slice(1).map((row) => {
      const pedido = {};
      headers.forEach((header, index) => {
        pedido[header] = row[index] || "";
      });
      return pedido;
    });

    const pedidosPerdidos = pedidos
      .filter((p) => p["Observaciones"] === "Perdido")
      .map((p) => ({ ...p, TN: p["Codigos de seguimiento"] }));
    const pedidosNoPagados = pedidos
      .filter(
        (p) =>
          p["Observaciones"] !== "Perdido" &&
          (p["¿Pagado?"] === "No" ||
            ((p["¿Pagado?"] === "" || p["¿Pagado?"] === "-") &&
              p["Estado Correo"] === "Entregado"))
      )
      .map((p) => ({ ...p, TN: p["Codigos de seguimiento"] }));

    const pedidosValidos = pedidos
      .filter(
        (p) =>
          p["Observaciones"] !== "Perdido" &&
          !(
            p["¿Pagado?"] === "No" ||
            ((p["¿Pagado?"] === "" || p["¿Pagado?"] === "-") &&
              p["Estado Correo"] === "Entregado")
          ) &&
          p["Estado Correo"] === "" &&
          p["Codigos de seguimiento"] &&
          p["Codigos de seguimiento"].trim() !== ""
      )
      .map((p) => ({ ...p, TN: p["Codigos de seguimiento"] }));

    const resultados = [];

    if (pedidosValidos.length > 0) {
      const browser = await puppeteer.launch({
        executablePath:
          "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
        headless: false,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });

      const page = await browser.newPage();
      const estadosPermitidos = [
        "ENTREGA EN SUCURSAL",
        "ENTREGADO",
        "EN ESPERA EN SUCURSAL",
        "EN PODER DEL DISTRIBUIDOR",
        "DOMICILIO CERRADO/1 VISITA",
        "RETORNANDO",
        "RETORNAND0",
      ];

      for (const pedido of pedidosValidos) {
        const codigo = pedido.TN;
        try {
          await page.goto(
            `https://www.correoargentino.com.ar/formularios/e-commerce?id=${codigo}`
          );
          await Promise.all([page.click('button[id="btsubmit"]')]);
          await page.waitForSelector("table.table-hover tbody tr");

          const datos = await page.evaluate(() => {
            const filas = Array.from(
              document.querySelectorAll("table.table-hover tbody tr")
            );
            const eventos = filas.map((fila) => {
              const celdas = Array.from(fila.querySelectorAll("td")).map(
                (celda) => celda.innerText.trim()
              );
              return {
                fechaHora: celdas[0],
                historia: celdas[2],
                estado: celdas[3],
              };
            });

            const eventoConEstado = eventos.find((e) => e.estado !== "");
            if (eventoConEstado) return eventoConEstado;

            const eventoDistribuidor = eventos.find((e) =>
              e.historia.toUpperCase().includes("EN PODER DEL DISTRIBUIDOR")
            );
            if (eventoDistribuidor)
              return {
                estado: "EN PODER DEL DISTRIBUIDOR",
                historia: eventoDistribuidor.historia,
                fechaHora: eventoDistribuidor.fechaHora,
              };

            return { estado: "Sin datos", fechaHora: "" };
          });

          if (estadosPermitidos.includes(datos.estado)) {
            resultados.push({
              "ID Pedido": pedido["ID Pedido"],
              Cliente: pedido.Cliente,
              Monto: pedido.Monto,
              TN: codigo,
              "Estado actual": datos.estado,
              fechaDeEstado: datos.fechaHora,
              Whatsapp: pedido.Whatsapp,
              STATUS: pedido.Status,
              IMPORTANCIA: pedido.Importancia
            });
          }
        } catch (error) {
          resultados.push({ ...pedido, "Estado actual": "Error al consultar" });
        }
      }

      await browser.close();
    }

    res.json({
      consultados: resultados,
      perdidos: pedidosPerdidos,
      noPagados: pedidosNoPagados,
    });
  } catch (error) {
    console.error("❌ Error general:", error.message);
    res.status(500).json({ error: "Error general del servidor" });
  }
};

const updateStatusInExcelHandler = async (req, res) => {
  const pedidosParaActualizar = req.body; // [{ "ID Pedido": "1182", "STATUS": "Nuevo status", "IMPORTANCIA": "Alta" }, ...]

  if (
    !Array.isArray(pedidosParaActualizar) ||
    pedidosParaActualizar.length === 0
  ) {
    return res.status(400).json({ error: "Debes enviar un array de pedidos." });
  }

  try {
    // 1. Leer la hoja completa
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${HOJA_PEDIDOS}!A1:Z1000`,
    });

    const rows = response.data.values;
    const headers = rows[0];
    const pedidos = rows.slice(1).map((row) => {
      const pedido = {};
      headers.forEach((header, index) => {
        pedido[header] = row[index] || "";
      });
      return pedido;
    });

    const idIndex = headers.indexOf("ID Pedido");
    const statusIndex = headers.indexOf("Status");
    const importanciaIndex = headers.indexOf("Importancia");

    if (idIndex === -1 || statusIndex === -1 || importanciaIndex === -1) {
      return res.status(500).json({
        error: "No se encontró la columna 'ID Pedido', 'Status' o 'Importancia' en el Excel.",
      });
    }

    const updates = [];
    const noUpdates = [];

    pedidosParaActualizar.forEach((pedidoReq) => {
      const pedidoExcelIndex = pedidos.findIndex(
        (p) => p["ID Pedido"] === pedidoReq["ID Pedido"]
      );

      if (pedidoExcelIndex === -1) {
        noUpdates.push({ ...pedidoReq, motivo: "Pedido no encontrado" });
        return;
      }

      const rowNumber = pedidoExcelIndex + 2; // +2 por encabezado y base cero
      const statusActual = pedidos[pedidoExcelIndex]["Status"] || "";
      const statusNuevo = pedidoReq["STATUS"] || "";

      const importanciaActual = pedidos[pedidoExcelIndex]["Importancia"] || "";
      const importanciaNueva = pedidoReq["IMPORTANCIA"] || "";

      // STATUS: Verificar si hay que actualizar
      if (
        statusNuevo === statusActual ||
        (statusNuevo === "" && statusActual !== "")
      ) {
        noUpdates.push({
          ...pedidoReq,
          motivo:
            statusNuevo === statusActual
              ? "Status idéntico al actual"
              : "Status vacío, pero ya existe uno en Excel",
        });
      } else {
        updates.push({
          range: `${HOJA_PEDIDOS}!${colNumberToLetter(statusIndex + 1)}${rowNumber}`,
          values: [[statusNuevo]],
          id: pedidoReq["ID Pedido"],
        });
      }

      // IMPORTANCIA: Verificar si hay que actualizar
      if (
        importanciaNueva !== "" &&
        importanciaNueva !== importanciaActual
      ) {
        updates.push({
          range: `${HOJA_PEDIDOS}!${colNumberToLetter(importanciaIndex + 1)}${rowNumber}`,
          values: [[importanciaNueva]],
          id: pedidoReq["ID Pedido"],
        });
      }
    });

    // Aplicar todos los updates
    const batchUpdateRequests = updates.map((u) =>
      sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: u.range,
        valueInputOption: "RAW",
        requestBody: { values: u.values },
      })
    );

    await Promise.all(batchUpdateRequests);

    res.json({
      actualizados: [...new Set(updates.map((u) => u.id))],
      noActualizados: noUpdates,
    });
  } catch (error) {
    console.error("❌ Error actualizando status e importancia:", error.message);
    res.status(500).json({ error: "Error actualizando status e importancia" });
  }
};


const updateRetornados = async (req, res) => {
  const nuevosPedidos = req.body; // [{ ID de pedido, Nombre del cliente, Código de seguimiento }]

  if (!Array.isArray(nuevosPedidos) || nuevosPedidos.length === 0) {
    return res.status(400).json({ error: "Debes enviar un array de pedidos." });
  }

  try {
    // 1. Leer la hoja RETORNADOS
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `RETORNADOS!A1:E1000`,
    });

    const rows = response.data.values;
    const headers = rows[0] || [];
    const data = rows.slice(1);

    const existingIds = new Set(data.map(row => row[0]?.trim()));

    // 2. Filtrar los que ya existen
    const nuevosSinRepetidos = nuevosPedidos.filter(p => !existingIds.has(p["ID de pedido"]));

    if (nuevosSinRepetidos.length === 0) {
      return res.json({ mensaje: "No hay pedidos nuevos para agregar." });
    }

    // 3. Crear nuevas filas con los datos que mandaste y columnas vacías al final
    const nuevasFilas = nuevosSinRepetidos.map(pedido => [
      pedido["ID de pedido"],
      pedido["Nombre del cliente"],
      pedido["Código de seguimiento"],
      "", // Motivo
      ""  // VUELVE A
    ]);

    // 4. Agregar al Excel
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `RETORNADOS!A1:E1`,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: nuevasFilas },
    });

    res.json({
      agregados: nuevosSinRepetidos.map(p => p["ID de pedido"]),
      omitidos: nuevosPedidos
        .filter(p => existingIds.has(p["ID de pedido"]))
        .map(p => p["ID de pedido"]),
    });
  } catch (error) {
    console.error("❌ Error al actualizar RETORNADOS:", error.message);
    res.status(500).json({ error: "Error al actualizar hoja RETORNADOS" });
  }
};

const colNumberToLetter = (num) => {
  let str = "";
  while (num > 0) {
    let rem = (num - 1) % 26;
    str = String.fromCharCode(65 + rem) + str;
    num = Math.floor((num - 1) / 26);
  }
  return str;
};

module.exports = {
  consultarEnviosHandler,
  updateStatusInExcelHandler,
  updateRetornados
};
