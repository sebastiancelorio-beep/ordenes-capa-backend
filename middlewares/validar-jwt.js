const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');
const { request, response } = require("express");

// Cliente JWKS para obtener la clave pública de Auth0
const client = jwksClient({
    jwksUri: `https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`
});

// Función para obtener la clave de firma
function getKey(header, callback) {
    client.getSigningKey(header.kid, function(err, key) {
        if (err) {
            callback(err);
        } else {
            const signingKey = key.publicKey || key.rsaPublicKey;
            callback(null, signingKey);
        }
    });
}

// Middleware para validar JWT de Auth0
const validarJWT = async (req = request, res = response, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '') || req.header('x-token');

    if (!token) {
        return res.status(401).json({
            msg: 'No hay token en la petición'
        });
    }

    try {
        // Verificar el token usando la clave pública de Auth0
        jwt.verify(token, getKey, {
            audience: process.env.AUTH0_AUDIENCE,
            issuer: `https://${process.env.AUTH0_DOMAIN}/`,
            algorithms: ['RS256']
        }, function(err, decoded) {
            if (err) {
                console.log('Error al validar JWT de Auth0:', err.message);
                return res.status(401).json({
                    msg: 'Token no válido'
                });
            }

            // Agregar información del usuario al request
            req.usuario = {
                uid: decoded.sub, // Auth0 user ID
                auth_user_id: decoded.sub,
                email: decoded.email,
                nombre: decoded.name || decoded.nickname,
                email_verified: decoded.email_verified,
                // Información adicional de Auth0
                auth0_metadata: {
                    iss: decoded.iss,
                    aud: decoded.aud,
                    iat: decoded.iat,
                    exp: decoded.exp
                }
            };

            next();
        });

    } catch (error) {
        console.log('Error al validar JWT:', error.message);
        return res.status(401).json({
            msg: 'Token no válido'
        });
    }
};

module.exports = {
    validarJWT
};
