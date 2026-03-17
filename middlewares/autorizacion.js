const { request, response } = require("express");

// Middleware para verificar que el usuario solo acceda a sus propios recursos
const verificarPropietarioOrden = async (req = request, res = response, next) => {
    try {
        const { id } = req.params;
        const usuarioAutenticado = req.usuario;

        if (!usuarioAutenticado || !usuarioAutenticado.auth_user_id) {
            return res.status(401).json({
                ok: false,
                msg: 'Usuario no autenticado'
            });
        }

        // Importar el modelo aquí para evitar dependencias circulares
        const { Ordenes } = require('../models/mySqlOrdenes.model');

        // Verificar que la orden pertenece al usuario autenticado
        const orden = await Ordenes.findByPk(id);

        if (!orden) {
            return res.status(404).json({
                ok: false,
                msg: 'Orden no encontrada'
            });
        }

        if (orden.auth_user_id !== usuarioAutenticado.auth_user_id) {
            return res.status(403).json({
                ok: false,
                msg: 'No tienes permisos para acceder a esta orden'
            });
        }

        // Agregar la orden al request para uso posterior
        req.orden = orden;
        next();

    } catch (error) {
        console.error('Error en middleware verificarPropietarioOrden:', error);
        res.status(500).json({
            ok: false,
            msg: 'Error interno del servidor'
        });
    }
};

// Middleware para verificar propiedad de órdenes en operaciones de usuario
const verificarPropietarioUsuario = (req = request, res = response, next) => {
    const { authUserId } = req.params;
    const usuarioAutenticado = req.usuario;

    if (!usuarioAutenticado || !usuarioAutenticado.auth_user_id) {
        return res.status(401).json({
            ok: false,
            msg: 'Usuario no autenticado'
        });
    }

    // Verificar que el usuario solo consulte sus propias órdenes
    if (authUserId !== usuarioAutenticado.auth_user_id) {
        return res.status(403).json({
            ok: false,
            msg: 'No tienes permisos para acceder a las órdenes de otro usuario'
        });
    }

    next();
};

// Middleware para administradores (si se implementa en el futuro)
const verificarAdmin = (req = request, res = response, next) => {
    const usuarioAutenticado = req.usuario;

    if (!usuarioAutenticado) {
        return res.status(401).json({
            ok: false,
            msg: 'Usuario no autenticado'
        });
    }

    // Aquí se podría verificar si el usuario tiene rol de admin
    // Por ahora, solo verificar que esté autenticado
    // En el futuro: if (!usuarioAutenticado.roles?.includes('admin'))

    next();
};

module.exports = {
    verificarPropietarioOrden,
    verificarPropietarioUsuario,
    verificarAdmin
};