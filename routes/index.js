var express = require('express');
var router = express.Router();
const csv = require('csv-parser');
const fs = require('fs');
const validator = require('validator');

var {client,dbName} = require('../db/mongodb');

router.get('/', (req, res) => {
  const results = [];
  let duplicados = 0; // variable para contar duplicados
  fs.createReadStream('public/MOCK_DATA.csv')
    .pipe(csv(['Nombre', 'Correo', 'Telefono']))
    .on('data', (data) => results.push(data))
    .on('end', async () => {

      try {
        await client.connect(); // Conectamos al cliente de MongoDB
        const db = client.db(dbName); // Obtenemos una referencia a la base de datos
        const personas = db.collection('personas'); // Obtenemos una referencia a la colección
      
        // Creamos un índice único en el campo Correo para evitar duplicados
        await personas.createIndex({ Nombre: 1 }, { unique: true });
      
        // Insertamos cada registro en la colección
        for (const data of results) {
          try {
            await personas.insertOne(data);
          } catch (err) {
            if (err.code === 11000) { // Error de índice único (duplicado)
              duplicados++;
            } else {
              console.error(err);
            }
          }
        }
      
        console.log('Datos insertados correctamente');
      } catch (err) {
        console.error(err);
      } finally {
        await client.close(); // Cerramos la conexión con el cliente de MongoDB
      }

      results.sort((a, b) => (a.Nombre > b.Nombre) ? 1 : -1);
      const totalNombres = results.length;

      // Busca duplicados en los nombres
      const nombreCounts = {};
      results.forEach((data) => {
        if (!nombreCounts[data.Nombre]) {
          nombreCounts[data.Nombre] = 1;
        } else {
          nombreCounts[data.Nombre]++;
          duplicados++; // aumenta duplicados
        }
      });

      // Agrega una propiedad "duplicado" a cada registro con un nombre duplicado
      results.forEach((data) => {
        if (nombreCounts[data.Nombre] > 1) {
          data.nombreDuplicado = true;
        }
      });

      // Busca duplicados en los correos
      const correoCounts = {};
      results.forEach((data) => {
        if (!correoCounts[data.Correo]) {
          correoCounts[data.Correo] = 1;
        } else {
          correoCounts[data.Correo]++;
          duplicados++; // aumenta duplicados
        }
      });

      // Agrega una propiedad "duplicado" a cada registro con un correo duplicado
      results.forEach((data) => {
        if (correoCounts[data.Correo] > 1) {
          data.correoDuplicado = true;
        }
      });

      // Busca duplicados en los teléfonos y valida que no pasen de los 10 dígitos
      const telefonoCounts = {};
      results.forEach((data) => {
        const telefono = parseInt(data.Telefono);
        if (isNaN(telefono) || telefono.toString().length > 10) {
          data.telefonoInvalido = true;
        } else if (!telefonoCounts[telefono]) {
          telefonoCounts[telefono] = 1;
        } else {
          telefonoCounts[telefono]++;
          duplicados++; // aumenta duplicados
        }
      });

      // Agrega una propiedad "duplicado" a cada registro con un teléfono duplicado
      results.forEach((data) => {
        if (telefonoCounts[data.Telefono] > 1) {
          data.telefonoDuplicado = true;
        }
      });

      // Busca registros con correos inválidos y agrega propiedad "correoValido"
      results.forEach((data) => {
        if (!validator.isEmail(data.Correo)) {
          data.correoValido = false;
        } else {
          data.correoValido = true;
        }
      });

      res.render('index', { datos: results, totalNombres: totalNombres, duplicados: duplicados });
    });
});


module.exports = router;

