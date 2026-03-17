class CalculosOrdenes {

    /**
     * Calcula el subtotal de una lista de items
     * @param {Array} items - Array de objetos con precio y cantidad
     * @returns {number} - Subtotal calculado
     */
    static calcularSubtotal(items) {
        if (!Array.isArray(items)) {
            throw new Error('Items debe ser un array');
        }

        return items.reduce((total, item) => {
            const precio = parseFloat(item.precio) || 0;
            const cantidad = parseInt(item.cantidad) || 0;
            return total + (precio * cantidad);
        }, 0);
    }

    /**
     * Calcula el total incluyendo costo de envío
     * @param {number} subtotal - Subtotal de los productos
     * @param {number} costoEnvio - Costo de envío
     * @param {number} descuento - Descuento opcional (default 0)
     * @returns {number} - Total calculado
     */
    static calcularTotal(subtotal, costoEnvio, descuento = 0) {
        const subtotalNum = parseFloat(subtotal) || 0;
        const envioNum = parseFloat(costoEnvio) || 0;
        const descuentoNum = parseFloat(descuento) || 0;

        return Math.max(0, subtotalNum + envioNum - descuentoNum);
    }

    /**
     * Calcula el subtotal de un item individual
     * @param {number} precio - Precio unitario
     * @param {number} cantidad - Cantidad
     * @returns {number} - Subtotal del item
     */
    static calcularSubtotalItem(precio, cantidad) {
        const precioNum = parseFloat(precio) || 0;
        const cantidadNum = parseInt(cantidad) || 0;

        return precioNum * cantidadNum;
    }

    /**
     * Valida que los cálculos sean consistentes
     * @param {Array} items - Items de la orden
     * @param {number} subtotalEsperado - Subtotal que debería resultar
     * @param {number} costoEnvio - Costo de envío
     * @param {number} totalEsperado - Total que debería resultar
     * @returns {boolean} - True si los cálculos son consistentes
     */
    static validarCalculos(items, subtotalEsperado, costoEnvio, totalEsperado) {
        const subtotalCalculado = this.calcularSubtotal(items);
        const totalCalculado = this.calcularTotal(subtotalCalculado, costoEnvio);

        const tolerancia = 0.01; // Tolerancia para decimales

        return (
            Math.abs(subtotalCalculado - subtotalEsperado) < tolerancia &&
            Math.abs(totalCalculado - totalEsperado) < tolerancia
        );
    }

    /**
     * Formatea un número como moneda (COP)
     * @param {number} valor - Valor a formatear
     * @returns {string} - Valor formateado como moneda
     */
    static formatearMoneda(valor) {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0
        }).format(valor);
    }

    /**
     * Calcula costo de envío basado en ciudad (lógica simple)
     * @param {string} ciudad - Ciudad de destino
     * @returns {number} - Costo de envío
     */
    static calcularCostoEnvioPorCiudad(ciudad) {
        if (!ciudad) return 15000; // Costo por defecto

        const ciudadLower = ciudad.toLowerCase();

        // Ciudades principales con costo diferente
        if (['bogotá', 'medellín'].includes(ciudadLower)) {
            return 12000;
        }

        if (['cali', 'barranquilla', 'cartagena'].includes(ciudadLower)) {
            return 18000;
        }

        // Ciudades pequeñas o por defecto
        return 15000;
    }
}

module.exports = CalculosOrdenes;