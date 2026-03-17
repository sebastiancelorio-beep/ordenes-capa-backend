class FormateadorRespuestas {

    /**
     * Formatea una respuesta exitosa estándar
     * @param {string} mensaje - Mensaje de éxito
     * @param {any} datos - Datos a incluir en la respuesta
     * @param {object} metadata - Metadatos adicionales (opcional)
     * @returns {object} - Respuesta formateada
     */
    static exito(mensaje, datos = null, metadata = {}) {
        return {
            ok: true,
            msg: mensaje,
            data: datos,
            timestamp: new Date().toISOString(),
            ...metadata
        };
    }

    /**
     * Formatea una respuesta de error estándar
     * @param {string} mensaje - Mensaje de error
     * @param {string|object} error - Detalles del error
     * @param {number} codigo - Código de estado HTTP
     * @returns {object} - Respuesta de error formateada
     */
    static error(mensaje, error = null, codigo = 500) {
        const respuesta = {
            ok: false,
            msg: mensaje,
            timestamp: new Date().toISOString()
        };

        if (error) {
            respuesta.err = typeof error === 'string' ? error : error.message || error;
        }

        // En desarrollo, incluir más detalles del error
        if (process.env.NODE_ENV === 'development' && error && error.stack) {
            respuesta.stack = error.stack;
        }

        return respuesta;
    }

    /**
     * Formatea una respuesta de lista con paginación
     * @param {Array} items - Array de items
     * @param {number} pagina - Página actual
     * @param {number} limite - Límite por página
     * @param {number} total - Total de registros
     * @returns {object} - Respuesta paginada formateada
     */
    static listaPaginada(items, pagina = 1, limite = 10, total = 0) {
        const totalPaginas = Math.ceil(total / limite);

        return this.exito('Lista obtenida exitosamente', items, {
            paginacion: {
                pagina: parseInt(pagina),
                limite: parseInt(limite),
                total: parseInt(total),
                totalPaginas,
                tieneSiguiente: pagina < totalPaginas,
                tieneAnterior: pagina > 1
            }
        });
    }

    /**
     * Formatea una respuesta de orden completa con detalles relacionados
     * @param {object} orden - Objeto de orden
     * @returns {object} - Respuesta formateada con orden completa
     */
    static ordenCompleta(orden) {
        if (!orden) {
            return this.error('Orden no encontrada');
        }

        // Calcular totales si no están incluidos
        const detalles = orden.detalles || orden.ordenes_detalles || [];
        const subtotal = detalles.reduce((total, detalle) => {
            return total + parseFloat(detalle.subtotal_item || 0);
        }, 0);

        const costoEnvio = parseFloat(orden.costo_envio || 0);
        const total = parseFloat(orden.total || 0);

        return this.exito('Orden obtenida exitosamente', {
            orden: {
                id_orden: orden.id_orden,
                auth_user_id: orden.auth_user_id,
                subtotal: subtotal,
                costo_envio: costoEnvio,
                total: total,
                estado_orden: orden.estado_orden,
                estado_pago: orden.estado_pago,
                estado_envio: orden.estado_envio,
                direccion_envio: orden.direccion_envio,
                ciudad: orden.ciudad,
                telefono_contacto: orden.telefono_contacto,
                observaciones: orden.observaciones,
                created_at: orden.created_at,
                updated_at: orden.updated_at,
                referencias: {
                    id_pago: orden.id_pago_referencia,
                    id_envio: orden.id_envio_referencia
                }
            },
            detalles: detalles.map(detalle => ({
                id_detalle: detalle.id_detalle,
                id_producto: detalle.id_producto,
                nombre_producto: detalle.nombre_producto_snapshot,
                precio_unitario: parseFloat(detalle.precio_unitario),
                cantidad: detalle.cantidad,
                subtotal_item: parseFloat(detalle.subtotal_item)
            }))
        });
    }

    /**
     * Formatea una respuesta de creación de orden
     * @param {object} orden - Orden creada
     * @param {object} pago - Registro de pago (opcional)
     * @param {object} envio - Registro de envío (opcional)
     * @returns {object} - Respuesta formateada
     */
    static ordenCreada(orden, pago = null, envio = null) {
        const respuesta = this.ordenCompleta(orden);

        if (pago) {
            respuesta.data.pago = {
                id_pago: pago.id_pago,
                estado_pago: pago.estado_pago,
                metodo_pago: pago.metodo_pago
            };
        }

        if (envio) {
            respuesta.data.envio = {
                id_envio: envio.id_envio,
                estado_envio: envio.estado_envio,
                costo_envio: parseFloat(envio.costo_envio)
            };
        }

        respuesta.msg = 'Orden creada exitosamente';
        return respuesta;
    }
}

module.exports = FormateadorRespuestas;