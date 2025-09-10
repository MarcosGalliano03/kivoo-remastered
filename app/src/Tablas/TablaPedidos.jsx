import React, { useState } from "react";
import "./tablas.css";
import MLlogo from "../assets/ML.png";

const TablaPedidos = ({
  pedidos,
  atendidos,
  handleCheck,
  tipo,
  titulo,
  exportar,
  handleTextChange: handleStatusChange,
}) => {
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState(null);
  // NUEVO: menú de selección de mensaje por fila
  const [menuAbiertoId, setMenuAbiertoId] = useState(null);

  const calcularDiasDesde = (fechaTexto) => {
    if (!fechaTexto) return null;
    const [dia, mes, anioHora] = fechaTexto.split("-");
    const [anio, hora] = (anioHora || "").split(" ");
    const fechaEstado = new Date(`${anio}-${mes}-${dia}T${hora || "00:00"}`);
    const hoy = new Date();
    const diferenciaMs = hoy - fechaEstado;
    const dias = Math.floor(diferenciaMs / (1000 * 60 * 60 * 24));
    return dias >= 0 ? dias : null;
  };

  const normalizar = (s) => (s || "").toString().trim().toUpperCase();

  // NUEVO: generador de textos según plantilla
  const generarMensaje = (plantilla, pedido) => {
    const estado = normalizar(pedido["Estado actual"]);
    const monto = pedido.Monto || "";
    const cliente = pedido.Cliente || "";

    const headerPago = `Por favor realizá la transferencia:\n\n📌 *Si transferís desde una cuenta bancaria* (Santander, Galicia, Cuenta DNI, etc):  \n👉🏻 *CVU:* 0720126088000003241736\n👉🏻  *Alias*: juanescobar9\n\n📌 *Si transferís desde Mercado Pago* :  \n👉🏻 *CVU:* 0340290208290120476005\n👉🏻 *Alias*: kivoo.patagonia\n👉🏻 *Titular*: Leonardo Gabriel\n\n💵 El importe total es de *$${monto}*`;

    switch (plantilla) {
      case "recordatorio_pago":
        return `Hola ${cliente}, ¿cómo estás? Te escribo de Kivoo para recordarte que todavía está pendiente la transferencia del pedido 💸.\n\n${headerPago}\n\n*Después enviame el comprobante por favor 🧾*`;

      case "entregado":
        return `Hola ${cliente}, te habla Ezequiel de Kivoo 😊 Me acaban de decir los chicos de correo que ya te entregaron el paquete 🙏🏻 \n\n${headerPago}\n\n*Después enviame el comprobante por favor 🧾*`;

      case "en_espera_en_sucursal":
        return `Sucursal 🏤 ¡Hola ${cliente}! Te habla Ezequiel de Kivoo 😊 Tu pedido ya está esperando para ser retirado en una sucursal. En un ratito te vamos a avisar exactamente cuál es la sucursal 📍. Tenés 3 días para ir a buscarlo, ¡gracias por tu compra! 🙌`;

      case "en_poder_del_distribuidor":
        return `Hola ${cliente}, te habla Ezequiel de Kivoo 😊 ¿Cómo estás? Te quería decir que *hoy mismo* vas a estar recibiendo tu pedido en tu domicilio.\n\n${headerPago}\n\n*Por favor recordá que al chico de Correo Argentino no hay que pagarle nada*`;

      case "sin_texto":
        return ""; // Abrir WhatsApp sin texto

      default:
        // fallback: si hay estado, sugerimos una por defecto según estado
        if (estado === "ENTREGADO" || estado === "ENTREGA EN SUCURSAL") {
          return generarMensaje("entregado", pedido);
        }
        if (estado === "EN ESPERA EN SUCURSAL") {
          return generarMensaje("en_espera_en_sucursal", pedido);
        }
        if (estado === "EN PODER DEL DISTRIBUIDOR") {
          return generarMensaje("en_poder_del_distribuidor", pedido);
        }
        return generarMensaje("recordatorio_pago", pedido);
    }
  };

  // NUEVO: opciones visibles en el menú según contexto
  const obtenerOpcionesMensajes = (pedido, tipo) => {
    const estado = normalizar(pedido["Estado actual"]);

    // Ordenamos sugerencias según "tipo" y "estado"
    const base = [
      { key: "recordatorio_pago", label: "Recordatorio de pago" },
      { key: "entregado", label: "Entregado (pedir transferencia)" },
      { key: "en_espera_en_sucursal", label: "En espera en sucursal" },
      {
        key: "en_poder_del_distribuidor",
        label: "En poder del distribuidor (llega hoy)",
      },
      { key: "sin_texto", label: "Abrir WhatsApp sin texto" },
    ];

    if (tipo === "no_pagados") {
      // Priorizar recordatorio
      return [
        { key: "recordatorio_pago", label: "Recordatorio de pago" },
        { key: "entregado", label: "Entregado (pedir transferencia)" },
        {
          key: "en_poder_del_distribuidor",
          label: "En poder del distribuidor (llega hoy)",
        },
        { key: "en_espera_en_sucursal", label: "En espera en sucursal" },
        { key: "sin_texto", label: "Abrir WhatsApp sin texto" },
      ];
    }

    if (estado === "ENTREGADO" || estado === "ENTREGA EN SUCURSAL") {
      return [
        { key: "entregado", label: "Entregado (pedir transferencia)" },
        { key: "recordatorio_pago", label: "Recordatorio de pago" },
        {
          key: "en_poder_del_distribuidor",
          label: "En poder del distribuidor (llega hoy)",
        },
        { key: "en_espera_en_sucursal", label: "En espera en sucursal" },
        { key: "sin_texto", label: "Abrir WhatsApp sin texto" },
      ];
    }

    if (estado === "EN ESPERA EN SUCURSAL") {
      return [
        { key: "en_espera_en_sucursal", label: "En espera en sucursal" },
        { key: "entregado", label: "Entregado (pedir transferencia)" },
        { key: "recordatorio_pago", label: "Recordatorio de pago" },
        {
          key: "en_poder_del_distribuidor",
          label: "En poder del distribuidor (llega hoy)",
        },
        { key: "sin_texto", label: "Abrir WhatsApp sin texto" },
      ];
    }

    if (estado === "EN PODER DEL DISTRIBUIDOR") {
      return [
        {
          key: "en_poder_del_distribuidor",
          label: "En poder del distribuidor (llega hoy)",
        },
        { key: "entregado", label: "Entregado (pedir transferencia)" },
        { key: "recordatorio_pago", label: "Recordatorio de pago" },
        { key: "en_espera_en_sucursal", label: "En espera en sucursal" },
        { key: "sin_texto", label: "Abrir WhatsApp sin texto" },
      ];
    }

    return base;
  };

  // NUEVO: abrir WhatsApp Web con la plantilla elegida
  const enviarMensaje = (pedido, plantillaKey) => {
    const texto = generarMensaje(plantillaKey, pedido);
    const phone = (pedido.Whatsapp || "").toString().replace(/[^\d]/g, "");
    if (!phone) return;

    const url = `https://web.whatsapp.com/send/?phone=${phone}${
      texto ? `&text=${encodeURIComponent(texto)}` : ""
    }`;

    window.open(url, "_blank", "noopener,noreferrer");
    setMenuAbiertoId(null);
  };

  // NUEVO: toggle del menú por fila
  const toggleMenu = (idPedido) => {
    setMenuAbiertoId((prev) => (prev === idPedido ? null : idPedido));
  };

  return (
    <div
      className="tabla-container"
      style={{
        marginTop: "2rem",
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
      }}
    >
      <h3>{titulo}</h3>

      <div
        className="tabla-datos"
        style={{ display: "flex", gap: "2rem", alignItems: "center" }}
      >
        <span style={{ fontWeight: "bold" }}>
          {tipo === "perdidos"
            ? "💸 Ingreso potencial perdido: $"
            : "💰 Ingreso potencial: $"}
          {pedidos.reduce(
            (total, pedido) => total + Number(pedido.Monto || 0),
            0
          )}
        </span>

        <span style={{ fontWeight: "bold" }}>
          📦 Cantidad de pedidos: {pedidos.length}
        </span>
      </div>

      <button
        className="tabla-exportar"
        onClick={exportar}
        style={{ backgroundColor: "#4CAF50", color: "white" }}
      >
        Exportar tabla a Excel
      </button>

      <div className="tabla-responsive">
        <table
          border="1"
          cellPadding="8"
          style={{ borderCollapse: "collapse", width: "100%" }}
          className="tabla-pedidos"
        >
          <thead>
            <tr>
              <th>Atendido</th>
              <th>ID Pedido</th>
              <th>Cliente</th>
              <th>Monto</th>
              <th>Códigos de seguimiento</th>
              {tipo !== "seguimientos" ? <th>¿Pagado?</th> : null}
              <th>
                {tipo === "seguimientos" ? "Estado actual" : "Estado Correo"}
              </th>
              <th>Whatsapp</th>
              <th>Status</th>
              {tipo === "seguimientos" || tipo === "no_pagados" ? (
                <th>Importancia</th>
              ) : null}
              <th>Acción</th>
            </tr>
          </thead>

          <tbody>
            {pedidos.map((pedido, index) => {
              const idPedido = pedido["ID Pedido"];
              return (
                <tr
                  key={index}
                  className={atendidos[idPedido] ? "fila-atendida" : ""}
                  style={{
                    ...(atendidos[idPedido] ? { background: "#006a00" } : {}),
                    ...(pedido["Mercado Libre"] === "Si"
                      ? { color: "#fff9c3ff" }
                      : {}),
                    position: "relative", // para posicionar el menú si querés hacerlo absoluto
                  }}
                >
                  <td
                    data-label="Atendido"
                    onClick={() => handleCheck(idPedido)}
                  >
                    <input
                      type="checkbox"
                      checked={!!atendidos[idPedido]}
                      readOnly
                    />
                    {pedido["Mercado Libre"] === "Si" ? (
                      <img
                        src={MLlogo}
                        alt="Mercado Libre"
                        style={{ width: "50px" }}
                      />
                    ) : null}
                  </td>
                  <td data-label="ID Pedido">{idPedido}</td>
                  <td data-label="Cliente">{pedido.Cliente}</td>
                  <td data-label="Monto">${pedido.Monto}</td>
                  <td data-label="Códigos de seguimiento">
                    {pedido.TN || pedido["Codigos de seguimiento"]}
                  </td>
                  {tipo !== "seguimientos" ? (
                    <td data-label="¿Pagado?">{pedido["¿Pagado?"]}</td>
                  ) : null}
                  <td
                    data-label={
                      tipo === "seguimientos"
                        ? "Estado actual"
                        : "Estado Correo"
                    }
                  >
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span>
                        {tipo === "seguimientos" || tipo === "restantes"
                          ? pedido["Estado actual"]
                          : pedido["Estado Correo"]}
                      </span>

                      {(() => {
                        const dias = calcularDiasDesde(pedido.fechaDeEstado);
                        if (dias === null) return null;

                        let color = "black";
                        if (dias <= 1) color = "green";
                        else if (dias <= 3) color = "orange";
                        else color = "red";

                        return (
                          <span
                            style={{
                              color,
                              fontSize: "0.9em",
                              marginTop: "4px",
                            }}
                          >
                            Hace {dias} día{dias !== 1 ? "s" : ""}
                          </span>
                        );
                      })()}
                    </div>
                  </td>

                  <td data-label="Whatsapp">{pedido.Whatsapp}</td>

                  <td data-label="Status">
                    <textarea
                      rows="2"
                      cols="30"
                      value={
                        tipo === "no_pagados" ? pedido.Status : pedido.STATUS
                      }
                      onChange={(e) =>
                        handleStatusChange({
                          id: idPedido,
                          nuevoStatus: e.target.value,
                        })
                      }
                    />
                  </td>

                  <td data-label="Importancia">
                    {tipo === "seguimientos" || tipo === "no_pagados"
                      ? (() => {
                          const importanciaValue = (
                            pedido.IMPORTANCIA ||
                            pedido.Importancia ||
                            ""
                          ).trim();
                          let borderColor = "orange";
                          if (importanciaValue === "Importante")
                            borderColor = "red";
                          else if (importanciaValue === "Bajo")
                            borderColor = "green";
                          else if (importanciaValue === "Moderado")
                            borderColor = "orange";

                          return (
                            <select
                              value={
                                ["Bajo", "Moderado", "Importante"].includes(
                                  importanciaValue
                                )
                                  ? importanciaValue
                                  : "Moderado"
                              }
                              onChange={(e) => {
                                handleStatusChange({
                                  id: idPedido,
                                  nuevaImportancia: e.target.value,
                                });
                              }}
                              style={{
                                border: `2px solid ${borderColor}`,
                                borderRadius: "4px",
                              }}
                            >
                              <option value="Importante">Importante</option>
                              <option value="Moderado">Moderado</option>
                              <option value="Bajo">Bajo</option>
                            </select>
                          );
                        })()
                      : null}
                  </td>

                  <td data-label="Acción" style={{ whiteSpace: "nowrap" }}>
                    {/* NUEVO: botón que abre menú de plantillas */}
                    <button
                      onClick={() => toggleMenu(idPedido)}
                      disabled={!pedido.Whatsapp}
                      title={
                        pedido.Whatsapp ? "Enviar mensaje" : "Sin WhatsApp"
                      }
                    >
                      <ion-icon name="send"></ion-icon>
                    </button>

                    {/* Info existente */}
                    <button
                      onClick={() => setPedidoSeleccionado(pedido)}
                      title="Ver detalles"
                    >
                      <ion-icon name="information-circle-outline"></ion-icon>
                    </button>

                    {/* NUEVO: menú de plantillas */}
                    {menuAbiertoId === idPedido && (
                      <div className="mensaje-menu">
                        <button
                          onClick={() => toggleMenu(idPedido)}
                          className="closeBtn"
                        >
                          X
                        </button>
                        {obtenerOpcionesMensajes(pedido, tipo).map((opt) => (
                          <button
                            key={opt.key}
                            onClick={(e) => {
                              e.stopPropagation();
                              enviarMensaje(pedido, opt.key);
                            }}
                            className="mensaje-menu-item"
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {pedidoSeleccionado && (
        <div className="modal">
          <div className="modal-contenido">
            <h2>Información del pedido</h2>
            <button onClick={() => setPedidoSeleccionado(null)}>Cerrar</button>
            <div className="pedido-detalles">
              {Object.entries(pedidoSeleccionado)
                .filter(([clave]) =>
                  [
                    "Cliente",
                    "Monto",
                    "Tipo de Envío",
                    "Estado Correo",
                    "¿Pagado?",
                    "Estado del Cliente",
                    "Importancia",
                    "DNI",
                    "Observaciones",
                    "Codigos de seguimiento",
                    "LINK FINAL CORREO",
                    "UNIDADES",
                    "Status",
                    "Whatsapp",
                    "Producto",
                    "COGS",
                    "Costo Envío",
                  ].includes(clave)
                )
                .map(([clave, valor]) => (
                  <div key={clave}>
                    <strong>{clave}:</strong>{" "}
                    {clave === "LINK FINAL CORREO" && valor ? (
                      <a href={valor} target="_blank" rel="noopener noreferrer">
                        {valor}
                      </a>
                    ) : (
                      String(valor || "-")
                    )}
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TablaPedidos;
