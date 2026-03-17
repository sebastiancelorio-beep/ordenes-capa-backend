const express = require('express')
const cors = require('cors')
const morgan = require('morgan')

const { bdmysqlOrdenes } = require('../database/mySqlConnection');


class Server {


    constructor() {
        this.app = express();
        this.port = process.env.PORT;

        
        this.pathsMySql = {
            auth: '/api/auth',
            prueba: '/api/prueba',

            //PATH ordenes
            ordenes: '/api/ordenes',

        }
        

        //Aqui me conecto a la BD
        this.dbConnection();

        //Middlewares
        this.middlewares();

        //Routes
        this.routes();

    }


    async dbConnection() {
        try {
            await bdmysqlOrdenes.authenticate();
            console.log('Connection OK a MySQL (Ordenes).');
        } catch (error) {
            console.error('No se pudo Conectar a la BD MySQL', error);
        }
    }


    routes() {

        //this.app.use(this.pathsMySql.auth, require('../routes/MySqlAuth'));

        //Aqui activo la ruta de ORDENES
        this.app.use(this.pathsMySql.ordenes, require('../routes/ordenes.route'));


    }

  
    middlewares() {
        
        this.app.use(cors());

        // Morgan para logging de requests en modo dev
        this.app.use(morgan('dev'));
       
        this.app.use(express.json());

        //Directorio publico
        this.app.use(express.static('public'));

    }
    

    listen() {
        this.app.listen(this.port, () => {
            console.log('Servidor corriendo en puerto', this.port);
        });
    }

}

module.exports = Server;