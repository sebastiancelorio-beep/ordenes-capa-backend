const { Router } = require('express');
const { validarDatosOrden, validarCambioEstado } = require('../middlewares/validar-ordenes');
const { validarJWT } = require('../middlewares/validar-jwt');
const { verificarPropietarioOrden, verificarPropietarioUsuario } = require('../middlewares/autorizacion');

const {
    ordenesGet,
    ordenGet,
    ordenesPorUsuarioGet,
    ordenesPost,
    ordenPut,
    ordenEstadoPatch,
    ordenDelete
} = require('../controllers/ordenes.controller');

const router = Router();

// Health check endpoint (no requiere autenticación)
router.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        service: 'Microservicio de Órdenes',
        timestamp: new Date().toISOString(),
        auth_provider: 'Auth0',
        database: 'MySQL'
    });
});

// END Points para órdenes
// GET /api/ordenes - Obtener todas las órdenes
router.get('/', [validarJWT], ordenesGet);

// GET /api/ordenes/:id - Obtener orden por ID
router.get('/:id', [validarJWT, verificarPropietarioOrden], ordenGet);

// GET /api/ordenes/usuario/:authUserId - Obtener órdenes por usuario
router.get('/usuario/:authUserId', [validarJWT, verificarPropietarioUsuario], ordenesPorUsuarioGet);

// POST /api/ordenes - Crear nueva orden
router.post('/', [validarJWT, validarDatosOrden], ordenesPost);

// PUT /api/ordenes/:id - Actualizar orden
router.put('/:id', [validarJWT, verificarPropietarioOrden], ordenPut);

// PATCH /api/ordenes/:id/estado - Actualizar estado de la orden
router.patch('/:id/estado', [validarJWT, verificarPropietarioOrden, validarCambioEstado], ordenEstadoPatch);

// DELETE /api/ordenes/:id - Eliminar orden
router.delete('/:id', [validarJWT, verificarPropietarioOrden], ordenDelete);

module.exports = router;