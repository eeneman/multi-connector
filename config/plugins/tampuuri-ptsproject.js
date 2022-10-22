var sql = require("mssql");


/**
 * Sends getDataFromDb request .
 *
 * @param {Object} config
 * @return {Promise}
 */
async function getDataFromDb(config) {
    return new Promise(function (resolve, reject) {
        try {
            var configuration = {
                user: config.authConfig.user,
                password: config.authConfig.password,
                server: config.authConfig.server,
                database: config.authConfig.database,
                port: config.authConfig.port,
                options: {
                    encrypt: false
                }
            };

            sql.connect(configuration, function (err) {

                if (err) console.log(err);
                var ids = config.parameters.targetObject.map(item => item.idLocal)

                // create Request object
                var request = new sql.Request();

                // query to the database and get the records
                request.query(`select 
                Pts.Remonttinro,
                Pts.Vastuuhenkilöid,
                Pts.Vastuuhenkilö,
                Pts.Budjettihinta,
                Pts.Toteutunuthinta,
                Pts.RemontinTila,
                Pts.Nimi,
                Pts.Kuvaus,
                Pts.kohteetid,
                Kustannuspaikat.name as costLocationName
            from 
                pot.Pts,
                pot.Kustannuspaikat 
            Where 
                Remonttinro IN ( ${ids.join()}) and 
                pot.Pts.kohteetid=pot.Kustannuspaikat.id;`,
                    function (err, recordset) {

                        if (err) {
                            reject(err)
                        }
                        let data = recordset.recordset

                        sql.close()
                        resolve(data)

                    });
            });
        } catch (error) {
            reject(error)
        }
    });
}


/**
 * Transforms output to Platform of Trust context schema.
 *
 * @param {Object} config
 * @param {Object} output
 * @return {Object}
 */
const output = async (config, output) => {
    var arr = []
    data = await getDataFromDb(config)
    data.forEach(function (item) {
        arr.push({
            "@type": "Project",
            "description": item.Kuvaus,
            "idLocal": item.Remonttinro,
            "name": item.Nimi,
            "status": item.RemontinTila,
            "priceBudget": item.Budjettihinta,
            "processTarget": "",
            "priceActual": item.Toteutunuthinta,
            "costLocation": {
                "@type": "CostLocation",
                "name": item.costLocationName,
                "idLocal": item.kohteetid
            },
            "owner": {
                "@type": [
                    "Organization",
                    "Person"
                ],
                "name": item.Vastuuhenkilö,
                "idLocal": item.Vastuuhenkilöid
            }
        })
    })
    const result = {
        [config.output.context]: config.output.contextValue,
        [config.output.object]: {
            [config.output.array]: arr,
        },
    };

    return result;
}


module.exports = {
    name: 'tampuuri-ptsproject',
    output
};