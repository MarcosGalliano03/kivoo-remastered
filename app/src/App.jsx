import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import "./App.css";
import TablaPedidos from "./Tablas/TablaPedidos";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

function App() {
  const [excelData, setExcelData] = useState([]);
  const [filtrados, setFiltrados] = useState([]);
  const [resultados, setResultados] = useState([]);
  const [filtradosNoPagados, setFiltradosNoPagados] = useState([]);
  const [verSeguimientos, setVerSeguimientos] = useState(false);
  const [enDistribuidor, setEnDistribuidor] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loading2, setLoading2] = useState(false);
  const [perdidos, setPerdidos] = useState([]);
  const [atendidos, setAtendidos] = useState({});
  const [resultadosRestantes, setResultadosRestantes] = useState([]);
  const [statusActualizados, setStatusActualizados] = useState([]);
  const [isLocal, setIsLocal] = useState(true);

  useEffect(() => {
    // Solo cargar desde localStorage si los estados están vacíos
    if (
      !resultados?.length &&
      !resultadosRestantes?.length &&
      !enDistribuidor?.length &&
      !filtradosNoPagados?.length &&
      !perdidos?.length
    ) {
      const resultadosGuardados = localStorage.getItem("resultados");
      const resultadosRestantesGuardados = localStorage.getItem(
        "resultadosRestantes"
      );
      const enDistribuidorGuardados = localStorage.getItem("enDistribuidor");
      const filtradosNoPagadosGuardados =
        localStorage.getItem("filtradosNoPagados");
      const perdidosGuardados = localStorage.getItem("perdidos");

      if (resultadosGuardados) {
        setResultados(JSON.parse(resultadosGuardados));
      }

      if (resultadosRestantesGuardados) {
        setResultadosRestantes(JSON.parse(resultadosRestantesGuardados));
      }

      if (enDistribuidorGuardados) {
        setEnDistribuidor(JSON.parse(enDistribuidorGuardados));
      }

      if (filtradosNoPagadosGuardados) {
        setFiltradosNoPagados(JSON.parse(filtradosNoPagadosGuardados));
      }

      if (perdidosGuardados) {
        setPerdidos(JSON.parse(perdidosGuardados));
      }
    }
  }, []);

  const enviarARetornados = async (retornados) => {
    if (!retornados || retornados.length === 0) return;

    // Solo mandamos ID, Nombre y Código
    const datosFiltrados = retornados.map((pedido) => ({
      "ID de pedido": pedido["ID Pedido"],
      "Nombre del cliente": pedido["Cliente"],
      "Código de seguimiento": pedido["TN"],
    }));

    try {
      const response = await fetch(
        "http://localhost:3001/api/excel/update-retornados",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(datosFiltrados),
        }
      );

      const data = await response.json();
      console.log("✔️ Agregados a retornados:", data);
    } catch (error) {
      console.error("❌ Error al enviar a retornados:", error);
    }
  };

  const enviarPedidos = async () => {
    setLoading(true);

    try {
      const response = await fetch(
        "http://localhost:3001/api/excel/consultar-envios",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }
      );

      if (!response.ok) throw new Error("Error en la consulta");

      const data = await response.json();
      setIsLocal(false);

      const { consultados, perdidos, noPagados } = data;

      // 🟢 Unificamos todos los pedidos en uno solo
      const todosLosPedidos = [...consultados];

      // 🔵 Clasificación
      const sinDistribuidor = todosLosPedidos.filter(
        (item) =>
          item["Estado actual"]?.toLowerCase() !== "en poder del distribuidor"
      );

      const distribuidor = todosLosPedidos.filter(
        (item) =>
          item["Estado actual"]?.toLowerCase() === "en poder del distribuidor"
      );

      const resultadosCompletos = sinDistribuidor.filter(
        (item) =>
          item["Estado actual"] === "ENTREGA EN SUCURSAL" ||
          item["Estado actual"] === "ENTREGADO" ||
          item["Estado actual"] === "EN ESPERA EN SUCURSAL"
      );

      const importanciaOrden = { Importante: 1, Moderado: 2, Bajo: 3 };

      // Normalizar IMPORTANCIA en completados
      resultadosCompletos.forEach((p) => {
        const raw = (p.IMPORTANCIA || p.Importancia || "").toLowerCase().trim();
        if (raw.includes("importante")) {
          p.Importancia = "Importante";
        } else if (raw.includes("moderad")) {
          p.Importancia = "Moderado";
        } else {
          p.Importancia = "Bajo";
        }
      });

      resultadosCompletos.sort((a, b) => {
        const impA = a.Importancia || "Bajo";
        const impB = b.Importancia || "Bajo";
        return (importanciaOrden[impA] || 4) - (importanciaOrden[impB] || 4);
      });

      setResultados(resultadosCompletos);
      localStorage.setItem("resultados", JSON.stringify(resultadosCompletos));

      const restantes = sinDistribuidor.filter(
        (item) =>
          item["Estado actual"] !== "ENTREGA EN SUCURSAL" &&
          item["Estado actual"] !== "ENTREGADO" &&
          item["Estado actual"] !== "EN ESPERA EN SUCURSAL"
      );

      setResultadosRestantes(restantes);
      localStorage.setItem("resultadosRestantes", JSON.stringify(restantes));

      setEnDistribuidor(distribuidor);
      localStorage.setItem("enDistribuidor", JSON.stringify(distribuidor));

      // No pagados
      const importanciaOrdenNoPagados = { Importante: 1, Moderado: 2, Bajo: 3 };

      noPagados.forEach((p) => {
        const raw = (p.IMPORTANCIA || p.Importancia || "").toLowerCase().trim();
        if (raw.includes("importante")) {
          p.Importancia = "Importante";
        } else if (raw.includes("moderad")) {
          p.Importancia = "Moderado";
        } else {
          p.Importancia = "Bajo";
        }
      });

      noPagados.sort((a, b) => {
        const impA = a.Importancia || "Bajo";
        const impB = b.Importancia || "Bajo";
        return (
          (importanciaOrdenNoPagados[impA] || 4) -
          (importanciaOrdenNoPagados[impB] || 4)
        );
      });

      setFiltradosNoPagados(noPagados);
      localStorage.setItem("filtradosNoPagados", JSON.stringify(noPagados));

      setPerdidos(perdidos);
      localStorage.setItem("perdidos", JSON.stringify(perdidos));

      const retornados = sinDistribuidor.filter((item) => {
        const estado = item["Estado actual"]?.toUpperCase();
        return estado === "RETORNANDO" || estado === "RETORNAND0";
      });

      enviarARetornados(retornados);
    } catch (error) {
      console.error("Fallo al consultar:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = ({
    id,
    nuevoStatus = null,
    nuevaImportancia = null,
  }) => {

    const actualizarEnArray = (array, setArray) => {
      const nuevoArray = array.map((item) => {
        if (item["ID Pedido"] !== id) return item;

        const statusKey =
          item.STATUS !== undefined
            ? "STATUS"
            : item.Status !== undefined
            ? "Status"
            : "STATUS";

        const importanciaKey =
          item.IMPORTANCIA !== undefined
            ? "IMPORTANCIA"
            : item.Importancia !== undefined
            ? "Importancia"
            : "IMPORTANCIA";
        return {
          ...item,
          ...(nuevoStatus !== null && { [statusKey]: nuevoStatus }),
          ...(nuevaImportancia !== null && {
            [importanciaKey]: nuevaImportancia,
          }),
        };
      });

      setArray(nuevoArray);
    };

    let encontrado = false;

    if (resultados.some((item) => item["ID Pedido"] === id)) {
      actualizarEnArray(resultados, setResultados);
      encontrado = true;
    } else if (filtradosNoPagados.some((item) => item["ID Pedido"] === id)) {
      actualizarEnArray(filtradosNoPagados, setFiltradosNoPagados);
      encontrado = true;
    } else if (enDistribuidor.some((item) => item["ID Pedido"] === id)) {
      actualizarEnArray(enDistribuidor, setEnDistribuidor);
      encontrado = true;
    } else if (resultadosRestantes.some((item) => item["ID Pedido"] === id)) {
      actualizarEnArray(resultadosRestantes, setResultadosRestantes);
      encontrado = true;
    }

    if (encontrado) {
      setStatusActualizados((prev) => {
        const sinDuplicados = prev.filter((p) => p["ID Pedido"] !== id);
        const anterior = prev.find((p) => p["ID Pedido"] === id) || {};

        return [
          ...sinDuplicados,
          {
            ...anterior, // primero lo viejo
            "ID Pedido": id,
            ...(nuevoStatus !== null && { STATUS: nuevoStatus }),
            ...(nuevaImportancia !== null && { IMPORTANCIA: nuevaImportancia }),
          },
        ];
      });
    }
  };

  const actualizarStatusEnExcel = async () => {
    if (statusActualizados.length === 0)
      return alert("No hay cambios para guardar.");

    try {
      setLoading2(true);
      const response = await fetch(
        "http://localhost:3001/api/excel/update-status",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(statusActualizados),
        }
      );
      setLoading2(false);

      const data = await response.json();
      console.log("Resultado actualización:", data);
      alert("Status actualizado en el Excel correctamente.");
      setStatusActualizados([]); // Limpiamos después de guardar
    } catch (error) {
      console.error("Error actualizando status:", error);
      alert("Error al actualizar status.");
    }
  };

  // Maneja el cambio del checkbox
  const handleCheck = (idPedido) => {
    setAtendidos((prev) => ({
      ...prev,
      [idPedido]: !prev[idPedido],
    }));
  };

  // Función para exportar una tabla a Excel
  const exportarTablaAExcel = async (tipo) => {
    let datos = [];
    let nombreArchivo = "tabla.xlsx";

    if (tipo === "seguimientos") {
      datos = resultados;
      nombreArchivo = "seguimientos.xlsx";
    } else if (tipo === "no_pagados") {
      datos = filtradosNoPagados;
      nombreArchivo = "no_pagados.xlsx";
    } else if (tipo === "distribuidor") {
      datos = enDistribuidor;
      nombreArchivo = "en_poder_del_distribuidor.xlsx";
    } else if (tipo === "perdidos") {
      datos = perdidos;
      nombreArchivo = "perdidos.xlsx";
    }

    if (!datos.length) return;

    // Campos que querés conservar y exportar en el orden correcto
    const camposDeseados = [
      "ID Pedido",
      "Cliente",
      "Monto",
      "TN",
      "Whatsapp",
      "Estado actual",
      "STATUS",
    ];

    // 1. Filtrar y mapear los datos
    const datosConWhatsapp = datos.map((item) => {
      const telefono =
        item["Whatsapp"] || item["TELÉFONO"] || item["Celular"] || "";
      const status = item.STATUS || "status vacio";

      const telLimpio = String(telefono).replace(/[^\d]/g, "");
      const whatsappUrl = telLimpio
        ? `https://api.whatsapp.com/send?phone=${telLimpio}&text=${encodeURIComponent(
            status
          )}`
        : "";

      const pedidoFiltrado = {};

      camposDeseados.forEach((campo) => {
        pedidoFiltrado[campo] = item[campo] || ".";
      });

      pedidoFiltrado["WhatsApp API"] = whatsappUrl;

      return pedidoFiltrado;
    });

    // 2. Cargar plantilla (¡debe estar dentro de /public!)
    const response = await fetch("../public/template_formateado.xlsx"); // NO uses ../public
    const arrayBuffer = await response.arrayBuffer();

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);

    const sheet = workbook.getWorksheet("Datos");

    // 3. Insertar datos desde la fila 3
    const startRow = 3;
    datosConWhatsapp.forEach((item, index) => {
      const row = sheet.getRow(startRow + index);
      let colIndex = 1;

      Object.values(item).forEach((value) => {
        row.getCell(colIndex).value = value;
        colIndex++;
      });

      row.commit();
    });

    // 4. Descargar archivo
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    saveAs(blob, nombreArchivo);
  };

  return (
    <div className="AppDiv">
      <h1>Lectura y Filtro de Excel</h1>
      <div className="mainActionsDiv">
        <button onClick={() => enviarPedidos(filtrados)} disabled={loading}>
          {loading ? "Cargando..." : "Consultar pedidos"}
        </button>
        <button
          onClick={() => actualizarStatusEnExcel()}
          disabled={resultados.length < 1 || loading2}
        >
          {loading2 ? "Cargando..." : "Actualizar status en Excel"}
        </button>
        {isLocal ? <p>Modo local activado</p> : ""}
      </div>

      <div className="buttons-container">
        <button
          onClick={() => setVerSeguimientos(true)}
          style={
            verSeguimientos === true
              ? { backgroundColor: "#4CAF50", color: "white" }
              : {}
          }
        >
          Ver nuevos estados de seguimiento
        </button>
        <button
          onClick={() => setVerSeguimientos(false)}
          style={
            !verSeguimientos
              ? { backgroundColor: "#4CAF50", color: "white" }
              : {}
          }
        >
          Ver pedidos no pagados
        </button>
        <button
          onClick={() => setVerSeguimientos("distribuidor")}
          style={
            verSeguimientos === "distribuidor"
              ? { backgroundColor: "#4CAF50", color: "white" }
              : {}
          }
        >
          Ver pedidos en poder del distribuidor
        </button>
        <button
          onClick={() => setVerSeguimientos("perdidos")}
          style={
            verSeguimientos === "perdidos"
              ? { backgroundColor: "#4CAF50", color: "white" }
              : {}
          }
        >
          Ver pedidos perdidos
        </button>

        <button
          onClick={() => setVerSeguimientos("restantes")}
          style={
            verSeguimientos === "restantes"
              ? { backgroundColor: "#4CAF50", color: "white" }
              : {}
          }
        >
          Ver seguimientos restantes
        </button>
      </div>

      {verSeguimientos === true && resultados.length > 0 && (
        <TablaPedidos
          pedidos={resultados}
          atendidos={atendidos}
          handleTextChange={(id, value) => handleStatusChange(id, value)}
          handleCheck={handleCheck}
          tipo="seguimientos"
          titulo="📋 Resultados del seguimiento:"
          exportar={() => exportarTablaAExcel("seguimientos")}
        />
      )}

      {verSeguimientos === "restantes" && resultadosRestantes.length > 0 && (
        <TablaPedidos
          pedidos={resultadosRestantes}
          atendidos={atendidos}
          handleTextChange={(id, value) => handleStatusChange(id, value)}
          handleCheck={handleCheck}
          tipo="restantes"
          titulo="📋 Resultados de seguimientos restantes:"
          exportar={() => exportarTablaAExcel("restantes")}
        />
      )}

      {verSeguimientos === false && (
        <TablaPedidos
          pedidos={filtradosNoPagados}
          atendidos={atendidos}
          handleTextChange={(id, value) => handleStatusChange(id, value)}
          handleCheck={handleCheck}
          tipo="no_pagados"
          titulo="Pedidos no pagados (Estado Correo no vacío):"
          exportar={() => exportarTablaAExcel("no_pagados")}
        />
      )}

      {verSeguimientos === "perdidos" && (
        <TablaPedidos
          pedidos={perdidos}
          atendidos={atendidos}
          handleCheck={handleCheck}
          tipo="perdidos"
          titulo="Pedidos Perdidos:"
          exportar={() => exportarTablaAExcel("perdidos")}
        />
      )}

      {verSeguimientos === "distribuidor" && enDistribuidor.length > 0 && (
        <TablaPedidos
          pedidos={enDistribuidor}
          atendidos={atendidos}
          handleTextChange={(id, value) => handleStatusChange(id, value)}
          handleCheck={handleCheck}
          tipo="seguimientos"
          titulo="📦 Pedidos en poder del distribuidor:"
          exportar={() => exportarTablaAExcel("distribuidor")}
        />
      )}
    </div>
  );
}

export default App;
