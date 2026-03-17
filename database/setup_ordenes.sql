-- =====================================================
-- MICROSERVICIO DE ÓRDENES - BASE DE DATOS
-- =====================================================
-- Base de datos para el microservicio de órdenes
-- =====================================================

CREATE DATABASE IF NOT EXISTS db_ordenes;
USE db_ordenes;

-- =====================================================
-- TABLA: ordenes
-- =====================================================
-- Almacena la cabecera de cada orden de compra
-- =====================================================

CREATE TABLE ordenes (
    id_orden INT PRIMARY KEY AUTO_INCREMENT,
    auth_user_id VARCHAR(100) NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    costo_envio DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    total DECIMAL(10, 2) NOT NULL,
    estado_orden ENUM(
        'creada',
        'pendiente_pago',
        'pagada',
        'preparando',
        'despachada',
        'entregada',
        'cancelada'
    ) DEFAULT 'creada',
    estado_pago ENUM(
        'pendiente',
        'pagado',
        'fallido',
        'reembolsado'
    ) DEFAULT 'pendiente',
    estado_envio ENUM(
        'pendiente',
        'preparado',
        'despachado',
        'en_transito',
        'entregado',
        'devuelto',
        'cancelado'
    ) DEFAULT 'pendiente',
    id_pago_referencia INT NULL COMMENT 'ID del pago en el microservicio de pagos',
    id_envio_referencia INT NULL COMMENT 'ID del envío en el microservicio de envíos',
    direccion_envio TEXT NOT NULL,
    ciudad VARCHAR(100) NOT NULL,
    telefono_contacto VARCHAR(20),
    observaciones TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- Índices para búsquedas rápidas
    INDEX idx_usuario (auth_user_id),
    INDEX idx_estado_orden (estado_orden),
    INDEX idx_estado_pago (estado_pago),
    INDEX idx_fecha (created_at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- =====================================================
-- TABLA: ordenes_detalle
-- =====================================================
-- Almacena los productos de cada orden
-- =====================================================

CREATE TABLE ordenes_detalle (
    id_detalle INT PRIMARY KEY AUTO_INCREMENT,
    id_orden INT NOT NULL,
    id_producto INT NOT NULL COMMENT 'ID del producto en microservicio de productos',
    nombre_producto_snapshot VARCHAR(255) NOT NULL COMMENT 'Nombre del producto al momento de la compra',
    descripcion_snapshot TEXT COMMENT 'Descripción del producto al momento de la compra',
    categoria_snapshot VARCHAR(100) COMMENT 'Categoría del producto al momento de la compra',
    talla_snapshot VARCHAR(20) COMMENT 'Talla del producto al momento de la compra',
    precio_unitario DECIMAL(10, 2) NOT NULL COMMENT 'Precio al momento de la compra',
    cantidad INT NOT NULL CHECK (cantidad > 0),
    subtotal_item DECIMAL(10, 2) GENERATED ALWAYS AS (precio_unitario * cantidad) STORED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (id_orden) REFERENCES ordenes(id_orden) ON DELETE CASCADE,
    INDEX idx_producto (id_producto)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- =====================================================
-- TABLA: ordenes_historial_estados
-- =====================================================
-- Audita los cambios de estado de la orden
-- Útil para trazabilidad y debugging
-- =====================================================

CREATE TABLE ordenes_historial_estados (
    id_historial INT PRIMARY KEY AUTO_INCREMENT,
    id_orden INT NOT NULL,
    estado_anterior VARCHAR(50),
    estado_nuevo VARCHAR(50) NOT NULL,
    cambiado_por VARCHAR(100) COMMENT 'Sistema, usuario, admin, etc.',
    motivo TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (id_orden) REFERENCES ordenes(id_orden) ON DELETE CASCADE,
    INDEX idx_orden_historial (id_orden)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- =====================================================
-- TABLA: ordenes_log_comunicacion (OPCIONAL)
-- =====================================================
-- Registra la comunicación con otros microservicios
-- Útil para debugging y monitoreo
-- =====================================================

CREATE TABLE ordenes_log_comunicacion (
    id_log INT PRIMARY KEY AUTO_INCREMENT,
    id_orden INT NOT NULL,
    microservicio_destino ENUM('productos', 'pagos', 'envios', 'carrito') NOT NULL,
    endpoint_consultado VARCHAR(255),
    request_data JSON,
    response_data JSON,
    codigo_respuesta INT,
    estado ENUM('exitoso', 'fallido') DEFAULT 'exitoso',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (id_orden) REFERENCES ordenes(id_orden) ON DELETE CASCADE,
    INDEX idx_log_orden (id_orden)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- =====================================================
-- TABLA: ordenes_temporales (OPCIONAL)
-- =====================================================
-- Para manejar el proceso de creación antes de confirmar
-- Útil si quieres implementar un "checkout" en varios pasos
-- =====================================================

CREATE TABLE ordenes_temporales (
    id_temp INT PRIMARY KEY AUTO_INCREMENT,
    auth_user_id VARCHAR(100) NOT NULL,
    id_carrito_referencia INT COMMENT 'ID del carrito en microservicio carrito',
    datos_checkout JSON COMMENT 'Datos completos del checkout en proceso',
    direccion_envio TEXT,
    ciudad VARCHAR(100),
    telefono_contacto VARCHAR(20),
    metodo_pago VARCHAR(50),
    estado_temp ENUM('en_proceso', 'completado', 'abandonado') DEFAULT 'en_proceso',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_usuario_temp (auth_user_id),
    INDEX idx_estado_temp (estado_temp)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- =====================================================
-- VISTAS ÚTILES
-- =====================================================

-- Vista de órdenes con total de items
CREATE VIEW v_ordenes_resumen AS
SELECT
    o.id_orden,
    o.auth_user_id,
    o.subtotal,
    o.costo_envio,
    o.total,
    o.estado_orden,
    o.estado_pago,
    o.estado_envio,
    o.ciudad,
    COUNT(od.id_detalle) AS cantidad_items,
    SUM(od.cantidad) AS total_productos,
    o.created_at,
    o.updated_at
FROM ordenes o
LEFT JOIN ordenes_detalle od ON o.id_orden = od.id_orden
GROUP BY o.id_orden;

-- Vista de órdenes por cliente
CREATE VIEW v_ordenes_por_cliente AS
SELECT
    auth_user_id,
    COUNT(*) AS total_ordenes,
    SUM(CASE WHEN estado_orden = 'entregada' THEN 1 ELSE 0 END) AS ordenes_completadas,
    SUM(CASE WHEN estado_orden = 'cancelada' THEN 1 ELSE 0 END) AS ordenes_canceladas,
    SUM(total) AS monto_total_gastado,
    MAX(created_at) AS ultima_orden
FROM ordenes
GROUP BY auth_user_id;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger para registrar cambios de estado automáticamente
DELIMITER $$

CREATE TRIGGER tr_ordenes_after_update_estado
AFTER UPDATE ON ordenes
FOR EACH ROW
BEGIN
    IF OLD.estado_orden != NEW.estado_orden THEN
        INSERT INTO ordenes_historial_estados
            (id_orden, estado_anterior, estado_nuevo, cambiado_por, motivo)
        VALUES
            (NEW.id_orden, OLD.estado_orden, NEW.estado_orden, 'SISTEMA', 'Cambio automático por trigger');
    END IF;

    IF OLD.estado_pago != NEW.estado_pago THEN
        INSERT INTO ordenes_historial_estados
            (id_orden, estado_anterior, estado_nuevo, cambiado_por, motivo)
        VALUES
            (NEW.id_orden, CONCAT('pago_', OLD.estado_pago), CONCAT('pago_', NEW.estado_pago), 'SISTEMA', 'Cambio en estado de pago');
    END IF;
END$$

DELIMITER ;

-- =====================================================
-- DATOS DE EJEMPLO PARA PRUEBAS
-- =====================================================

-- Insertar una orden de ejemplo
INSERT INTO ordenes (
    auth_user_id,
    subtotal,
    costo_envio,
    total,
    estado_orden,
    estado_pago,
    direccion_envio,
    ciudad,
    telefono_contacto
) VALUES (
    'auth0|123456789',
    150000.00,
    12000.00,
    162000.00,
    'creada',
    'pendiente',
    'Calle 123 #45-67',
    'Bogotá',
    '3001234567'
);

-- Insertar detalles de la orden de ejemplo
INSERT INTO ordenes_detalle (
    id_orden,
    id_producto,
    nombre_producto_snapshot,
    categoria_snapshot,
    talla_snapshot,
    precio_unitario,
    cantidad
) VALUES
    (1, 101, 'Faja postquirúrgica lumbar', 'Fajas', 'M', 85000.00, 1),
    (1, 102, 'Medias de compresión', 'medias', 'L', 65000.00, 1);

-- =====================================================
-- PROCEDIMIENTOS ALMACENADOS
-- =====================================================

-- Procedimiento para crear una nueva orden
DELIMITER $$

CREATE PROCEDURE sp_crear_orden(
    IN p_auth_user_id VARCHAR(100),
    IN p_direccion_envio TEXT,
    IN p_ciudad VARCHAR(100),
    IN p_telefono_contacto VARCHAR(20),
    IN p_observaciones TEXT,
    IN p_items JSON, -- Formato: [{"id_producto":101, "nombre":"...", "precio":85000, "cantidad":1}]
    IN p_costo_envio DECIMAL(10,2),
    OUT p_id_orden INT
)
BEGIN
    DECLARE v_subtotal DECIMAL(10,2) DEFAULT 0;
    DECLARE v_total DECIMAL(10,2) DEFAULT 0;
    DECLARE v_item_count INT DEFAULT 0;
    DECLARE v_i INT DEFAULT 0;
    DECLARE v_id_producto INT;
    DECLARE v_nombre_producto VARCHAR(255);
    DECLARE v_precio DECIMAL(10,2);
    DECLARE v_cantidad INT;

    -- Calcular subtotal del JSON
    SET v_item_count = JSON_LENGTH(p_items);

    WHILE v_i < v_item_count DO
        SET v_precio = JSON_UNQUOTE(JSON_EXTRACT(p_items, CONCAT('$[', v_i, '].precio')));
        SET v_cantidad = JSON_UNQUOTE(JSON_EXTRACT(p_items, CONCAT('$[', v_i, '].cantidad')));
        SET v_subtotal = v_subtotal + (v_precio * v_cantidad);
        SET v_i = v_i + 1;
    END WHILE;

    -- Calcular total
    SET v_total = v_subtotal + p_costo_envio;

    -- Insertar la orden
    INSERT INTO ordenes (
        auth_user_id,
        subtotal,
        costo_envio,
        total,
        direccion_envio,
        ciudad,
        telefono_contacto,
        observaciones
    ) VALUES (
        p_auth_user_id,
        v_subtotal,
        p_costo_envio,
        v_total,
        p_direccion_envio,
        p_ciudad,
        p_telefono_contacto,
        p_observaciones
    );

    SET p_id_orden = LAST_INSERT_ID();

    -- Insertar detalles
    SET v_i = 0;
    WHILE v_i < v_item_count DO
        SET v_id_producto = JSON_UNQUOTE(JSON_EXTRACT(p_items, CONCAT('$[', v_i, '].id_producto')));
        SET v_nombre_producto = JSON_UNQUOTE(JSON_EXTRACT(p_items, CONCAT('$[', v_i, '].nombre')));
        SET v_precio = JSON_UNQUOTE(JSON_EXTRACT(p_items, CONCAT('$[', v_i, '].precio')));
        SET v_cantidad = JSON_UNQUOTE(JSON_EXTRACT(p_items, CONCAT('$[', v_i, '].cantidad')));

        INSERT INTO ordenes_detalle (
            id_orden,
            id_producto,
            nombre_producto_snapshot,
            precio_unitario,
            cantidad
        ) VALUES (
            p_id_orden,
            v_id_producto,
            v_nombre_producto,
            v_precio,
            v_cantidad
        );

        SET v_i = v_i + 1;
    END WHILE;

    -- Registrar en historial
    INSERT INTO ordenes_historial_estados (id_orden, estado_nuevo, cambiado_por, motivo)
    VALUES (p_id_orden, 'creada', 'SISTEMA', 'Orden creada mediante procedimiento sp_crear_orden');

END$$

DELIMITER ;

-- =====================================================
-- ÍNDICES ADICIONALES PARA RENDIMIENTO
-- =====================================================

CREATE INDEX idx_ordenes_fecha_usuario ON ordenes(auth_user_id, created_at);
CREATE INDEX idx_detalle_orden_producto ON ordenes_detalle(id_orden, id_producto);
CREATE INDEX idx_historial_fecha ON ordenes_historial_estados(created_at);

-- =====================================================
-- USUARIO Y PERMISOS (OPCIONAL - si usas usuario dedicado)
-- =====================================================

-- CREATE USER IF NOT EXISTS 'app_ordenes'@'localhost' IDENTIFIED BY 'password_seguro';
-- GRANT SELECT, INSERT, UPDATE, DELETE ON db_ordenes.* TO 'app_ordenes'@'localhost';
-- FLUSH PRIVILEGES;

-- =====================================================
-- FIN DEL SCRIPT
-- =====================================================