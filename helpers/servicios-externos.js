const axios = require('axios');

// URLs base de los microservicios (configurar en .env)
const PRODUCTOS_API = process.env.PRODUCTOS_API || 'http://localhost:3001/api';
const PAGOS_API = process.env.PAGOS_API || 'http://localhost:3002/api';
const ENVIOS_API = process.env.ENVIOS_API || 'http://localhost:3003/api';

class ServiciosExternos {

    // ========== PRODUCTOS API ==========

    /**
     * Valida que los productos existan y estén disponibles
     * @param {Array} items - Array de {id_producto, cantidad}
     * @returns {Promise<Array>} - Array con productos válidos y precios actuales
     */
    static async validarProductos(items) {
        try {
            const productos = [];

            for (const item of items) {
                const response = await axios.get(`${PRODUCTOS_API}/productos/${item.id_producto}`);

                if (response.data.ok && response.data.data.estado === 'activo') {
                    const producto = response.data.data;

                    // Verificar stock disponible
                    if (producto.stock >= item.cantidad) {
                        productos.push({
                            id_producto: producto.id_producto,
                            nombre: producto.nombre,
                            precio: producto.precio,
                            stock_disponible: producto.stock,
                            cantidad_solicitada: item.cantidad,
                            subtotal: producto.precio * item.cantidad
                        });
                    } else {
                        throw new Error(`Stock insuficiente para ${producto.nombre}. Disponible: ${producto.stock}, Solicitado: ${item.cantidad}`);
                    }
                } else {
                    throw new Error(`Producto ${item.id_producto} no encontrado o inactivo`);
                }
            }

            return productos;
        } catch (error) {
            console.error('Error validando productos:', error.message);
            throw new Error(`Error en validación de productos: ${error.message}`);
        }
    }

    /**
     * Actualiza el stock de productos después de una orden confirmada
     * @param {Array} items - Array de {id_producto, cantidad}
     * @returns {Promise<void>}
     */
    static async actualizarStock(items) {
        try {
            for (const item of items) {
                await axios.patch(`${PRODUCTOS_API}/productos/${item.id_producto}/stock`, {
                    cantidad: -item.cantidad, // Restar del stock
                    motivo: 'venta_confirmada'
                });
            }
        } catch (error) {
            console.error('Error actualizando stock:', error.message);
            throw new Error(`Error actualizando inventario: ${error.message}`);
        }
    }

    // ========== PAGOS API ==========

    /**
     * Crea un registro de pago para una orden
     * @param {Object} datosPago - {id_orden, monto, metodo_pago}
     * @returns {Promise<Object>} - Datos del pago creado
     */
    static async crearPago(datosPago) {
        try {
            const response = await axios.post(`${PAGOS_API}/pagos`, {
                id_orden: datosPago.id_orden,
                monto: datosPago.monto,
                moneda: 'COP',
                metodo_pago: datosPago.metodo_pago || 'pendiente',
                estado_pago: 'pendiente'
            });

            return response.data.data;
        } catch (error) {
            console.error('Error creando pago:', error.message);
            throw new Error(`Error creando registro de pago: ${error.message}`);
        }
    }

    /**
     * Consulta el estado de un pago
     * @param {number} idPago - ID del pago
     * @returns {Promise<Object>} - Estado del pago
     */
    static async consultarEstadoPago(idPago) {
        try {
            const response = await axios.get(`${PAGOS_API}/pagos/${idPago}`);
            return response.data.data;
        } catch (error) {
            console.error('Error consultando pago:', error.message);
            throw new Error(`Error consultando estado de pago: ${error.message}`);
        }
    }

    /**
     * Actualiza el estado de un pago
     * @param {number} idPago - ID del pago
     * @param {string} nuevoEstado - Nuevo estado del pago
     * @returns {Promise<Object>} - Pago actualizado
     */
    static async actualizarEstadoPago(idPago, nuevoEstado) {
        try {
            const response = await axios.patch(`${PAGOS_API}/pagos/${idPago}/estado`, {
                estado_pago: nuevoEstado
            });
            return response.data.data;
        } catch (error) {
            console.error('Error actualizando pago:', error.message);
            throw new Error(`Error actualizando estado de pago: ${error.message}`);
        }
    }

    // ========== ENVIOS API ==========

    /**
     * Crea un registro de envío para una orden
     * @param {Object} datosEnvio - Datos del envío
     * @returns {Promise<Object>} - Datos del envío creado
     */
    static async crearEnvio(datosEnvio) {
        try {
            const response = await axios.post(`${ENVIOS_API}/envios`, {
                id_orden: datosEnvio.id_orden,
                ciudad: datosEnvio.ciudad,
                direccion: datosEnvio.direccion_envio,
                costo_envio: datosEnvio.costo_envio,
                estado_envio: 'pendiente'
            });

            return response.data.data;
        } catch (error) {
            console.error('Error creando envío:', error.message);
            throw new Error(`Error creando registro de envío: ${error.message}`);
        }
    }

    /**
     * Calcula el costo de envío para una ciudad
     * @param {string} ciudad - Ciudad de destino
     * @returns {Promise<number>} - Costo de envío
     */
    static async calcularCostoEnvio(ciudad) {
        try {
            const response = await axios.post(`${ENVIOS_API}/envios/calcular-costo`, {
                ciudad: ciudad
            });

            return response.data.data.costo_envio;
        } catch (error) {
            console.error('Error calculando costo de envío:', error.message);
            // Retornar costo por defecto si falla la API
            return 15000; // Costo por defecto
        }
    }

    /**
     * Actualiza el estado de un envío
     * @param {number} idEnvio - ID del envío
     * @param {string} nuevoEstado - Nuevo estado del envío
     * @returns {Promise<Object>} - Envío actualizado
     */
    static async actualizarEstadoEnvio(idEnvio, nuevoEstado) {
        try {
            const response = await axios.patch(`${ENVIOS_API}/envios/${idEnvio}/estado`, {
                estado_envio: nuevoEstado
            });
            return response.data.data;
        } catch (error) {
            console.error('Error actualizando envío:', error.message);
            throw new Error(`Error actualizando estado de envío: ${error.message}`);
        }
    }

    /**
     * Consulta el estado de un envío
     * @param {number} idEnvio - ID del envío
     * @returns {Promise<Object>} - Estado del envío
     */
    static async consultarEstadoEnvio(idEnvio) {
        try {
            const response = await axios.get(`${ENVIOS_API}/envios/${idEnvio}`);
            return response.data.data;
        } catch (error) {
            console.error('Error consultando envío:', error.message);
            throw new Error(`Error consultando estado de envío: ${error.message}`);
        }
    }
}

module.exports = ServiciosExternos;