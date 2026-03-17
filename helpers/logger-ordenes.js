const fs = require('fs').promises;
const path = require('path');

class LoggerOrdenes {

    constructor() {
        this.logDirectory = path.join(__dirname, '..', 'logs');
        this.ordenesLogFile = path.join(this.logDirectory, 'ordenes.log');
        this.erroresLogFile = path.join(this.logDirectory, 'ordenes_errores.log');

        // Crear directorio de logs si no existe
        this.inicializarLogs();
    }

    async inicializarLogs() {
        try {
            await fs.mkdir(this.logDirectory, { recursive: true });
        } catch (error) {
            console.error('Error creando directorio de logs:', error);
        }
    }

    /**
     * Formatea un mensaje de log con timestamp
     * @param {string} nivel - Nivel del log (INFO, ERROR, WARN)
     * @param {string} mensaje - Mensaje del log
     * @param {object} datos - Datos adicionales (opcional)
     * @returns {string} - Mensaje formateado
     */
    formatearMensaje(nivel, mensaje, datos = null) {
        const timestamp = new Date().toISOString();
        let mensajeFormateado = `[${timestamp}] [${nivel}] ${mensaje}`;

        if (datos) {
            mensajeFormateado += ` | Datos: ${JSON.stringify(datos)}`;
        }

        return mensajeFormateado;
    }

    /**
     * Escribe en el archivo de log de órdenes
     * @param {string} mensaje - Mensaje a escribir
     */
    async escribirLogOrdenes(mensaje) {
        try {
            await fs.appendFile(this.ordenesLogFile, mensaje + '\n');
        } catch (error) {
            console.error('Error escribiendo log de órdenes:', error);
        }
    }

    /**
     * Escribe en el archivo de log de errores
     * @param {string} mensaje - Mensaje a escribir
     */
    async escribirLogErrores(mensaje) {
        try {
            await fs.appendFile(this.erroresLogFile, mensaje + '\n');
            console.error(mensaje); // También mostrar en consola
        } catch (error) {
            console.error('Error escribiendo log de errores:', error);
        }
    }

    /**
     * Log de información general
     * @param {string} mensaje - Mensaje informativo
     * @param {object} datos - Datos adicionales
     */
    async info(mensaje, datos = null) {
        const mensajeFormateado = this.formatearMensaje('INFO', mensaje, datos);
        console.log(mensajeFormateado);
        await this.escribirLogOrdenes(mensajeFormateado);
    }

    /**
     * Log de error
     * @param {string} mensaje - Mensaje de error
     * @param {Error} error - Objeto de error
     * @param {object} datos - Datos adicionales
     */
    async error(mensaje, error = null, datos = null) {
        const mensajeFormateado = this.formatearMensaje('ERROR', mensaje, {
            error: error ? error.message : null,
            stack: error ? error.stack : null,
            ...datos
        });
        await this.escribirLogErrores(mensajeFormateado);
    }

    /**
     * Log de advertencia
     * @param {string} mensaje - Mensaje de advertencia
     * @param {object} datos - Datos adicionales
     */
    async warn(mensaje, datos = null) {
        const mensajeFormateado = this.formatearMensaje('WARN', mensaje, datos);
        console.warn(mensajeFormateado);
        await this.escribirLogOrdenes(mensajeFormateado);
    }

    // ========== LOGS ESPECÍFICOS DE ÓRDENES ==========

    /**
     * Log cuando se crea una orden
     * @param {number} idOrden - ID de la orden
     * @param {string} authUserId - ID del usuario
     * @param {number} total - Total de la orden
     */
    async ordenCreada(idOrden, authUserId, total) {
        await this.info('Orden creada', {
            id_orden: idOrden,
            auth_user_id: authUserId,
            total: total
        });
    }

    /**
     * Log cuando cambia el estado de una orden
     * @param {number} idOrden - ID de la orden
     * @param {string} estadoAnterior - Estado anterior
     * @param {string} estadoNuevo - Estado nuevo
     * @param {string} usuario - Usuario que realizó el cambio
     */
    async estadoOrdenCambiado(idOrden, estadoAnterior, estadoNuevo, usuario = 'SISTEMA') {
        await this.info('Estado de orden cambiado', {
            id_orden: idOrden,
            estado_anterior: estadoAnterior,
            estado_nuevo: estadoNuevo,
            cambiado_por: usuario
        });
    }

    /**
     * Log de error en validación de productos
     * @param {number} idOrden - ID de la orden
     * @param {string} error - Descripción del error
     */
    async errorValidacionProductos(idOrden, error) {
        await this.error('Error en validación de productos', null, {
            id_orden: idOrden,
            error: error
        });
    }

    /**
     * Log de error en comunicación con servicios externos
     * @param {string} servicio - Nombre del servicio (productos, pagos, envios)
     * @param {string} operacion - Operación que se intentaba realizar
     * @param {Error} error - Error ocurrido
     */
    async errorServicioExterno(servicio, operacion, error) {
        await this.error(`Error en comunicación con servicio ${servicio}`, error, {
            servicio: servicio,
            operacion: operacion
        });
    }

    /**
     * Log de actualización de stock
     * @param {number} idProducto - ID del producto
     * @param {number} cantidad - Cantidad actualizada
     * @param {string} motivo - Motivo de la actualización
     */
    async stockActualizado(idProducto, cantidad, motivo) {
        await this.info('Stock de producto actualizado', {
            id_producto: idProducto,
            cantidad: cantidad,
            motivo: motivo
        });
    }
}

// Instancia singleton del logger
const loggerOrdenes = new LoggerOrdenes();

module.exports = loggerOrdenes;