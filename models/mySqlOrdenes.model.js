const { DataTypes } = require('sequelize');
const { bdmysql, bdmysqlNube, bdmysqlOrdenes } = require('../database/mySqlConnection');

const Ordenes = bdmysqlOrdenes.define('ordenes', {
    id_orden: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    auth_user_id: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    subtotal: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    costo_envio: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00
    },
    total: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    estado_orden: {
        type: DataTypes.ENUM('creada', 'pendiente_pago', 'pagada', 'preparando', 'despachada', 'entregada', 'cancelada'),
        defaultValue: 'creada'
    },
    estado_pago: {
        type: DataTypes.ENUM('pendiente', 'pagado', 'fallido', 'reembolsado'),
        defaultValue: 'pendiente'
    },
    estado_envio: {
        type: DataTypes.ENUM('pendiente', 'preparado', 'despachado', 'en_transito', 'entregado', 'devuelto', 'cancelado'),
        defaultValue: 'pendiente'
    },
    id_pago_referencia: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    id_envio_referencia: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    direccion_envio: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    ciudad: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    telefono_contacto: {
        type: DataTypes.STRING(20),
        allowNull: true
    },
    observaciones: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    freezeTableName: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

const OrdenesDetalle = bdmysqlOrdenes.define('ordenes_detalle', {
    id_detalle: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    id_orden: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    id_producto: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    nombre_producto_snapshot: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    descripcion_snapshot: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    categoria_snapshot: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    talla_snapshot: {
        type: DataTypes.STRING(20),
        allowNull: true
    },
    precio_unitario: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    cantidad: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            min: 1
        }
    },
    subtotal_item: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    }
}, {
    freezeTableName: true,
    createdAt: 'created_at',
    updatedAt: false
});

// Definir relaciones
Ordenes.hasMany(OrdenesDetalle, { foreignKey: 'id_orden', as: 'detalles', onDelete: 'CASCADE' });
OrdenesDetalle.belongsTo(Ordenes, { foreignKey: 'id_orden' });

// Método para crear una orden usando el procedimiento almacenado
Ordenes.crearOrden = async function(data) {
    const itemsJson = JSON.stringify(data.items);

    // Llamar al procedimiento almacenado
    await bdmysqlOrdenes.query('CALL sp_crear_orden(?, ?, ?, ?, ?, ?, ?, @id_orden)', {
        replacements: [
            data.auth_user_id,
            data.direccion_envio,
            data.ciudad,
            data.telefono_contacto,
            data.observaciones,
            itemsJson,
            data.costo_envio
        ],
        type: bdmysqlOrdenes.QueryTypes.RAW
    });

    // Obtener el ID de la orden creada
    const [rows] = await bdmysqlOrdenes.query('SELECT @id_orden as id_orden', {
        type: bdmysqlOrdenes.QueryTypes.SELECT
    });

    return rows.id_orden;
};

// Método para obtener órdenes por usuario
Ordenes.getOrdenesByUser = async function(auth_user_id) {
    return await Ordenes.findAll({
        where: { auth_user_id },
        include: [{ model: OrdenesDetalle, as: 'detalles' }],
        order: [['created_at', 'DESC']]
    });
};

// Método para obtener una orden por ID
Ordenes.getOrdenById = async function(id_orden) {
    return await Ordenes.findByPk(id_orden, {
        include: [{ model: OrdenesDetalle, as: 'detalles' }]
    });
};

// Método para actualizar el estado de la orden
Ordenes.updateEstado = async function(id_orden, estado_orden) {
    return await Ordenes.update({ estado_orden }, { where: { id_orden } });
};

module.exports = {
    Ordenes,
    OrdenesDetalle
};