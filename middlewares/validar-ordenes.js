const { request, response } = require("express");

// Middleware para validar datos de entrada de órdenes
const validarDatosOrden = (req = request, res = response, next) => {
    const {
        auth_user_id,
        direccion_envio,
        ciudad,
        items
    } = req.body;

    // Validaciones básicas
    if (!auth_user_id) {
        return res.status(400).json({
            ok: false,
            msg: 'auth_user_id es requerido'
        });
    }

    if (!direccion_envio || direccion_envio.trim().length < 10) {
        return res.status(400).json({
            ok: false,
            msg: 'direccion_envio es requerida y debe tener al menos 10 caracteres'
        });
    }

    if (!ciudad || ciudad.trim().length < 3) {
        return res.status(400).json({
            ok: false,
            msg: 'ciudad es requerida y debe tener al menos 3 caracteres'
        });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
            ok: false,
            msg: 'items es requerido y debe ser un array con al menos un producto'
        });
    }

    // Validar estructura de items
    for (let i = 0; i < items.length; i++) {
        const item = items[i];

        if (!item.id_producto || typeof item.id_producto !== 'number') {
            return res.status(400).json({
                ok: false,
                msg: `Item ${i + 1}: id_producto es requerido y debe ser un número`
            });
        }

        if (!item.cantidad || typeof item.cantidad !== 'number' || item.cantidad <= 0) {
            return res.status(400).json({
                ok: false,
                msg: `Item ${i + 1}: cantidad es requerida y debe ser un número mayor a 0`
            });
        }
    }

    next();
};

// Middleware para validar cambio de estado de orden
const validarCambioEstado = (req = request, res = response, next) => {
    const { estado_orden } = req.body;
    const estadosValidos = ['creada', 'pendiente_pago', 'pagada', 'preparando', 'despachada', 'entregada', 'cancelada'];

    if (!estado_orden) {
        return res.status(400).json({
            ok: false,
            msg: 'estado_orden es requerido'
        });
    }

    if (!estadosValidos.includes(estado_orden)) {
        return res.status(400).json({
            ok: false,
            msg: `estado_orden debe ser uno de: ${estadosValidos.join(', ')}`
        });
    }

    next();
};

module.exports = {
    validarDatosOrden,
    validarCambioEstado
};