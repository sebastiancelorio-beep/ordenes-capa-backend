const { response, request } = require('express');
const { Ordenes, OrdenesDetalle } = require('../models/mySqlOrdenes.model');
const ServiciosExternos = require('../helpers/servicios-externos');
const CalculosOrdenes = require('../helpers/calculos-ordenes');
const FormateadorRespuestas = require('../helpers/formateador-respuestas');
const loggerOrdenes = require('../helpers/logger-ordenes');

// GET /api/ordenes - Obtener órdenes del usuario autenticado
const ordenesGet = async (req, res = response) => {
    try {
        const usuarioAutenticado = req.usuario;

        if (!usuarioAutenticado || !usuarioAutenticado.auth_user_id) {
            return res.status(401).json(FormateadorRespuestas.error('Usuario no autenticado'));
        }

        const ordenes = await Ordenes.findAll({
            where: { auth_user_id: usuarioAutenticado.auth_user_id },
            include: [{
                model: OrdenesDetalle,
                as: 'detalles'
            }],
            order: [['created_at', 'DESC']]
        });

        res.json(FormateadorRespuestas.exito('Órdenes obtenidas exitosamente', ordenes));

    } catch (error) {
        loggerOrdenes.error('Error obteniendo órdenes del usuario', error, {
            user_id: req.usuario?.auth_user_id
        });
        res.status(500).json(FormateadorRespuestas.error('Error obteniendo órdenes', error));
    }
};

// GET /api/ordenes/:id - Obtener orden por ID
const ordenGet = async (req, res = response) => {
    const { id } = req.params;

    try {
        const orden = await Ordenes.findByPk(id, {
            include: [{
                model: OrdenesDetalle,
                as: 'detalles'
            }]
        });

        if (!orden) {
            return res.status(404).json(FormateadorRespuestas.error('Orden no encontrada'));
        }

        res.json(FormateadorRespuestas.ordenCompleta(orden));

    } catch (error) {
        loggerOrdenes.error('Error obteniendo orden por ID', error, { id_orden: id });
        res.status(500).json(FormateadorRespuestas.error('Error obteniendo orden', error));
    }
};

// GET /api/ordenes/usuario/:authUserId - Obtener órdenes por usuario (con verificación de propiedad)
const ordenesPorUsuarioGet = async (req, res = response) => {
    const { authUserId } = req.params;

    try {
        const ordenes = await Ordenes.findAll({
            where: { auth_user_id: authUserId },
            include: [{
                model: OrdenesDetalle,
                as: 'detalles'
            }],
            order: [['created_at', 'DESC']]
        });

        res.json(FormateadorRespuestas.exito('Órdenes del usuario obtenidas exitosamente', ordenes));

    } catch (error) {
        loggerOrdenes.error('Error obteniendo órdenes por usuario', error, {
            authUserId,
            user_id: req.usuario?.auth_user_id
        });
        res.status(500).json(FormateadorRespuestas.error('Error obteniendo órdenes del usuario', error));
    }
};

// POST /api/ordenes - Crear nueva orden
const ordenesPost = async (req, res = response) => {
    const {
        auth_user_id,
        direccion_envio,
        ciudad,
        telefono_contacto,
        observaciones,
        items, // Array de objetos: [{id_producto, cantidad}]
        costo_envio
    } = req.body;

    try {
        // 1. Validar productos con API externa y obtener precios actuales
        const productosValidados = await ServiciosExternos.validarProductos(items);

        // 2. Calcular subtotal usando el helper
        const subtotal = CalculosOrdenes.calcularSubtotal(productosValidados);

        // 3. Calcular costo de envío (si no viene en el request, calcularlo)
        let costoEnvioFinal = costo_envio;
        if (!costoEnvioFinal) {
            costoEnvioFinal = CalculosOrdenes.calcularCostoEnvioPorCiudad(ciudad);
        }

        // 4. Calcular total usando el helper
        const total = CalculosOrdenes.calcularTotal(subtotal, costoEnvioFinal);

        // 5. Preparar items con información actualizada para el stored procedure
        const itemsParaOrden = productosValidados.map(producto => ({
            id_producto: producto.id_producto,
            nombre: producto.nombre,
            precio: producto.precio,
            cantidad: producto.cantidad_solicitada
        }));

        // 6. Crear la orden usando el procedimiento almacenado
        const id_orden = await Ordenes.crearOrden({
            auth_user_id,
            direccion_envio,
            ciudad,
            telefono_contacto,
            observaciones,
            items: itemsParaOrden,
            costo_envio: costoEnvioFinal
        });

        // 7. Crear registro de pago
        const pagoCreado = await ServiciosExternos.crearPago({
            id_orden,
            monto: total,
            metodo_pago: 'pendiente'
        });

        // 8. Crear registro de envío
        const envioCreado = await ServiciosExternos.crearEnvio({
            id_orden,
            ciudad,
            direccion_envio,
            costo_envio: costoEnvioFinal
        });

        // 9. Actualizar referencias en la orden
        await Ordenes.update({
            id_pago_referencia: pagoCreado.id_pago,
            id_envio_referencia: envioCreado.id_envio
        }, { where: { id_orden } });

        // 10. Obtener la orden completa con detalles
        const ordenCompleta = await Ordenes.findByPk(id_orden, {
            include: [{
                model: OrdenesDetalle,
                as: 'detalles'
            }]
        });

        // 11. Log de orden creada
        await loggerOrdenes.ordenCreada(id_orden, auth_user_id, total);

        res.json(FormateadorRespuestas.ordenCreada(ordenCompleta, pagoCreado, envioCreado));

    } catch (error) {
        loggerOrdenes.error('Error creando orden', error, {
            auth_user_id,
            ciudad,
            items_count: items?.length
        });
        res.status(500).json(FormateadorRespuestas.error('Error al crear la orden', error));
    }
};

// PATCH /api/ordenes/:id/estado - Actualizar estado de la orden
const ordenEstadoPatch = async (req, res = response) => {
    const { id } = req.params;
    const { estado_orden } = req.body;

    try {
        const orden = await Ordenes.findByPk(id);

        if (!orden) {
            return res.status(404).json(FormateadorRespuestas.error('Orden no encontrada'));
        }

        const estadoAnterior = orden.estado_orden;

        // Actualizar estado de la orden
        await orden.update({ estado_orden });

        // Log del cambio de estado
        await loggerOrdenes.estadoOrdenCambiado(id, estadoAnterior, estado_orden);

        // Notificar a servicios externos según el nuevo estado
        if (estado_orden === 'pagada' && orden.id_pago_referencia) {
            try {
                await ServiciosExternos.actualizarEstadoPago(orden.id_pago_referencia, 'pagada');
                await loggerOrdenes.info('Pago actualizado a pagado', { id_orden: id, id_pago: orden.id_pago_referencia });
            } catch (error) {
                await loggerOrdenes.errorServicioExterno('pagos', 'actualizar_estado', error);
            }
        }

        if (estado_orden === 'preparando' && orden.id_envio_referencia) {
            try {
                await ServiciosExternos.actualizarEstadoEnvio(orden.id_envio_referencia, 'preparado');
                await loggerOrdenes.info('Envío actualizado a preparado', { id_orden: id, id_envio: orden.id_envio_referencia });
            } catch (error) {
                await loggerOrdenes.errorServicioExterno('envios', 'actualizar_estado', error);
            }
        }

        if (estado_orden === 'despachada' && orden.id_envio_referencia) {
            try {
                await ServiciosExternos.actualizarEstadoEnvio(orden.id_envio_referencia, 'despachado');

                // Actualizar stock de productos (descontar definitivamente)
                const detalles = await OrdenesDetalle.findAll({ where: { id_orden: id } });
                const itemsParaStock = detalles.map(detalle => ({
                    id_producto: detalle.id_producto,
                    cantidad: detalle.cantidad
                }));
                await ServiciosExternos.actualizarStock(itemsParaStock);

                await loggerOrdenes.info('Stock actualizado por despacho', { id_orden: id, items: itemsParaStock.length });
            } catch (error) {
                await loggerOrdenes.errorServicioExterno('productos', 'actualizar_stock', error);
            }
        }

        if (estado_orden === 'entregada' && orden.id_envio_referencia) {
            try {
                await ServiciosExternos.actualizarEstadoEnvio(orden.id_envio_referencia, 'entregado');
                await loggerOrdenes.info('Envío marcado como entregado', { id_orden: id, id_envio: orden.id_envio_referencia });
            } catch (error) {
                await loggerOrdenes.errorServicioExterno('envios', 'marcar_entregado', error);
            }
        }

        if (estado_orden === 'cancelada') {
            try {
                // Cancelar pago y envío si existen
                if (orden.id_pago_referencia) {
                    await ServiciosExternos.actualizarEstadoPago(orden.id_pago_referencia, 'cancelada');
                }
                if (orden.id_envio_referencia) {
                    await ServiciosExternos.actualizarEstadoEnvio(orden.id_envio_referencia, 'cancelado');
                }
                await loggerOrdenes.warn('Orden cancelada', { id_orden: id });
            } catch (error) {
                await loggerOrdenes.errorServicioExterno('cancelacion', 'cancelar_orden', error);
            }
        }

        res.json(FormateadorRespuestas.exito('Estado de la orden actualizado', orden));

    } catch (error) {
        loggerOrdenes.error('Error actualizando estado de orden', error, { id_orden: id, estado_deseado: estado_orden });
        res.status(500).json(FormateadorRespuestas.error('Error actualizando estado de orden', error));
    }
};

// PUT /api/ordenes/:id - Actualizar orden
const ordenPut = async (req, res = response) => {
    const { id } = req.params;
    const { body } = req;

    try {
        const orden = await Ordenes.findByPk(id);

        if (!orden) {
            return res.status(404).json({
                ok: false,
                msg: 'No existe una orden con el id: ' + id
            });
        }

        await orden.update(body);

        res.json({
            ok: true,
            msg: 'Orden actualizada',
            data: orden
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok: false,
            msg: 'Hable con el Administrador',
            err: error
        });
    }
};

// DELETE /api/ordenes/:id - Eliminar orden
const ordenDelete = async (req, res = response) => {
    const { id } = req.params;

    try {
        const orden = await Ordenes.findByPk(id);

        if (!orden) {
            return res.status(404).json({
                ok: false,
                msg: 'No existe una orden con el id: ' + id
            });
        }

        // Los detalles se eliminan automáticamente por CASCADE
        await orden.destroy();

        res.json({
            ok: true,
            msg: 'Orden eliminada',
            data: orden
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok: false,
            msg: 'Hable con el Administrador',
            err: error
        });
    }
};

module.exports = {
    ordenesGet,
    ordenGet,
    ordenesPorUsuarioGet,
    ordenesPost,
    ordenPut,
    ordenEstadoPatch,
    ordenDelete
};